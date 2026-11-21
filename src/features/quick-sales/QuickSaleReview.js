import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiClock, FiLink, FiSearch, FiShield, FiUnlock, FiX } from 'react-icons/fi';
import {
  fetchQuickSaleAliasAuditAPI,
  fetchQuickSaleAliasesAPI,
  mapQuickSaleAliasAPI,
  reviewQuickSaleAliasAPI,
  unlinkQuickSaleAliasAPI,
  verifyQuickSaleGstAPI,
} from '../../api/quickSales';
import { formatCurrency } from '../../utils/currency';
import { hasPermission } from '../../utils/permissions';
import useAppStore from '../../store/appStore';
import useAuthStore from '../../store/authStore';
import './QuickSaleReview.css';

const GST_RATES = [0, 0.1, 0.25, 1.5, 3, 5, 6, 12, 18, 28, 40];
const TABS = [
  { id: 'pending', label: 'Pending review' },
  { id: 'linked', label: 'Product linked' },
  { id: 'reviewed', label: 'Reviewed history' },
  { id: 'all', label: 'All Quick Sale' },
];

const emptyFilters = {
  search: '',
  fromDate: '',
  toDate: '',
  cashierId: '',
  counterId: '',
};

function formatStatus(value) {
  return String(value || '').replace(/_/g, ' ').toLowerCase();
}

export default function QuickSaleReview() {
  const user = useAuthStore((state) => state.user);
  const products = useAppStore((state) => state.products);
  const [tab, setTab] = useState('pending');
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [drafts, setDrafts] = useState({});
  const [productSearch, setProductSearch] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [unlinkReasons, setUnlinkReasons] = useState({});
  const [audit, setAudit] = useState({});
  const [selectedAlias, setSelectedAlias] = useState(null);

  const canVerify = hasPermission(user, 'quick-sales.aliases.verify');
  const canMap = hasPermission(user, 'quick-sales.aliases.map');
  const canReview = hasPermission(user, 'quick-sales.aliases.review');
  const canUnlink = hasPermission(user, 'quick-sales.aliases.unlink');

  const loadAliases = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchQuickSaleAliasesAPI({
        companyId: user?.companyId,
        tab,
        page,
        pageSize: 20,
        ...appliedFilters,
      });
      const loadedRows = Array.isArray(result?.data) ? result.data : [];
      setRows(loadedRows);
      setPagination(result?.pagination || { page: 1, totalPages: 1, total: 0 });
      return loadedRows;
    } catch (loadError) {
      setError(loadError.message || 'Could not load Quick Sale aliases.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, tab, user?.companyId]);

  useEffect(() => {
    loadAliases(1);
  }, [loadAliases]);

  const productOptions = useMemo(() => {
    const normalize = (value) => String(value || '').trim().toLowerCase();
    return (query) => {
      const term = normalize(query);
      if (!term) return [];
      return products
        .filter((product) =>
          [product.name, product.sku, product.barcode]
            .some((value) => normalize(value).includes(term)),
        )
        .slice(0, 20);
    };
  }, [products]);

  function updateDraft(aliasId, patch) {
    setDrafts((current) => ({
      ...current,
      [aliasId]: { priceType: 'WITH_GST', ...current[aliasId], ...patch },
    }));
  }

  async function runAction(aliasId, action, callback) {
    const actionKey = `${aliasId}:${action}`;
    setBusyAction(actionKey);
    setError('');
    try {
      await callback();
      const refreshedRows = await loadAliases(pagination.page);
      if (selectedAlias?.id === aliasId) {
        setSelectedAlias(
          refreshedRows?.find((alias) => alias.id === aliasId) || null,
        );
      }
      return true;
    } catch (actionError) {
      setError(actionError.message || 'Quick Sale action failed.');
      return false;
    } finally {
      setBusyAction('');
    }
  }

  async function handleVerify(alias) {
    const draft = drafts[alias.id] || {};
    await runAction(alias.id, 'verify', () =>
      verifyQuickSaleGstAPI(alias.id, {
        taxRate: Number(draft.taxRate),
        priceType: 'WITH_GST',
        hsnCode: String(draft.hsnCode || '').trim(),
      }),
    );
  }

  async function handleMap(alias) {
    const productId = selectedProducts[alias.id];
    if (!productId) {
      setError('Choose a registered product before mapping this alias.');
      return;
    }
    await runAction(alias.id, 'map', () =>
      mapQuickSaleAliasAPI(alias.id, Number(productId)),
    );
  }

  async function handleUnlink(alias) {
    const reason = String(unlinkReasons[alias.id] || '').trim();
    if (!reason) {
      setError('Enter a reason before unlinking the product.');
      return;
    }
    const succeeded = await runAction(alias.id, 'unlink', () =>
      unlinkQuickSaleAliasAPI(alias.id, reason),
    );
    if (succeeded) {
      setUnlinkReasons((current) => ({ ...current, [alias.id]: '' }));
    }
  }

  async function toggleAudit(aliasId) {
    if (audit[aliasId]) {
      setAudit((current) => ({ ...current, [aliasId]: null }));
      return;
    }
    setBusyAction(`${aliasId}:audit`);
    setError('');
    try {
      const events = await fetchQuickSaleAliasAuditAPI(aliasId);
      setAudit((current) => ({ ...current, [aliasId]: events }));
    } catch (auditError) {
      setError(auditError.message || 'Could not load alias history.');
    } finally {
      setBusyAction('');
    }
  }

  useEffect(() => {
    if (!selectedAlias) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') setSelectedAlias(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedAlias]);

  const pageStats = [
    { label: 'Matching aliases', value: pagination.total || 0 },
    { label: 'On this page', value: rows.length },
    { label: 'Product linked', value: rows.filter((alias) => alias.mappingStatus === 'LINKED').length },
    { label: 'GST pending', value: rows.filter((alias) => alias.gstVerificationStatus !== 'GST_VERIFIED').length },
  ];
  const selectedDraft = selectedAlias ? drafts[selectedAlias.id] || {} : {};
  const selectedOptions = selectedAlias ? productOptions(productSearch[selectedAlias.id]) : [];
  const selectedActionBusy = (action) =>
    selectedAlias && busyAction === `${selectedAlias.id}:${action}`;
  const pageStart = pagination.total
    ? ((pagination.page - 1) * 20) + 1
    : 0;
  const pageEnd = pageStart ? pageStart + rows.length - 1 : 0;

  return (
    <main className="quick-sale-review">
      <header className="quick-sale-review__hero">
        <div className="quick-sale-review__hero-copy">
          <span className="quick-sale-review__eyebrow"><FiShield /> POST-SALE LEDGER</span>
          <h1>Quick Sale Review &amp; History</h1>
          <p>Review cashier-entered items, verify tax details, and link aliases to registered products.</p>
        </div>
        <div className="quick-sale-review__headline-count">
          <span>{tab === 'pending' ? 'Pending review' : 'Matching records'}</span>
          <strong>{pagination.total || 0}</strong>
        </div>
      </header>

      <section className="quick-sale-review__summary" aria-label="Quick Sale summary">
        {pageStats.map((stat) => (
          <article className="quick-sale-review__summary-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="quick-sale-review__filters" aria-label="Quick Sale filters">
        <div className="quick-sale-review__tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form
          className="quick-sale-review__filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedFilters({ ...filters });
          }}
        >
          <label className="quick-sale-review__search">
            <span>Search item or barcode</span>
            <span className="quick-sale-review__search-input">
              <FiSearch />
              <input
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="Name, barcode"
              />
            </span>
          </label>
          <label>
            <span>From date</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })}
            />
          </label>
          <label>
            <span>To date</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters({ ...filters, toDate: event.target.value })}
            />
          </label>
          <label>
            <span>Cashier ID</span>
            <input
              inputMode="numeric"
              value={filters.cashierId}
              onChange={(event) => setFilters({ ...filters, cashierId: event.target.value })}
              placeholder="Any"
            />
          </label>
          <label>
            <span>Counter ID</span>
            <input
              inputMode="numeric"
              value={filters.counterId}
              onChange={(event) => setFilters({ ...filters, counterId: event.target.value })}
              placeholder="Any"
            />
          </label>
          <button type="submit" className="quick-sale-review__apply" disabled={loading}>
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
        </form>
      </section>

      {!selectedAlias && error && <div role="alert" className="quick-sale-review__error">{error}</div>}
      {loading && rows.length === 0 && <div className="quick-sale-review__empty">Loading Quick Sale records…</div>}
      {!loading && rows.length === 0 && (
        <div className="quick-sale-review__empty">No Quick Sale records match these filters.</div>
      )}

      {rows.length > 0 && (
        <section className="quick-sale-review__table-panel" aria-label="Quick Sale alias records">
          <div className="quick-sale-review__table-heading">
            <div>
              <h2>{TABS.find((item) => item.id === tab)?.label || 'Quick Sale records'}</h2>
              <p>Review sales activity and open an item to update its details.</p>
            </div>
            {loading && <span className="quick-sale-review__refreshing">Updating records…</span>}
          </div>
          <div className="quick-sale-review__table-wrap">
            <table className="quick-sale-review__table">
              <thead>
                <tr>
                  <th scope="col">Alias / scanned code</th>
                  <th scope="col">Sales activity</th>
                  <th scope="col">Sales value</th>
                  <th scope="col">GST status</th>
                  <th scope="col">Product mapping</th>
                  <th scope="col">Review status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((alias) => (
                  <tr key={alias.id}>
                    <td>
                      <div className="quick-sale-review__item">
                        <strong>{alias.name}</strong>
                        <span>Alias #{alias.id}</span>
                        <small>{alias.barcode || 'No barcode recorded'}</small>
                      </div>
                    </td>
                    <td>
                      <div className="quick-sale-review__activity">
                        <strong>{alias.metrics?.quantitySold || 0}</strong>
                        <span>units · {alias.metrics?.invoiceCount || 0} invoices</span>
                      </div>
                    </td>
                    <td>
                      <div className="quick-sale-review__amount">
                        <strong>{formatCurrency(alias.metrics?.grossSales || 0)}</strong>
                        <span>Returned {formatCurrency(alias.metrics?.returnedAmount || 0)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`quick-sale-badge ${alias.gstVerificationStatus === 'GST_VERIFIED' ? 'is-verified' : 'is-pending'}`}>
                        <FiClock /> {formatStatus(alias.gstVerificationStatus)}
                      </span>
                    </td>
                    <td>
                      <div className="quick-sale-review__mapping">
                        <span className={`quick-sale-badge ${alias.mappingStatus === 'LINKED' ? 'is-verified' : 'is-pending'}`}>
                          {formatStatus(alias.mappingStatus)}
                        </span>
                        {alias.linkedProduct && <small>{alias.linkedProduct.name}</small>}
                      </div>
                    </td>
                    <td>
                      <span className="quick-sale-badge">{formatStatus(alias.reviewStatus)}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="quick-sale-review__open"
                        onClick={() => {
                          setError('');
                          setSelectedAlias(alias);
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="quick-sale-review__pagination">
            <span>Showing {pageStart}–{pageEnd} of {pagination.total || 0}</span>
            <div>
              <button
                type="button"
                disabled={loading || pagination.page <= 1}
                onClick={() => loadAliases(pagination.page - 1)}
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                type="button"
                disabled={loading || pagination.page >= pagination.totalPages}
                onClick={() => loadAliases(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      )}

      {selectedAlias && (
        <div
          className="quick-sale-review__overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedAlias(null);
          }}
        >
          <section
            className="quick-sale-review__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-sale-review-modal-title"
          >
            <header className="quick-sale-review__modal-header">
              <div className="quick-sale-review__modal-icon"><FiShield /></div>
              <div>
                <span>POST-SALE ADMINISTRATIVE ALIGNMENT</span>
                <h2 id="quick-sale-review-modal-title">Quick Sale Product Review</h2>
                <p>Alias #{selectedAlias.id} · {selectedAlias.barcode || 'No barcode recorded'}</p>
              </div>
              <button
                type="button"
                className="quick-sale-review__modal-close"
                onClick={() => setSelectedAlias(null)}
                aria-label="Close review"
              >
                <FiX />
              </button>
            </header>

            <div className="quick-sale-review__modal-body">
              {error && <div role="alert" className="quick-sale-review__error">{error}</div>}
              <section className="quick-sale-review__alias-summary">
                <div className="quick-sale-review__alias-title">
                  <div>
                    <span>ALIAS CAPTURED AT REGISTER</span>
                    <h3>{selectedAlias.name}</h3>
                  </div>
                  <div className="quick-sale-card__badges">
                    <span className={`quick-sale-badge ${selectedAlias.gstVerificationStatus === 'GST_VERIFIED' ? 'is-verified' : 'is-pending'}`}>
                      GST {formatStatus(selectedAlias.gstVerificationStatus)}
                    </span>
                    <span className={`quick-sale-badge ${selectedAlias.mappingStatus === 'LINKED' ? 'is-verified' : 'is-pending'}`}>
                      {formatStatus(selectedAlias.mappingStatus)}
                    </span>
                  </div>
                </div>
                <div className="quick-sale-review__modal-metrics">
                  <div><span>Invoices</span><strong>{selectedAlias.metrics?.invoiceCount || 0}</strong></div>
                  <div><span>Quantity sold</span><strong>{selectedAlias.metrics?.quantitySold || 0}</strong></div>
                  <div><span>Total sales</span><strong>{formatCurrency(selectedAlias.metrics?.grossSales || 0)}</strong></div>
                  <div><span>Returned</span><strong>{formatCurrency(selectedAlias.metrics?.returnedAmount || 0)}</strong></div>
                </div>
                {selectedAlias.linkedProduct && (
                  <div className="quick-sale-review__linked-product">
                    <span>Linked registered product</span>
                    <strong>{selectedAlias.linkedProduct.name}</strong>
                    {selectedAlias.linkedProduct.sku && <small>SKU: {selectedAlias.linkedProduct.sku}</small>}
                  </div>
                )}
              </section>

              <section className="quick-sale-review__edit-section">
                <div className="quick-sale-review__section-heading">
                  <div>
                    <h3>GST tax verification</h3>
                    <p>Applies to future Quick Sale entries; historical bills remain unchanged.</p>
                  </div>
                  <span className={`quick-sale-badge ${selectedAlias.gstVerificationStatus === 'GST_VERIFIED' ? 'is-verified' : 'is-pending'}`}>
                    {selectedAlias.gstVerificationStatus === 'GST_VERIFIED' ? 'Verified' : 'Action required'}
                  </span>
                </div>
                {canVerify && selectedAlias.gstVerificationStatus !== 'GST_VERIFIED' ? (
                  <div className="quick-sale-review__edit-grid">
                    <label className="quick-sale-review__field">
                      <span>Applicable GST rate</span>
                      <select
                        value={selectedDraft.taxRate ?? ''}
                        onChange={(event) => updateDraft(selectedAlias.id, { taxRate: event.target.value })}
                      >
                        <option value="">Select GST rate</option>
                        {GST_RATES.map((rate) => <option value={rate} key={rate}>{rate}%</option>)}
                      </select>
                    </label>
                    <label className="quick-sale-review__field">
                      <span>HSN / SAC code (optional)</span>
                      <input
                        maxLength={15}
                        value={selectedDraft.hsnCode || ''}
                        onChange={(event) => updateDraft(selectedAlias.id, { hsnCode: event.target.value })}
                        placeholder="Enter HSN / SAC"
                      />
                    </label>
                    <div className="quick-sale-review__notice">
                      Quick Sale prices are GST-inclusive. Verification classifies future sales and does not rewrite printed bills.
                    </div>
                    <button
                      type="button"
                      className="quick-sale-review__primary"
                      disabled={!selectedDraft.taxRate || selectedActionBusy('verify')}
                      onClick={() => handleVerify(selectedAlias)}
                    >
                      <FiCheck /> {selectedActionBusy('verify') ? 'Saving…' : 'Save GST verification'}
                    </button>
                  </div>
                ) : (
                  <p className="quick-sale-review__read-only">
                    {selectedAlias.gstVerificationStatus === 'GST_VERIFIED'
                      ? 'GST classification is verified for future Quick Sale entries.'
                      : 'You do not have permission to verify GST details.'}
                  </p>
                )}
              </section>

              <section className="quick-sale-review__edit-section">
                <div className="quick-sale-review__section-heading">
                  <div>
                    <h3>Map to master catalog</h3>
                    <p>Link this register alias to an existing product without changing historical sales.</p>
                  </div>
                  <span className={`quick-sale-badge ${selectedAlias.mappingStatus === 'LINKED' ? 'is-verified' : 'is-pending'}`}>
                    {selectedAlias.mappingStatus === 'LINKED' ? 'Product linked' : 'Pending link'}
                  </span>
                </div>
                {canMap ? (
                  <div className="quick-sale-review__edit-grid quick-sale-review__mapping-grid">
                    <label className="quick-sale-review__field quick-sale-review__field--wide">
                      <span>Search registered products</span>
                      <input
                        value={productSearch[selectedAlias.id] || ''}
                        onChange={(event) => setProductSearch((current) => ({
                          ...current,
                          [selectedAlias.id]: event.target.value,
                        }))}
                        placeholder="Product name, SKU or barcode"
                      />
                    </label>
                    <label className="quick-sale-review__field quick-sale-review__field--wide">
                      <span>Target registered product</span>
                      <select
                        value={selectedProducts[selectedAlias.id] || ''}
                        onChange={(event) => setSelectedProducts((current) => ({
                          ...current,
                          [selectedAlias.id]: event.target.value,
                        }))}
                        aria-label={`Registered product for ${selectedAlias.name}`}
                      >
                        <option value="">Choose product</option>
                        {selectedOptions.map((product) => (
                          <option value={product.id} key={product.id}>
                            {product.name}{product.sku ? ` · ${product.sku}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="quick-sale-review__primary"
                      disabled={!selectedProducts[selectedAlias.id] || selectedActionBusy('map')}
                      onClick={() => handleMap(selectedAlias)}
                    >
                      <FiLink /> {selectedActionBusy('map') ? 'Linking…' : 'Save product link'}
                    </button>
                  </div>
                ) : (
                  <p className="quick-sale-review__read-only">
                    {selectedAlias.linkedProduct
                      ? `Linked to ${selectedAlias.linkedProduct.name}.`
                      : 'You do not have permission to link a registered product.'}
                  </p>
                )}
              </section>

              <section className="quick-sale-review__edit-section quick-sale-review__record-actions">
                <div className="quick-sale-review__section-heading">
                  <div>
                    <h3>Review controls</h3>
                    <p>Update review status, manage an existing link, or inspect the audit trail.</p>
                  </div>
                </div>
                <div className="quick-sale-review__control-row">
                  {canReview && selectedAlias.reviewStatus !== 'REVIEWED' && (
                    <button
                      type="button"
                      className="quick-sale-review__secondary"
                      disabled={selectedActionBusy('review')}
                      onClick={() => runAction(
                        selectedAlias.id,
                        'review',
                        () => reviewQuickSaleAliasAPI(selectedAlias.id),
                      )}
                    >
                      <FiCheck /> {selectedActionBusy('review') ? 'Saving…' : 'Mark reviewed'}
                    </button>
                  )}
                  {canUnlink && selectedAlias.mappingStatus === 'LINKED' && (
                    <div className="quick-sale-review__unlink">
                      <label className="quick-sale-review__field">
                        <span>Reason to unlink</span>
                        <input
                          maxLength={255}
                          value={unlinkReasons[selectedAlias.id] || ''}
                          onChange={(event) => setUnlinkReasons((current) => ({
                            ...current,
                            [selectedAlias.id]: event.target.value,
                          }))}
                          placeholder="Enter a reason"
                          aria-label={`Unlink reason for ${selectedAlias.name}`}
                        />
                      </label>
                      <button
                        type="button"
                        className="quick-sale-review__danger"
                        disabled={!String(unlinkReasons[selectedAlias.id] || '').trim() || selectedActionBusy('unlink')}
                        onClick={() => handleUnlink(selectedAlias)}
                      >
                        <FiUnlock /> {selectedActionBusy('unlink') ? 'Unlinking…' : 'Unlink product'}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="quick-sale-review__secondary"
                    disabled={selectedActionBusy('audit')}
                    onClick={() => toggleAudit(selectedAlias.id)}
                  >
                    {selectedActionBusy('audit') ? 'Loading history…' : audit[selectedAlias.id] ? 'Hide audit history' : 'Audit history'}
                  </button>
                </div>
                {Array.isArray(audit[selectedAlias.id]) && (
                  <div className="quick-sale-audit">
                    {audit[selectedAlias.id].length === 0 ? (
                      <p>No audit events recorded.</p>
                    ) : audit[selectedAlias.id].map((event) => (
                      <div key={event.id}>
                        <strong>{formatStatus(event.action)}</strong>
                        <span>{event.actor?.name || 'User'} · {new Date(event.createdAt).toLocaleString()}</span>
                        {event.reason && <small>{event.reason}</small>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <footer className="quick-sale-review__modal-footer">
              <button type="button" className="quick-sale-review__secondary" onClick={() => setSelectedAlias(null)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
