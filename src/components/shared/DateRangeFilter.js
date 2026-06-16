/* ===== DateRangeFilter — Shared component replacing 6 duplicates ===== */
import React from 'react';
import { Button } from '../ui';

const FILTER_OPTIONS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'thisYear',  label: 'This Year' },
  { value: 'lastYear',  label: 'Last Year' },
  { value: 'custom',    label: 'Custom' },
];

export function DateRangeFilter({ filter, dateRange, onFilterChange, onDateChange, onApply, onClear }) {
  const isCustom = filter === 'custom';
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">Period</label>
        <select className="form-select" value={filter} onChange={(e) => onFilterChange(e.target.value)}>
          {FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">From</label>
        <input
          type="date"
          className="form-input"
          value={dateRange.startDate}
          disabled={!isCustom}
          onChange={(e) => onDateChange({ ...dateRange, startDate: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">To</label>
        <input
          type="date"
          className="form-input"
          value={dateRange.endDate}
          disabled={!isCustom}
          onChange={(e) => onDateChange({ ...dateRange, endDate: e.target.value })}
        />
      </div>

      <div className="filter-actions">
        <Button variant="primary" size="sm" onClick={onApply}>Apply</Button>
        <Button variant="secondary" size="sm" onClick={onClear}>Clear</Button>
      </div>
    </div>
  );
}
