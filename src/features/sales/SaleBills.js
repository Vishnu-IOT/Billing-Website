/* ===== SALE BILLS — List View ===== */
import React, { useState, useMemo, useEffect } from 'react';
import useSalesStore from '../../store/salesStore';
import useUIStore from '../../store/uiStore';
import {
  Button,
  EmptyState,
  PaymentBadge,
  Pagination,
  ConfirmModal,
  ActionMenu,
  StatCard,
} from '../../components/ui';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { ToastContainer } from '../../components/ui';
import SaleBillForm from './SaleBillForm';
import BillPreview from '../billing/BillPreview';
import '../../styles/bills.css';

export default function SaleBills({ searchParams }) {
  const {
    saleBills,
    filter,
    dateRange,
    loadBills,
    deleteBill,
    setFilter,
    setDateRange,
  } = useSalesStore();
  const toast = useToast();

  const [view, setView] = useState('list'); // list | create | preview | edit
  const [previewBill, setPreviewBill] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [billingType, setBillingType] = useState('B2C');
  const [billID, setBillID] = useState(null);

  const setHideSidebar = useUIStore((s) => s.setHideSidebar);

  useEffect(() => {
    setHideSidebar(view !== 'list');

    return () => setHideSidebar(false);
  }, [view]);

  /* Handle searchParams from Sidebar sub-menu */
  useEffect(() => {
    if (!searchParams) return;
    const type = searchParams.get('type');
    if (type === 'B2B' || type === 'B2C') {
      setBillingType(type);
      setView('create');
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return saleBills.filter(
      (b) =>
        !q ||
        b.Party?.name?.toLowerCase().includes(q) ||
        b.invoiceNumber?.toLowerCase().includes(q)
    );
  }, [saleBills, search]);

  const { page, totalPages, paginated, from, to, total, goToPage } =
    usePagination(filtered, 10);

  const totalSales = saleBills.reduce(
    (s, b) => s + (parseInt(b.totalAmount) || 0),
    0
  );
  const unpaidCount = saleBills.filter(
    (b) => b.paymentStatus?.toLowerCase() === 'unpaid'
  ).length;

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
      toast.success('Invoice deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  }

  if (view === 'preview' && previewBill) {
    return (
      <BillPreview
        bill={previewBill}
        billType="SALE"
        onBack={() => setView('list')}
      />
    );
  }
  if (view === 'create') {
    return (
      <SaleBillForm
        billingType={billingType}
        onBack={() => setView('list')}
        onSaved={() => {
          setView('list');
          loadBills();
        }}
      />
    );
  }
  if (view === 'edit') {
    return (
      <SaleBillForm
        billingType={billingType}
        editMode={true}
        billId={billID}
        onBack={() => setView('list')}
        onSaved={() => {
          setView('list');
          loadBills();
        }}
      />
    );
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}
    >
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Invoice?"
        message="This action cannot be undone."
      />

      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <h1>Sale Invoices</h1>
          <p className="page-header__sub">Manage your B2B and B2C sales</p>
        </div>
        <div className="page-header__actions">
          <Button
            variant="outline"
            onClick={() => {
              setBillingType('B2B');
              setView('create');
            }}
          >
            + B2B Invoice
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setBillingType('B2C');
              setView('create');
            }}
          >
            + B2C Invoice
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter
        filter={filter}
        dateRange={dateRange}
        onFilterChange={setFilter}
        onDateChange={setDateRange}
        onApply={applyFilter}
        onClear={clearFilter}
      />

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          label="Total Sales"
          value={formatCurrency(totalSales)}
          icon="📊"
          color="blue"
          sub={`${saleBills.length} invoices`}
        />
        <StatCard
          label="Pending"
          value={`${unpaidCount}`}
          icon="⏳"
          color="amber"
          sub="Unpaid invoices"
        />
      </div>

      {/* Search */}
      <div
        style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}
      >
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar__icon">🔍</span>
          <input
            placeholder="Search by party or invoice no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No invoices found"
          description="Try adjusting the date filter or create a new invoice."
          action={
            <Button variant="primary" onClick={() => setView('create')}>
              + New Invoice
            </Button>
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Desktop */}
          <div className="table-desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Type</th>
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
                    <td>{formatDate(bill.saleDate)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {bill.Party?.name || bill.Customer?.name || '-'}
                    </td>
                    <td>
                      <span className="badge badge--sale">
                        {bill.bill_type || 'B2C'}
                      </span>
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
                            label: 'Print',
                            icon: '🖨️',
                            onClick: () => {
                              setPreviewBill(bill);
                              setView('preview');
                            },
                          },
                          {
                            label: 'Edit',
                            icon: '✏️',
                            onClick: () => {
                              setView('edit');
                              setBillID(bill.id || bill._id);
                              setBillingType(bill.bill_type);
                              // window.location.hash = `sales/edit/${bill.id || bill._id}?type=${bill.bill_type || 'B2C'}`;
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

          {/* Mobile cards */}
          <div
            className="bill-cards-list"
            style={{ padding: 'var(--sp-4)', display: 'none' }}
            id="mobile-bills"
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
                  <span className="bill-card-mobile__label">
                    {bill.Party?.name}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {formatCurrency(bill.totalAmount)}
                  </span>
                </div>
                <div className="bill-card-mobile__row">
                  <span className="bill-card-mobile__label">
                    {formatDate(bill.saleDate)}
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
                      onClick={() => {
                        setView('edit');
                        setBillID(bill.id || bill._id);
                        setBillingType(bill.bill_type);
                        // window.location.hash = `sales/edit/${bill.id || bill._id}?type=${bill.bill_type || 'B2C'}`;
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger-outline"
                      size="sm"
                      onClick={() => setDeleteId(bill.id || bill._id)}
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

      <style>{`@media(max-width:767px){.table-desktop-only{display:none!important}#mobile-bills{display:flex!important;flex-direction:column}}`}</style>
    </div>
  );
}
