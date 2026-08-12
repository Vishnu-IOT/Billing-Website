/* ===== PAYMENT OUT ===== */
import React, { useState, useMemo, useEffect } from 'react';
import usePurchaseStore from '../../store/purchaseStore';
import useAppStore from '../../store/appStore';
import usePaymentStore from '../../store/paymentStore';
import {
  Button,
  StatCard,
  PaymentBadge,
  Pagination,
  ToastContainer,
  Modal,
  Badge,
} from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { FiPlus } from 'react-icons/fi';
import '../../styles/payments.css';

const PAYMENT_TYPES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'NEFT/RTGS', 'Credit Card', 'Debit Card'];

const EMPTY_FORM = {
  partyId: '',
  billId: '',
  paymentNumber: '',
  paymentType: 'Bank Transfer',
  paymentMode: 'full',   // 'full' | 'partial'
  paymentAmount: '',
  referenceNo: '',
};

export default function PaymentOut() {
  const { purchaseBills, loadBills } = usePurchaseStore();
  const parties = useAppStore((s) => s.parties);
  const { paymentsOut: payments, loadPaymentsOut, addPaymentOut } = usePaymentStore();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const [applied, setApplied] = useState({
    startDate: '',
    endDate: '',
  });

  const debouncedSearch = useDebounce(partySearch, 250);

  useEffect(() => {
    if (typeof loadBills === 'function') {
      loadBills();
    }

    loadPaymentsOut(
      applied.startDate,
      applied.endDate
    );
  }, [
    loadBills,
    loadPaymentsOut,
    applied.startDate,
    applied.endDate,
  ]);

  // Bills not yet paid, filtered by selected party
  const selectedPartyBills = useMemo(() => {
    const unpaid = purchaseBills.filter((b) => b.paymentStatus?.toLowerCase() !== 'paid');
    if (!form.partyId) return unpaid;
    return unpaid.filter((b) => String(b.Party?.id || b.partyId) === String(form.partyId));
  }, [purchaseBills, form.partyId]);

  // Filter payments register
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return payments.filter((p) => {
      const partyName = p.Party?.name || p.partyName || '';
      const billNo = p.Purchase?.invoiceNumber || p.billNumber || '';
      const matchParty = !q || partyName.toLowerCase().includes(q) || billNo.toLowerCase().includes(q);
      const matchStatus = !statusFilter || (p.status || 'Paid').toLowerCase() === statusFilter;
      return matchParty && matchStatus;
    });
  }, [payments, debouncedSearch, statusFilter]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 10);

  const totalPaidOut = payments.reduce((s, p) => s + Number(p.amount || p.paymentAmount || 0), 0);
  const pendingBills = purchaseBills.filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid');
  const totalPending = pendingBills.reduce((s, b) => s + parseInt(b.totalAmount || 0), 0);

  function openModal() {
    setForm({ ...EMPTY_FORM, paymentNumber: `PAY-OUT-${Date.now().toString().slice(-6)}` });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  function handleBillChange(billId) {
    const bill = purchaseBills.find((b) => String(b.id || b._id) === String(billId));
    setForm((f) => ({ ...f, billId, paymentAmount: bill ? String(bill.totalAmount || '') : '' }));
  }

  function handleModeChange(mode) {
    if (mode === 'full' && form.billId) {
      const bill = purchaseBills.find((b) => String(b.id || b._id) === String(form.billId));
      setForm((f) => ({ ...f, paymentMode: mode, paymentAmount: bill ? String(bill.totalAmount || '') : f.paymentAmount }));
    } else {
      setForm((f) => ({ ...f, paymentMode: mode }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.billId) { toast.error('Please select a bill'); return; }
    if (!form.paymentAmount || Number(form.paymentAmount) <= 0) { toast.error('Enter a valid payment amount'); return; }

    setSaving(true);
    try {
      await addPaymentOut({
        purchaseId: form.billId,
        partyId: form.partyId,
        paymentDate: new Date().toISOString(),
        amount: Number(form.paymentAmount),
        paymentMode: form.paymentType, // e.g. Bank Transfer, Cash
        referenceNo: form.referenceNo,
      });

      // Reload bills to see updated status
      if (typeof loadBills === 'function') loadBills();

      toast.success('Payment Out recorded ✓');
      closeModal();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <ToastContainer toasts={toast.toasts} />

      {/* Create Payment Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title="Record Payment Out"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSubmit}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-grid-2">
            {/* Party */}
            <div className="form-group">
              <label className="form-label">Vendor / Party *</label>
              <select
                className="form-input"
                value={form.partyId}
                onChange={(e) => setForm({ ...form, partyId: e.target.value, billId: '', paymentAmount: '' })}
              >
                <option value="">— Select Party —</option>
                {parties.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Bill */}
            <div className="form-group">
              <label className="form-label">Bill Number *</label>
              <select
                className="form-input"
                value={form.billId}
                onChange={(e) => handleBillChange(e.target.value)}
              >
                <option value="">— Select Bill —</option>
                {selectedPartyBills.map((b) => (
                  <option key={b.id || b._id} value={b.id || b._id}>
                    {b.invoiceNumber || b.invoiceNo} — {formatCurrency(b.totalAmount)}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Number */}
            <div className="form-group">
              <label className="form-label">Payment Number *</label>
              <input
                className="form-input"
                value={form.paymentNumber}
                onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
                required
              />
            </div>

            {/* Payment Type */}
            <div className="form-group">
              <label className="form-label">Payment Type *</label>
              <select
                className="form-input"
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
              >
                {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Payment Mode — Full / Partial */}
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <div className="toggle-group">
              {['full', 'partial'].map((m) => (
                <button
                  type="button"
                  key={m}
                  className={`toggle-btn ${form.paymentMode === m ? 'active' : ''}`}
                  onClick={() => handleModeChange(m)}
                >
                  {m === 'full' ? '✅ Full Payment' : '⚡ Partial Payment'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-2">
            {/* Amount */}
            <div className="form-group">
              <label className="form-label">
                Payment Amount (₹) *
                {form.paymentMode === 'partial' && (
                  <span style={{ marginLeft: 6, fontSize: 'var(--fs-xs)', color: 'var(--warning)', fontWeight: 600 }}>
                    (Partial)
                  </span>
                )}
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={form.paymentAmount}
                onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })}
                readOnly={form.paymentMode === 'full'}
                style={form.paymentMode === 'full' ? { background: 'var(--bg-hover)', cursor: 'not-allowed' } : {}}
                required
              />
            </div>

            {/* Reference No */}
            <div className="form-group">
              <label className="form-label">Reference No</label>
              <input
                className="form-input"
                placeholder="UTR / Cheque No / Transaction ID"
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__left">
          <h1>Payments Out</h1>
          <p className="page-header__sub">Track outgoing payments made to vendors</p>
        </div>
        <Button variant="primary" icon={<FiPlus />} onClick={openModal}>
          Create Payment Out
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard label="Total Paid Out" value={formatCurrency(totalPaidOut)} icon="✅" color="green" sub={`${payments.length} payments`} />
        <StatCard label="Pending Payables" value={formatCurrency(totalPending)} icon="⏳" color="amber" sub={`${pendingBills.length} bills`} />
      </div>

      {/* Filters */}
      {/* Filters */}
      <div className="filter-bar">

        {/* Start Date */}
        <div className="filter-group">
          <label className="filter-label">Start Date</label>

          <input
            type="date"
            className="form-input"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                startDate: e.target.value,
              }))
            }
          />
        </div>

        {/* End Date */}
        <div className="filter-group">
          <label className="filter-label">End Date</label>

          <input
            type="date"
            className="form-input"
            min={filters.startDate || undefined}
            value={filters.endDate}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                endDate: e.target.value,
              }))
            }
          />
        </div>

        {/* Search */}
        <div className="filter-group">
          <label className="filter-label">Search</label>

          <div className="search-bar">
            <span className="search-bar__icon">🔍</span>

            <input
              placeholder="Search vendor or bill no…"
              value={partySearch}
              onChange={(e) => {
                setPartySearch(e.target.value);
                goToPage(1);
              }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="filter-group">
          <label className="filter-label">Status</label>

          <div className="toggle-group">
            {[
              { val: '', label: 'All' },
              { val: 'paid', label: 'Paid' },
            ].map((s) => (
              <button
                type="button"
                key={s.val}
                className={`toggle-btn ${statusFilter === s.val ? 'active' : ''
                  }`}
                onClick={() => {
                  setStatusFilter(s.val);
                  goToPage(1);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply / Clear */}
        <div className="filter-actions">

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setApplied({
                startDate: filters.startDate,
                endDate: filters.endDate,
              });

              goToPage(1);
            }}
          >
            Apply
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const emptyDates = {
                startDate: '',
                endDate: '',
              };

              setFilters(emptyDates);
              setApplied(emptyDates);
              setPartySearch('');
              setStatusFilter('');

              goToPage(1);
            }}
          >
            Clear
          </Button>

        </div>

      </div>

      {/* Payments Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payment No</th>
              <th>Vendor</th>
              <th>Bill No</th>
              <th>Type</th>
              <th>Mode</th>
              <th>Reference</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No payments recorded yet. Click "Create Payment Out" to record one.
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paymentDate || p.date)}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--fs-xs)' }}>
                    PAY-OUT-{p.id || 'NEW'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.Party?.name || p.partyName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{p.Purchase?.invoiceNumber || p.billNumber}</td>
                  <td>{p.paymentMode}</td>
                  <td>
                    <Badge variant="success">
                      Paid
                    </Badge>
                  </td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{p.referenceNo}</td>
                  <td className="text-right" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                    {formatCurrency(p.amount || p.paymentAmount)}
                  </td>
                  <td><PaymentBadge status="Paid" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={goToPage} />
      </div>
    </div>
  );
}
