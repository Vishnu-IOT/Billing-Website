/* ===== CATEGORIES ===== */
import React, { useState, useEffect } from 'react';
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
import '../../styles/Categories.css';

export default function Categories() {
  const { categories, products, addCategory, deleteCategory } = useAppStore();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // Auto-select first category if available
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  async function handleAdd() {
    if (!name.trim()) {
      toast.error('Enter a category name');
      return;
    }
    setSaving(true);
    try {
      await addCategory({ category: name.trim() });
      toast.success('Category added');
      setName('');
      setShowAdd(false);
    } catch {
      toast.error('Failed to add');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteCategory(deleteId);
      toast.success('Deleted');
      if (activeCategory && String(activeCategory.id || activeCategory._id) === String(deleteId)) {
        setActiveCategory(null);
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
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
        title="Delete Category?"
        message="Products in this category won't be deleted."
      />

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleAdd}>
              Add
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Category Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Electronics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
      </Modal>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>Categories</h1>
          <p className="page-header__sub">
            Organize products and view matching inventory in a clean ERP split-screen
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          + Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No categories yet"
          description="Add categories to organize your products"
          action={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              + Add Category
            </Button>
          }
        />
      ) : (
        <div className="co-layout">
          {/* Left Pane: Category Selector Sidebar */}
          <div className="co-sidebar">
            <div className="co-sidebar-header">
              <div className="co-sidebar-title-row">
                <span className="co-sidebar-icon">📁</span>
                <span className="co-sidebar-label">Categories</span>
                <span className="co-sidebar-count">{categories.length}</span>
              </div>
            </div>

            <div className="co-cat-list">
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => String(p.categoryId || p.category) === String(cat.id || cat._id)
                ).length;
                const isSelected = activeCategory && (activeCategory.id || activeCategory._id) === (cat.id || cat._id);

                return (
                  <div
                    key={cat.id || cat._id}
                    className={`co-cat-item ${isSelected ? 'co-cat-item--active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    <div className="co-cat-item-left">
                      <div className="co-cat-item-name">{cat.category || cat.name}</div>
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

            <button className="co-add-cat-btn" onClick={() => setShowAdd(true)}>
              + Add Category
            </button>
          </div>

          {/* Right Pane: Products belonging to category */}
          <div className="co-main">
            {!activeCategory ? (
              <div className="co-main-empty">
                <span className="co-main-empty-icon">🏷️</span>
                <h3>Select a Category</h3>
                <p>Click on any category in the list to view its products and inventory stats.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="co-panel-header">
                  <div>
                    <h2 className="co-panel-title">{activeCategory.category}</h2>
                    <p className="co-panel-sub">
                      Showing products filtered by <span className="co-filter-chip">{activeCategory.category}</span>
                    </p>
                  </div>
                  <div className="co-panel-header-right">
                    <button
                      className="co-icon-btn co-icon-btn--danger"
                      title="Delete Category"
                      onClick={() => setDeleteId(activeCategory.id || activeCategory._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Table list of products */}
                {(() => {
                  const catProducts = products.filter(
                    (p) => String(p.categoryId || p.category) === String(activeCategory.id || activeCategory._id)
                  );

                  if (catProducts.length === 0) {
                    return (
                      <div className="co-no-data">
                        No products listed in this category yet. Move products to this category to view them here.
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
                          {catProducts.map((prod) => {
                            const qty = parseInt(prod.stockQuantity) || 0;
                            const min = parseInt(prod.minStockLevel) || 5;
                            const isOut = qty === 0;
                            const isLow = qty > 0 && qty < min;

                            let badgeClass = 'co-badge--available';
                            let badgeLabel = 'In Stock';
                            if (isOut) {
                              badgeClass = 'co-badge--outofstock';
                              badgeLabel = 'Out of Stock';
                            } else if (isLow) {
                              badgeClass = 'co-badge--outofstock'; // co-badge--outofstock style has high contrast Red, which is fine
                              badgeLabel = 'Low Stock';
                            }

                            return (
                              <tr key={prod.id || prod._id}>
                                <td>
                                  <div className="co-product-cell">
                                    <div className="co-product-info">
                                      <span className="co-product-name">{prod.name}</span>
                                      <span className="co-product-desc">{prod.unit || 'pcs'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="co-sku">
                                    {prod.barcode || prod.SKU || prod.sku || '—'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ marginRight: 8, fontWeight: 700 }}>{qty}</span>
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
