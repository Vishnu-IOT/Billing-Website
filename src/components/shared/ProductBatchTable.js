/* ===== PRODUCT BATCH TABLE — batch/expiry sub-table per product ===== */
import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchProductBatchesAPI,
  addProductBatchAPI,
  updateProductBatchAPI,
  deleteProductBatchAPI,
} from '../../api';
import { Button, Badge, Modal, ConfirmModal } from '../ui';
import { useToast } from '../../hooks/useToast';
import { formatDateInput } from '../../utils/date';
import { invalidateBatchCache } from './BatchSelector';
import DateInput from './DateInput';

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

const EMPTY_BATCH = {
  batchNumber: '',
  quantity: '',
  freeQuantity: 0,
  MRP: '',
  purchasePrice: '',
  sellingPrice: '',
  discount: 0,
  gstPercentage: '',
  expiryDate: '',
  mfgDate: '',
};

export default function ProductBatchTable({ productId, productName, unit = 'PCS' }) {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [form, setForm] = useState(EMPTY_BATCH);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [loadError, setLoadError] = useState('');

  const loadBatches = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchProductBatchesAPI(productId);
      setBatches(Array.isArray(data) ? data : data?.data ?? []);
    } catch (error) {
      setBatches([]);
      setLoadError(error.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // ── Form Validation ──
  function validateForm() {
    const errors = {};
    if (!form.batchNumber.trim()) {
      errors.batchNumber = 'Batch number is required';
    }
    if (!editingBatch && (!form.quantity || Number(form.quantity) <= 0)) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    const today = new Date().toISOString().split("T")[0];

    if (!editingBatch) {
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
      const quantity = Number(form.quantity);
      const freeQuantity = Number(form.freeQuantity) || 0;
      let companyId;
      try {
        const erpSettings = localStorage.getItem('erp-settings');
        companyId = erpSettings
          ? JSON.parse(erpSettings)?.state?.companyId
          : null;
      } catch {
        companyId = null;
      }
      const batchPayload = {
        batchNumber: form.batchNumber,
        ...(form.MRP !== '' && { mrp: Number(form.MRP) }),
        ...(form.purchasePrice !== '' && {
          purchasePrice: Number(form.purchasePrice),
        }),
        ...(form.sellingPrice !== '' && {
          salePrice: Number(form.sellingPrice),
        }),
        discount: Number(form.discount) || 0,
        ...(form.gstPercentage !== '' && {
          gstPercentage: Number(form.gstPercentage),
        }),
        ...(form.mfgDate && { mfgDate: form.mfgDate }),
        ...(form.expiryDate && { expiryDate: form.expiryDate }),
      };
      if (editingBatch) {
        await updateProductBatchAPI(
          productId,
          editingBatch.id || editingBatch._id,
          batchPayload,
        );
        toast.success('Batch updated');
      } else {
        if (!companyId) {
          toast.error('Company details are required to add a batch');
          return;
        }
        await addProductBatchAPI(productId, {
          ...batchPayload,
          paidQuantity: quantity,
          freeQuantity,
          companyId: Number(companyId),
        });
        toast.success('Batch added');
      }
      invalidateBatchCache(productId);
      setModalOpen(false);
      setEditingBatch(null);
      setForm(EMPTY_BATCH);
      loadBatches();
    } catch (error) {
      toast.error(error.message || 'Failed to add batch');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteProductBatchAPI(productId, deleteId);
      toast.success('Batch deleted');
      invalidateBatchCache(productId);
      loadBatches();
    } catch (error) {
      toast.error(error.message || 'Delete failed');
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
        onClose={() => { setModalOpen(false); setEditingBatch(null); setFormErrors({}) }}
        title={`${editingBatch ? 'Edit' : 'Add'} Batch — ${productName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingBatch(null); setFormErrors({}) }}>
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
            <label className="form-label">Paid Quantity *</label>
            <input
              type="number"
              min="0.001"
              step={unit === 'KG' ? '0.001' : '1'}
              placeholder='Enter Qty'
              className="form-input"
              value={form.quantity}
              readOnly={!!editingBatch}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
            {formErrors.quantity && (
              <span className="um-error-text">{formErrors.quantity}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Supplier Free Quantity</label>
            <input
              type="number"
              min="0"
              step={unit === 'KG' ? '0.001' : '1'}
              className="form-input"
              value={form.freeQuantity}
              readOnly={!!editingBatch}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  freeQuantity: e.target.value,
                }))
              }
            />
            <span className="price-gst-hint">
              {editingBatch
                ? `Available: ${form.quantity || 0} ${unit}`
                : `Total received: ${Number(form.quantity || 0) + Number(form.freeQuantity || 0)} ${unit}`}
            </span>
          </div>
          <div className="form-group">
            <label className="form-label">Batch MRP (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={form.MRP}
              onChange={(e) => setForm((current) => ({ ...current, MRP: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Purchase Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm((current) => ({ ...current, purchasePrice: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Selling Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={form.sellingPrice}
              onChange={(e) =>
                setForm((current) => ({ ...current, sellingPrice: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="form-input"
              value={form.discount}
              onChange={(e) =>
                setForm((current) => ({ ...current, discount: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">GST (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="form-input"
              value={form.gstPercentage}
              onChange={(e) =>
                setForm((current) => ({ ...current, gstPercentage: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mfg Date *</label>
            <DateInput
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
            <DateInput
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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingBatch(null);
            setForm(EMPTY_BATCH);
            setModalOpen(true);
          }}
        >
          + Add Batch
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading batches…</div>
      ) : loadError ? (
        <div className="um-error-text" role="alert">{loadError}</div>
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
                <th>MRP</th>
                <th>Purchase</th>
                <th>Selling</th>
                <th>Discount</th>
                <th>GST</th>
                <th>Paid Qty</th>
                <th>Free Qty</th>
                <th>Total Received</th>
                <th>Available</th>
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
                    <td>{b.MRP ?? b.mrp ?? '—'}</td>
                    <td>{b.purchasePrice ?? '—'}</td>
                    <td>{b.salePrice ?? b.sellingPrice ?? '—'}</td>
                    <td>{b.discount ?? 0}%</td>
                    <td>{b.gstPercentage ?? '—'}%</td>
                    <td>{b.paidQuantity ?? b.quantity ?? '—'} {unit}</td>
                    <td>{b.freeQuantity ?? 0} {unit}</td>
                    <td>{b.totalReceivedQuantity ?? (Number(b.paidQuantity ?? b.quantity ?? 0) + Number(b.freeQuantity ?? 0))} {unit}</td>
                    <td>{b.availableQuantity ?? b.quantity ?? '—'} {unit}</td>
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
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingBatch(b);
                            setForm({
                              batchNumber: b.batchNumber || b.batchNo || '',
                              quantity: b.availableQuantity ?? b.quantity ?? '',
                              freeQuantity: b.freeQuantity ?? 0,
                              MRP: b.MRP ?? b.mrp ?? '',
                              purchasePrice: b.purchasePrice ?? '',
                              sellingPrice: b.salePrice ?? b.sellingPrice ?? '',
                              discount: b.discount ?? 0,
                              gstPercentage: b.gstPercentage ?? '',
                              expiryDate: b.expiryDate
                                ? String(b.expiryDate).slice(0, 10)
                                : '',
                              mfgDate: b.mfgDate ? String(b.mfgDate).slice(0, 10) : '',
                            });
                            setFormErrors({});
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      <Button
                        variant="danger-outline"
                        size="sm"
                        onClick={() => setDeleteId(b.id || b._id)}
                      >
                        Delete
                      </Button>
                      </div>
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
