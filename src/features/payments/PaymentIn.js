/* ===== PAYMENTS IN ===== */
import React, { useState, useMemo, useEffect } from 'react';
import useSalesStore from '../../store/salesStore';
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
  paymentType: 'Cash',
  paymentMode: 'full',   // 'full' | 'partial'
  paymentAmount: '',
  referenceNo: '',
};

export default function PaymentIn() {
  const { saleBills, loadBills } = useSalesStore();
  const parties = useAppStore((s) => s.parties);
  const { paymentsIn: payments, loadPaymentsIn, addPaymentIn } = usePaymentStore();
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
    loadBills();
    loadPaymentsIn(applied.startDate, applied.endDate);
  }, [loadBills, loadPaymentsIn, applied]);

  // ── Bills filtered by selected party for bill dropdown ──
  const selectedPartyBills = useMemo(() => {
    if (!form.partyId) return saleBills.filter((b) => b.paymentStatus?.toLowerCase() !== 'paid');
    return saleBills.filter(
      (b) =>
        String(b.Party?.id || b.partyId) === String(form.partyId) &&
        b.paymentStatus?.toLowerCase() !== 'paid'
    );
  }, [saleBills, form.partyId]);

  // ── Filter the payments register ──
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return payments.filter((p) => {
      const partyName = p.Party?.name || p.partyName || '';
      const billNo = p.Sale?.invoiceNumber || p.billNumber || '';
      const matchParty = !q || partyName.toLowerCase().includes(q) || billNo.toLowerCase().includes(q);
      const matchStatus = !statusFilter || (p.status || 'Paid').toLowerCase() === statusFilter;
      return matchParty && matchStatus;
    });
  }, [payments, debouncedSearch, statusFilter]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 10);

  const totalReceived = payments.reduce((s, p) => s + Number(p.amount || p.paymentAmount || 0), 0);
  const pendingBills = saleBills.filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid');
  const totalPending = pendingBills.reduce((s, b) => s + parseInt(b.totalAmount || 0), 0);

  function openModal() {
    setForm({
      ...EMPTY_FORM,
      paymentNumber: `PAY-IN-${Date.now().toString().slice(-6)}`,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  // Auto-fill amount when bill selected
  function handleBillChange(billId) {
    const bill = saleBills.find((b) => String(b.id || b._id) === String(billId));
    setForm((f) => ({
      ...f,
      billId,
      paymentAmount: bill ? String(bill.totalAmount || '') : '',
    }));
  }

  // When mode switches to full, restore full bill amount
  function handleModeChange(mode) {
    if (mode === 'full' && form.billId) {
      const bill = saleBills.find((b) => String(b.id || b._id) === String(form.billId));
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
      await addPaymentIn({
        saleId: form.billId,
        partyId: form.partyId,
        paymentDate: new Date().toISOString(),
        amount: Number(form.paymentAmount),
        paymentMode: form.paymentType, // e.g. Cash, UPI
        referenceNo: form.referenceNo,
      });

      // Reload bills so we see updated payment status
      loadBills();

      toast.success('Payment In recorded ✓');
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
        title="Record Payment In"
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
              <label className="form-label">Party *</label>
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
                disabled={!form.partyId && selectedPartyBills.length === 0}
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
          <h1>Payments In</h1>
          <p className="page-header__sub">Track incoming payments received from customers</p>
        </div>
        <Button variant="primary" icon={<FiPlus />} onClick={openModal}>
          Create Payment In
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard label="Total Received" value={formatCurrency(totalReceived)} icon="✅" color="green" sub={`${payments.length} payments`} />
        <StatCard label="Pending Receivables" value={formatCurrency(totalPending)} icon="⏳" color="amber" sub={`${pendingBills.length} invoices`} />
      </div>

      {/* Filters */}
      {/* Filters */}
      <div className="filter-bar">

        {/* Start Date */}
        <div className="filter-group">
          <label className="filter-label">
            Start Date
          </label>

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
          <label className="filter-label">
            End Date
          </label>

          <input
            type="date"
            className="form-input"
            value={filters.endDate}
            min={filters.startDate || undefined}
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
          <label className="filter-label">
            Search
          </label>

          <div className="search-bar">
            <span className="search-bar__icon">🔍</span>

            <input
              placeholder="Search party or bill no…"
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
          <label className="filter-label">
            Status
          </label>

          <div className="toggle-group">
            {[
              { val: '', label: 'All' },
              { val: 'paid', label: 'Paid' },
            ].map((s) => (
              <button
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
                ...filters,
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
              <th>Party</th>
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
                  No payments recorded yet. Click "Create Payment In" to record one.
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paymentDate || p.date)}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--fs-xs)' }}>
                    RCPT-{p.id || 'NEW'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.Party?.name || p.partyName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{p.Sale?.invoiceNumber || p.billNumber}</td>
                  <td>{p.paymentMode}</td>
                  <td>
                    <Badge variant="success">
                      Paid
                    </Badge>
                  </td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{p.referenceNo}</td>
                  <td className="text-right" style={{ fontWeight: 700, color: 'var(--success)' }}>
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
