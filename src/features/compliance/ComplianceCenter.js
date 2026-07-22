/* ===== COMPLIANCE CENTER — e-Invoice & e-Way Bill listing ===== */
import React, { useEffect, useMemo, useState } from 'react';
import useComplianceStore from '../../store/complianceStore';
import {
  Button,
  Badge,
  Pagination,
  EmptyState,
  ToastContainer,
  ConfirmModal,
} from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/date';
import '../../styles/reports.css';

export default function ComplianceCenter() {
  const { eInvoices, eWayBills, loading, loadAll, cancelEInvoice, cancelEWayBill } =
    useComplianceStore();
  const toast = useToast();

  const [tab, setTab] = useState('einvoice');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const list = tab === 'einvoice' ? eInvoices : eWayBills;

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return list.filter(
      (r) =>
        !q ||
        (r.irn || r.ewbNo || '').toLowerCase().includes(q) ||
        (r.invoiceNumber || '').toLowerCase().includes(q)
    );
  }, [list, debouncedSearch]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 10);

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      if (tab === 'einvoice') {
        await cancelEInvoice(cancelTarget.irn);
        toast.success('e-Invoice cancelled');
      } else {
        await cancelEWayBill(cancelTarget.ewbNo);
        toast.success('e-Way Bill cancelled');
      }
    } catch {
      toast.error('Cancellation failed');
    } finally {
      setCancelTarget(null);
    }
  }

  function getStatusVariant(status = '') {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'generated') return 'success';
    if (s === 'cancelled') return 'danger';
    if (s === 'expired') return 'warning';
    return 'default';
  }

  return (
    <div className="report-page">
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title={tab === 'einvoice' ? 'Cancel e-Invoice?' : 'Cancel e-Way Bill?'}
        message="This action may not be reversible depending on GST portal rules."
      />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Compliance Center</h1>
          <p className="page-header__sub">e-Invoices and e-Way Bills with status & validity</p>
        </div>
        <Button variant="secondary" onClick={() => loadAll()}>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`bill-type-btn ${tab === 'einvoice' ? 'active' : ''}`}
          onClick={() => {
            setTab('einvoice');
            goToPage(1);
          }}
        >
          e-Invoices ({eInvoices.length})
        </button>
        <button
          className={`bill-type-btn ${tab === 'eway' ? 'active' : ''}`}
          onClick={() => {
            setTab('eway');
            goToPage(1);
          }}
        >
          e-Way Bills ({eWayBills.length})
        </button>
      </div>

      <div className="filter-bar">
        <input
          className="form-input"
          placeholder="Search IRN, EWB no, invoice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading compliance records…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏛"
          title={tab === 'einvoice' ? 'No e-Invoices yet' : 'No e-Way Bills yet'}
          description="Generate e-Invoice or e-Way Bill from any invoice preview screen."
        />
      ) : (
        <>
          <div className="bills-table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>{tab === 'einvoice' ? 'IRN' : 'EWB No'}</th>
                  <th>Status</th>
                  <th>Valid Until</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id || row.irn || row.ewbNo}>
                    <td>{formatDate(row.ackDate || row.ewbDate || row.createdAt)}</td>
                    <td>{row.invoiceNumber || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>
                      {row.irn || row.ewbNo || '—'}
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(row.status)}>{row.status || 'Active'}</Badge>
                    </td>
                    <td>{formatDate(row.validUpto || row.validUntil)}</td>
                    <td>
                      {(row.status || '').toLowerCase() !== 'cancelled' && (
                        <Button
                          variant="danger-outline"
                          size="sm"
                          onClick={() => setCancelTarget(row)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            from={from}
            to={to}
            total={total}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  );
}
