/* ===== BRAND MANAGER MODAL ===== */
import React, { useState, useEffect } from 'react';
import { fetchBrandsAPI, addBrandAPI, updateBrandAPI, deleteBrandAPI } from '../../api/brands';
import { Modal, Button, ConfirmModal } from '../ui';

export default function BrandManagerModal({ open, onClose }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) loadBrands();
  }, [open]);

  async function loadBrands() {
    setLoading(true);
    const data = await fetchBrandsAPI();
    setBrands(data);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ name: '', description: '' });
    setError('');
  }

  function openEdit(b) {
    setEditId(b.id);
    setForm({ name: b.name, description: b.description || '' });
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Brand name is required');
      return;
    }
    setSaving(true);
    if (editId) {
      await updateBrandAPI(editId, form);
    } else {
      await addBrandAPI(form);
    }
    setSaving(false);
    setEditId(null);
    setForm({ name: '', description: '' });
    setError('');
    loadBrands();
  }

  async function handleDelete() {
    await deleteBrandAPI(deleteId);
    setDeleteId(null);
    loadBrands();
  }

  return (
    <>
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Brand?"
        message="This brand will be removed. Products using this brand will become unassigned."
      />
      <Modal
        open={open}
        onClose={onClose}
        title="🏷️ Brand Manager"
        size="md"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        {/* Add / Edit Form */}
        <form onSubmit={handleSave} style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: 10,
              alignItems: 'end',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Brand Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Samsung, Amul..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {error && <span className="um-error-text">{error}</span>}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="Optional short note"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Update' : 'Add Brand'}
              </Button>
              {editId && (
                <Button type="button" variant="secondary" onClick={openAdd}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Brands Table */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading brands…
            </div>
          ) : brands.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No brands yet. Add your first brand above.
            </div>
          ) : (
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Brand Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b, i) => (
                  <tr
                    key={b.id}
                    style={{
                      background:
                        editId === b.id ? 'var(--primary-light)' : 'transparent',
                    }}
                  >
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.description || '—'}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: b.isActive ? 'var(--success-light)' : 'var(--danger-light)',
                          color: b.isActive ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 600,
                        }}
                      >
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                          ✏️ Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteId(b.id)}
                        >
                          🗑 Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </>
  );
}
