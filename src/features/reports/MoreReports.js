/* ===== MORE REPORTS — thin wrapper kept for backward compatibility =====
 * All report logic now lives in reportRegistry.js + ReportView.js.
 * ReportsHub no longer needs this file; it is only kept because AppShell still
 * lazy-imports it as a standalone route.
 */
import React, { useState } from 'react';
import ReportView from './ReportView';
import { REPORTS } from './reportRegistry';

const MORE_KEYS = [
  'salesByParty', 'salesByUser', 'salesByItem', 'itemSalesByUser', 'itemSalesByParty',
  'purchaseByParty', 'purchaseByItem', 'stockSummary', 'gst2', 'partyOutstanding', 'customerStatement',
];

export const REPORT_DEFS = Object.fromEntries(MORE_KEYS.map((k) => [k, REPORTS[k]]));

export function AnalyticalReportView({ reportKey }) {
  return <ReportView reportKey={reportKey} />;
}

export default function MoreReports() {
  const [active, setActive] = useState(MORE_KEYS[0]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {MORE_KEYS.map((key) => (
          <button
            key={key}
            className="btn"
            onClick={() => setActive(key)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${active === key ? 'var(--primary)' : 'var(--border)'}`,
              background: active === key ? 'var(--primary)' : 'var(--bg-card)',
              color: active === key ? '#fff' : 'var(--text)',
              fontSize: 'var(--fs-xs)',
              cursor: 'pointer',
            }}
          >
            {REPORTS[key].label}
          </button>
        ))}
      </div>
      <ReportView key={active} reportKey={active} />
    </div>
  );
}
