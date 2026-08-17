/* ===== PRODUCT BATCH TABLE — batch/expiry sub-table per product ===== */
import React, { useEffect, useState } from 'react';
import {
  fetchProductBatchesAPI,
  addProductBatchAPI,
  deleteProductBatchAPI,
} from '../../api';
import { Button, Badge, Modal, ConfirmModal } from '../ui';
import { useToast } from '../../hooks/useToast';
import { formatDateInput } from '../../utils/date';

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', variant: 'danger' };
  if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, variant: 'warning' };
  return { label: 'OK', variant: 'success' };
}

const EMPTY_BATCH = { batchNumber: '', quantity: '', expiryDate: '', mfgDate: '' };

export default function ProductBatchTable({ productId, productName }) {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_BATCH);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  async function loadBatches() {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await fetchProductBatchesAPI(productId);
      setBatches(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, [productId]);

  // ── Form Validation ──
  function validateForm() {
    const errors = {};
    if (!form.batchNumber.trim()) {
      errors.batchNumber = 'Batch number is required';
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    const today = new Date().toISOString().split("T")[0];

    if (!form.mfgDate) {
      errors.mfgDate = "Mfg Date is required";
    } else if (form.mfgDate > today) {
      errors.mfgDate = "Mfg Date cannot be a future date";
    }

    if (!form.expiryDate) {
      errors.expiryDate = "Expiry Date is required";
    } else if (form.expiryDate < today) {
      errors.expiryDate = "Expiry Date cannot be a past date";
    }

    if (form.mfgDate && form.expiryDate && form.expiryDate < form.mfgDate) {
      errors.expiryDate = "Expiry Date must be after Mfg Date";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await addProductBatchAPI(productId, form);
      toast.success('Batch added');
      setModalOpen(false);
      setForm(EMPTY_BATCH);
      loadBatches();
    } catch {
      toast.error('Failed to add batch');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteProductBatchAPI(productId, deleteId);
      toast.success('Batch deleted');
      loadBatches();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  }

  const hasExpiryAlert = batches.some((b) => {
    const s = getExpiryStatus(b.expiryDate);
    return s && (s.variant === 'warning' || s.variant === 'danger');
  });

  return (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete batch?"
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormErrors({}) }}
        title={`Add Batch — ${productName}`}
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
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Batch No *</label>
            <input
              className="form-input"
              placeholder='Batch Number'
              value={form.batchNumber}
              onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
            />
            {formErrors.batchNumber && (
              <span className="um-error-text">{formErrors.batchNumber}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input
              type="number"
              placeholder='Enter Qty'
              className="form-input"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
            {formErrors.quantity && (
              <span className="um-error-text">{formErrors.quantity}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Mfg Date *</label>
            <input
              type="date"
              className="form-input"
              max={new Date().toISOString().split("T")[0]}
              value={form.mfgDate}
              onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))}
            />
            {formErrors.mfgDate && (
              <span className="um-error-text">{formErrors.mfgDate}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date *</label>
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              className="form-input"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
            {formErrors.expiryDate && (
              <span className="um-error-text">{formErrors.expiryDate}</span>
            )}
          </div>
        </div>
      </Modal>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--sp-3)',
        }}
      >
        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, margin: 0 }}>
          Batch & Expiry
          {hasExpiryAlert && (
            <Badge variant="warning" style={{ marginLeft: 8 }}>
              Expiry Alert
            </Badge>
          )}
        </h3>
        <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
          + Add Batch
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading batches…</div>
      ) : batches.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          No batch records. Add batches to track expiry.
        </div>
      ) : (
        <div className="table-wrapper batch-table-wrapper">
          <table className="batch-table">
            <thead>
              <tr>
                <th>Batch No</th>
                <th>Qty</th>
                <th>Mfg Date</th>
                <th>Expiry</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const expiryStatus = getExpiryStatus(b.expiryDate);
                return (
                  <tr key={b.id || b._id}>
                    <td style={{ fontWeight: 600 }}>{b.batchNo || b.batchNumber}</td>
                    <td>{b.quantity ?? '—'}</td>
                    <td>{formatDateInput(b.mfgDate) || '—'}</td>
                    <td>{formatDateInput(b.expiryDate) || '—'}</td>
                    <td>
                      {expiryStatus ? (
                        <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <Button
                        variant="danger-outline"
                        size="sm"
                        onClick={() => setDeleteId(b.id || b._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
