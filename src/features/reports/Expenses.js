/* ===== EXPENSES DASHBOARD ===== */
import React, { useState, useEffect, useMemo } from 'react';
import useExpensesStore from '../../store/expensesStore';
import { Button, ToastContainer, Pagination, ConfirmModal } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { FiPlus, FiTrendingDown, FiTag, FiTrash2 } from 'react-icons/fi';
import '../../styles/reports.css';

export default function Expenses() {
  const { expenses, loading, loadExpenses, addExpense, deleteExpense } = useExpensesStore();
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [form, setForm] = useState({
    name: '',
    category: 'Rent',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        (e.name || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === 'ALL' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, debouncedSearch, selectedCategory]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(
    filteredExpenses,
    10
  );

  const totalMonthlySpend = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) {
      toast.error('All required fields must be filled');
      return;
    }
    try {
      await addExpense({
        name: form.name,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
      });
      setShowModal(false);
      setForm({
        name: '',
        category: 'Rent',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      toast.success('Expense recorded successfully ✓');
    } catch {
      toast.error('Failed to record expense');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense(deleteId);
      toast.success('Expense deleted ✓');
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Record?"
        message="This expenditure record will be permanently removed."
      />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Expenses Log</h1>
          <p className="page-header__sub">Track and categorize company expenditures</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)} icon={<FiPlus />}>
          Record Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--sp-4)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--sp-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              background: 'var(--danger-light)',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
            }}
          >
            <FiTrendingDown style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOTAL SPEND
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatCurrency(totalMonthlySpend)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--sp-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              background: 'var(--primary-light)',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
            }}
          >
            <FiTag style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
              LOGGED ITEMS
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {expenses.length}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bills-toolbar">
        <input
          className="form-input bills-search"
          placeholder="Search expenses by description or category…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            goToPage(1);
          }}
          style={{ maxWidth: 320 }}
        />
        <select
          className="form-input"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            goToPage(1);
          }}
          style={{ maxWidth: 180 }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Categories' : c}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bills-table-wrap">
        <table className="bills-table">
          <thead>
            <tr>
              <th>Expense Detail</th>
              <th>Category</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((exp) => (
              <tr key={exp.id || exp._id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.name}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    ID: {exp.id || exp._id}
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 'var(--fs-xs)',
                      background: 'var(--bg-hover)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {exp.category}
                  </span>
                </td>
                <td>{formatDate(exp.date)}</td>
                <td>
                  <span
                    style={{
                      fontSize: 'var(--fs-xs)',
                      background: 'var(--success-light)',
                      color: 'var(--success)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {exp.status || 'Paid'}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: 'var(--danger)',
                    fontSize: 'var(--fs-md)',
                  }}
                >
                  {formatCurrency(exp.amount || 0)}
                </td>
                <td>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() => setDeleteId(exp.id || exp._id)}
                  >
                    <FiTrash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        from={from}
        to={to}
        total={total}
        onPageChange={goToPage}
      />

      {/* Modal Dialog */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              width: '420px',
              padding: 'var(--sp-5)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 'var(--fs-lg)',
                color: 'var(--text-primary)',
              }}
            >
              Record New Expense
            </h3>

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Description *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Monthly electricity bill"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Category
                </label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Salaries">Salaries</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  min="1"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                  marginTop: '10px',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
