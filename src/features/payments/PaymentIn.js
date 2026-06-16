/* ===== PAYMENTS IN ===== */
import React, { useState, useMemo } from 'react';
import useSalesStore from '../../store/salesStore';
import useAppStore from '../../store/appStore';
import {
  Button,
  StatCard,
  PaymentBadge,
  Pagination,
  ToastContainer,
} from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import '../../styles/payments.css';

export default function PaymentIn() {
  const { saleBills, updatePaymentStatus } = useSalesStore();
  const parties = useAppStore((s) => s.parties);
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [view, setView] = useState('list');

  const filtered = useMemo(() => {
    return saleBills.filter((b) => {
      const matchParty =
        !partySearch ||
        b.Party?.name?.toLowerCase().includes(partySearch.toLowerCase());
      const matchStatus =
        !statusFilter || b.paymentStatus?.toLowerCase() === statusFilter;
      return matchParty && matchStatus;
    });
  }, [saleBills, partySearch, statusFilter]);

  const { page, totalPages, paginated, from, to, total, goToPage } =
    usePagination(filtered, 10);

  const totalReceived = saleBills
    .filter((b) => b.paymentStatus?.toLowerCase() === 'paid')
    .reduce((s, b) => s + parseInt(b.totalAmount || 0), 0);
  const totalPending = saleBills
    .filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid')
    .reduce((s, b) => s + parseInt(b.totalAmount || 0), 0);

  async function handleMarkPaid(id, status) {
    try {
      await updatePaymentStatus(id, status);
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error('Update failed');
    }
  }

  function getInitials(name = '') {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}
    >
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Payments In</h1>
          <p className="page-header__sub">
            Track incoming payments from customers
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Total Received"
          value={formatCurrency(totalReceived)}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(totalPending)}
          icon="⏳"
          color="amber"
          sub={`${saleBills.filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid').length} invoices`}
        />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Party</label>
          <div className="search-bar">
            <span className="search-bar__icon">🔍</span>
            <input
              placeholder="Search party…"
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <div className="toggle-group">
            {['', 'paid', 'unpaid'].map((s) => (
              <button
                key={s}
                className={`toggle-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {(partySearch || statusFilter) && (
          <div className="filter-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPartySearch('');
                setStatusFilter('');
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              <th>Party</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--text-muted)',
                  }}
                >
                  No records found
                </td>
              </tr>
            ) : (
              paginated.map((b) => (
                <tr key={b.id || b._id}>
                  <td>{formatDate(b.saleDate)}</td>
                  <td
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      fontSize: 'var(--fs-xs)',
                    }}
                  >
                    {b.invoiceNumber}
                  </td>
                  <td>
                    <div className="party-cell">
                      <div className="party-avatar">
                        {getInitials(b.Party?.name || b.Customer?.name)}
                      </div>
                      <span>{b.Party?.name}</span>
                    </div>
                  </td>
                  <td className="text-right" style={{ fontWeight: 700 }}>
                    {formatCurrency(b.totalAmount)}
                  </td>
                  <td>
                    <PaymentBadge status={b.paymentStatus} />
                  </td>
                  <td>
                    {b.paymentStatus?.toLowerCase() === 'unpaid' ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleMarkPaid(b.id || b._id, 'Paid')}
                      >
                        Mark Paid
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMarkPaid(b.id || b._id, 'Unpaid')}
                      >
                        Revert
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={goToPage}
        />
      </div>
    </div>
  );
}
