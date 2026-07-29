/* ===== PRODUCT VARIANT MANAGER MODAL ===== */
import React, { useState, useEffect } from 'react';
import { fetchVariantsByProductAPI, addVariantAPI, deleteVariantAPI } from '../../api/variants';
import { Modal, Button, ConfirmModal, Badge } from '../ui';
import { formatCurrency } from '../../utils/currency';

export default function ProductVariantModal({ open, onClose, product }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const EMPTY_FORM = {
    sku: '',
    barcode: '',
    variantName: '',
    colorAttr: '',
    sizeAttr: '',
    price: '',
    stockQuantity: 0,
  };
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open && product?.id) loadVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  async function loadVariants() {
    setLoading(true);
    const data = await fetchVariantsByProductAPI(product.id);
    setVariants(data);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.sku.trim()) return setError('SKU is required');
    if (!form.variantName.trim()) return setError('Variant name is required');
    if (!form.price || Number(form.price) <= 0) return setError('Price must be greater than 0');

    const attributes = {};
    if (form.colorAttr) attributes.color = form.colorAttr;
    if (form.sizeAttr) attributes.size = form.sizeAttr;

    setSaving(true);
    await addVariantAPI({
      productId: product.id,
      sku: form.sku,
      barcode: form.barcode,
      variantName: form.variantName,
      attributes,
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity || 0),
    });
    setSaving(false);
    setForm(EMPTY_FORM);
    setError('');
    loadVariants();
  }

  async function handleDelete() {
    await deleteVariantAPI(deleteId);
    setDeleteId(null);
    loadVariants();
  }

  return (
    <>
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Variant?"
        message="This product variant will be permanently removed."
      />
      <Modal
        open={open}
        onClose={onClose}
        title={`📦 Variants — ${product?.name || ''}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        {/* Add Variant Form */}
        <form onSubmit={handleAdd}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Variant Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Red / XL"
                value={form.variantName}
                onChange={(e) => setForm((f) => ({ ...f, variantName: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">SKU *</label>
              <input
                className="form-input"
                placeholder="Unique SKU code"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Barcode</label>
              <input
                className="form-input"
                placeholder="Optional barcode"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
              gap: 10,
              alignItems: 'end',
              marginBottom: 16,
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Color</label>
              <input
                className="form-input"
                placeholder="e.g. Red"
                value={form.colorAttr}
                onChange={(e) => setForm((f) => ({ ...f, colorAttr: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Size</label>
              <input
                className="form-input"
                placeholder="e.g. XL"
                value={form.sizeAttr}
                onChange={(e) => setForm((f) => ({ ...f, sizeAttr: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Price (₹) *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                onWheel={(e) => e.target.blur()}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Stock Qty</label>
              <input
                className="form-input"
                type="number"
                min="0"
                onWheel={(e) => e.target.blur()}
                placeholder="0"
                value={form.stockQuantity}
                onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
              />
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? '…' : '+ Add'}
            </Button>
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginBottom: 12 }}>
              ⚠️ {error}
            </p>
          )}
        </form>

        {/* Variants Table */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading variants…
            </div>
          ) : variants.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No variants yet. Add product variants above.
            </div>
          ) : (
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Attributes</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Stock</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  let attrs = {};
                  try {
                    attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
                  } catch {}
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{v.variantName}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--primary)' }}>
                        {v.sku}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {Object.entries(attrs).map(([k, val]) => (
                            <span
                              key={k}
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                              }}
                            >
                              {k}: {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-right" style={{ fontWeight: 700 }}>
                        {formatCurrency(v.price)}
                      </td>
                      <td className="text-right">
                        <span
                          style={{
                            color: Number(v.stockQuantity) <= 0 ? 'var(--danger)' : 'var(--success)',
                            fontWeight: 600,
                          }}
                        >
                          {v.stockQuantity}
                        </span>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteId(v.id)}
                        >
                          🗑 Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </>
  );
}
