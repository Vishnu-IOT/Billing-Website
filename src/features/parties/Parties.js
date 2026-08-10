/* ===== PARTIES PAGE ===== */
import React, { useState, useMemo, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import {
  Button,
  Modal,
  ConfirmModal,
  EmptyState,
  Badge,
  Pagination,
  ToastContainer,
} from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { fetchInvoiceByPartiesIdAPI } from '../../api';
import { formatCurrency } from '../../utils/currency';
import '../../styles/Users.css';
import '../../styles/products.css';

const EMPTY_FORM = { name: '', phone: '', email: '', GST: '', address: '' };

const AVATAR_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Parties() {
  const { parties, addParty, updateParty, deleteParty } = useAppStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editParty, setEditParty] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Two-Pane States
  const [selectedParty, setSelectedParty] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'sales' | 'purchase'
  const [formErrors, setFormErrors] = useState({});

  const debouncedSearch = useDebounce(search, 250);

  // ── Form Validation ──
  function validateForm() {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'Invalid email address';
    }
    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(form.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    if (!form.address.trim()) {
      errors.address = 'Address is required';
    }
    if (!form.GST.trim()) {
      errors.GST = 'GST number is required';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.GST)) {
      errors.GST = 'Invalid GST number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Left sidebar search filter
  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      const q = debouncedSearch.toLowerCase();
      return (
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.GST?.toLowerCase().includes(q)
      );
    });
  }, [parties, debouncedSearch]);

  // Select first party on load
  useEffect(() => {
    if (parties.length > 0 && !selectedParty) {
      handlePartySelect(parties[0]);
    }
  }, [parties, selectedParty]);

  async function handlePartySelect(party) {
    setSelectedParty(party);
    setTxPage(1);
    setInvoices([]);
    setInvoicesLoading(true);
    try {
      const data = await fetchInvoiceByPartiesIdAPI(party.id || party._id);
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to fetch invoices for party', err);
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }

  function openAdd() {
    setEditParty(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(party) {
    setEditParty(party);
    setForm({
      name: party.name || '',
      phone: party.phone || '',
      email: party.email || '',
      GST: party.GST || '',
      address: party.address || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    // if (!form.name.trim()) {
    //   toast.error('Name is required');
    //   return;
    // }
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editParty) {
        const id = editParty.id || editParty._id;
        await updateParty(id, form);
        toast.success('Party updated');
        setSelectedParty((prev) =>
          prev && String(prev.id || prev._id) === String(id)
            ? { ...prev, ...form }
            : prev
        );
      } else {
        const saved = await addParty(form);
        toast.success('Party added');
        if (saved) {
          handlePartySelect(saved);
        }
      }
      setModalOpen(false);
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteParty(deleteId);
      toast.success('Party deleted');
      if (
        selectedParty &&
        String(selectedParty.id || selectedParty._id) === String(deleteId)
      ) {
        setSelectedParty(null);
        setInvoices([]);
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  }

  // Unified Transaction filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const typeStr = String(inv.type || '').toLowerCase();
      const isPurchase = typeStr.includes('purchase') || !!inv.purchaseDate;
      if (txFilter === 'sales') return !isPurchase;
      if (txFilter === 'purchase') return isPurchase;
      return true;
    });
  }, [invoices, txFilter]);

  // Transaction Pagination
  const TX_ITEMS_PER_PAGE = 8;
  const totalTxPages =
    Math.ceil(filteredInvoices.length / TX_ITEMS_PER_PAGE) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (txPage - 1) * TX_ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + TX_ITEMS_PER_PAGE);
  }, [filteredInvoices, txPage]);

  function getBillTypeInfo(inv) {
    const typeStr = String(inv.type || '').toLowerCase();
    if (typeStr.includes('purchase') || inv.purchaseDate) {
      return { label: 'Purchase', variant: 'warning' };
    }
    return { label: 'Sales', variant: 'success' };
  }

  function getPaymentBadgeVariant(status = '') {
    const s = status.toLowerCase();
    if (s === 'paid') return 'success';
    if (s === 'partial') return 'warning';
    return 'danger';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 'var(--sp-4)',
      }}
    >
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Party?"
        message="This will not delete their invoices."
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormErrors({}) }}
        title={editParty ? 'Edit Party' : 'Add New Party'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setFormErrors({}) }}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
          }}
        >
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {formErrors.name && (
              <div className="um-error-text">{formErrors.name}</div>
            )}
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
              {formErrors.phone && (
                <div className="um-error-text">{formErrors.phone}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              {formErrors.email && (
                <div className="um-error-text">{formErrors.email}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input
                className="form-input"
                value={form.GST}
                onChange={(e) =>
                  setForm((f) => ({ ...f, GST: e.target.value }))
                }
              />
              {formErrors.GST && (
                <div className="um-error-text">{formErrors.GST}</div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="form-textarea"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
            {formErrors.address && (
              <div className="um-error-text">{formErrors.address}</div>
            )}
          </div>
        </div>
      </Modal>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>Parties</h1>
          <p className="page-header__sub">
            {parties.length} customers & vendors registered
          </p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          + Add Party
        </Button>
      </div>

      <div className="pu-layout" style={{ gridTemplateColumns: '290px 1fr' }}>
        {/* Left Sidebar */}
        <div
          className="pu-sidebar"
          style={{
            height: 'calc(100vh - var(--topbar-height) - 130px)',
            minHeight: 450,
          }}
        >
          <div className="pu-sidebar-header">
            <span className="pu-sidebar-title">All Parties</span>
          </div>

          <div className="pu-sidebar-search">
            <span className="pu-search-icon">🔍</span>
            <input
              className="pu-search-input"
              placeholder="Search by name, phone, GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pu-party-list" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredParties.length === 0 ? (
              <div className="pu-empty">No parties found</div>
            ) : (
              filteredParties.map((p) => {
                const isActive =
                  selectedParty &&
                  String(selectedParty.id || selectedParty._id) ===
                  String(p.id || p._id);
                return (
                  <div
                    key={p.id || p._id}
                    className={`pu-party-item ${isActive ? 'pu-party-item--active' : ''}`}
                    onClick={() => handlePartySelect(p)}
                  >
                    <div
                      className="pu-party-avatar"
                      style={{ background: getAvatarColor(p.name) }}
                    >
                      {getInitials(p.name)}
                    </div>
                    <div className="pu-party-info">
                      <div className="pu-party-name-row">
                        <span
                          className="pu-party-name"
                          style={{ maxWidth: '160px' }}
                        >
                          {p.name}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                      >
                        {p.phone || p.email || 'No contact'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="pu-main">
          {selectedParty ? (
            <>
              {/* Profile Card */}
              <div className="pu-profile-card">
                <div className="pu-profile-top">
                  <div className="pu-profile-avatar-wrap">
                    <div
                      className="pu-profile-avatar"
                      style={{ background: getAvatarColor(selectedParty.name) }}
                    >
                      {getInitials(selectedParty.name)}
                    </div>
                  </div>
                  <div className="pu-profile-info">
                    <div className="pu-profile-name-row">
                      <h2 className="pu-profile-name">{selectedParty.name}</h2>
                      <span className="pu-verified-badge">✓ Party Profile</span>
                    </div>
                    <div className="pu-profile-meta">
                      {selectedParty.GST && (
                        <span
                          className="pu-meta-item"
                          style={{ marginRight: 16 }}
                        >
                          <strong>GSTIN:</strong> {selectedParty.GST}
                        </span>
                      )}
                      {selectedParty.phone && (
                        <span
                          className="pu-meta-item"
                          style={{ marginRight: 16 }}
                        >
                          <strong>Phone:</strong> {selectedParty.phone}
                        </span>
                      )}
                      {selectedParty.email && (
                        <span
                          className="pu-meta-item"
                          style={{ marginRight: 16 }}
                        >
                          <strong>Email:</strong> {selectedParty.email}
                        </span>
                      )}
                      {selectedParty.address && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 'var(--fs-sm)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <strong>Address:</strong> {selectedParty.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="pu-profile-actions"
                    style={{ display: 'flex', gap: 8 }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(selectedParty)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger-outline"
                      size="sm"
                      onClick={() =>
                        setDeleteId(selectedParty.id || selectedParty._id)
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Transaction History Section */}
              <div
                className="npt-transaction-history-section"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div className="npt-transaction-history-header">
                  <div>
                    <h3 className="npt-transaction-history-title">
                      Transaction History
                    </h3>
                    <p
                      style={{
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                        margin: 0,
                      }}
                    >
                      Sales & Purchase transaction history
                    </p>
                  </div>

                  <div className="npt-transaction-history-filters">
                    <button
                      className={`npt-transaction-filter-btn ${txFilter === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setTxFilter('all');
                        setTxPage(1);
                      }}
                    >
                      All Invoices
                    </button>
                    <button
                      className={`npt-transaction-filter-btn ${txFilter === 'sales' ? 'active' : ''}`}
                      onClick={() => {
                        setTxFilter('sales');
                        setTxPage(1);
                      }}
                    >
                      Sales
                    </button>
                    <button
                      className={`npt-transaction-filter-btn ${txFilter === 'purchase' ? 'active' : ''}`}
                      onClick={() => {
                        setTxFilter('purchase');
                        setTxPage(1);
                      }}
                    >
                      Purchase
                    </button>
                  </div>
                </div>

                <div
                  className="npt-transaction-table-wrapper"
                  style={{ overflowX: 'auto' }}
                >
                  {invoicesLoading ? (
                    <div
                      style={{
                        padding: 40,
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Loading transactions...
                    </div>
                  ) : paginatedInvoices.length === 0 ? (
                    <div className="npt-transaction-empty-state">
                      No invoices recorded for this party.
                    </div>
                  ) : (
                    <table className="npt-transaction-table">
                      <thead>
                        <tr>
                          <th>DATE</th>
                          <th>BILL TYPE</th>
                          <th>INVOICE NO</th>
                          <th>PARTY NAME</th>
                          <th>TOTAL AMOUNT</th>
                          <th>PAYMENT STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedInvoices.map((inv) => {
                          const billType = getBillTypeInfo(inv);
                          const dateVal =
                            inv.saleDate || inv.purchaseDate || inv.date;
                          const amountVal = inv.totalAmount || inv.total || 0;
                          return (
                            <tr key={inv.id || inv._id}>
                              <td>
                                {dateVal
                                  ? new Date(dateVal).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    }
                                  )
                                  : '—'}
                              </td>
                              <td>
                                <Badge variant={billType.variant}>
                                  {billType.label}
                                </Badge>
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {inv.invoiceNo || inv.invoiceNumber || '—'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 500 }}>
                                {selectedParty.name}
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                {formatCurrency(amountVal)}
                              </td>
                              <td>
                                <Badge
                                  variant={getPaymentBadgeVariant(
                                    inv.paymentStatus || 'Paid'
                                  )}
                                >
                                  {inv.paymentStatus || 'Paid'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {filteredInvoices.length > TX_ITEMS_PER_PAGE && (
                  <div className="npt-transaction-pagination">
                    <span className="npt-transaction-pagination-info">
                      Showing {(txPage - 1) * TX_ITEMS_PER_PAGE + 1}–
                      {Math.min(
                        txPage * TX_ITEMS_PER_PAGE,
                        filteredInvoices.length
                      )}{' '}
                      of {filteredInvoices.length} transactions
                    </span>

                    <div className="npt-transaction-pagination-controls">
                      <button
                        className="npt-transaction-page-nav"
                        disabled={txPage === 1}
                        onClick={() => setTxPage((p) => p - 1)}
                      >
                        ‹
                      </button>

                      {Array.from(
                        { length: totalTxPages },
                        (_, i) => i + 1
                      ).map((p) => (
                        <button
                          key={p}
                          className={`npt-transaction-page-btn ${txPage === p ? 'active' : ''}`}
                          onClick={() => setTxPage(p)}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        className="npt-transaction-page-nav"
                        disabled={txPage === totalTxPages}
                        onClick={() => setTxPage((p) => p + 1)}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 60,
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <EmptyState
                icon="👥"
                title="Select a Party"
                description="Click on any customer or vendor on the left to view details and unified transaction history."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
