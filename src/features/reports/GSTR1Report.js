/* ===== GSTR-1 REPORT ===== */
import React, { useState, useEffect, useMemo } from 'react';
import { fetchGSTR1ReportAPI } from '../../api';
import { StatCard, Button, Pagination, ToastContainer } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { exportToExcel } from '../../utils/export';
import { PiMicrosoftExcelLogoFill } from 'react-icons/pi';
import '../../styles/reports.css';

export default function GSTR1Report() {
  const toast = useToast();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [report, setReport] = useState({ sections: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(currentMonth);

  useEffect(() => {
    loadReport(period);
  }, [period]);

  async function loadReport(p) {
    setLoading(true);
    try {
      const data = await fetchGSTR1ReportAPI({ period: p });
      setReport(data?.data ?? data ?? { sections: [], summary: {} });
    } catch {
      toast.error('Failed to load GSTR-1 data');
    } finally {
      setLoading(false);
    }
  }

  const b2bRows = useMemo(() => {
    if (report.b2b?.rows) return report.b2b.rows;
    const section = report.sections?.find((s) => s.key === 'b2b') || [];
    return Array.isArray(section) ? section : section.rows || [];
  }, [report]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(b2bRows, 10);

  const summary = report.summary || {};

  function handleExport() {
    try {
      const rows = b2bRows.map((r) => ({
        GSTIN: r.gstin || r.partyGstin,
        'Invoice No': r.invoiceNumber,
        Date: r.invoiceDate,
        'Taxable Value': r.taxableValue,
        'IGST': r.igst,
        'CGST': r.cgst,
        'SGST': r.sgst,
      }));
      exportToExcel(rows, 'GSTR-1', `GSTR1_${period}`);
      toast.success('GSTR-1 exported');
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="report-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>GSTR-1 Report</h1>
          <p className="page-header__sub">Outward supplies — B2B, B2C, exports & credit/debit notes</p>
        </div>
        <Button variant="success" onClick={handleExport} icon={<PiMicrosoftExcelLogoFill />}>
          Export Excel
        </Button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Return Period</label>
          <input
            type="month"
            className="form-input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={() => loadReport(period)} loading={loading}>
          Apply
        </Button>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Total Taxable"
          value={formatCurrency(summary.totalTaxable || 0)}
          icon="📊"
          color="blue"
        />
        <StatCard label="Output IGST" value={formatCurrency(summary.igst || 0)} icon="🏛" color="cyan" />
        <StatCard label="Output CGST" value={formatCurrency(summary.cgst || 0)} icon="🏛" color="green" />
        <StatCard label="Output SGST" value={formatCurrency(summary.sgst || 0)} icon="🏛" color="amber" />
        <StatCard label="Total Invoices" value={summary.totalInvoices || 0} icon="📄" color="purple" />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card__title">Table 4 — B2B Outward Supplies</span>
          <span className="badge badge--primary">{b2bRows.length} Invoices</span>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading B2B invoice data…</div>
          ) : b2bRows.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No B2B outward supplies recorded for this return period.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>GSTIN</th>
                      <th>Party Name</th>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th className="text-right">Taxable Value</th>
                      <th className="text-right">IGST</th>
                      <th className="text-right">CGST</th>
                      <th className="text-right">SGST</th>
                      <th className="text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => (
                      <tr key={r.id || r.invoiceNumber || i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{String(from + i).padStart(2, '0')}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{r.gstin || r.partyGstin || '—'}</td>
                        <td>{r.partyName || r.Party?.name || 'B2B Client'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{r.invoiceNumber}</td>
                        <td>{r.invoiceDate}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(r.taxableValue || 0)}</td>
                        <td className="text-right">{formatCurrency(r.igst || 0)}</td>
                        <td className="text-right">{formatCurrency(r.cgst || 0)}</td>
                        <td className="text-right">{formatCurrency(r.sgst || 0)}</td>
                        <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency(r.totalValue || (Number(r.taxableValue || 0) + Number(r.igst || 0) + Number(r.cgst || 0) + Number(r.sgst || 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  from={from}
                  to={to}
                  total={total}
                  onPageChange={goToPage}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {report.b2c && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__header">
            <span className="card__title">Table 7 — B2C Small Outward Supplies</span>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="bills-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="text-center">No. of Invoices</th>
                    <th className="text-right">Taxable Value</th>
                    <th className="text-right">Output IGST</th>
                    <th className="text-right">Output CGST</th>
                    <th className="text-right">Output SGST</th>
                    <th className="text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>B2C Small Supplies</strong></td>
                    <td className="text-center"><span className="badge badge--neutral">{report.b2c.count || 0}</span></td>
                    <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(report.b2c.taxableValue || 0)}</td>
                    <td className="text-right">{formatCurrency(report.b2c.igst || 0)}</td>
                    <td className="text-right">{formatCurrency(report.b2c.cgst || 0)}</td>
                    <td className="text-right">{formatCurrency(report.b2c.sgst || 0)}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>
                      {formatCurrency(Number(report.b2c.igst || 0) + Number(report.b2c.cgst || 0) + Number(report.b2c.sgst || 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {report.hsn && report.hsn.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__header">
            <span className="card__title">Table 12 — HSN Code Summary of Outward Supplies</span>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="bills-table">
                <thead>
                  <tr>
                    <th>HSN Code</th>
                    <th>Description</th>
                    <th className="text-right">Total Quantity</th>
                    <th className="text-right">Taxable Value</th>
                    <th className="text-right">IGST</th>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                    <th className="text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {report.hsn.map((h, i) => {
                    const itemTax = Number(h.igst || 0) + Number(h.cgst || 0) + Number(h.sgst || 0);
                    return (
                      <tr key={h.hsnCode || i}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{h.hsnCode || '—'}</td>
                        <td>{h.description || 'General Item'}</td>
                        <td className="text-right" style={{ fontWeight: 500 }}>{h.quantity}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(h.taxableValue || 0)}</td>
                        <td className="text-right">{formatCurrency(h.igst || 0)}</td>
                        <td className="text-right">{formatCurrency(h.cgst || 0)}</td>
                        <td className="text-right">{formatCurrency(h.sgst || 0)}</td>
                        <td className="text-right" style={{ fontWeight: 700 }}>{formatCurrency(itemTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
