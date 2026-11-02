/* ===== GSTR-3B REPORT ===== */
import React, { useState, useEffect } from 'react';
import { fetchGSTR3BReportAPI } from '../../api';
import useAppStore from '../../store/appStore';
import { StatCard, Button, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { exportToExcel } from '../../utils/export';
import { PiMicrosoftExcelLogoFill } from 'react-icons/pi';
import '../../styles/reports.css';

export default function GSTR3BReport() {
  const toast = useToast();
  const now = new Date();
  // local-date formatting (toISOString shifts the day for timezones ahead of UTC)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const firstOfMonth = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = iso(now);
  const parties = useAppStore((s) => s.parties);

  const [report, setReport] = useState({ summary: {}, sections: [] });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ fromDate: firstOfMonth, toDate: today, partyId: '' });

  // initial load only — after that, reports reload when Apply is clicked
  useEffect(() => {
    loadReport(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadReport(f) {
    setLoading(true);
    try {
      const data = await fetchGSTR3BReportAPI({ fromDate: f.fromDate, toDate: f.toDate, ...(f.partyId ? { partyId: f.partyId } : {}) });
      setReport(data?.data ?? data ?? { summary: {}, sections: [] });
    } catch {
      toast.error('Failed to load GSTR-3B data');
    } finally {
      setLoading(false);
    }
  }

  const s = report.summary || {};

  function handleExport() {
    const rows = [
      { Section: '3.1 Outward taxable supplies', IGST: s.outwardIgst, CGST: s.outwardCgst, SGST: s.outwardSgst },
      { Section: '4. Eligible ITC', IGST: s.itcIgst, CGST: s.itcCgst, SGST: s.itcSgst },
      { Section: '6.1 Tax payable', IGST: s.payableIgst, CGST: s.payableCgst, SGST: s.payableSgst },
    ];
    try {
      exportToExcel(rows, 'GSTR-3B', `GSTR3B_${filters.fromDate}_to_${filters.toDate}`);
      toast.success('GSTR-3B exported');
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="report-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>GSTR-3B Report</h1>
          <p className="page-header__sub">Monthly summary return — tax liability & ITC</p>
        </div>
        <Button variant="success" onClick={handleExport} icon={<PiMicrosoftExcelLogoFill />}>
          Export Excel
        </Button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">From Date</label>
          <input
            type="date"
            className="form-input"
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">To Date</label>
          <input
            type="date"
            className="form-input"
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Party</label>
          <select
            className="form-input"
            value={filters.partyId}
            onChange={(e) => setFilters((f) => ({ ...f, partyId: e.target.value }))}
          >
            <option value="">All Parties</option>
            {parties.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
            ))}
          </select>
        </div>
        <Button variant="primary" onClick={() => loadReport(filters)} loading={loading}>
          Apply
        </Button>
      </div>

      <div className="stat-grid">
        <StatCard label="Outward Taxable" value={formatCurrency(s.outwardTaxable || 0)} icon="📤" color="blue" />
        <StatCard label="Input Tax Credit" value={formatCurrency(s.totalItc || 0)} icon="📥" color="green" />
        <StatCard label="Net Tax Payable" value={formatCurrency(s.netPayable || 0)} icon="💰" color="amber" />
        <StatCard label="Interest & Late Fee" value={formatCurrency(s.interest || 0)} icon="⚠️" color="danger" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {/* Table 3.1 — Outward Supplies */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">3.1 — Details of Outward Supplies & Inward Supplies Subject to Reverse Charge</span>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading section 3.1…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>Nature of Supply</th>
                      <th className="text-right">Total Taxable Value</th>
                      <th className="text-right">Integrated Tax (IGST)</th>
                      <th className="text-right">Central Tax (CGST)</th>
                      <th className="text-right">State/UT Tax (SGST)</th>
                      <th className="text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>(a) Outward taxable supplies</strong> (other than zero rated, nil rated)</td>
                      <td className="text-right" style={{ fontWeight: 600 }}>{formatCurrency(s.outwardTaxable || 0)}</td>
                      <td className="text-right">{formatCurrency(s.outwardIgst || 0)}</td>
                      <td className="text-right">{formatCurrency(s.outwardCgst || 0)}</td>
                      <td className="text-right">{formatCurrency(s.outwardSgst || 0)}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>
                        {formatCurrency(Number(s.outwardIgst || 0) + Number(s.outwardCgst || 0) + Number(s.outwardSgst || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Table 4 — Eligible ITC */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">4 — Eligible Input Tax Credit (ITC)</span>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading section 4…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>Details</th>
                      <th className="text-right">Integrated Tax (IGST)</th>
                      <th className="text-right">Central Tax (CGST)</th>
                      <th className="text-right">State/UT Tax (SGST)</th>
                      <th className="text-right">Total ITC Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>(A) ITC Available</strong> (All other ITC from Purchases)</td>
                      <td className="text-right">{formatCurrency(s.itcIgst || 0)}</td>
                      <td className="text-right">{formatCurrency(s.itcCgst || 0)}</td>
                      <td className="text-right">{formatCurrency(s.itcSgst || 0)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(s.totalItc || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Table 6.1 — Payment of Tax */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">6.1 — Payment of Tax (Tax Liability Offset & Cash Payable)</span>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading section 6.1…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>Tax Head</th>
                      <th className="text-right">Total Tax Liability</th>
                      <th className="text-right">Paid Through ITC</th>
                      <th className="text-right">Net Tax Payable (Cash)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Integrated Tax (IGST)</strong></td>
                      <td className="text-right">{formatCurrency(s.outwardIgst || 0)}</td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>{formatCurrency(s.itcIgst || 0)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: s.payableIgst > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatCurrency(s.payableIgst || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Central Tax (CGST)</strong></td>
                      <td className="text-right">{formatCurrency(s.outwardCgst || 0)}</td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>{formatCurrency(s.itcCgst || 0)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: s.payableCgst > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatCurrency(s.payableCgst || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>State/UT Tax (SGST)</strong></td>
                      <td className="text-right">{formatCurrency(s.outwardSgst || 0)}</td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>{formatCurrency(s.itcSgst || 0)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: s.payableSgst > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatCurrency(s.payableSgst || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
