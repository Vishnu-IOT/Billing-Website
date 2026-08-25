/* ===== DateRangeFilter — Shared component ===== */
import React from 'react';
import { Button } from '../ui';

const FILTER_OPTIONS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom' },
];

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDateRange = (filter) => {
  const today = new Date();

  switch (filter) {
    case 'thisMonth': {
      // First day of current month
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      // Last day of current month
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case 'thisYear': {
      // First day of current year
      const startDate = new Date(today.getFullYear(), 0, 1);

      // Last day of current year
      const endDate = new Date(today.getFullYear(), 11, 31);

      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case 'lastYear': {
      const lastYear = today.getFullYear() - 1;

      // First day of last year
      const startDate = new Date(lastYear, 0, 1);

      // Last day of last year
      const endDate = new Date(lastYear, 11, 31);

      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case 'custom':
      return {
        startDate: '',
        endDate: '',
      };

    default:
      return {
        startDate: '',
        endDate: '',
      };
  }
};

export function DateRangeFilter({
  filter,
  dateRange,
  onFilterChange,
  onDateChange,
  onApply,
  onClear,
}) {
  const isCustom = filter === 'custom';

  const handleFilterChange = (value) => {
    const newDateRange = getDateRange(value);

    onFilterChange(value);
    onDateChange(newDateRange);
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">Period</label>

        <select
          className="form-select"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">From</label>

        <input
          type="date"
          className="form-input"
          value={dateRange.startDate}
          disabled={!isCustom}
          onChange={(e) =>
            onDateChange({
              ...dateRange,
              startDate: e.target.value,
            })
          }
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">To</label>

        <input
          type="date"
          className="form-input"
          value={dateRange.endDate}
          disabled={!isCustom}
          onChange={(e) =>
            onDateChange({
              ...dateRange,
              endDate: e.target.value,
            })
          }
        />
      </div>

      <div className="filter-actions">
        <Button
          variant="primary"
          size="sm"
          onClick={onApply}
        >
          Apply
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}