/* ===== PURCHASE BILLS — List View ===== */
import React, { useState, useMemo, useEffect } from 'react';
import usePurchaseStore from '../../store/purchaseStore';
import useUIStore from '../../store/uiStore';
import {
  Button,
  EmptyState,
  PaymentBadge,
  Pagination,
  ConfirmModal,
  ActionMenu,
  StatCard,
  ToastContainer,
} from '../../components/ui';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import PurchaseBillForm from './PurchaseBillForm';
import BillPreview from '../billing/BillPreview';
import '../../styles/bills.css';

export default function PurchaseBills() {
  const {
    purchaseBills,
    filter,
    dateRange,
    loadBills,
    deleteBill,
    setFilter,
    setDateRange,
  } = usePurchaseStore();
  const toast = useToast();

  const [view, setView] = useState('list');
  const [previewBill, setPreviewBill] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const setHideSidebar = useUIStore((s) => s.setHideSidebar);

  useEffect(() => {
    setHideSidebar(view !== 'list');

    return () => setHideSidebar(false);
  }, [view]);

  useEffect(() => {
    loadBills();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return purchaseBills.filter(
      (b) =>
        !q ||
        b.Party?.name?.toLowerCase().includes(q) ||
        b.invoiceNumber?.toLowerCase().includes(q)
    );
  }, [purchaseBills, search]);

  const { page, totalPages, paginated, from, to, total, goToPage } =
    usePagination(filtered, 10);
  const totalPurchases = purchaseBills.reduce(
    (s, b) => s + (parseInt(b.totalAmount) || 0),
    0
  );

  async function applyFilter() {
    await loadBills(filter, dateRange);
  }
  async function clearFilter() {
    setFilter('thisMonth');
    setDateRange({ startDate: '', endDate: '' });
    await loadBills('thisMonth', { startDate: '', endDate: '' });
  }

  async function handleDelete() {
    try {
      await deleteBill(deleteId);
      toast.success('Bill deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  }

  if (view === 'preview' && previewBill)
    return (
      <BillPreview
        bill={previewBill}
        billType="PURCHASE"
        onBack={() => setView('list')}
      />
    );
  if (view === 'create')
    return (
      <PurchaseBillForm
        onBack={() => setView('list')}
        onSaved={() => {
          setView('list');
          loadBills();
        }}
      />
    );

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
    >
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Purchase Bill?"
        confirmLabel='Delete'
      />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Purchase Bills</h1>
          <p className="page-header__sub">
            Track your vendor purchases and expenses
          </p>
        </div>
        <Button variant="primary" onClick={() => setView('create')}>
          + New Purchase Bill
        </Button>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Total Purchases"
          value={formatCurrency(totalPurchases)}
          icon="📦"
          color="cyan"
          sub={`${purchaseBills.length} bills`}
        />
      </div>

      <DateRangeFilter
        filter={filter}
        dateRange={dateRange}
        onFilterChange={setFilter}
        onDateChange={setDateRange}
        onApply={applyFilter}
        onClear={clearFilter}
      />

      <div className="search-bar" style={{ maxWidth: 400 }}>
        <span className="search-bar__icon">🔍</span>
        <input
          placeholder="Search by party or bill no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No purchase bills found"
          action={
            <Button variant="primary" onClick={() => setView('create')}>
              + New Bill
            </Button>
          }
        />
      ) : (
        <div className="table-wrapper">
          <div className="table-desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((bill, i) => (
                  <tr key={bill.id || bill._id}>
                    <td
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 'var(--fs-xs)',
                      }}
                    >
                      {from + i}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color: 'var(--primary)',
                        fontFamily: 'monospace',
                        fontSize: 'var(--fs-xs)',
                      }}
                    >
                      {bill.invoiceNumber}
                    </td>
                    <td>{formatDate(bill.purchaseDate)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {bill.Party?.name || '—'}
                    </td>
                    <td className="text-right" style={{ fontWeight: 700 }}>
                      {formatCurrency(bill.totalAmount)}
                    </td>
                    <td>
                      <PaymentBadge status={bill.paymentStatus} />
                    </td>
                    <td className="text-center">
                      <ActionMenu
                        trigger={
                          <Button variant="ghost" size="sm">
                            ⋯
                          </Button>
                        }
                        items={[
                          {
                            label: 'Preview',
                            icon: '👁',
                            onClick: () => {
                              setPreviewBill(bill);
                              setView('preview');
                            },
                          },
                          {
                            label: 'Edit',
                            icon: '✏️',
                            onClick: () => {
                              window.location.hash = `purchase/edit/${bill.id || bill._id}`;
                            },
                          },
                          {
                            label: 'Print',
                            icon: '🖨️',
                            onClick: () => {
                              setPreviewBill(bill);
                              setView('preview');
                            },
                          },
                          {
                            label: 'Delete',
                            icon: '🗑',
                            danger: true,
                            onClick: () => setDeleteId(bill.id || bill._id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="bill-cards-list hide-desktop"
            style={{ padding: 'var(--sp-4)' }}
          >
            {paginated.map((bill) => (
              <div key={bill.id} className="bill-card-mobile">
                <div className="bill-card-mobile__row">
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--primary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {bill.invoiceNumber}
                  </span>
                  <PaymentBadge status={bill.paymentStatus} />
                </div>
                <div className="bill-card-mobile__row">
                  <span>{bill.Party?.name}</span>
                  <span style={{ fontWeight: 700 }}>
                    {formatCurrency(bill.totalAmount)}
                  </span>
                </div>
                <div className="bill-card-mobile__row">
                  <span className="bill-card-mobile__label">
                    {formatDate(bill.purchaseDate)}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setPreviewBill(bill);
                        setView('preview');
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.hash = `purchase/edit/${bill.id || bill._id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger-outline"
                      size="sm"
                      onClick={() => setDeleteId(bill.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            from={from}
            to={to}
            total={total}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  );
}
