import React, { useMemo, useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { Button, LoadingSpinner, StatCard, ToastContainer } from '../../components/ui';
import DateInput from '../../components/shared/DateInput';
import { useToast } from '../../hooks/useToast';
import {
  downloadGstTemplateReportAPI,
  fetchGstTemplatePreviewAPI,
} from '../../api/reports';
import { fyLabel, fyStartYear, getFinancialYearOptions, FY_MONTHS } from '../../utils/reportDates';
import '../../styles/ReportView.css';

const SUMMARY_FIELDS = {
  gstr1: [
    ['invoiceCount', 'Sales invoices', 'number'],
    ['b2bInvoiceCount', 'B2B invoices', 'number'],
    ['b2cInvoiceCount', 'B2C invoices', 'number'],
    ['taxableValue', 'Taxable value', 'currency'],
    ['taxAmount', 'Output tax', 'currency'],
    ['returns', 'Returns', 'currency'],
  ],
  gstr2: [
    ['billCount', 'Purchase bills', 'number'],
    ['taxableValue', 'Taxable value', 'currency'],
    ['taxAmount', 'Supplier GST', 'currency'],
    ['eligibleItc', 'Eligible ITC', 'currency'],
    ['ineligibleItc', 'Ineligible GST', 'currency'],
    ['nonGstValue', 'Non-GST purchases', 'currency'],
  ],
};

function displayCell(value, column) {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toLocaleDateString('en-IN');
  if (column.heading?.toLowerCase().includes('date') && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleDateString('en-IN');
  }
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
  return String(value);
}

function SheetPreview({ sheet }) {
  const populatedColumns = sheet.columns
    .map((column, index) => ({ ...column, index }))
    .filter((column) => column.heading);

  return (
    <details className="gst-template-sheet">
      <summary>
        <span>{sheet.name}</span>
        <span className="gst-template-sheet__meta">
          Header row {sheet.headerRow} · {sheet.rowCount} row(s)
        </span>
      </summary>
      <div className="table-wrapper gst-template-sheet__table">
        <table className="data-table">
          <thead>
            <tr>
              {populatedColumns.map((column) => (
                <th key={column.letter}>
                  <span>{column.letter}</span>
                  <small>{column.heading}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.previewRows.length ? sheet.previewRows.map((row, rowIndex) => (
              <tr key={`${sheet.name}-${rowIndex}`}>
                {populatedColumns.map((column) => (
                  <td key={column.letter} data-label={column.heading}>
                    {displayCell(row[column.index], column)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={Math.max(populatedColumns.length, 1)}>
                  No transactions for this worksheet in the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {sheet.rowCount > sheet.previewRows.length && (
          <p className="rv-note">
            Showing the first {sheet.previewRows.length} rows; Excel export includes all rows.
          </p>
        )}
      </div>
    </details>
  );
}

export default function GSTTemplateReport({ reportType }) {
  const title = reportType === 'gstr1' ? 'GST 1 – Sales Report' : 'GST 2 – Purchase Report';
  const toast = useToast();
  const [periodMode, setPeriodMode] = useState('financialYear');
  const [financialYear, setFinancialYear] = useState(
    fyLabel(fyStartYear())
  );
  const [month, setMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const periodParams = useMemo(() => (
    periodMode === 'custom'
      ? { fromDate, toDate }
      : { financialYear, ...(month ? { month } : {}) }
  ), [periodMode, financialYear, month, fromDate, toDate]);

  async function generateReport() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetchGstTemplatePreviewAPI(reportType, periodParams);
      setResult(response);
      if (response.warnings?.length) {
        toast.error('Report generated with data-quality warnings. Review them before filing.');
      } else {
        toast.success('GST report generated.');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to generate GST report');
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const workbook = await downloadGstTemplateReportAPI(reportType, periodParams);
      const url = URL.createObjectURL(workbook);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${reportType}-${financialYear || 'custom'}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel report downloaded.');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to download GST report');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="report-page gst-template-report">
      <ToastContainer toasts={toast.toasts} />
      <div className="page-header">
        <div className="page-header__left">
          <h1>{title}</h1>
          <p className="page-header__sub">
            Generated in the supplied Excel workbook format. The backend applies the selected period and saved invoice tax data.
          </p>
        </div>
        <div className="rv-actions">
          <Button
            variant="success"
            size="sm"
            icon={<FiDownload />}
            loading={downloading}
            disabled={loading}
            onClick={downloadReport}
          >
            Download Excel
          </Button>
        </div>
      </div>

      <section className="gst-template-period">
        <div className="filter-group rv-filter">
          <label className="filter-label" htmlFor={`${reportType}-period-mode`}>Reporting period</label>
          <select
            id={`${reportType}-period-mode`}
            className="form-select"
            value={periodMode}
            onChange={(event) => setPeriodMode(event.target.value)}
          >
            <option value="financialYear">Financial year</option>
            <option value="custom">Start and end date</option>
          </select>
        </div>
        {periodMode === 'financialYear' ? (
          <>
            <div className="filter-group rv-filter">
              <label className="filter-label" htmlFor={`${reportType}-fy`}>Financial year</label>
              <select
                id={`${reportType}-fy`}
                className="form-select"
                value={financialYear}
                onChange={(event) => {
                  setFinancialYear(event.target.value);
                  setMonth('');
                }}
              >
                {getFinancialYearOptions(8).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group rv-filter">
              <label className="filter-label" htmlFor={`${reportType}-month`}>Month</label>
              <select
                id={`${reportType}-month`}
                className="form-select"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                <option value="">Entire financial year</option>
                {FY_MONTHS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="filter-group rv-filter">
              <label className="filter-label" htmlFor={`${reportType}-from`}>From date</label>
              <DateInput
                id={`${reportType}-from`}
                className="form-input"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="filter-group rv-filter">
              <label className="filter-label" htmlFor={`${reportType}-to`}>To date</label>
              <DateInput
                id={`${reportType}-to`}
                className="form-input"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </>
        )}
        <Button
          variant="primary"
          size="sm"
          icon={<FiFileText />}
          loading={loading}
          onClick={generateReport}
        >
          Generate report
        </Button>
      </section>

      {loading && <LoadingSpinner message="Generating GST report…" />}
      {result && (
        <>
          <p className="rv-note">
            Period: {result.period} · Company: {result.company?.legalName || '—'}
            {result.company?.gstin ? ` · GSTIN: ${result.company.gstin}` : ''}
          </p>
          {result.summary && (
            <div className="stat-grid rv-stats">
              {SUMMARY_FIELDS[reportType].map(([key, label, type]) => {
                const value = Number(result.summary[key] || 0);
                const display = type === 'currency'
                  ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : value.toLocaleString('en-IN');
                return (
                  <StatCard
                    key={key}
                    label={label}
                    value={display}
                    icon={type === 'currency' ? '₹' : '📄'}
                    color={type === 'currency' ? 'cyan' : 'blue'}
                  />
                );
              })}
            </div>
          )}
          {!!result.warnings?.length && (
            <section className="gst-template-message gst-template-message--warning">
              <strong>Data-quality warnings</strong>
              <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          )}
          <section className="gst-template-message">
            <strong>Template fields not populated from current database records</strong>
            <ul>{result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
          </section>
          <div className="gst-template-sheets">
            {result.sheets.map((sheet) => <SheetPreview key={sheet.name} sheet={sheet} />)}
          </div>
        </>
      )}
    </div>
  );
}
