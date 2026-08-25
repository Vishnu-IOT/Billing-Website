/* ===== DOCUMENT FORM — Shared parameterized bill/document form ===== */
import React, { useEffect, useState, useMemo } from 'react';
import useAppStore from '../../store/appStore';
import useDocumentStore from '../../store/documentStore';
import useSalesStore from '../../store/salesStore';
import usePurchaseStore from '../../store/purchaseStore';
import { PartySelector } from './PartySelector';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { Button, ConfirmModal, ToastContainer } from '../ui';
import { useBillCalculations } from '../../hooks/useBillCalculations';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { todayISO } from '../../utils/date';
import {
  calcBillTotals,
  getNextInvoiceNo,
  buildDocumentPayload,
  buildSaleBillPayload,
  buildPurchaseBillPayload,
  createEmptyItem,
  mapLineItemsFromBill,
} from '../../utils/invoice';
import {
  getDocumentConfig,
  getDocumentPrefix,
  isInvoiceDocType,
} from '../../utils/documents';
import { fetchCompanyUsersAPI } from '../../api';
import '../../styles/bills.css';

export default function DocumentForm({
  docType,
  documentType: documentTypeProp,
  billingType = 'B2B',
  editMode = false,
  documentId = null,
  billId = null,
  onBack,
  onSaved,
  onConvert,
}) {
  const documentType = docType || documentTypeProp;
  const config = getDocumentConfig(documentType);
  const isInvoice = isInvoiceDocType(documentType);
  const recordId = documentId || billId;

  const products = useAppStore((s) => s.products);
  const settings = useAppStore((s) => s.settings);
  const saleBills = useSalesStore((s) => s.saleBills);
  const purchaseBills = usePurchaseStore((s) => s.purchaseBills);
  const addSaleBill = useSalesStore((s) => s.addBill);
  const updateSaleBill = useSalesStore((s) => s.updateBill);
  const addPurchaseBill = usePurchaseStore((s) => s.addBill);
  const updatePurchaseBill = usePurchaseStore((s) => s.updateBill);
  const getDocuments = useDocumentStore((s) => s.getDocuments);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const updateDocument = useDocumentStore((s) => s.updateDocument);
  const convertToInvoice = useDocumentStore((s) => s.convertToInvoice);

  const toast = useToast();
  const { updateItemField, removeItem, addItem } = useBillCalculations();

  const existingDocs = getDocuments(documentType);
  const numberingBills = useMemo(() => {
    if (documentType === 'SALE_INVOICE') return saleBills;
    if (documentType === 'PURCHASE_BILL') return purchaseBills;
    return existingDocs;
  }, [documentType, saleBills, purchaseBills, existingDocs]);

  const docPrefix = getDocumentPrefix(documentType, settings);
  const numberingSettings = useMemo(
    () => ({ ...settings, invoicePrefix: docPrefix, dateStr: todayISO() }),
    [settings, docPrefix]
  );

  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [users, setUsers] = useState([]);
  const [close, setClose] = useState(false);
  const [address, setAddress] = useState('');

  const [loaded, setLoaded] = useState(false);

  const [billForm, setBillForm] = useState({
    invoiceNo:
      documentType === 'PURCHASE_BILL'
        ? ''
        : getNextInvoiceNo(numberingBills, numberingSettings),
    date: todayISO(),
    items: Array.from({ length: 3 }, createEmptyItem),
    globalDiscount: 0,
  });

  const [customerForm, setCustomerForm] = useState({
    name: '',
    userId: '',
    phone: '',
    poNumber: '',
    ewayBill: '',
    referenceNo: '',
    validUntil: '',
    transportRef: '',
    state: '',
  });

  useEffect(() => {
    async function loadUsers() {
      if (!config.requireUserRep && documentType !== 'SALE_INVOICE') return;
      try {
        const data = await fetchCompanyUsersAPI(1);
        setUsers(data.data || []);
      } catch {
        toast.error('Failed to load user listing.');
      }
    }
    loadUsers();
  }, [config.requireUserRep, documentType]);

  useEffect(() => {
    if (!editMode || !recordId || loaded) return;

    let existing = null;
    if (documentType === 'SALE_INVOICE') {
      existing = saleBills.find((b) => String(b.id || b._id) === String(recordId));
    } else if (documentType === 'PURCHASE_BILL') {
      existing = purchaseBills.find((b) => String(b.id || b._id) === String(recordId));
    } else {
      existing = existingDocs.find((d) => String(d.id || d._id) === String(recordId));
    }

    if (!existing) return;

    setSelectedPartyId(existing.partyId || existing.Party?.id || '');

    const items =
      existing[config.itemsField] ||
      existing.SalesItems ||
      existing.PurchaseItems ||
      existing.DocumentItems ||
      existing.items ||
      [];

    const dateVal =
      existing[config.dateField] ||
      existing.saleDate ||
      existing.purchaseDate ||
      existing.documentDate;

    setBillForm({
      invoiceNo:
        existing.invoiceNumber ||
        existing.invoiceNo ||
        existing.documentNumber ||
        '',
      date: dateVal ? dateVal.split('T')[0] : todayISO(),
      globalDiscount: existing.global_discount_amount || 0,
      items: mapLineItemsFromBill(items),
    });

    setCustomerForm({
      name: existing.name || existing.Party?.name || '',
      userId: existing.userId || existing.UserId || existing.User?.id || '',
      phone: existing.phone || existing.Party?.phone || '',
      poNumber: existing.po_number || '',
      ewayBill: existing.eway_bill || '',
      referenceNo: existing.referenceNo || '',
      validUntil: existing.validUntil ? existing.validUntil.split('T')[0] : '',
      transportRef: existing.transportRef || '',
      state: existing.state || '',
    });

    setLoaded(true);
  }, [editMode, recordId, documentType, saleBills, purchaseBills, existingDocs, config, loaded]);

  useEffect(() => {
    setLoaded(false);
  }, [recordId, editMode]);

  const validItems = billForm.items.filter((i) => i.productName?.trim());
  const totals = calcBillTotals(validItems, billForm.globalDiscount);
  const billCalcType = config.side === 'purchase' ? 'purchase' : 'sales';

  function handleItemUpdate(idx, field, value) {
    if (field === 'quantity' && (value <= 0 || !String(value).trim())) {
      toast.error("Qty can't be empty or 0");
    }
    setBillForm((prev) => ({
      ...prev,
      items: updateItemField(prev.items, products, idx, field, value, billCalcType),
    }));
  }

  async function handleSave() {
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    // if (!customerForm.validUntil) {
    //   toast.error('Select a proper valid date');
    //   return;
    // }

    if (documentType === 'QUOTATION') {
      if (!customerForm.validUntil) {
        toast.error('Valid until date is required');
        return;
      }
    }

    if (!selectedPartyId) {
      toast.error(config.side === 'purchase' ? 'Select a vendor' : 'Select a party');
      return;
    }
    if (config.requireUserRep && !customerForm.userId) {
      toast.error('Select a User/Rep');
      return;
    }
    if (!billForm.date) {
      toast.error('Select a proper date');
      return;
    }
    if (documentType === 'PURCHASE_BILL' && !billForm.invoiceNo.trim()) {
      toast.error('Purchase Bill No is required');
      return;
    }

    setSaving(true);
    try {
      let createdRecord = null;
      if (documentType === 'SALE_INVOICE') {
        let companyId = null;

        try {
          const erpSettings = localStorage.getItem('erp-settings');
          console.log('ERP Settings from localStorage:', erpSettings);
          if (erpSettings) {
            const companydata = JSON.parse(erpSettings);
            companyId = companydata?.state?.companyId;
          }
        } catch (error) {
          console.error('Error reading company ID:', error);
        }

        if (!companyId) {
          toast.error('Company ID not found');
          return;
        }

        const payload = buildSaleBillPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
        });

        const salePayload = {
          ...payload,
          companyId: Number(companyId),
          bill_type: billingType,
        };

        if (editMode) {
          await updateSaleBill(recordId, salePayload);
          toast.success('Invoice updated ✓');
        } else {
          createdRecord = await addSaleBill(salePayload); // ← capture it here
          toast.success('Invoice saved ✓');
        }
      } else if (documentType === 'PURCHASE_BILL') {
        const payload = buildPurchaseBillPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
        });
        if (editMode) {
          await updatePurchaseBill(recordId, payload);
          toast.success('Purchase bill updated ✓');
        } else {
          await addPurchaseBill(payload);
          toast.success('Purchase bill saved ✓');
        }
      } else {
        const payload = buildDocumentPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
          documentType,
        });
        if (editMode) {
          await updateDocument(recordId, payload);
          toast.success(`${config.label} updated ✓`);
        } else {
          await addDocument(payload);
          toast.success(`${config.label} saved ✓`);
        }
      }
      if (documentType === 'SALE_INVOICE') {
        onSaved?.(createdRecord.data);
      }
      else {
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${config.label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert() {
    if (!config.convertible || !recordId) return;
    setConverting(true);
    try {
      const result = await convertToInvoice(recordId, documentType);
      if (result?.saleBill || result?.data || result?.success) {
        toast.success('Converted to sale invoice ✓');
        onConvert?.(result);
        return;
      }
      const salePayload = buildSaleBillPayload({
        billForm: {
          ...billForm,
          invoiceNo: getNextInvoiceNo(saleBills, {
            ...settings,
            invoicePrefix: settings.invoicePrefix || 'INV',
            dateStr: todayISO(),
          }),
        },
        customerForm,
        validItems,
        partyId: selectedPartyId,
      });
      await addSaleBill({
        ...salePayload,
        bill_type: 'B2B',
        convertedFrom: recordId,
      });
      await updateDocument(recordId, {
        ...buildDocumentPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
          documentType,
        }),
        status: 'converted',
      });
      toast.success('Converted to sale invoice ✓');
      onConvert?.();
    } catch (err) {
      console.error(err);
      toast.error('Conversion failed');
    } finally {
      setConverting(false);
    }
  }

  const saveLabel = editMode
    ? documentType === 'SALE_INVOICE'
      ? 'Update Invoice'
      : documentType === 'PURCHASE_BILL'
        ? 'Update Bill'
        : `Update ${config.label}`
    : documentType === 'SALE_INVOICE'
      ? 'Save Invoice'
      : documentType === 'PURCHASE_BILL'
        ? 'Save Bill'
        : `Save ${config.label}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <ToastContainer toasts={toast.toasts} />

      <ConfirmModal
        open={!!close}
        onClose={() => setClose(false)}
        onConfirm={onBack}
        title={`Discard ${config.label}?`}
        confirmLabel="Discard"
        icon={isInvoice ? '🧾' : '📄'}
      />

      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <Button variant="ghost" size="sm" onClick={() => setClose(true)}>
              ← Back
            </Button>
            <h1>
              {editMode ? `Edit ${config.label}` : `New ${config.label}`}
              {documentType === 'SALE_INVOICE' && billingType ? ` (${billingType})` : ''}
            </h1>
          </div>
        </div>
        {/* {documentType === 'SALE_INVOICE' && (
          <div className="page-header__actions">
            <div className="bill-type-toggle">
              <button className={`bill-type-btn ${billingType === 'B2B' ? 'active' : ''}`} type="button">
                B2B
              </button>
              <button className={`bill-type-btn ${billingType === 'B2C' ? 'active' : ''}`} type="button">
                B2C
              </button>
            </div>
          </div>
        )} */}
      </div>

      <div className="invoice-layout">
        <div className="invoice-main">
          <div className="bill-form-card">
            <div className="bill-form-card__header">
              <span className="card__title">{config.label} Details</span>
              <span
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {billForm.invoiceNo}
              </span>
            </div>
            <div className="bill-form-card__body">
              <div className="form-grid-3" style={{ marginBottom: 'var(--sp-4)' }}>
                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">{config.partyLabel || 'Select Party *'}</label>
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
                        <input type="text" className="form-input" value={address?.GST ?? ''} readOnly />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address</label>
                        <input type="text" className="form-input" value={address?.address ?? ''} readOnly />
                      </div>
                    </>
                  )}
                </div>

                {(config.requireUserRep || documentType === 'SALE_INVOICE') && (
                  <div className="form-flex-2-1">
                    <div className="form-group">
                      <label className="form-label">User/Rep ID{config.requireUserRep ? ' *' : ''}</label>
                      <select
                        className="form-input"
                        value={customerForm.userId}
                        onChange={(e) =>
                          setCustomerForm((p) => ({ ...p, userId: e.target.value }))
                        }
                      >
                        <option value="">Select User</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">{config.dateLabel || 'Date'}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={billForm.date}
                      onChange={(e) => setBillForm((p) => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  {config.showValidUntil && (
                    <div className="form-group">
                      <label className="form-label">{config.validUntilLabel || 'Valid Until'}</label>
                      <input
                        type="date"
                        className="form-input"
                        min={new Date().toISOString().split("T")[0]}
                        value={customerForm.validUntil}
                        onChange={(e) =>
                          setCustomerForm((p) => ({ ...p, validUntil: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                  {config.showState && (
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input
                        className="form-input"
                        value={customerForm.state}
                        onChange={(e) =>
                          setCustomerForm((p) => ({ ...p, state: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">{config.numberLabel || 'Document No'}</label>
                    <input
                      className="form-input"
                      value={billForm.invoiceNo}
                      onChange={(e) =>
                        setBillForm((p) => ({
                          ...p,
                          invoiceNo: e.target.value,
                        }))
                      }
                      readOnly={documentType !== 'PURCHASE_BILL' && (editMode || isInvoice)}
                      placeholder={
                        documentType === 'PURCHASE_BILL'
                          ? 'Enter vendor bill number'
                          : 'Document No'
                      }
                    />
                  </div>
                  {config.referenceLabel && (
                    <div className="form-group">
                      <label className="form-label">{config.referenceLabel}</label>
                      <input
                        className="form-input"
                        value={customerForm.referenceNo}
                        onChange={(e) =>
                          setCustomerForm((p) => ({ ...p, referenceNo: e.target.value }))
                        }
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">PO Number</label>
                    <input
                      className="form-input"
                      value={customerForm.poNumber}
                      onChange={(e) =>
                        setCustomerForm((p) => ({ ...p, poNumber: e.target.value }))
                      }
                    />
                  </div>
                  {config.transportLabel && (
                    <div className="form-group">
                      <label className="form-label">{config.transportLabel}</label>
                      <input
                        className="form-input"
                        value={customerForm.transportRef}
                        onChange={(e) =>
                          setCustomerForm((p) => ({ ...p, transportRef: e.target.value }))
                        }
                      />
                    </div>
                  )}
                  {documentType !== 'DELIVERY_CHALLAN' && (
                    <div className="form-group">
                      <label className="form-label">E-Way Bill No</label>
                      <input
                        className="form-input"
                        value={customerForm.ewayBill}
                        onChange={(e) =>
                          setCustomerForm((p) => ({ ...p, ewayBill: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <InvoiceItemsTable
            items={billForm.items}
            products={products}
            onUpdateItem={handleItemUpdate}
            onRemoveItem={(idx) =>
              setBillForm((prev) => ({ ...prev, items: removeItem(prev.items, idx) }))
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
            {config.showTax && (
              <>
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
                    style={
                      isInvoice
                        ? {
                          background: 'var(--danger-light)',
                          color: 'var(--danger)',
                          borderColor: 'var(--danger-light)',
                        }
                        : {}
                    }
                  />
                </div>
                {config.showRoundOff && (
                  <div className="totals-card__row">
                    <span>Round Off</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {totals.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="totals-card__row totals-card__row--grand">
                  <span>TOTAL</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <Button
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
              loading={saving}
              onClick={handleSave}
            >
              {saveLabel}
            </Button>
            {config.convertible && editMode && (
              <Button
                variant="success"
                style={{ width: '100%' }}
                loading={converting}
                onClick={handleConvert}
              >
                {config.convertLabel}
              </Button>
            )}
            <Button variant="secondary" style={{ width: '100%' }} onClick={() => setClose(true)}>
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
