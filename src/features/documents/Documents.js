/* ===== DOCUMENTS — List hub for quotation, proforma, challan, credit/debit notes ===== */
import React, { useState, useMemo, useEffect } from 'react';
import useDocumentStore from '../../store/documentStore';
import useUIStore from '../../store/uiStore';
import {
  Button,
  EmptyState,
  Pagination,
  ConfirmModal,
  ActionMenu,
  Badge,
  ToastContainer,
} from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { DOCUMENT_TYPES, SALES_DOCUMENT_TYPES, PURCHASE_DOCUMENT_TYPES } from '../../utils/documents';
import DocumentForm from '../../components/shared/DocumentForm';
import '../../styles/bills.css';
import useAppStore from '../../store/appStore';
import DocumentPreview from '../../components/shared/DocumentPreview';

const TAB_TYPES = [...SALES_DOCUMENT_TYPES, ...PURCHASE_DOCUMENT_TYPES];

export default function Documents({ searchParams }) {
  const { loadDocuments, getDocuments, deleteDocument, convertToInvoice, getFilters } = useDocumentStore();
  const toast = useToast();
  const setHideSidebar = useUIStore((s) => s.setHideSidebar);
  const companies = useAppStore((s) => s.companies);
  const parties = useAppStore((s) => s.parties);

  const initialType = searchParams?.get('type') || 'QUOTATION';
  const [activeType, setActiveType] = useState(
    TAB_TYPES.includes(initialType) ? initialType : 'QUOTATION'
  );
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const [activeDoc, setActiveDoc] = useState(null);

  // Filter bar state — party + date range + status, applied server-side
  const [filterPartyId, setFilterPartyId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const config = DOCUMENT_TYPES[activeType];
  const documents = getDocuments(activeType);
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    // switching tabs resets the filter bar to whatever was last applied for that tab (or empty)
    const existing = getFilters(activeType);
    setFilterPartyId(existing.partyId || '');
    setFilterFromDate(existing.fromDate || '');
    setFilterToDate(existing.toDate || '');
    setFilterStatus(existing.status || '');
    loadDocuments(activeType, existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  useEffect(() => {
    setHideSidebar(view !== 'list');
    return () => setHideSidebar(false);
  }, [view, setHideSidebar]);

  useEffect(() => {
    const type = searchParams?.get('type');
    if (type && TAB_TYPES.includes(type)) {
      setActiveType(type);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return documents.filter(
      (d) =>
        !q ||
        d.Party?.name?.toLowerCase().includes(q) ||
        (d.documentNumber || d.invoiceNumber || '').toLowerCase().includes(q)
    );
  }, [documents, debouncedSearch]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 10);

  async function handleDelete() {
    try {
      await deleteDocument(deleteId, activeType);
      toast.success(`${config.label} deleted`);
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  }

  function applyFilters() {
    const filters = {};
    if (filterPartyId) filters.partyId = filterPartyId;
    if (filterStatus) filters.status = filterStatus;
    if (filterFromDate && filterToDate) {
      filters.fromDate = filterFromDate;
      filters.toDate = filterToDate;
    }
    loadDocuments(activeType, filters);
    goToPage(1);
  }

  function clearFilters() {
    setFilterPartyId('');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterStatus('');
    loadDocuments(activeType, {});
    goToPage(1);
  }

  const hasActiveFilters = !!(filterPartyId || filterStatus || (filterFromDate && filterToDate));

  if (view === 'create') {
    return (
      <DocumentForm
        documentType={activeType}
        onBack={() => setView('list')}
        onSaved={() => {
          setView('list');
          loadDocuments(activeType);
        }}
      />
    );
  }

  if (view === 'edit' && editId) {
    return (
      <DocumentForm
        documentType={activeType}
        editMode
        documentId={editId}
        onBack={() => {
          setView('list');
          setEditId(null);
        }}
        onSaved={() => {
          setView('list');
          setEditId(null);
          loadDocuments(activeType);
        }}
        onConvert={() => {
          window.location.hash = 'sales';
        }}
      />
    );
  }

  if (view === 'preview' && activeDoc) {
    return (
      <DocumentPreview
        doc={activeDoc}
        documentType={activeType}
        companies={companies}
        onBack={() => {
          setView('list');
          setActiveDoc(null);
        }}
      />
    );
  }

  return (
    <div className="bills-page">
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={`Delete ${config.label}?`}
      />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Documents</h1>
          <p className="page-header__sub">
            Quotations, proforma, delivery challan, credit & debit notes
          </p>
        </div>
        <Button variant="primary" onClick={() => setView('create')}>
          + New {config.label}
        </Button>
      </div>

      <div className="bills-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TAB_TYPES.map((type) => (
          <button
            key={type}
            className={`bill-type-btn ${activeType === type ? 'active' : ''}`}
            onClick={() => {
              setActiveType(type);
              goToPage(1);
              window.location.hash = `documents?type=${type}`;
            }}
          >
            {DOCUMENT_TYPES[type].label}
          </button>
        ))}
      </div>

      <div
        className="bills-filters"
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: 16,
          padding: 'var(--sp-3)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Party
          </label>
          <select
            className="form-input"
            value={filterPartyId}
            onChange={(e) => setFilterPartyId(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">All Parties</option>
            {parties.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            From
          </label>
          <input
            className="form-input"
            type="date"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            To
          </label>
          <input
            className="form-input"
            type="date"
            value={filterToDate}
            onChange={(e) => setFilterToDate(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Status
          </label>
          <select
            className="form-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ minWidth: 130 }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="converted">Converted</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="sm" onClick={applyFilters}>
            Apply
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bills-toolbar">
        <input
          className="form-input bills-search"
          placeholder={`Search ${config.label.toLowerCase()}s…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📄"
          title={`No ${config.label}s yet`}
          description={`Create your first ${config.label.toLowerCase()} to get started.`}
          action={
            <Button variant="primary" onClick={() => setView('create')}>
              + New {config.label}
            </Button>
          }
        />
      ) : (
        <>
          <div className="table-wrapper">
            {/* Desktop */}
            <div className="table-desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Number</th>
                    <th>Party</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((doc, i) => (
                    <tr key={doc.id || doc._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                        {from + i}
                      </td>
                      <td>{formatDate(doc.documentDate || doc.date)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>
                        {doc.documentNumber || doc.invoiceNumber}
                      </td>
                      <td style={{ fontWeight: 500 }}>{doc.Party?.name || doc.name || '—'}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>
                        {formatCurrency(doc.totalAmount || 0)}
                      </td>
                      <td>
                        <Badge variant={doc.status === 'converted' ? 'success' : 'default'}>
                          {doc.status || 'Open'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <ActionMenu
                          trigger={<Button variant="ghost" size="sm">⋯</Button>}
                          items={[
                            {
                              label: 'Edit',
                              icon: '✏️',
                              onClick: () => {
                                setEditId(doc.id || doc._id);
                                setView('edit');
                              },
                            },
                            {
                              label: 'Preview / Print',
                              icon: '🖨️',
                              onClick: () => {
                                setActiveDoc(doc);
                                setView('preview');
                              },
                            },
                            ...(config.convertible && doc.status !== 'converted'
                              ? [
                                {
                                  label: 'Convert to Invoice',
                                  icon: '📄',
                                  onClick: async () => {
                                    try {
                                      await convertToInvoice(doc.id || doc._id, activeType);
                                      toast.success('Converted to Sale Invoice');
                                      loadDocuments(activeType);
                                    } catch (err) {
                                      toast.error('Conversion failed');
                                    }
                                  },
                                },
                              ]
                              : []),
                            {
                              label: 'Delete',
                              icon: '🗑',
                              danger: true,
                              onClick: () => setDeleteId(doc.id || doc._id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div
              className="bill-cards-list"
              style={{ padding: 'var(--sp-4)', display: 'none' }}
              id="mobile-bills"
            >
              {paginated.map((doc) => (
                <div key={doc.id || doc._id} className="bill-card-mobile">
                  <div className="bill-card-mobile__row">
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                      {doc.documentNumber || doc.invoiceNumber}
                    </span>
                    <Badge variant={doc.status === 'converted' ? 'success' : 'default'}>
                      {doc.status || 'Open'}
                    </Badge>
                  </div>
                  <div className="bill-card-mobile__row">
                    <span className="bill-card-mobile__label">
                      {doc.Party?.name || doc.name || '—'}
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {formatCurrency(doc.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="bill-card-mobile__row">
                    <span className="bill-card-mobile__label">
                      {formatDate(doc.documentDate || doc.date)}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditId(doc.id || doc._id);
                          setView('edit');
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
