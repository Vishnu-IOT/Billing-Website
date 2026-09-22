/* ===== ANALYTICAL REPORTS — Sales/Purchase/Party/Stock/GST report defs ===== */
import React, { useState, useEffect, useCallback } from 'react';
import useAppStore from '../../store/appStore';
import { Button, EmptyState, LoadingSpinner } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import {
  fetchSalesByPartyAPI,
  fetchSalesByUserAPI,
  fetchSalesByItemAPI,
  fetchItemSalesByUserAPI,
  fetchStockSummaryAPI,
  fetchGst2ReportAPI,
  fetchPartyOutstandingAPI,
  fetchCustomerStatementAPI,
  fetchPurchaseByPartyAPI,
  fetchPurchaseByItemAPI,
} from '../../api';

// Each report: how to fetch it, which columns to render, and whether it
// needs the date-range filter bar / a party picker (customer statement only).
// Exported so ReportsHub.js can list these individually in its sidebar.
export const REPORT_DEFS = {
  salesByParty: {
    label: 'Sales by Party',
    group: 'Sales',
    fetch: fetchSalesByPartyAPI,
    needsDateRange: true,
    columns: [
      { key: 'partyName', label: 'Party' },
      { key: 'invoiceCount', label: 'Invoices' },
      { key: 'totalSales', label: 'Total Sales', currency: true },
      { key: 'totalPaid', label: 'Paid', currency: true },
      { key: 'outstanding', label: 'Outstanding', currency: true },
    ],
  },
  salesByUser: {
    label: 'Sales by User',
    group: 'Sales',
    fetch: fetchSalesByUserAPI,
    needsDateRange: true,
    columns: [
      { key: 'userName', label: 'User' },
      { key: 'invoiceCount', label: 'Invoices' },
      { key: 'totalSales', label: 'Total Sales', currency: true },
    ],
  },
  salesByItem: {
    label: 'Sales by Item',
    group: 'Sales',
    fetch: fetchSalesByItemAPI,
    needsDateRange: true,
    columns: [
      { key: 'productName', label: 'Product' },
      { key: 'totalQuantity', label: 'Qty Sold' },
      { key: 'invoiceCount', label: 'Invoices' },
      { key: 'totalSales', label: 'Total Sales', currency: true },
    ],
  },
  itemSalesByUser: {
    label: 'Item Sales by User',
    group: 'Sales',
    fetch: fetchItemSalesByUserAPI,
    needsDateRange: true,
    columns: [
      { key: 'userName', label: 'User' },
      { key: 'productName', label: 'Product' },
      { key: 'totalQuantity', label: 'Qty Sold' },
      { key: 'totalSales', label: 'Total Sales', currency: true },
    ],
  },
  purchaseByParty: {
    label: 'Purchase by Party',
    group: 'Purchase',
    fetch: fetchPurchaseByPartyAPI,
    needsDateRange: true,
    columns: [
      { key: 'partyName', label: 'Vendor' },
      { key: 'billCount', label: 'Bills' },
      { key: 'totalPurchases', label: 'Total Purchases', currency: true },
    ],
  },
  purchaseByItem: {
    label: 'Purchase by Item',
    group: 'Purchase',
    fetch: fetchPurchaseByItemAPI,
    needsDateRange: true,
    columns: [
      { key: 'productName', label: 'Product' },
      { key: 'totalQuantity', label: 'Qty Purchased' },
      { key: 'billCount', label: 'Bills' },
      { key: 'totalPurchases', label: 'Total Purchases', currency: true },
    ],
  },
  stockSummary: {
    label: 'Stock Summary',
    group: 'Inventory',
    fetch: fetchStockSummaryAPI,
    needsDateRange: false,
    columns: [
      { key: 'name', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'stockQuantity', label: 'Qty' },
      { key: 'stockStatus', label: 'Status' },
      { key: 'stockValueAtCost', label: 'Value (Cost)', currency: true },
      { key: 'stockValueAtSale', label: 'Value (Sale)', currency: true },
    ],
  },
  gst2: {
    label: 'GST-2 (Purchase Tax Summary)',
    group: 'GST',
    fetch: fetchGst2ReportAPI,
    needsDateRange: true,
    columns: [
      { key: 'taxRate', label: 'Tax Rate %' },
      { key: 'billCount', label: 'Bills' },
      { key: 'taxableValue', label: 'Taxable Value', currency: true },
      { key: 'taxAmount', label: 'Tax Amount', currency: true },
      { key: 'totalValue', label: 'Total Value', currency: true },
    ],
  },
  partyOutstanding: {
    label: 'Party-wise Outstanding',
    group: 'Party',
    fetch: fetchPartyOutstandingAPI,
    needsDateRange: false,
    columns: [
      { key: 'partyName', label: 'Party' },
      { key: 'phone', label: 'Phone' },
      { key: 'unpaidInvoiceCount', label: 'Unpaid Invoices' },
      { key: 'totalInvoiced', label: 'Total Invoiced', currency: true },
      { key: 'outstanding', label: 'Outstanding', currency: true },
    ],
  },
  customerStatement: {
    label: 'Customer Statement',
    group: 'Party',
    fetch: (filters) => fetchCustomerStatementAPI(filters.partyId, filters),
    needsDateRange: true,
    needsPartyPicker: true,
    columns: [
      { key: 'date', label: 'Date', isDate: true },
      { key: 'reference', label: 'Reference' },
      { key: 'debit', label: 'Debit', currency: true },
      { key: 'credit', label: 'Credit', currency: true },
      { key: 'runningBalance', label: 'Balance', currency: true },
    ],
  },
};

const REPORT_KEYS = Object.keys(REPORT_DEFS);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

// Renders the filter bar + results table for ONE report — no picker, no
// page header. This is what ReportsHub.js embeds per sidebar item.
export function AnalyticalReportView({ reportKey }) {
  const parties = useAppStore((s) => s.parties);
  const toast = useToast();
  const def = REPORT_DEFS[reportKey];

  const [fromDate, setFromDate] = useState(firstOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [partyId, setPartyId] = useState('');
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (def.needsPartyPicker && !partyId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const filters = def.needsDateRange ? { fromDate, toDate } : {};
      if (def.needsPartyPicker) filters.partyId = partyId;

      const res = await def.fetch(filters);
      setRows(res?.data || []);
      setTotals(
        res?.totals
          ? res.totals
          : res?.totalOutstanding != null
            ? { totalOutstanding: res.totalOutstanding }
            : res?.closingBalance != null
              ? { closingBalance: res.closingBalance }
              : null
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey, fromDate, toDate, partyId]);

  useEffect(() => {
    setRows([]);
    setTotals(null);
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey]);

  function renderCell(row, col) {
    const val = row[col.key];
    if (col.currency) return formatCurrency(Number(val) || 0);
    if (col.isDate) return val ? new Date(val).toLocaleDateString() : '';
    return val ?? '—';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          padding: 'var(--sp-3)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        {def.needsPartyPicker && (
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Party
            </label>
            <select className="form-input" value={partyId} onChange={(e) => setPartyId(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">— Select Party —</option>
              {parties.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        {def.needsDateRange && (
          <>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                From
              </label>
              <input className="form-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                To
              </label>
              <input className="form-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </>
        )}
        <Button variant="primary" size="sm" onClick={loadReport}>
          Apply
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading report…" />
      ) : def.needsPartyPicker && !partyId ? (
        <EmptyState icon="👤" title="Select a party" description="Choose a party above to see their statement." />
      ) : rows.length === 0 ? (
        <EmptyState icon="📊" title="No data" description="No records found for this selection." />
      ) : (
        <div className="table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {def.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id || row.partyId || row.productId || row.userId || i}>
                  {def.columns.map((col) => (
                    <td key={col.key}>{renderCell(row, col)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totals?.totalOutstanding != null && (
        <div style={{ fontWeight: 700, fontSize: 'var(--fs-md)' }}>
          Total Outstanding: {formatCurrency(totals.totalOutstanding)}
        </div>
      )}
      {totals?.closingBalance != null && (
        <div style={{ fontWeight: 700, fontSize: 'var(--fs-md)' }}>
          Closing Balance: {formatCurrency(totals.closingBalance)}
        </div>
      )}
    </div>
  );
}

// Standalone page — kept for backward compatibility with anything still
// routing directly here. ReportsHub.js uses AnalyticalReportView directly
// instead, with its own sidebar as the picker.
export default function MoreReports() {
  const [activeReport, setActiveReport] = useState('salesByParty');

  const grouped = REPORT_KEYS.reduce((g, key) => {
    const group = REPORT_DEFS[key].group;
    if (!g[group]) g[group] = [];
    g[group].push(key);
    return g;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>More Reports</h1>
          <p className="page-header__sub">Sales, purchase, party, stock, and GST reports</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
        {Object.entries(grouped).map(([group, keys]) => (
          <div key={group}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              {group.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveReport(key)}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${activeReport === key ? 'var(--primary)' : 'var(--border)'}`,
                    background: activeReport === key ? 'var(--primary)' : 'var(--bg-card)',
                    color: activeReport === key ? '#fff' : 'var(--text)',
                    fontSize: 'var(--fs-xs)',
                    cursor: 'pointer',
                  }}
                >
                  {REPORT_DEFS[key].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnalyticalReportView reportKey={activeReport} />
    </div>
  );
}
