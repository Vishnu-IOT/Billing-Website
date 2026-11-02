/* ===== REPORTS HUB — single page, internal sidebar for all reports ===== */
import React, { useState } from 'react';
import SalesReport from './SalesReport';
import PurchaseReport from './PurchaseReport';
import StockReport from './StockReport';
import GSTR1Report from './GSTR1Report';
import GSTR3BReport from './GSTR3BReport';
import UsersReport from './UsersReport';
import { AnalyticalReportView, REPORT_DEFS } from './MoreReports';
import './ReportsHub.css';

// Full-page standalone reports (each already a complete component with its
// own header/filters/export etc.) rendered as-is when selected.
const STANDALONE_REPORTS = [
  { key: 'sale-report', label: 'Sales Report', group: 'Sales', Component: SalesReport },
  { key: 'purchase-report', label: 'Purchase Report', group: 'Purchase', Component: PurchaseReport },
  { key: 'stock-report', label: 'Stock Report', group: 'Inventory', Component: StockReport },
  { key: 'gstr1-report', label: 'GSTR-1 Report', group: 'GST', Component: GSTR1Report },
  { key: 'gstr3b-report', label: 'GSTR-3B Report', group: 'GST', Component: GSTR3BReport },
  { key: 'user-report', label: 'User/Rep Report', group: 'Sales', Component: UsersReport },
];

// Analytical reports (table-based, driven by REPORT_DEFS in MoreReports.js)
const ANALYTICAL_REPORTS = Object.entries(REPORT_DEFS).map(([key, def]) => ({
  key: `analytical:${key}`,
  label: def.label,
  group: def.group,
  reportKey: key,
}));

const ALL_ITEMS = [...STANDALONE_REPORTS, ...ANALYTICAL_REPORTS];

// Preserve a sensible group display order rather than alphabetical
const GROUP_ORDER = ['Sales', 'Purchase', 'Inventory', 'GST', 'Party'];

function groupItems(items) {
  const g = {};
  items.forEach((item) => {
    if (!g[item.group]) g[item.group] = [];
    g[item.group].push(item);
  });
  const orderedGroups = {};
  GROUP_ORDER.forEach((grp) => {
    if (g[grp]) orderedGroups[grp] = g[grp];
  });
  Object.keys(g).forEach((grp) => {
    if (!orderedGroups[grp]) orderedGroups[grp] = g[grp];
  });
  return orderedGroups;
}

export default function ReportsHub() {
  const [activeKey, setActiveKey] = useState('sale-report');
  const grouped = groupItems(ALL_ITEMS);
  const active = ALL_ITEMS.find((i) => i.key === activeKey);

  return (
    <div className="rh-layout">
      {/* Internal sidebar — every report listed individually, grouped */}
      <aside className="rh-sidebar">
        <div className="rh-sidebar-header">
          <span className="rh-sidebar-icon">📊</span>
          <span className="rh-sidebar-title">Reports</span>
        </div>

        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="rh-group">
            <div className="rh-group-label">{group.toUpperCase()}</div>
            {items.map((item) => (
              <button
                key={item.key}
                className={`rh-item ${activeKey === item.key ? 'rh-item--active' : ''}`}
                onClick={() => setActiveKey(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content — the selected report */}
      <main className="rh-main">
        {active?.Component ? (
          <active.Component />
        ) : active?.reportKey ? (
          <>
            <div className="rh-main-header">
              <h2>{active.label}</h2>
            </div>
            <AnalyticalReportView key={active.reportKey} reportKey={active.reportKey} />
          </>
        ) : null}
      </main>
    </div>
  );
}
