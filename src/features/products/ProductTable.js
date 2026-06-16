/* ===== PRODUCT TABLE (Adjust Items) ===== */
import React, { useState } from 'react';
import useAppStore from '../../store/appStore';
import { Button, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { updateProductsBulkAPI } from '../../api';

export default function ProductTable() {
  const { products, refreshProducts } = useAppStore();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({}); // { id: { field: value } }

  function handleEdit(id, field, value) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  }

  async function handleSave() {
    const keys = Object.keys(edits);
    if (keys.length === 0) {
      toast.warning('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const payload = keys.map((id) => ({ id, ...edits[id] }));
      await updateProductsBulkAPI(payload);
      toast.success('Inventory updated');
      setEdits({});
      await refreshProducts();
    } catch {
      toast.error('Failed to update inventory');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}
    >
      <ToastContainer toasts={toast.toasts} />
      <div className="page-header">
        <div className="page-header__left">
          <h1>Adjust Items</h1>
          <p className="page-header__sub">
            Bulk edit pricing and inventory levels
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="secondary" onClick={() => setEdits({})}>
            Discard Changes
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>HSN Code</th>
              <th>MRP</th>
              <th>Sales Price</th>
              <th>Stock Qty</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const id = String(p.id || p._id);
              const e = edits[id] || {};
              const hasEdits = Object.keys(e).length > 0;

              return (
                <tr
                  key={id}
                  style={{
                    background: hasEdits ? 'var(--warning-light)' : undefined,
                  }}
                >
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <input
                      className="form-input"
                      style={{ height: 32 }}
                      value={e.HSNCode ?? p.HSNCode ?? ''}
                      onChange={(ev) =>
                        handleEdit(id, 'HSNCode', ev.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      style={{ height: 32 }}
                      type="number"
                      value={e.MRP ?? p.MRP ?? ''}
                      onChange={(ev) => handleEdit(id, 'MRP', ev.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      style={{ height: 32 }}
                      type="number"
                      value={e.salesPrice ?? p.salesPrice ?? ''}
                      onChange={(ev) =>
                        handleEdit(id, 'salesPrice', ev.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      style={{ height: 32 }}
                      type="number"
                      value={e.stockQuantity ?? p.stockQuantity ?? ''}
                      onChange={(ev) =>
                        handleEdit(id, 'stockQuantity', ev.target.value)
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
