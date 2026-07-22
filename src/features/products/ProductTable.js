/* ===== PRODUCT TABLE (Adjust Items) ===== */
import React, { useState, useMemo } from 'react';
import useAppStore from '../../store/appStore';
import useInventoryStore from '../../store/inventoryStore';
import { Button, ToastContainer, Pagination, Modal } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import ProductBatchTable from '../../components/shared/ProductBatchTable';
import BarcodeLabelPrint from '../../components/shared/BarcodeLabelPrint';
import { FiPrinter, FiLayers } from 'react-icons/fi';

export default function ProductTable() {
  const { products, refreshProducts } = useAppStore();
  const { bulkUpdateStock } = useInventoryStore();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({}); // { id: { field: value } }
  const [search, setSearch] = useState('');
  const [batchProduct, setBatchProduct] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return (products || []).filter(
      (p) =>
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.HSNCode || '').toLowerCase().includes(q) ||
        (p.barcode || p.SKU || '').toLowerCase().includes(q)
    );
  }, [products, debouncedSearch]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(
    filteredProducts,
    10
  );

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
      await bulkUpdateStock(payload);
      toast.success('Inventory updated successfully');
      setEdits({});
      await refreshProducts();
    } catch {
      toast.error('Failed to update inventory');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <ToastContainer toasts={toast.toasts} />

      {/* Batch & Expiry Modal */}
      <Modal
        open={!!batchProduct}
        onClose={() => setBatchProduct(null)}
        title={`Batch & Expiry Management`}
      >
        {batchProduct && (
          <ProductBatchTable
            productId={batchProduct.id || batchProduct._id}
            productName={batchProduct.name}
          />
        )}
      </Modal>

      {/* Barcode Printing Modal */}
      <Modal
        open={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        title={`Print Barcode Labels — ${barcodeProduct?.name}`}
      >
        {barcodeProduct && (
          <BarcodeLabelPrint
            product={barcodeProduct}
            quantity={10}
            onClose={() => setBarcodeProduct(null)}
          />
        )}
      </Modal>

      <div className="page-header">
        <div className="page-header__left">
          <h1>Adjust Items & Batches</h1>
          <p className="page-header__sub">Bulk edit pricing, stock levels, batches, and barcode labels</p>
        </div>
        <div className="page-header__actions" style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => setEdits({})}>
            Discard Changes
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="bills-toolbar">
        <input
          className="form-input bills-search"
          placeholder="Search items by name, HSN, barcode…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            goToPage(1);
          }}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div className="table-wrapper">
        {/* Desktop */}
        <div className="table-desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>HSN Code</th>
                <th className="text-right">MRP</th>
                <th className="text-right">Sales Price</th>
                <th className="text-right">Stock Qty</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, i) => {
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
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                      {from + i}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <input
                        className="form-input"
                        style={{ height: 32, minWidth: 100 }}
                        value={e.HSNCode ?? p.HSNCode ?? ''}
                        onChange={(ev) => handleEdit(id, 'HSNCode', ev.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ height: 32, minWidth: 90, textAlign: 'right' }}
                        type="number"
                        value={e.MRP ?? p.MRP ?? ''}
                        onChange={(ev) => handleEdit(id, 'MRP', ev.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ height: 32, minWidth: 90, textAlign: 'right' }}
                        type="number"
                        value={e.salesPrice ?? p.salesPrice ?? ''}
                        onChange={(ev) => handleEdit(id, 'salesPrice', ev.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ height: 32, minWidth: 80, textAlign: 'right' }}
                        type="number"
                        value={e.stockQuantity ?? p.stockQuantity ?? ''}
                        onChange={(ev) => handleEdit(id, 'stockQuantity', ev.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FiLayers />}
                          onClick={() => setBatchProduct(p)}
                          title="Batches & Expiry"
                        >
                          Batches
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FiPrinter />}
                          onClick={() => setBarcodeProduct(p)}
                          title="Print Barcode Labels"
                        >
                          Barcode
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div
          className="bill-cards-list"
          style={{ padding: 'var(--sp-4)', display: 'none' }}
          id="mobile-bills"
        >
          {paginated.map((p) => {
            const id = String(p.id || p._id);
            const e = edits[id] || {};
            const hasEdits = Object.keys(e).length > 0;

            return (
              <div
                key={id}
                className="bill-card-mobile"
                style={{ background: hasEdits ? 'var(--warning-light)' : undefined }}
              >
                <div className="bill-card-mobile__row">
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    HSN: {p.HSNCode || '—'}
                  </span>
                </div>
                <div className="bill-card-mobile__row">
                  <span className="bill-card-mobile__label">
                    MRP: ₹{e.MRP ?? p.MRP ?? '—'}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    Sale: ₹{e.salesPrice ?? p.salesPrice ?? '—'}
                  </span>
                </div>
                <div className="bill-card-mobile__row">
                  <span className="bill-card-mobile__label">
                    Stock: {e.stockQuantity ?? p.stockQuantity ?? 0}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="secondary" size="sm" icon={<FiLayers />} onClick={() => setBatchProduct(p)}>
                      Batches
                    </Button>
                    <Button variant="secondary" size="sm" icon={<FiPrinter />} onClick={() => setBarcodeProduct(p)}>
                      Barcode
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}
