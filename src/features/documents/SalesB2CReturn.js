import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiPackage,
  FiRotateCcw,
  FiSearch,
  FiUser,
} from 'react-icons/fi';
import useAppStore from '../../store/appStore';
import useSettingsStore from '../../store/settingsStore-DB';
import { Button, ToastContainer } from '../../components/ui';
import ThermalSalesReturnBill from '../../components/shared/ThermalSalesReturnBill';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import {
  createSalesReturnCreditAPI,
  fetchReturnableSaleByInvoiceNumberAPI,
} from '../../api/sales';
import { refreshProductsAfterInventoryChange } from '../../store/refreshProductsAfterInventoryChange';
import '../../styles/SalesB2CReturn.css';

const createIdempotencyKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sales-return-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getReturnItemKey = (item) =>
  `${item.itemType === 'QUICK_SALE' ? 'quick' : 'product'}:${item.id}`;
const RETURN_CONDITIONS = [
  { value: 'GOOD', label: 'Good / Resalable' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
];
const initialAllocation = () => ({ id: 'initial', quantity: '', returnCondition: '' });
const getAllocations = (selection) => selection.allocations || [initialAllocation()];

export default function SalesB2CReturn({ searchParams }) {
  const companies = useAppStore((state) => state.companies);
  const printerWidth = useSettingsStore((state) => state.printerWidth);
  const toast = useToast();
  const toastError = toast.error;
  const company = Array.isArray(companies) ? companies[0] : companies;
  const initialInvoiceNumber = searchParams?.get('invoice') || '';

  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoiceNumber);
  const [invoice, setInvoice] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const lookupInvoice = useCallback(async (number) => {
    const invoiceNo = String(number || '').trim();
    if (!invoiceNo) {
      toastError('Enter the original B2C invoice number');
      return;
    }

    setLookingUp(true);
    setInvoice(null);
    setSelectedItems({});
    setReceipt(null);
    setIdempotencyKey('');
    try {
      const result = await fetchReturnableSaleByInvoiceNumberAPI(invoiceNo);
      setInvoice(result);
      setInvoiceNumber(result.invoiceNumber || invoiceNo);
    } catch (error) {
      toastError(error.message || 'Could not load the B2C invoice');
    } finally {
      setLookingUp(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (initialInvoiceNumber) lookupInvoice(initialInvoiceNumber);
  }, [initialInvoiceNumber, lookupInvoice]);

  const chosenItems = useMemo(
    () =>
      (invoice?.items || [])
        .flatMap((item) => {
          const selection = selectedItems[getReturnItemKey(item)] || {};
          if (item.itemType === 'QUICK_SALE') {
            const quantity = Number(selection.quantity);
            return Number.isFinite(quantity) && quantity > 0
              ? [{ quickSaleItemId: item.quickSaleItemId || item.id, quantity }]
              : [];
          }
          return getAllocations(selection)
            .filter((allocation) => Number(allocation.quantity) > 0)
            .map((allocation) => ({
              saleItemId: item.id,
              quantity: Number(allocation.quantity),
              quantityUnit: selection.quantityUnit || item.quantityUnit || 'PCS',
              returnCondition: allocation.returnCondition,
            }));
        })
        .flat(),
    [invoice, selectedItems],
  );

  const estimatedCredit = useMemo(
    () =>
      (invoice?.items || []).reduce((total, item) => {
        const selection = selectedItems[getReturnItemKey(item)] || {};
        const soldQuantity = Number(item.quantity) || 0;
        const lineAmount =
          item.itemType === 'QUICK_SALE'
            ? Number(item.netAmount) || 0
            : Number(item.netRate) || 0;
        if (soldQuantity <= 0) return total;
        if (item.itemType === 'QUICK_SALE') {
          const quantity = Number(selection.quantity);
          return Number.isFinite(quantity) && quantity > 0
            ? total + lineAmount * quantity / soldQuantity
            : total;
        }
        const unit = String(selection.quantityUnit || item.quantityUnit || 'PCS').toUpperCase();
        const allocatedQuantity = getAllocations(selection).reduce((sum, allocation) => {
          const quantity = Number(allocation.quantity);
          if (!Number.isFinite(quantity) || quantity <= 0) return sum;
          return sum + (unit === 'GRAM' ? quantity / 1000 : quantity);
        }, 0);
        return total + lineAmount * allocatedQuantity / soldQuantity;
      }, 0),
    [invoice, selectedItems],
  );

  function updateSelection(item, patch) {
    setReceipt(null);
    setIdempotencyKey('');
    const itemKey = getReturnItemKey(item);
    setSelectedItems((current) => ({
      ...current,
      [itemKey]: {
        quantityUnit: item.quantityUnit || item.Product?.baseUnit || 'PCS',
        ...current[itemKey],
        ...patch,
      },
    }));
  }

  function updateAllocation(item, allocationId, patch) {
    setReceipt(null);
    setIdempotencyKey('');
    const itemKey = getReturnItemKey(item);
    setSelectedItems((current) => {
      const selection = current[itemKey] || {
        quantityUnit: item.quantityUnit || item.Product?.baseUnit || 'PCS',
        allocations: [initialAllocation()],
      };
      return {
        ...current,
        [itemKey]: {
          ...selection,
          allocations: getAllocations(selection).map((allocation) =>
            allocation.id === allocationId ? { ...allocation, ...patch } : allocation
          ),
        },
      };
    });
  }

  function addAllocation(item) {
    setReceipt(null);
    setIdempotencyKey('');
    const itemKey = getReturnItemKey(item);
    setSelectedItems((current) => {
      const selection = current[itemKey] || {
        quantityUnit: item.quantityUnit || item.Product?.baseUnit || 'PCS',
        allocations: [initialAllocation()],
      };
      const allocations = getAllocations(selection);
      if (allocations.length >= RETURN_CONDITIONS.length) return current;
      return {
        ...current,
        [itemKey]: {
          ...selection,
          allocations: [
            ...allocations,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, quantity: '', returnCondition: '' },
          ],
        },
      };
    });
  }

  function removeAllocation(item, allocationId) {
    setReceipt(null);
    setIdempotencyKey('');
    const itemKey = getReturnItemKey(item);
    setSelectedItems((current) => {
      const selection = current[itemKey];
      if (!selection || getAllocations(selection).length <= 1) return current;
      return {
        ...current,
        [itemKey]: {
          ...selection,
          allocations: getAllocations(selection).filter((allocation) => allocation.id !== allocationId),
        },
      };
    });
  }

  const hasUnverifiedCondition = (invoice?.items || []).some((item) => {
    if (item.itemType === 'QUICK_SALE') return false;
    const selection = selectedItems[getReturnItemKey(item)] || {};
    return getAllocations(selection).some((allocation) =>
      Number(allocation.quantity) > 0 && !allocation.returnCondition
    );
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!invoice || chosenItems.length === 0) {
      toast.error('Enter a return quantity for at least one item');
      return;
    }
    if (estimatedCredit <= 0) {
      toast.error('Selected items do not have a refundable amount');
      return;
    }
    if (hasUnverifiedCondition) {
      toast.error('Select a condition for every returned product allocation');
      return;
    }

    const key = idempotencyKey || createIdempotencyKey();
    setIdempotencyKey(key);
    setSaving(true);
    try {
      const created = await createSalesReturnCreditAPI(
        invoice.id,
        { items: chosenItems, reason: reason.trim() },
        key,
      );
      setReceipt(created);
      toast.success('Sales return recorded and credit barcode created');
      if (chosenItems.some((item) => item.saleItemId != null)) {
        try {
          await refreshProductsAfterInventoryChange('Sales return');
        } catch (error) {
          console.error('Sales return succeeded, but product stock refresh failed:', error);
          toast.error('Return recorded, but product stock could not be refreshed');
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record sales return');
    } finally {
      setSaving(false);
    }
  }

  function startNewReturn() {
    setReceipt(null);
    setInvoice(null);
    setSelectedItems({});
    setReason('');
    setInvoiceNumber('');
    setIdempotencyKey('');
  }

  return (
    <div className="bills-page b2c-return-page">
      <ToastContainer toasts={toast.toasts} />
      <header className="b2c-return-hero">
        <div className="b2c-return-hero__main">
          <div className="b2c-return-breadcrumb">
            <span>Sales Operations</span><span aria-hidden="true">/</span><strong>Sales Return</strong>
          </div>
          <div className="b2c-return-hero__intro">
            <span className="b2c-return-hero__icon"><FiRotateCcw /></span>
            <div>
              <span className="b2c-return-eyebrow">B2C RETAIL SETTLEMENT</span>
              <h1>B2C Sales Return</h1>
              <p>Review the original invoice, assess returned items and issue store credit.</p>
            </div>
          </div>
        </div>
        <div className="b2c-return-hero__actions">
          <div className="b2c-return-hero__badges">
            <span><FiCreditCard /> Store credit barcode</span>
            <span><FiCheckCircle /> Condition-based stock handling</span>
          </div>
          <Button variant="secondary" onClick={() => { window.location.hash = 'documents'; }} icon={<FiArrowLeft />}>
            Back to Documents
          </Button>
        </div>
      </header>

      <section className="card b2c-return-lookup">
        <div className="b2c-return-section-heading">
          <span className="b2c-return-step">01</span>
          <div>
            <h2>Find original sales invoice</h2>
            <p>Enter or scan the B2C invoice number to load its returnable items.</p>
          </div>
        </div>
        <form
          className="b2c-return-lookup__form"
          onSubmit={(event) => {
            event.preventDefault();
            lookupInvoice(invoiceNumber);
          }}
        >
          <label className="b2c-return-lookup__field" htmlFor="sales-return-invoice">
            <span>Original B2C invoice number</span>
            <span className="b2c-return-input-wrap">
              <FiFileText aria-hidden="true" />
              <input
                id="sales-return-invoice"
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                placeholder="Enter or scan invoice number"
                autoComplete="off"
              />
            </span>
          </label>
          <Button type="submit" variant="primary" disabled={lookingUp} icon={<FiSearch />}>
            {lookingUp ? 'Searching…' : 'Find Invoice'}
          </Button>
        </form>
      </section>

      {invoice && !receipt && (
        <form className="b2c-return-form" onSubmit={handleSubmit}>
          <section className="card b2c-return-invoice">
            <div className="b2c-return-invoice__header">
              <div className="b2c-return-invoice__title">
                <span className="b2c-return-section-heading__icon"><FiFileText /></span>
                <div>
                  <span className="b2c-return-eyebrow">ORIGINAL SALES INVOICE</span>
                  <h2>{invoice.invoiceNumber}</h2>
                </div>
              </div>
              <div className="b2c-return-invoice__total">
                <span className="b2c-return-invoice__status"><FiCheckCircle /> Invoice loaded</span>
                <div className="b2c-return-original-total">
                  <small>Original invoice value</small>
                  <strong>{formatCurrency(invoice.totalAmount)}</strong>
                </div>
              </div>
            </div>
            <div className="b2c-return-invoice__meta">
              <div className="b2c-return-invoice__meta-item">
                <small>Customer</small>
                <span><FiUser /><strong>{invoice.customer?.name || 'Walk-in Customer'}</strong></span>
                {invoice.customer?.phone && <span className="b2c-return-invoice__meta-sub">{invoice.customer.phone}</span>}
              </div>
              <div className="b2c-return-invoice__meta-item">
                <small>Invoice date</small>
                <span>
                  <FiCalendar />
                  <strong>{invoice.saleDate ? new Date(invoice.saleDate).toLocaleDateString('en-IN') : '—'}</strong>
                </span>
              </div>
              <div className="b2c-return-invoice__meta-item">
                <small>Invoice items</small>
                <span><FiPackage /><strong>{(invoice.items || []).length} products</strong></span>
              </div>
            </div>
          </section>

          <section className="card b2c-return-products">
            <div className="b2c-return-products__header">
              <div className="b2c-return-section-heading">
                <span className="b2c-return-step">02</span>
                <div>
                  <h2>Original invoice line items</h2>
                  <p>Choose the return quantity and condition. Split an item when quantities have different conditions.</p>
                </div>
              </div>
              <span className="b2c-return-selected-count">
                {chosenItems.length} {chosenItems.length === 1 ? 'item selected' : 'items selected'}
              </span>
            </div>
            <div className="b2c-return-routing" aria-label="Return condition stock handling">
              <strong>Stock routing</strong>
              <span className="b2c-return-routing__good"><i /> Good / Resalable <small>Restores saleable stock</small></span>
              <span className="b2c-return-routing__damaged"><i /> Damaged <small>Excluded from saleable stock</small></span>
              <span className="b2c-return-routing__expired"><i /> Expired <small>Excluded from saleable stock</small></span>
            </div>
            <div className="b2c-return-grid-head" aria-hidden="true">
              <span>Product and batch</span>
              <span>Invoice quantities</span>
              <span>Return assessment</span>
            </div>
            <div className="b2c-return-items">
              {(invoice.items || []).map((item) => {
                const itemKey = getReturnItemKey(item);
                const selection = selectedItems[itemKey] || {};
                const isQuickSaleItem = item.itemType === 'QUICK_SALE';
                const isWeight =
                  !isQuickSaleItem &&
                  (item.Product?.unitType === 'WEIGHT' ||
                    item.quantityUnit === 'KG');
                const allowFractionalQuantity = isWeight || isQuickSaleItem;
                const unit = selection.quantityUnit ||
                  item.quantityUnit ||
                  item.Product?.baseUnit ||
                  'PCS';
                const remaining = Number(item.remainingReturnableQuantity) || 0;
                const quantity = Number(selection.quantity) || 0;
                const allocations = isQuickSaleItem ? [] : getAllocations(selection);
                const lineAmount =
                  isQuickSaleItem
                    ? Number(item.netAmount) || 0
                    : Number(item.netRate) || 0;
                const estimate = isQuickSaleItem && Number(item.quantity) > 0
                  ? lineAmount *
                    quantity /
                    Number(item.quantity)
                  : 0;
                const allocationEstimates = allocations.reduce((result, allocation) => {
                  const allocationQuantity = Number(allocation.quantity);
                  if (Number(item.quantity) <= 0 || !Number.isFinite(allocationQuantity) || allocationQuantity <= 0) {
                    result[allocation.id] = 0;
                    return result;
                  }
                  const normalizedQuantity = unit === 'GRAM'
                    ? allocationQuantity / 1000
                    : allocationQuantity;
                  result[allocation.id] = lineAmount * normalizedQuantity / Number(item.quantity);
                  return result;
                }, {});
                const isBlocked = Boolean(item.promoApplicationId) ||
                  item.itemRole === 'GIFT';
                const totalAllocatedBaseQuantity = allocations.reduce((sum, allocation) => {
                  const allocationQuantity = Number(allocation.quantity);
                  if (!Number.isFinite(allocationQuantity) || allocationQuantity <= 0) return sum;
                  return sum + (unit === 'GRAM' ? allocationQuantity / 1000 : allocationQuantity);
                }, 0);

                return (
                  <article
                    key={itemKey}
                    className={`b2c-return-item${isBlocked || remaining <= 0 ? ' b2c-return-item--disabled' : ''}`}
                  >
                    <div className="b2c-return-item__product">
                      <span className="b2c-return-product-icon"><FiPackage /></span>
                      <div>
                        <strong>{item.productName || item.Product?.name || 'Product'}</strong>
                        <div className="b2c-return-item__meta">
                          {item.batchNo && <span>Batch {item.batchNo}</span>}
                          {item.sku && <span>SKU {item.sku}</span>}
                          {!isBlocked && remaining > 0 && <span className="b2c-return-item__status b2c-return-item__status--eligible">Eligible to return</span>}
                          {isBlocked && <span className="b2c-return-item__status b2c-return-item__status--blocked">Not returnable</span>}
                          {!isBlocked && remaining <= 0 && <span className="b2c-return-item__status b2c-return-item__status--complete">Fully returned</span>}
                          {isQuickSaleItem && (
                            <span>Quick Sale · {item.gstVerificationStatus === 'GST_PENDING' ? 'GST pending verification' : 'GST verified'}</span>
                          )}
                        </div>
                        {isQuickSaleItem && (
                          <div className="b2c-return-item__notice">
                              This is not registered inventory; returning it will not change product stock.
                          </div>
                        )}
                        {isBlocked && (
                          <div className="b2c-return-item__notice"><FiAlertCircle />Promotion-linked items cannot be returned.</div>
                        )}
                        {!isBlocked && remaining <= 0 && (
                          <div className="b2c-return-item__notice">This item has already been fully returned.</div>
                        )}
                      </div>
                    </div>
                    <div className="b2c-return-item__stats">
                      <div><small>Sold</small><strong>{item.quantity} <span>{item.quantityUnit}</span></strong></div>
                      <div><small>Returned</small><strong>{item.returnedQuantity} <span>{item.quantityUnit}</span></strong></div>
                      <div className="b2c-return-item__remaining"><small>Available to return</small><strong>{remaining} <span>{item.quantityUnit}</span></strong></div>
                    </div>
                    <div className="b2c-return-item__entry">
                      {isQuickSaleItem ? (
                        <>
                          <label htmlFor={`return-qty-${itemKey}`}>
                            Return quantity <span>{isWeight ? '(KG / GRAM)' : '(PCS)'}</span>
                          </label>
                          <div className="b2c-return-item__quantity-controls">
                            <input
                              id={`return-qty-${itemKey}`}
                              type="number"
                              min={allowFractionalQuantity ? '0.001' : '1'}
                              max={unit === 'GRAM' ? remaining * 1000 : remaining}
                              step={allowFractionalQuantity && (!isWeight || unit !== 'GRAM') ? '0.001' : '1'}
                              disabled={isBlocked || remaining <= 0 || saving}
                              value={selection.quantity ?? ''}
                              onChange={(event) => updateSelection(item, { quantity: event.target.value })}
                            />
                          </div>
                          <div className="b2c-return-item__estimate">
                            Estimated credit <strong>{formatCurrency(estimate)}</strong>
                          </div>
                        </>
                      ) : (
                        <div className="b2c-return-allocations">
                          {allocations.map((allocation) => {
                            const allocationQuantity = Number(allocation.quantity) || 0;
                            const otherAllocatedQuantity = Math.max(
                              0,
                              totalAllocatedBaseQuantity - (
                                unit === 'GRAM' ? allocationQuantity / 1000 : allocationQuantity
                              ),
                            );
                            const availableForAllocation = Math.max(0, remaining - otherAllocatedQuantity);
                            const maxQuantity = unit === 'GRAM'
                              ? availableForAllocation * 1000
                              : availableForAllocation;
                            return (
                              <div className="b2c-return-allocation" key={allocation.id}>
                                <div className="b2c-return-allocation__fields">
                                  <div className="b2c-return-allocation__field">
                                    <label htmlFor={`return-condition-${itemKey}-${allocation.id}`}>Return condition</label>
                                    <select
                                      id={`return-condition-${itemKey}-${allocation.id}`}
                                      value={allocation.returnCondition}
                                      disabled={isBlocked || remaining <= 0 || saving}
                                      onChange={(event) => updateAllocation(item, allocation.id, { returnCondition: event.target.value })}
                                    >
                                      <option value="">Select condition</option>
                                      {RETURN_CONDITIONS.map((condition) => (
                                        <option
                                          key={condition.value}
                                          value={condition.value}
                                          disabled={allocations.some((other) => (
                                            other.id !== allocation.id && other.returnCondition === condition.value
                                          ))}
                                        >
                                          {condition.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="b2c-return-allocation__field">
                                    <label htmlFor={`return-qty-${itemKey}-${allocation.id}`}>
                                      Return quantity <span>{isWeight ? '(KG / GRAM)' : '(PCS)'}</span>
                                    </label>
                                    <div className="b2c-return-item__quantity-controls">
                                      <input
                                        id={`return-qty-${itemKey}-${allocation.id}`}
                                        type="number"
                                        min={allowFractionalQuantity ? '0.001' : '1'}
                                        max={maxQuantity}
                                        step={allowFractionalQuantity && unit !== 'GRAM' ? '0.001' : '1'}
                                        disabled={isBlocked || remaining <= 0 || saving}
                                        value={allocation.quantity}
                                        onChange={(event) => updateAllocation(item, allocation.id, { quantity: event.target.value })}
                                      />
                                      {isWeight && (
                                        <select
                                          aria-label={`Return quantity unit for ${item.productName}`}
                                          value={unit}
                                          disabled={isBlocked || remaining <= 0 || saving}
                                          onChange={(event) => {
                                            const nextUnit = event.target.value;
                                            setSelectedItems((current) => ({
                                              ...current,
                                              [itemKey]: {
                                                ...current[itemKey],
                                                quantityUnit: nextUnit,
                                                allocations: getAllocations(current[itemKey] || {}).map((entry) => ({
                                                  ...entry,
                                                  quantity: '',
                                                })),
                                              },
                                            }));
                                            setReceipt(null);
                                            setIdempotencyKey('');
                                          }}
                                        >
                                          <option value="KG">KG</option>
                                          <option value="GRAM">GRAM</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="b2c-return-item__estimate">
                                  Estimated credit <strong>{formatCurrency(allocationEstimates[allocation.id])}</strong>
                                </div>
                                {allocations.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => removeAllocation(item, allocation.id)}
                                  >
                                    Remove allocation
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                          {allocations.length < RETURN_CONDITIONS.length && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isBlocked || remaining <= 0 || saving}
                              onClick={() => addAllocation(item)}
                            >
                              Add condition allocation
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="b2c-return-reason">
              <label htmlFor="sales-return-reason">Return reason <span>(optional)</span></label>
              <input
                id="sales-return-reason"
                maxLength={255}
                value={reason}
                disabled={saving}
                onChange={(event) => {
                  setReason(event.target.value);
                  setIdempotencyKey('');
                }}
                placeholder="Reason for return"
              />
            </div>
          </section>

          <section className="card b2c-return-summary">
            <div className="b2c-return-summary__method">
              <span className="b2c-return-summary__icon"><FiCreditCard /></span>
              <div>
                <small>Settlement method</small>
                <strong>Store credit barcode</strong>
                <span>Credit is issued for the selected return quantities.</span>
              </div>
            </div>
            <div className="b2c-return-summary__amount">
              <small>Estimated return credit</small>
              <strong>{formatCurrency(estimatedCredit)}</strong>
              <span>{chosenItems.length} {chosenItems.length === 1 ? 'item' : 'items'} · based on original invoice line prices</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || chosenItems.length === 0 || estimatedCredit <= 0 || hasUnverifiedCondition}
              icon={<FiCheckCircle />}
            >
              {saving ? 'Processing Return…' : 'Process Return & Create Credit'}
            </Button>
          </section>
        </form>
      )}

      {receipt && (
        <section className="b2c-return-receipt">
          <div className="b2c-return-success">
            <span><FiCheckCircle /></span>
            <div><strong>Return recorded successfully</strong><small>Store credit has been created. Print or save the credit receipt below.</small></div>
          </div>
          <ThermalSalesReturnBill
            receipt={receipt}
            company={company}
            printerWidth={printerWidth}
            onPrintError={(message) => toast.error(message)}
          />
          <div className="b2c-return-receipt__actions">
            <Button variant="secondary" onClick={startNewReturn}>
              Create Another Return
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
