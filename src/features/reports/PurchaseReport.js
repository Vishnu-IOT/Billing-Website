/* ===== PURCHASE REPORT ===== */
import React, { useState, useMemo, useEffect } from 'react';
import { fetchPurchaseBillsByDateAPI } from '../../api';
import { StatCard, PaymentBadge, Pagination, Button, ToastContainer } from '../../components/ui';
import { usePagination }  from '../../hooks/usePagination';
import { useToast }       from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate }     from '../../utils/date';
import { exportToExcel, buildPurchaseExportRows } from '../../utils/export';
import { PiMicrosoftExcelLogoFill } from 'react-icons/pi';
import '../../styles/reports.css';

function getInitials(name = '') { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2); }

export default function PurchaseReport() {
  const toast = useToast();
  const [bills, setBills]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });
  const [applied, setApplied] = useState({ startDate: '', endDate: '', status: '' });

  useEffect(() => { loadData(applied); }, [applied]);

  async function loadData(f) {
    setLoading(true);
    try {
      const data = await fetchPurchaseBillsByDateAPI('', f);
      setBills(Array.isArray(data) ? data : data?.data ?? []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() =>
    bills.filter((b) => !applied.status || b.paymentStatus?.toLowerCase() === applied.status),
  [bills, applied.status]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 8);

  const totalTaxable    = filtered.reduce((s, b) => s + parseFloat(b.baseRate || 0), 0);
  const totalGST        = filtered.reduce((s, b) => s + parseFloat(b.tax || 0), 0);
  const netPayables     = filtered.reduce((s, b) => s + parseFloat(b.totalAmount || 0), 0);
  const pendingPayables = filtered.filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid').reduce((s, b) => s + parseFloat(b.totalAmount || 0), 0);

  function handleExport() {
    try { exportToExcel(buildPurchaseExportRows(filtered), 'Purchase Report', 'Purchase_Report'); toast.success('Excel exported!'); }
    catch { toast.error('No data to export'); }
  }

  return (
    <div className="report-page">
      <ToastContainer toasts={toast.toasts} />
      <div className="page-header">
        <div className="page-header__left">
          <h1>Purchase Report</h1>
          <p className="page-header__sub">Vendor purchase history and tax credits</p>
        </div>
        <Button variant="success" onClick={handleExport} icon={<PiMicrosoftExcelLogoFill />}>Export Excel</Button>
      </div>

      <div className="stat-grid">
        <StatCard label="Taxable Value" value={formatCurrency(totalTaxable)} icon="📊" color="blue" />
        <StatCard label="Input GST"     value={formatCurrency(totalGST)}     icon="🏛" color="cyan" />
        <StatCard label="Net Payables"  value={formatCurrency(netPayables)}   icon="💸" color="amber" />
        <StatCard label="Pending"       value={formatCurrency(pendingPayables)} icon="⚠️" color="red" />
      </div>

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
          <thead><tr><th>#</th><th>Date</th><th>Bill No</th><th>Vendor</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
          <tbody>
            {paginated.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{loading ? 'Loading…' : 'No data'}</td></tr>
              : paginated.map((b, i) => (
                <tr key={b.id || b._id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{String(from + i).padStart(2, '0')}</td>
                  <td>{formatDate(b.purchaseDate)}</td>
                  <td className="report-invoice-num">{b.invoiceNumber}</td>
                  <td>
                    <div className="report-party-cell">
                      <span className="report-avatar">{getInitials(b.Party?.name)}</span>
                      <span>{b.Party?.name}</span>
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
