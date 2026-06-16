/* ===== POS CART ITEM — Single row in the cart ===== */
import React, { useState } from 'react';
import { formatCurrency } from '../../utils/currency';

/**
 * POSCartItem
 * Renders a single item in the cart with:
 * - ± quantity buttons + direct input
 * - Inline discount % edit
 * - Remove button
 * - Live total display
 */
export default function POSCartItem({ item, onUpdate, onRemove, index }) {
  const [editingQty, setEditingQty] = useState(false);
  const [editingDisc, setEditingDisc] = useState(false);
  const [localQty, setLocalQty] = useState(String(item.quantity || 1));
  const [localDisc, setLocalDisc] = useState(String(item.discountPercent || 0));

  function commitQty() {
    const val = Math.max(1, parseFloat(localQty) || 1);
    setLocalQty(String(val));
    onUpdate(item.productId, 'quantity', val);
    setEditingQty(false);
  }

  function commitDisc() {
    const val = Math.min(100, Math.max(0, parseFloat(localDisc) || 0));
    setLocalDisc(String(val));
    onUpdate(item.productId, 'discountPercent', val);
    setEditingDisc(false);
  }

  function decrement() {
    const newQty = Math.max(1, (item.quantity || 1) - 1);
    setLocalQty(String(newQty));
    onUpdate(item.productId, 'quantity', newQty);
  }

  function increment() {
    const newQty = (item.quantity || 1) + 1;
    setLocalQty(String(newQty));
    onUpdate(item.productId, 'quantity', newQty);
  }

  return (
    <tr className="pos-cart-row">
      <td className="pos-cart-td-index">
        {index + 1}
      </td>
      <td className="pos-cart-td-product">
        <div className="pos-cart-item__name">{item.productName}</div>
        <div className="pos-cart-item__meta">
          {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
        </div>
      </td>
      <td className="pos-cart-td-barcode">
        <span className="pos-cart-item__barcode">{item.barcode || item.sku || '—'}</span>
      </td>
      <td className="pos-cart-td-qty">
        <div className="pos-qty-controls">
          <button className="pos-qty-btn" onClick={decrement} disabled={item.quantity <= 1}>−</button>
          {editingQty ? (
            <input
              className="pos-qty-input"
              type="number"
              value={localQty}
              onChange={(e) => setLocalQty(e.target.value)}
              onBlur={commitQty}
              onKeyDown={(e) => e.key === 'Enter' && commitQty()}
              min="1"
              style={{ touchAction: 'manipulation' }}
            />
          ) : (
            <span
              className="pos-qty-display"
              onClick={() => { setLocalQty(String(item.quantity)); setEditingQty(true); }}
            >
              {item.quantity}
            </span>
          )}
          <button className="pos-qty-btn" onClick={increment}>+</button>
        </div>
      </td>
      <td className="pos-cart-td-price">
        <span className="pos-cart-item__rate">{formatCurrency(item.price)}</span>
        <div className="pos-cart-item__unit">/{item.unit || 'pcs'}</div>
      </td>
      <td className="pos-cart-td-disc">
        {editingDisc ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
            <input
              className="pos-disc-input"
              type="number"
              value={localDisc}
              onChange={(e) => setLocalDisc(e.target.value)}
              onBlur={commitDisc}
              onKeyDown={(e) => e.key === 'Enter' && commitDisc()}
              min="0"
              max="100"
              style={{ touchAction: 'manipulation' }}
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
          </div>
        ) : (
          <span
            className={`pos-disc-display ${item.discountPercent > 0 ? 'has-disc' : ''}`}
            onClick={() => { setLocalDisc(String(item.discountPercent || 0)); setEditingDisc(true); }}
          >
            {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
          </span>
        )}
      </td>
      <td className="pos-cart-td-gst">
        <div className="pos-gst-display">{item.taxRate > 0 ? `${item.taxRate}%` : '—'}</div>
        {item.taxAmount > 0 && <div className="pos-gst-amount">{formatCurrency(item.taxAmount)}</div>}
      </td>
      <td className="pos-cart-td-total">
        <div className="pos-item-total">{formatCurrency(item.total || 0)}</div>
        {item.discountAmount > 0 && (
          <div className="pos-item-saved">−{formatCurrency(item.discountAmount)}</div>
        )}
      </td>
      <td className="pos-cart-td-action">
        <button
          className="pos-cart-item__remove"
          onClick={() => onRemove(item.productId)}
          title="Remove item"
        >
          🗑
        </button>
      </td>
    </tr>
  );
}
