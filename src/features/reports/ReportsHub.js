/* ===== REPORTS HUB — single page, internal sidebar for all 19 reports ===== */
import React, { useState } from 'react';
import ReportView from './ReportView';
import GSTTemplateReport from './GSTTemplateReport';
import { REPORTS, REPORT_GROUP_ORDER } from './reportRegistry';
import './ReportsHub.css';

const ALL_ITEMS = Object.entries(REPORTS).map(([key, def]) => ({ key, label: def.label, group: def.group }));

function groupItems(items) {
  const g = {};
  items.forEach((item) => {
    if (!g[item.group]) g[item.group] = [];
    g[item.group].push(item);
  });
  const ordered = {};
  REPORT_GROUP_ORDER.forEach((grp) => { if (g[grp]) ordered[grp] = g[grp]; });
  Object.keys(g).forEach((grp) => { if (!ordered[grp]) ordered[grp] = g[grp]; });
  return ordered;
}

export default function ReportsHub() {
  const [activeKey, setActiveKey] = useState('salesReport');
  const grouped = groupItems(ALL_ITEMS);

  return (
    <div className="rh-layout">
      {/* Phone / small tablet: compact report picker instead of a 19-button column */}
      <select className="form-select rh-mobile-select" value={activeKey} onChange={(e) => setActiveKey(e.target.value)} aria-label="Select report">
        {Object.entries(grouped).map(([group, items]) => (
          <optgroup key={group} label={group}>
            {items.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </optgroup>
        ))}
      </select>

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

      <main className="rh-main">
        {REPORTS[activeKey].templateReport ? (
          <GSTTemplateReport
            key={activeKey}
            reportType={REPORTS[activeKey].templateReport}
          />
        ) : (
          <ReportView key={activeKey} reportKey={activeKey} />
        )}
      </main>
    </div>
  );
}
