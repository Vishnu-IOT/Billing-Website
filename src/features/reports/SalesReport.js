/* ===== SALES REPORT ===== */
import React, { useState, useMemo, useEffect } from 'react';
import { fetchSaleBillsByDateAPI } from '../../api';
import { StatCard, PaymentBadge, Pagination, Button, ToastContainer } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { exportToExcel, buildSalesGSTExportRows } from '../../utils/export';
import { PiMicrosoftExcelLogoFill } from 'react-icons/pi';
import '../../styles/reports.css';

function getInitials(name = '') { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2); }

export default function SalesReport() {
  const toast = useToast();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });
  const [applied, setApplied] = useState({ startDate: '', endDate: '', status: '' });

  useEffect(() => {
    loadData(applied);
  }, [applied]);

  async function loadData(f) {
    setLoading(true);
    try {
      const data = await fetchSaleBillsByDateAPI('', f);
      setBills(Array.isArray(data) ? data : data?.data ?? []);
    } catch { toast.error('Failed to load report data'); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    return bills.filter((b) => !applied.status || b.paymentStatus?.toLowerCase() === applied.status);
  }, [bills, applied.status]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 8);

  const totalTaxable = filtered.reduce((s, b) => s + parseFloat(b.baseRate || 0), 0);
  const totalGST = filtered.reduce((s, b) => s + parseFloat(b.tax || 0), 0);
  const netReceivables = filtered.reduce((s, b) => s + parseFloat(b.totalAmount || 0), 0);
  const pendingDues = filtered.filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid').reduce((s, b) => s + parseFloat(b.totalAmount || 0), 0);

  function handleExport() {
    try {
      exportToExcel(buildSalesGSTExportRows(filtered), 'Sales GST Report', 'GST_Sales_Report');
      toast.success('Excel report generated!');
    } catch { toast.error('No data to export'); }
  }

  return (
    <div className="report-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Sales GST Report</h1>
          <p className="page-header__sub">Detailed tax liability and invoice history</p>
        </div>
        <Button variant="success" onClick={handleExport} icon={<PiMicrosoftExcelLogoFill />}>Export Excel</Button>
      </div>

      <div className="stat-grid">
        <StatCard label="Taxable Value" value={formatCurrency(totalTaxable)} icon="📊" color="blue" />
        <StatCard label="Output GST" value={formatCurrency(totalGST)} icon="🏛" color="cyan" />
        <StatCard label="Net Receivables" value={formatCurrency(netReceivables)} icon="💰" color="green" />
        <StatCard label="Pending Dues" value={formatCurrency(pendingDues)} icon="⚠️" color="amber" />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Start Date</label>
          <input type="date" className="form-input" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div className="filter-group">
          <label className="filter-label">End Date</label>
          <input type="date" className="form-input" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <div className="toggle-group">
            {['', 'paid', 'unpaid'].map((s) => (
              <button key={s} className={`toggle-btn ${filters.status === s ? 'active' : ''}`} onClick={() => setFilters((f) => ({ ...f, status: s }))}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-actions">
          <Button variant="primary" size="sm" onClick={() => setApplied({ ...filters })}>Apply</Button>
          <Button variant="secondary" size="sm" onClick={() => { setFilters({ startDate: '', endDate: '', status: '' }); setApplied({ startDate: '', endDate: '', status: '' }); }}>Clear</Button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>#</th><th>Date</th><th>Invoice No</th><th>Party</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
          <tbody>
            {paginated.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{loading ? 'Loading…' : 'No data found'}</td></tr>
              : paginated.map((b, i) => (
                <tr key={b.id || b._id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{String(from + i).padStart(2, '0')}</td>
                  <td>{formatDate(b.saleDate)}</td>
                  <td className="report-invoice-num">{b.invoiceNumber}</td>
                  <td>
                    <div className="report-party-cell">
                      <span className="report-avatar">{getInitials(b.Party?.name || b.Customer?.name)}</span>
                      <span>{b.Party?.name|| b.Customer?.name}</span>
                    </div>
                  </td>
                  <td className="text-right report-amount">{formatCurrency(b.totalAmount)}</td>
                  <td><PaymentBadge status={b.paymentStatus} /></td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={goToPage} />
      </div>
    </div>
  );
}
