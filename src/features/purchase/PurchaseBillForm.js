/* ===== PURCHASE BILL FORM ===== */
import React, { useState, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import usePurchaseStore from '../../store/purchaseStore';
import { PartySelector } from '../../components/shared/PartySelector';
import { InvoiceItemsTable } from '../../components/shared/InvoiceItemsTable';
import { Button, ToastContainer } from '../../components/ui';
import { useBillCalculations } from '../../hooks/useBillCalculations';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { todayISO } from '../../utils/date';
import {
  calcBillTotals,
  getNextInvoiceNo,
  buildPurchaseBillPayload,
  createEmptyItem,
} from '../../utils/invoice';
import '../../styles/bills.css';

export default function PurchaseBillForm({
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  const products = useAppStore((s) => s.products);
  const purchaseBills = usePurchaseStore((s) => s.purchaseBills);
  const addBill = usePurchaseStore((s) => s.addBill);
  const updateBill = usePurchaseStore((s) => s.updateBill);
  const toast = useToast();
  const { updateItemField, removeItem, addItem } = useBillCalculations();

  const settings = useAppStore((s) => s.settings);

  const [saving, setSaving] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [billForm, setBillForm] = useState({
    invoiceNo: getNextInvoiceNo(purchaseBills, {
      ...settings,
      invoicePrefix: 'PUR',
    }),
    date: todayISO(),
    items: Array.from({ length: 3 }, createEmptyItem),
    globalDiscount: 0,
  });
  const [customerForm, setCustomerForm] = useState({
    poNumber: '',
    ewayBill: '',
    state: '',
  });

  const [address, setAddress] = useState('');

  /* Load Bill for Edit Mode */
  useEffect(() => {
    if (editMode && billId) {
      const existingBill = purchaseBills.find(
        (b) => String(b.id || b._id) === String(billId)
      );
      console.log(existingBill);
      if (existingBill) {
        setSelectedPartyId(
          existingBill.partyId || existingBill.Party?.id || ''
        );
        setBillForm({
          invoiceNo: existingBill.invoiceNumber || existingBill.invoiceNo || '',
          date: existingBill.purchaseDate
            ? existingBill.purchaseDate.split('T')[0]
            : todayISO(),
          globalDiscount: existingBill.global_discount_amount || 0,
          items:
            existingBill.PurchaseItems && existingBill.PurchaseItems.length > 0
              ? existingBill.PurchaseItems.map((item) => ({
                  productId: item.productId || '',
                  productName: item.Product.name || '',
                  hsnCode: item.hsnCode || '',
                  sku: item.sku || '',
                  batchNumber: item.batchNumber || '',
                  expiryDate: item.expiryDate || '',
                  serialNumber: item.serialNumber || '',
                  notes: item.notes || '',
                  price: item.price || 0,
                  quantity: item.quantity || 1,
                  discountPercent: item.discountPercentage || 0,
                  taxRate: item.taxPercentage || 0,
                  mrp: item.price || 0,
                  unit: 'pcs',
                  afterDiscount: item.baseRate || 0,
                  discountAmount: item.discountAmount || 0,
                  taxAmount: item.taxAmount || 0,
                  netRate: item.netRate || 0,
                  total: item.netRate || 0,
                }))
              : Array.from({ length: 3 }, createEmptyItem),
        });
        setCustomerForm({
          poNumber: existingBill.po_number || '',
          ewayBill: existingBill.eway_bill || '',
          state: '',
        });
      }
    }
  }, [editMode, billId, purchaseBills]);

  const validItems = billForm.items.filter((i) => i.productName?.trim());
  const totals = calcBillTotals(validItems, billForm.globalDiscount);

  function handleItemUpdate(idx, field, value) {
    setBillForm((prev) => ({
      ...prev,
      items: updateItemField(prev.items, products, idx, field, value),
    }));
  }

  async function handleSave() {
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (!selectedPartyId) {
      toast.error('Select a vendor');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPurchaseBillPayload({
        billForm,
        validItems,
        partyId: selectedPartyId,
      });
      if (editMode) {
        await updateBill(billId, payload);
        toast.success('Purchase bill updated ✓');
      } else {
        await addBill(payload);
        toast.success('Purchase bill saved ✓');
      }
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save bill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}
    >
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div
          className="page-header__left"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}
        >
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h1>{editMode ? 'Edit Purchase Bill' : 'New Purchase Bill'}</h1>
        </div>
      </div>

      <div className="invoice-layout">
        <div className="invoice-main">
          <div className="bill-form-card">
            <div className="bill-form-card__header">
              <span className="card__title">Vendor & Bill Details</span>
            </div>
            <div className="bill-form-card__body">
              <div className="form-grid-3">
                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">Vendor / Party *</label>
                    <PartySelector
                      value={selectedPartyId}
                      onChange={(id, party) => {
                        setSelectedPartyId(id);
                        setAddress(party);
                      }}
                    />
                  </div>
                  {address && (
                    <>
                      <div className="form-group">
                        <label className="form-label">GST No</label>
                        <input
                          type="text"
                          className="form-input"
                          value={address?.GST ?? ''}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          className="form-input"
                          value={address?.address ?? ''}
                          readOnly
                          // style={{ height: '60px' }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={billForm.date}
                      onChange={(e) =>
                        setBillForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      className="form-input"
                      value={customerForm.state}
                      onChange={(e) =>
                        setCustomerForm((p) => ({
                          ...p,
                          state: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">Bill No</label>
                    <input
                      className="form-input"
                      value={billForm.invoiceNo}
                      onChange={(e) =>
                        setBillForm((p) => ({
                          ...p,
                          invoiceNo: e.target.value,
                        }))
                      }
                      readOnly={editMode}
                      style={
                        editMode
                          ? {
                              backgroundColor: 'var(--bg-hover)',
                              cursor: 'not-allowed',
                            }
                          : {}
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">PO Number</label>
                    <input
                      className="form-input"
                      value={customerForm.poNumber}
                      onChange={(e) =>
                        setCustomerForm((p) => ({
                          ...p,
                          poNumber: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">E-Way Bill No</label>
                    <input
                      className="form-input"
                      value={customerForm.ewayBill}
                      onChange={(e) =>
                        setCustomerForm((p) => ({
                          ...p,
                          ewayBill: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <InvoiceItemsTable
            items={billForm.items}
            products={products}
            onUpdateItem={handleItemUpdate}
            onRemoveItem={(idx) =>
              setBillForm((prev) => ({
                ...prev,
                items: removeItem(prev.items, idx),
              }))
            }
            onAddItem={() =>
              setBillForm((prev) => ({ ...prev, items: addItem(prev.items) }))
            }
          />
        </div>

        <div className="invoice-sidebar">
          <div className="totals-card">
            <div className="totals-card__row">
              <span>Items</span>
              <span style={{ fontWeight: 600 }}>{validItems.length}</span>
            </div>
            <div className="totals-card__row">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="totals-card__row">
              <span>GST</span>
              <span>{formatCurrency(totals.totalTax)}</span>
            </div>
            <div className="totals-card__row totals-card__row--discount">
              <span>Discount (₹)</span>
              <input
                className="totals-inline-input"
                type="number"
                value={billForm.globalDiscount || ''}
                onChange={(e) =>
                  setBillForm((p) => ({ ...p, globalDiscount: e.target.value }))
                }
                placeholder="0"
                style={{
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  borderColor: 'transparent',
                }}
              />
            </div>
            <div className="totals-card__row">
              <span>Round Off</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {totals.roundOff.toFixed(2)}
              </span>
            </div>
            <div className="totals-card__row totals-card__row--grand">
              <span>TOTAL</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
            loading={saving}
            onClick={handleSave}
          >
            {editMode ? '💾 Update Bill' : '💾 Save Bill'}
          </Button>
          <Button
            variant="secondary"
            style={{ width: '100%' }}
            onClick={onBack}
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}
