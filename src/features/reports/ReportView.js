/* ===== ReportView — one generic screen that renders any of the 19 reports =====
 * header · export/print · summary cards · filters · search · sortable table ·
 * server-side pagination · loading / empty / error states.
 */
import React, { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, LoadingSpinner, Pagination, SearchBar, StatCard, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { PiMicrosoftExcelLogoFill } from 'react-icons/pi';
import { FiPrinter, FiFileText } from 'react-icons/fi';
import { REPORTS, PRODUCT_DETAIL_COLUMNS } from './reportRegistry';
import { useReportData, PAGE_SIZES } from './useReportData';
import { useReportLookups } from './useReportLookups';
import ReportFilters, { describeFilters } from './ReportFilters';
import { displayValue, isNumericCol, summaryDisplay, rawValue } from '../../utils/reportFormat';
import { exportReportExcel, exportReportPDF, printReport } from '../../utils/reportExport';
import '../../styles/reports.css';
import '../../styles/ReportView.css';

const STATUS_VARIANT = {
  Paid: 'paid', Unpaid: 'unpaid', Partial: 'partial', Overdue: 'danger', Cancelled: 'neutral',
  'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'danger', 'Negative Stock': 'danger',
};

function Cell({ col, row }) {
  const v = rawValue(col, row);
  if ((col.type === 'status' || col.type === 'stock') && v) return <Badge variant={STATUS_VARIANT[v] || 'neutral'}>{v}</Badge>;
  if (col.type === 'badge' && v) return <Badge variant="neutral">{v}</Badge>;
  const text = displayValue(col, row);
  if (col.type === 'mono') return <span className="report-invoice-num">{text}</span>;
  if (isNumericCol(col)) return <span className="report-amount">{text}</span>;
  return text;
}

function MiniTable({ columns, rows }) {
  return (
    <div className="table-wrapper rv-mini">
      <table className="data-table">
        <thead><tr>{columns.map((c) => <th key={c.key} className={isNumericCol(c) ? 'text-right' : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{columns.map((c) => <td key={c.key} data-label={c.label} className={isNumericCol(c) ? 'text-right' : ''}><Cell col={c} row={r} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportView({ reportKey }) {
  const def = REPORTS[reportKey];
  const toast = useToast();
  const d = useReportData(def);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState({});

  const seenModes = useMemo(
    () => [...new Set(d.rows.flatMap((r) => (r.paymentModes ? String(r.paymentModes).split(', ') : [])))],
    [d.rows]
  );
  const lookups = useReportLookups({ needUsers: def.filters.includes('user'), seenPaymentModes: seenModes });

  const { rows, columns, summary, pagination, sort } = d;
  const total = pagination?.total ?? rows.length;
  const pageNo = pagination?.page ?? d.page;
  const pageSize = pagination?.limit ?? d.limit;
  const from = total ? (pageNo - 1) * pageSize + 1 : 0;
  const to = Math.min(pageNo * pageSize, total);

  async function runExport(kind) {
    setBusy(kind);
    try {
      const res = await d.fetchAll(); // every page of the current filtered set
      const all = res.data || [];
      if (!all.length) { toast.error('Nothing to export'); return; }
      const common = {
        title: def.label,
        subtitle: def.subtitle,
        columns,
        rows: all,
        summary: res.summary || summary,
        summaryCards: def.summary,
        filterLines: describeFilters(def, d.applied, lookups, d.searchText.trim()),
      };
      if (kind === 'excel') {
        const detailRows = def.expandable
          ? all.flatMap((r) => (r.products || []).map((p) => ({ ...p, __parent: rawValue(columns[0], r) })))
          : [];
        exportReportExcel({
          ...common,
          detail: detailRows.length ? { rows: detailRows, columns: PRODUCT_DETAIL_COLUMNS, parentLabel: columns[0].label } : null,
        });
        toast.success(`Excel exported (${all.length} rows)`);
      } else if (kind === 'pdf') {
        exportReportPDF(common);
        toast.success(`PDF exported (${all.length} rows)`);
      } else {
        printReport(common);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Export failed');
    } finally {
      setBusy('');
    }
  }

  const sorted = (col) => (col.sort && sort.sortBy === col.sort ? sort.sortOrder : null);
  const canExpand = def.expandable && rows.some((r) => r.products?.length);

  return (
    <div className="report-page rv-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>{def.label}</h1>
          <p className="page-header__sub">{def.subtitle}</p>
        </div>
        <div className="rv-actions">
          <Button variant="secondary" size="sm" icon={<FiPrinter />} loading={busy === 'print'} onClick={() => runExport('print')}>Print</Button>
          <Button variant="secondary" size="sm" icon={<FiFileText />} loading={busy === 'pdf'} onClick={() => runExport('pdf')}>PDF</Button>
          <Button variant="success" size="sm" icon={<PiMicrosoftExcelLogoFill />} loading={busy === 'excel'} onClick={() => runExport('excel')}>Excel</Button>
        </div>
      </div>

      {summary && !d.error && (
        <div className="stat-grid rv-stats">
          {def.summary.filter((c) => summary[c.key] !== undefined && summary[c.key] !== null).map((c) => (
            <StatCard key={c.key} label={c.label} value={summaryDisplay(c, summary[c.key])} icon={c.icon} color={c.color} />
          ))}
        </div>
      )}

      <ReportFilters def={def} draft={d.draft} patchDraft={d.patchDraft} lookups={lookups} onApply={d.applyFilters} onReset={d.resetFilters} loading={d.loading} />

      {d.party && (
        <div className="rv-party">
          <strong>{d.party.name}</strong>
          {d.party.partyType && <Badge variant="neutral">{d.party.partyType}</Badge>}
          {d.party.GST && <span className="report-invoice-num">{d.party.GST}</span>}
          {d.party.phone && <span>{d.party.phone}</span>}
          {d.party.email && <span>{d.party.email}</span>}
        </div>
      )}

      {def.breakdowns && summary && def.breakdowns.map((b) => (summary[b.key]?.length ? (
        <div key={b.key} className="rv-breakdown">
          <div className="rv-breakdown__title">{b.title}</div>
          <MiniTable columns={b.cols} rows={summary[b.key]} />
        </div>
      ) : null))}

      {!def.noSearch && !d.missingRequired.length && (
        <div className="rv-toolbar">
          <SearchBar value={d.searchText} onChange={d.changeSearch} placeholder={def.searchPlaceholder || 'Search…'} className="rv-search" />
          <div className="rv-pagesize">
            <label className="filter-label" htmlFor="rv-pagesize">Rows</label>
            <select id="rv-pagesize" className="form-select" value={d.limit} onChange={(e) => d.changeLimit(Number(e.target.value))}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      )}

      {d.missingRequired.length > 0 ? (
        <EmptyState icon="👤" title="Select a party" description={def.requiresMessage || 'Choose a filter above to run this report.'} />
      ) : d.error ? (
        <div className="rv-error" role="alert">
          <div className="rv-error__icon">⚠️</div>
          <div className="rv-error__msg">{d.error}</div>
          <Button variant="primary" size="sm" onClick={d.reload}>Retry</Button>
        </div>
      ) : d.loading && !rows.length ? (
        <LoadingSpinner message="Loading report…" />
      ) : !rows.length ? (
        <EmptyState icon="📊" title="No data found" description="No records match the selected filters. Try widening the date range or resetting the filters." />
      ) : (
        <div className={`table-wrapper rv-table-wrap ${d.loading ? 'rv-loading' : ''}`}>
          <table className="data-table rv-table">
            <thead>
              <tr>
                {canExpand && <th className="rv-expand-col" />}
                {columns.map((col) => {
                  const dir = sorted(col);
                  return (
                    <th
                      key={col.key}
                      className={`${isNumericCol(col) ? 'text-right' : ''} ${col.sort ? 'rv-sortable' : ''}`}
                      aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      onClick={col.sort ? () => d.toggleSort(col.sort) : undefined}
                    >
                      {col.label}
                      {col.sort && <span className={`rv-sort ${dir ? 'rv-sort--on' : ''}`}>{dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const key = def.rowKey ? def.rowKey(row, i) : i;
                const hasKids = def.expandable && row.products?.length;
                const isOpen = !!open[key];
                return (
                  <React.Fragment key={key}>
                    <tr>
                      {canExpand && (
                        <td className="rv-expand-col">
                          {hasKids && (
                            <button type="button" className="rv-expand" aria-expanded={isOpen} aria-label="Toggle products" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}>
                              {isOpen ? '▾' : '▸'}
                            </button>
                          )}
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} data-label={col.label} className={isNumericCol(col) ? 'text-right' : ''}><Cell col={col} row={row} /></td>
                      ))}
                    </tr>
                    {hasKids && isOpen && (
                      <tr className="rv-detail-row">
                        <td colSpan={columns.length + 1}><MiniTable columns={PRODUCT_DETAIL_COLUMNS} rows={row.products} /></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!d.error && rows.length > 0 && (
        <Pagination page={pageNo} totalPages={pagination?.totalPages || 1} from={from} to={to} total={total} onPageChange={(p) => d.setPage(Math.max(1, Math.min(p, pagination?.totalPages || 1)))} />
      )}
      {def.note && <p className="rv-note">{def.note}</p>}
    </div>
  );
}
