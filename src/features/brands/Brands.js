/* ===== BRANDS ===== */
import React, { useState, useEffect, useMemo } from 'react';
import useAppStore from '../../store/appStore';
import {
  Button,
  Modal,
  ConfirmModal,
  EmptyState,
  ToastContainer,
} from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { formatQuantity, getProductBaseUnit } from '../../utils/quantityUnits';
import '../../styles/Categories.css';

export default function Brands() {
  const { brands, products, addBrand, updateBrand, deleteBrand } = useAppStore();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeBrand, setActiveBrand] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? brands.filter((brand) =>
          String(brand.name || '').toLocaleLowerCase().includes(query),
        )
      : brands;
  }, [brands, search]);

  // Auto-select first brand if available
  useEffect(() => {
    if (brands.length > 0 && !activeBrand) {
      setActiveBrand(brands[0]);
    }
  }, [brands, activeBrand]);

  function closeForm() {
    setShowAdd(false);
    setEditId(null);
    setName('');
    setFormErrors({});
  }

  function openEdit(brand) {
    setEditId(brand.id || brand._id);
    setName(brand.name || '');
    setFormErrors({});
    setShowAdd(true);
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editId !== null) {
        await updateBrand(editId, { name: name.trim() });
        setActiveBrand((current) =>
          current && String(current.id || current._id) === String(editId)
            ? { ...current, name: name.trim() }
            : current,
        );
        toast.success('Brand updated successfully');
      } else {
        await addBrand({ name: name.trim() });
        toast.success('Brand Added Successfully!');
      }
      setName('');
      setShowAdd(false);
      setEditId(null);
      setFormErrors({});
    } catch (error) {
      toast.error(error.message || `Failed to ${editId !== null ? 'update' : 'add'} brand`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteBrand(deleteId);
      toast.success('Brand Deleted Successfully!');
      if (activeBrand && String(activeBrand.id || activeBrand._id) === String(deleteId)) {
        setActiveBrand(null);
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  }

  function validateForm() {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Brand name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
    >
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Brand?"
        message="Products under this brand won't be deleted."
      />

      <Modal
        open={showAdd}
        onClose={closeForm}
        title={editId !== null ? 'Edit Brand' : 'Add Brand'}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editId !== null ? 'Save Changes' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Brand Name <span style={{ color: "red" }}>*</span></label>
          <input
            className="form-input"
            placeholder="e.g. Samsung"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          {formErrors.name && (
            <span className="um-error-text">{formErrors.name}</span>
          )}
        </div>
      </Modal>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>Brands</h1>
          <p className="page-header__sub">
            Organize products by brand and view matching inventory in a clean ERP split-screen
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          + Add Brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <EmptyState
          icon="🏭"
          title="No brands yet"
          description="Add brands to organize your products"
          action={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              + Add Brand
            </Button>
          }
        />
      ) : (
        <div className="co-layout">
          {/* Left Pane: Brand Selector Sidebar */}
          <div className="co-sidebar">
            <div className="co-sidebar-header">
              <div className="co-sidebar-title-row">
                <span className="co-sidebar-icon">🏭</span>
                <span className="co-sidebar-label">Brands</span>
                <span className="co-sidebar-count">{brands.length}</span>
              </div>
            </div>
            <label className="co-sidebar-search">
              <span className="co-sidebar-search-icon" aria-hidden="true">🔍</span>
              <input
                className="co-sidebar-search-input"
                type="search"
                placeholder="Search brands..."
                aria-label="Search brands"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="co-cat-list">
              {filteredBrands.length === 0 ? (
                <div className="co-empty-cats" role="status">
                  No brands match “{search}”.
                </div>
              ) : filteredBrands.map((brand) => {
                const count = products.filter(
                  (p) => String(p.brandId) === String(brand.id || brand._id)
                ).length;
                const isSelected = activeBrand && (activeBrand.id || activeBrand._id) === (brand.id || brand._id);

                return (
                  <div
                    key={brand.id || brand._id}
                    className={`co-cat-item ${isSelected ? 'co-cat-item--active' : ''}`}
                    onClick={() => setActiveBrand(brand)}
                  >
                    <div className="co-cat-item-left">
                      <div className="co-cat-item-name">{brand.name}</div>
                      <div className="co-cat-item-label">Products</div>
                    </div>
                    <div className="co-cat-item-right">
                      <span className="co-cat-item-count">{count}</span>
                      <span className="co-cat-item-unit">items</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Products belonging to brand */}
          <div className="co-main">
            {!activeBrand ? (
              <div className="co-main-empty">
                <span className="co-main-empty-icon">🏭</span>
                <h3>Select a Brand</h3>
                <p>Click on any brand in the list to view its products and inventory stats.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="co-panel-header">
                  <div>
                    <h2 className="co-panel-title">{activeBrand.name}</h2>
                    <p className="co-panel-sub">
                      Showing products filtered by <span className="co-filter-chip">{activeBrand.name}</span>
                    </p>
                  </div>
                  <div className="co-panel-header-right">
                    <button
                      className="co-icon-btn"
                      title="Edit Brand"
                      aria-label={`Edit ${activeBrand.name}`}
                      onClick={() => openEdit(activeBrand)}
                    >
                      ✏️
                    </button>
                    <button
                      className="co-icon-btn co-icon-btn--danger"
                      title="Delete Brand"
                      onClick={() => setDeleteId(activeBrand.id || activeBrand._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Table list of products */}
                {(() => {
                  const brandProducts = products.filter(
                    (p) => String(p.brandId) === String(activeBrand.id || activeBrand._id)
                  );

                  if (brandProducts.length === 0) {
                    return (
                      <div className="co-no-data">
                        No products listed under this brand yet. Assign products to this brand to view them here.
                      </div>
                    );
                  }

                  return (
                    <div className="co-table-wrap">
                      <table className="co-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Barcode / SKU</th>
                            <th>Stock</th>
                            <th>Sales Price</th>
                            <th>Purchase Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brandProducts.map((prod) => {
                            const qty = Number(prod.stockQuantity) || 0;
                            const min = parseInt(prod.minStockLevel) || 5;
                            const isOut = qty <= 0;
                            const isLow = qty > 0 && qty < min;

                            let badgeClass = 'co-badge--available';
                            let badgeLabel = 'In Stock';
                            if (isOut) {
                              badgeClass = 'co-badge--outofstock';
                              badgeLabel = 'Out of Stock';
                            } else if (isLow) {
                              badgeClass = 'co-badge--outofstock';
                              badgeLabel = 'Low Stock';
                            }

                            return (
                              <tr key={prod.id || prod._id}>
                                <td>
                                  <div className="co-product-cell">
                                    <div className="co-product-info">
                                      <span className="co-product-name">{prod.name}</span>
                                      <span className="co-product-desc">{getProductBaseUnit(prod)}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="co-sku">
                                    {prod.barcode || prod.SKU || prod.sku || '—'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ marginRight: 8, fontWeight: 700 }}>{formatQuantity(qty)}</span>
                                  <span className={`co-badge ${badgeClass}`}>{badgeLabel}</span>
                                </td>
                                <td>
                                  <span className="co-price">{formatCurrency(prod.salesPrice)}</span>
                                </td>
                                <td>
                                  <span className="co-price" style={{ color: 'var(--text-secondary)' }}>
                                    {formatCurrency(prod.purchasePrice)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
