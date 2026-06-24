/* ===== SALE BILL FORM — Create B2B / B2C invoices ===== */
import React, { useEffect, useState } from 'react';
import useAppStore from '../../store/appStore';
import useSalesStore from '../../store/salesStore';
import { PartySelector } from '../../components/shared/PartySelector';
import { InvoiceItemsTable } from '../../components/shared/InvoiceItemsTable';
import { Button, ConfirmModal, ToastContainer } from '../../components/ui';
import { useBillCalculations } from '../../hooks/useBillCalculations';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { todayISO } from '../../utils/date';
import {
  calcBillTotals,
  getNextInvoiceNo,
  buildSaleBillPayload,
  createEmptyItem,
} from '../../utils/invoice';
import { generateId } from '../../utils/numbers';
import POSScreen from './POSScreen';
import '../../styles/bills.css';
import { fetchCompanyUsersAPI } from '../../api';

/* Router: B2C → POSScreen, B2B → full B2B form */
export default function SaleBillForm({
  billingType = 'B2C',
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  if (billingType === 'B2C') {
    return (
      <POSScreen
        editMode={editMode}
        billId={billId}
        onBack={onBack}
        onSaved={onSaved}
      />
    );
  }
  return (
    <B2BInvoiceForm
      billingType={billingType}
      editMode={editMode}
      billId={billId}
      onBack={onBack}
      onSaved={onSaved}
    />
  );
}

/* ── B2B Invoice Form (all hooks safe here — no conditional) ── */
function B2BInvoiceForm({ billingType, editMode, billId, onBack, onSaved }) {
  const products = useAppStore((s) => s.products);
  const customers = useAppStore((s) => s.customers);
  const saleBills = useSalesStore((s) => s.saleBills);
  const addBill = useSalesStore((s) => s.addBill);
  const updateBill = useSalesStore((s) => s.updateBill);
  const addParty = useAppStore((s) => s.addParty);
  const toast = useToast();
  const { updateItemField, removeItem, addItem } = useBillCalculations();

  const settings = useAppStore((s) => s.settings);

  const [saving, setSaving] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const [users, setUsers] = useState([]);
  const [close, setClose] = useState(false);

  // ── Fetch Users ──
  async function loadUsers() {
    try {
      const data = await fetchCompanyUsersAPI(1); // Default company ID = 1
      setUsers(data.data || []);
    } catch (err) {
      toast.error('Failed to load user listing.');
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const [billForm, setBillForm] = useState({
    invoiceNo: getNextInvoiceNo(saleBills, settings),
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
    gstNumber: '',
    address: '',
  });

  const [address, setAddress] = useState('');

  /* Load Bill for Edit Mode */
  useEffect(() => {
    if (editMode && billId) {
      const existingBill = saleBills.find(
        (b) => String(b.id || b._id) === String(billId)
      );
      if (existingBill) {
        setSelectedPartyId(
          existingBill.partyId || existingBill.Party?.id || ''
        );

        setBillForm({
          invoiceNo: existingBill.invoiceNumber || existingBill.invoiceNo || '',
          date: existingBill.saleDate
            ? existingBill.saleDate.split('T')[0]
            : todayISO(),
          globalDiscount: existingBill.global_discount_amount || 0,
          items:
            existingBill.SalesItems && existingBill.SalesItems.length > 0
              ? existingBill.SalesItems.map((item) => ({
                productId: item.productId || '',
                productName: item.productName || '',
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
                mrp: item.price || 0, // Fallback if missing
                unit: 'pcs', // Fallback
                afterDiscount: item.baseRate || 0,
                discountAmount: item.discountAmount || 0,
                taxAmount: item.taxAmount || 0,
                netRate: item.netRate || 0,
                total: item.netRate || 0,
              }))
              : Array.from({ length: 3 }, createEmptyItem),
        });
        setCustomerForm({
          name: existingBill.name || existingBill.Party?.name || '',
          userId: existingBill.UserId || existingBill.User?.id || '',
          phone: existingBill.phone || existingBill.Party?.phone || '',
          poNumber: existingBill.po_number || '',
          ewayBill: existingBill.eway_bill || '',
          gstNumber: existingBill.Party?.GST || '',
          address: '', // Fill if needed
        });
      }
    }
  }, [editMode, billId, saleBills]);

  /* Totals */
  const validItems = billForm.items.filter((i) => i.productName?.trim());
  const totals = calcBillTotals(validItems, billForm.globalDiscount);

  /* Item handlers */
  function handleItemUpdate(idx, field, value) {
    setBillForm((prev) => ({
      ...prev,
      items: updateItemField(prev.items, products, idx, field, value),
    }));
  }
  function handleItemRemove(idx) {
    setBillForm((prev) => ({ ...prev, items: removeItem(prev.items, idx) }));
  }
  function handleAddItem() {
    setBillForm((prev) => ({ ...prev, items: addItem(prev.items) }));
  }

  /* Phone lookup for B2C */
  function handlePhoneBlur() {
    console.log(customers, customerForm.phone);
    if (!customerForm.phone) return;
    const existing = customers.find(
      (p) => String(p.phone).trim() === String(customerForm.phone).trim()
    );
    if (existing) {
      setSelectedCustomerId(String(existing.id || existing._id));
      setCustomerForm((prev) => ({ ...prev, name: existing.name || '' }));
      toast.showToast('Existing party found ✓');
    }
  }

  /* Save */
  async function handleSave() {
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (billingType === 'B2B' && !selectedPartyId) {
      toast.error('Select a party');
      return;
    }
    setSaving(true);

    try {
      let partyId = selectedPartyId;
      if (!partyId && billingType === 'B2C') {
        const newParty = await addParty({
          id: generateId(),
          name: customerForm.name || 'Walk-in',
          phone: customerForm.phone,
        });
        partyId = String(newParty?.id || newParty?._id || generateId());
      }

      const payload = buildSaleBillPayload({
        billForm,
        customerForm,
        validItems,
        partyId,
      });

      if (editMode) {
        await updateBill(billId, { ...payload, bill_type: billingType });
        toast.success('Invoice updated ✓');
      } else {
        await addBill({ ...payload, bill_type: billingType });
        toast.success('Invoice saved ✓');
      }
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}
    >
      <ToastContainer toasts={toast.toasts} />

      <ConfirmModal
        open={!!close}
        onClose={() => setClose(false)}
        onConfirm={onBack}
        title="Discard Sales Bill?"
        confirmLabel='Discard'
        icon='🛒'
      />

      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-3)',
            }}
          >
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <h1>
              {editMode
                ? `Edit ${billingType} Invoice`
                : `New ${billingType} Invoice`}
            </h1>
          </div>
        </div>
        <div className="page-header__actions">
          <div className="bill-type-toggle">
            <button
              className={`bill-type-btn ${billingType === 'B2B' ? 'active' : ''}`}
              onClick={() => { }}
            >
              B2B
            </button>
            <button
              className={`bill-type-btn ${billingType === 'B2C' ? 'active' : ''}`}
              onClick={() => { }}
            >
              B2C
            </button>
          </div>
        </div>
      </div>

      <div className="invoice-layout">
        {/* ── Left: Form + Items ── */}
        <div className="invoice-main">
          {/* Bill details card */}
          <div className="bill-form-card">
            <div className="bill-form-card__header">
              <span className="card__title">Invoice Details</span>
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
              <div
                className="form-grid-3"
                style={{ marginBottom: 'var(--sp-4)' }}
              >
                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">Select Party *</label>
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
                    <label className="form-label">User/Rep ID</label>
                    <select
                      className="form-input"
                      placeholder="User/Rep ID"
                      value={customerForm.userId}
                      onChange={(e) =>
                        setCustomerForm((p) => ({
                          ...p,
                          userId: e.target.value,
                        }))
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
                    <label className="form-label">Invoice No</label>
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

          {/* Invoice Items */}
          <InvoiceItemsTable
            items={billForm.items}
            products={products}
            onUpdateItem={handleItemUpdate}
            onRemoveItem={handleItemRemove}
            onAddItem={handleAddItem}
          />
        </div>

        {/* ── Right: Totals + Actions ── */}
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
              <span>
                GST ({billingType === 'B2B' ? 'Applicable' : 'Incl.'})
              </span>
              <span>{formatCurrency(totals.totalTax)}</span>
            </div>
            <div className="totals-card__row totals-card__row--discount">
              <span>Discount (₹)</span>
              <input
                className="totals-inline-input"
                style={{
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  borderColor: 'var(--danger-light)',
                }}
                type="number"
                value={billForm.globalDiscount || ''}
                onChange={(e) =>
                  setBillForm((p) => ({ ...p, globalDiscount: e.target.value }))
                }
                placeholder="0"
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

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-3)',
            }}
          >
            <Button
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
              loading={saving}
              onClick={handleSave}
            >
              {editMode ? '💾 Update Invoice' : '💾 Save Invoice'}
            </Button>
            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => setClose(true)}
            >
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
