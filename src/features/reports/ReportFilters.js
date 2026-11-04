/* ===== ReportFilters — report-specific filter bar =====
 * Renders only the controls listed in def.filters. Control values are written
 * straight into the filter state under the backend's own parameter names
 * (fromDate, toDate, partyId, userId, productId, categoryId, brandId,
 * paymentMode, billType, status, taxRate, financialYear, month, stockStatus,
 * transactionType, …) — see reportRegistry.js.
 */
import React, { useState } from 'react';
import { Button } from '../../components/ui';
import {
  STATUS_OPTIONS, BILL_TYPES, STOCK_STATUSES, TX_TYPES, PARTY_TYPES, OUTSTANDING_STATUSES, STOCK_GROUPS,
} from './reportRegistry';
import { QUICK_RANGES, getQuickRange, getFinancialYearOptions, FY_MONTHS } from '../../utils/reportDates';
import '../../styles/ReportView.css';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const FY_OPTIONS = getFinancialYearOptions(6);

function Select({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="filter-group rv-filter">
      <label className="filter-label">{label}</label>
      <select className="form-select" value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, type = 'text', min }) {
  return (
    <div className="filter-group rv-filter">
      <label className="filter-label">{label}</label>
      <input className="form-input" type={type} min={min} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="rv-check">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// filters shown in the always-visible row; everything else sits under "More filters"
const PRIMARY = new Set(['period', 'gstPeriod', 'party', 'user', 'status', 'stockStatus', 'groupBy', 'transactionType', 'category', 'asOfDate']);

export default function ReportFilters({ def, draft, patchDraft, lookups, onApply, onReset, loading }) {
  const [showMore, setShowMore] = useState(false);
  const set = (k) => (v) => patchDraft({ [k]: v });

  const dateChanged = (k) => (v) => patchDraft({ [k]: v, quick: 'custom', financialYear: '', month: '' });
  const quickChanged = (key) => patchDraft(key === 'custom' ? { quick: 'custom', financialYear: '', month: '' } : { quick: key, ...getQuickRange(key), financialYear: '', month: '' });
  const fyChanged = (v) => patchDraft(v ? { financialYear: v, month: '', fromDate: '', toDate: '', quick: '' } : { financialYear: '', month: '', quick: 'custom' });
  const gstDatesLocked = !!draft.financialYear;

  const dateControls = (disabled) => (
    <>
      <Select label="Period" value={draft.quick || 'custom'} onChange={quickChanged} options={QUICK_RANGES.map((q) => ({ value: q.key, label: q.label }))} disabled={disabled} />
      <TextInput label="From Date" type="date" value={draft.fromDate} onChange={dateChanged('fromDate')} />
      <TextInput label="To Date" type="date" value={draft.toDate} onChange={dateChanged('toDate')} />
    </>
  );

  const renderFilter = (k) => {
    switch (k) {
      case 'period': return <React.Fragment key={k}>{dateControls(false)}</React.Fragment>;
      case 'gstPeriod': return (
        <React.Fragment key={k}>
          <Select label="Financial Year" value={draft.financialYear} onChange={fyChanged} options={FY_OPTIONS} placeholder="Use date range" />
          <Select label="Month" value={draft.month} onChange={set('month')} options={FY_MONTHS} placeholder="Whole year" disabled={!draft.financialYear} />
          {!gstDatesLocked && dateControls(false)}
        </React.Fragment>
      );
      case 'party': return <Select key={k} label={def.partyLabel || 'Party'} value={draft.partyId} onChange={set('partyId')} options={lookups.parties} placeholder={def.requires?.includes('partyId') ? '— Select Party —' : `All ${def.partyLabel ? `${def.partyLabel}s` : 'Parties'}`} />;
      case 'user': return <Select key={k} label="User / Rep" value={draft.userId} onChange={set('userId')} options={lookups.users} placeholder="All Users" />;
      case 'product': return <Select key={k} label="Product" value={draft.productId} onChange={set('productId')} options={lookups.products} placeholder="All Products" />;
      case 'category': return <Select key={k} label="Category" value={draft.categoryId} onChange={set('categoryId')} options={lookups.categories} placeholder="All Categories" />;
      case 'brand': return <Select key={k} label="Brand" value={draft.brandId} onChange={set('brandId')} options={lookups.brands} placeholder="All Brands" />;
      case 'paymentMode': return <Select key={k} label="Payment Mode" value={draft.paymentMode} onChange={set('paymentMode')} options={lookups.paymentModes} placeholder="All Modes" />;
      case 'billType': return <Select key={k} label="Bill Type" value={draft.billType} onChange={set('billType')} options={BILL_TYPES} placeholder="All Types" />;
      case 'invoiceType': return <Select key={k} label="Invoice Type" value={draft.invoiceType} onChange={set('invoiceType')} options={BILL_TYPES} placeholder="All Types" />;
      case 'status': return <Select key={k} label="Status" value={draft.status} onChange={set('status')} options={STATUS_OPTIONS} placeholder="Active (excl. Cancelled)" />;
      case 'invoiceNumber': return <TextInput key={k} label="Invoice No" value={draft.invoiceNumber} onChange={set('invoiceNumber')} placeholder="Contains…" />;
      case 'purchaseNumber': return <TextInput key={k} label="Bill No" value={draft.purchaseNumber} onChange={set('purchaseNumber')} placeholder="Contains…" />;
      case 'gstin': return <TextInput key={k} label="GSTIN" value={draft.gstin} onChange={set('gstin')} placeholder="Contains…" />;
      case 'taxRate': return <Select key={k} label="Tax Rate" value={draft.taxRate} onChange={set('taxRate')} options={lookups.taxRates} placeholder="All Rates" />;
      case 'stockStatus': return <Select key={k} label="Stock Status" value={draft.stockStatus} onChange={set('stockStatus')} options={STOCK_STATUSES} />;
      case 'asOfDate': return <TextInput key={k} label="As Of Date" type="date" value={draft.asOfDate} onChange={set('asOfDate')} />;
      case 'groupBy': return <Select key={k} label="Group By" value={draft.groupBy} onChange={set('groupBy')} options={STOCK_GROUPS.map((g) => ({ value: g, label: cap(g) }))} />;
      case 'transactionType': return <Select key={k} label="Transaction Type" value={draft.transactionType} onChange={set('transactionType')} options={TX_TYPES} />;
      case 'partyType': return <Select key={k} label="Party Type" value={draft.partyType} onChange={set('partyType')} options={PARTY_TYPES} placeholder="All" />;
      case 'outstandingStatus': return <Select key={k} label="Outstanding Status" value={draft.outstandingStatus} onChange={set('outstandingStatus')} options={OUTSTANDING_STATUSES} />;
      case 'overdueDays': return <TextInput key={k} label="Overdue > (days)" type="number" min="0" value={draft.overdueDays} onChange={set('overdueDays')} placeholder="e.g. 30" />;
      case 'includeProducts': return <Check key={k} label="Show products" checked={draft.includeProducts} onChange={set('includeProducts')} />;
      case 'activeOnly': return <Check key={k} label="Only with movement" checked={draft.activeOnly} onChange={set('activeOnly')} />;
      default: return null;
    }
  };

  const primary = def.filters.filter((k) => PRIMARY.has(k) || k === 'includeProducts' || k === 'activeOnly');
  const more = def.filters.filter((k) => !PRIMARY.has(k) && k !== 'includeProducts' && k !== 'activeOnly');
  const moreActive = more.filter((k) => {
    const map = { user: 'userId', product: 'productId', brand: 'brandId', paymentMode: 'paymentMode', billType: 'billType', invoiceType: 'invoiceType', invoiceNumber: 'invoiceNumber', purchaseNumber: 'purchaseNumber', gstin: 'gstin', taxRate: 'taxRate', partyType: 'partyType', outstandingStatus: 'outstandingStatus', overdueDays: 'overdueDays' };
    return map[k] && draft[map[k]];
  }).length;

  return (
    <form className="filter-bar rv-filters" onSubmit={(e) => { e.preventDefault(); onApply(); }}>
      {primary.map(renderFilter)}
      {more.length > 0 && showMore && more.map(renderFilter)}
      <div className="filter-actions rv-filter-actions">
        {more.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowMore((s) => !s)}>
            {showMore ? 'Fewer filters' : `More filters${moreActive ? ` (${moreActive})` : ''}`}
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={onReset}>Reset</Button>
        <Button type="submit" variant="primary" size="sm" loading={loading}>Apply Filters</Button>
      </div>
    </form>
  );
}

// Human-readable list of the APPLIED filters (for PDF / Excel / Print headers)
export function describeFilters(def, applied, lookups, search) {
  const lines = [];
  const pick = (list, v) => (list.find((o) => String(o.value) === String(v)) || {}).label || v;
  const add = (label, v) => { if (v !== '' && v !== undefined && v !== null && v !== false) lines.push({ label, value: String(v) }); };
  if (applied.financialYear) add('Financial Year', `FY ${applied.financialYear}`);
  if (applied.month) add('Month', (FY_MONTHS.find((m) => m.value === String(applied.month)) || {}).label || applied.month);
  add('From', applied.fromDate); add('To', applied.toDate); add('As of', applied.asOfDate);
  add(def.partyLabel || 'Party', applied.partyId && pick(lookups.parties, applied.partyId));
  add('User', applied.userId && pick(lookups.users, applied.userId));
  add('Product', applied.productId && pick(lookups.products, applied.productId));
  add('Category', applied.categoryId && pick(lookups.categories, applied.categoryId));
  add('Brand', applied.brandId && pick(lookups.brands, applied.brandId));
  add('Payment Mode', applied.paymentMode); add('Bill Type', applied.billType); add('Invoice Type', applied.invoiceType);
  add('Status', applied.status); add('Invoice No', applied.invoiceNumber); add('Bill No', applied.purchaseNumber);
  add('GSTIN', applied.gstin); add('Tax Rate', applied.taxRate !== '' && applied.taxRate !== undefined ? `${applied.taxRate}%` : '');
  add('Stock Status', applied.stockStatus && applied.stockStatus !== 'All' ? applied.stockStatus : '');
  add('Group By', applied.groupBy); add('Transaction Type', applied.transactionType);
  add('Party Type', applied.partyType); add('Outstanding', applied.outstandingStatus); add('Overdue >', applied.overdueDays && `${applied.overdueDays} days`);
  add('Search', search);
  return lines;
}
