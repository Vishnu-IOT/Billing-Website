/* ===== POS PRODUCT GRID — Left panel ===== */
import React, { useState, useMemo, useCallback } from 'react';
import { formatCurrency } from '../../utils/currency';

/**
 * POSProductGrid
 * Left panel of the POS screen:
 * - Category filter pills
 * - Product search
 * - Product card grid (click to add to cart)
 * - Stock badge per card
 */
export default function POSProductGrid({ products, categories, onAddProduct, recentProductIds }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  /* ── Build category list from products ── */
  const categoryList = useMemo(() => {
    const cats = new Set();
    (products || []).forEach((p) => {
      if (p.category) cats.add(p.category);
      if (p.categoryName) cats.add(p.categoryName);
    });
    return ['all', ...Array.from(cats)];
  }, [products]);

  /* ── Filter products ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (products || []).filter((p) => {
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.HSNCode && p.HSNCode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      const matchCat =
        activeCategory === 'all' ||
        (p.category || p.categoryName || '').toLowerCase() ===
          activeCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  /* ── Recent products strip ── */
  const recentProducts = useMemo(() => {
    if (!recentProductIds?.length) return [];
    return recentProductIds
      .slice(-5)
      .reverse()
      .map((id) => (products || []).find((p) => String(p.id || p._id) === String(id)))
      .filter(Boolean);
  }, [recentProductIds, products]);

  function getStockBadge(p) {
    const qty = p.stockQuantity || 0;
    if (qty === 0) return { label: 'Out', color: '#dc2626', bg: '#fee2e2' };
    if (qty < 5) return { label: `${qty} left`, color: '#d97706', bg: '#fef3c7' };
    return { label: 'In stock', color: '#16a34a', bg: '#dcfce7' };
  }

  const handleAdd = useCallback((product) => {
    onAddProduct(product);
  }, [onAddProduct]);

  return (
    <div className="pos-left-panel">
      {/* ── Search ── */}
      <div className="pos-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search products, HSN, SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pos-search-input"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Category pills ── */}
      <div className="pos-category-strip">
        {categoryList.map((cat) => (
          <button
            key={cat}
            className={`pos-category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? '🏪 All' : cat}
          </button>
        ))}
      </div>

      {/* ── Recent strip ── */}
      {recentProducts.length > 0 && !search && (
        <div className="pos-recent-strip">
          <span className="pos-recent-label">Recently Added</span>
          <div className="pos-recent-items">
            {recentProducts.map((p) => (
              <button
                key={p.id || p._id}
                className="pos-recent-pill"
                onClick={() => handleAdd(p)}
                title={p.name}
              >
                <span className="pos-recent-pill-name">{p.name}</span>
                <span className="pos-recent-pill-price">{formatCurrency(p.salesPrice || p.price || p.MRP)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Product Grid ── */}
      <div className="pos-products-grid">
        {filtered.length === 0 ? (
          <div className="pos-grid-empty">
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
            <p>No products found</p>
            {search && (
              <button
                className="pos-grid-empty-clear"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filtered.map((product) => {
            const stock = getStockBadge(product);
            const price = product.salesPrice || product.price || product.MRP || 0;
            return (
              <button
                key={product.id || product._id}
                className="pos-product-card"
                onClick={() => handleAdd(product)}
                title={`${product.name} — Press to add`}
              >
                <div className="pos-product-card__top">
                  <span
                    className="pos-product-card__stock"
                    style={{ background: stock.bg, color: stock.color }}
                  >
                    {stock.label}
                  </span>
                  {product.taxRate > 0 && (
                    <span className="pos-product-card__gst">
                      GST {product.taxRate}%
                    </span>
                  )}
                </div>
                <div className="pos-product-card__name">{product.name}</div>
                {(product.HSNCode || product.sku) && (
                  <div className="pos-product-card__sku">
                    {product.sku || product.HSNCode}
                  </div>
                )}
                <div className="pos-product-card__price">
                  {formatCurrency(price)}
                  {product.unit && (
                    <span className="pos-product-card__unit">/{product.unit}</span>
                  )}
                </div>
                <div className="pos-product-card__add-hint">+ Add</div>
              </button>
            );
          })
        )}
      </div>

      {/* ── Count ── */}
      <div className="pos-grid-count">
        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        {activeCategory !== 'all' && ` in "${activeCategory}"`}
      </div>
    </div>
  );
}
