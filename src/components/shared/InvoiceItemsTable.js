/* ===== InvoiceItemsTable — Shared (used by Sale + Purchase forms) ===== */
import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatCurrency } from '../../utils/currency';
import useInvoiceColumnStore from '../../store/invoiceColumnStore';
import { ColumnSettingsDrawer } from './ColumnSettingsDrawer';
import { FiSettings } from 'react-icons/fi';
import { ProductSelector } from './ProductSelector';

export function InvoiceItemsTable({
  items,
  products,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}) {
  const isMobile = useIsMobile();
  const { columns } = useInvoiceColumnStore();
  const [showSettings, setShowSettings] = useState(false);

  const activeColumns = columns.filter((c) => c.visible);

  return (
    <div className="invoice-items-card">
      <div
        className="card__header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="card__title">Invoice Items</span>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => setShowSettings(true)}
            title="Column Settings"
          >
            <FiSettings /> <span style={{ marginLeft: 4 }}>Columns</span>
          </button>
          <button className="btn btn--outline btn--sm" onClick={onAddItem}>
            + Add Row
          </button>
        </div>
      </div>

      {isMobile ? (
        <MobileItems
          items={items}
          products={products}
          onUpdate={onUpdateItem}
          onRemove={onRemoveItem}
          activeColumns={activeColumns}
        />
      ) : (
        <DesktopTable
          items={items}
          products={products}
          onUpdate={onUpdateItem}
          onRemove={onRemoveItem}
          activeColumns={activeColumns}
        />
      )}

      <ColumnSettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

function DesktopTable({ items, products, onUpdate, onRemove, activeColumns }) {
  function renderCell(col, item, idx) {
    switch (col.id) {
      case 'productName':
        return (
          // <select
          //   className="invoice-select"
          //   value={item.productId || ''}
          //   onChange={(e) => onUpdate(idx, 'productId', e.target.value)}
          // >
          //   <option value="">Select…</option>
          //   {products.map((p) => (
          //     <option key={p.id || p._id} value={p.id || p._id}>
          //       {p.name}
          //     </option>
          //   ))}
          // </select>
          <ProductSelector
            products={products}
            value={item.productId}
            onChange={(productId) => {
              onUpdate(idx, 'productId', productId);
            }}
          />
        );
      case 'hsnCode':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.hsnCode || ''}
            onChange={(e) => onUpdate(idx, 'hsnCode', e.target.value)}
          />
        );
      case 'sku':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.sku || ''}
            onChange={(e) => onUpdate(idx, 'sku', e.target.value)}
          />
        );
      case 'batchNumber':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.batchNumber || ''}
            onChange={(e) => onUpdate(idx, 'batchNumber', e.target.value)}
          />
        );
      case 'expiryDate':
        return (
          <input
            type="date"
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.expiryDate || ''}
            onChange={(e) => onUpdate(idx, 'expiryDate', e.target.value)}
          />
        );
      case 'serialNumber':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.serialNumber || ''}
            onChange={(e) => onUpdate(idx, 'serialNumber', e.target.value)}
          />
        );
      case 'notes':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.notes || ''}
            onChange={(e) => onUpdate(idx, 'notes', e.target.value)}
          />
        );
      case 'quantity':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            type="number"
            onWheel={(e) => e.target.blur()}
            placeholder="Qty"
            value={item.quantity || ''}
            onChange={(e) => onUpdate(idx, 'quantity', e.target.value)}
          />
        );
      case 'unit':
        return (
          <select
            className="invoice-select"
            style={{ width: '100%' }}
            value={item.unit || 'pcs'}
            onChange={(e) => onUpdate(idx, 'unit', e.target.value)}
          >
            {[
              'pcs',
              'kg',
              'g',
              'L',
              'mL',
              'box',
              'set',
              'pair',
              'roll',
              'm',
            ].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        );
      case 'price':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            type="number"
            onWheel={(e) => e.target.blur()}
            value={item.price || ''}
            onChange={(e) => onUpdate(idx, 'price', e.target.value)}
            placeholder="Price"
          />
        );
      case 'discountPercent':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            type="number"
            onWheel={(e) => e.target.blur()}
            value={item.discountPercent || 0}
            onChange={(e) => onUpdate(idx, 'discountPercent', e.target.value)}
          />
        );
      case 'taxRate':
        return (
          <select
            className="invoice-input"
            style={{ width: '100%' }}
            value={item.taxRate || 0}
            onChange={(e) => onUpdate(idx, 'taxRate', Number(e.target.value))}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
            <option value={28}>28%</option>
          </select>
        );
      case 'discountAmount':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency(item.discountAmount || 0)}
          </div>
        );
      case 'cgst':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency((item.taxAmount || 0) / 2)}
          </div>
        );
      case 'sgst':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency((item.taxAmount || 0) / 2)}
          </div>
        );
      case 'igst':
      case 'taxAmount':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency(item.taxAmount || 0)}
          </div>
        );
      case 'afterDiscount':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-primary)',
            }}
          >
            {formatCurrency(item.afterDiscount || 0)}
          </div>
        );
      case 'total':
        return (
          <div
            style={{
              textAlign: 'right',
              fontWeight: 600,
              fontSize: 'var(--fs-sm)',
            }}
          >
            {formatCurrency(item.total || 0)}
          </div>
        );
      default:
        return null;
    }
  }

  function getColWidth(colId) {
    const widths = {
      productName: 200,
      hsnCode: 80,
      sku: 90,
      batchNumber: 100,
      expiryDate: 120,
      serialNumber: 100,
      notes: 150,
      quantity: 60,
      unit: 70,
      price: 90,
      discountPercent: 70,
      taxRate: 70,
      discountAmount: 90,
      taxAmount: 90,
      cgst: 80,
      sgst: 80,
      igst: 80,
      afterDiscount: 100,
      total: 100,
    };
    return widths[colId] || 100;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        className="invoice-table"
        style={{ width: '100%', minWidth: 'max-content' }}
      >
        <thead>
          <tr>
            {activeColumns.map((col) => (
              <th
                key={col.id}
                style={{
                  width: getColWidth(col.id),
                  textAlign: [
                    'discountAmount',
                    'taxAmount',
                    'cgst',
                    'sgst',
                    'igst',
                    'afterDiscount',
                    'total',
                  ].includes(col.id)
                    ? 'right'
                    : 'left',
                }}
              >
                {col.label}
              </th>
            ))}
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              {activeColumns.map((col) => (
                <td key={col.id}>{renderCell(col, item, idx)}</td>
              ))}
              <td>
                {items.length > 1 && (
                  <button
                    className="invoice-remove-btn"
                    onClick={() => onRemove(idx)}
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileItems({ items, products, onUpdate, onRemove, activeColumns }) {
  // Mobile stacks the fields. We filter out the read-only totals to group them at the bottom.
  const inputCols = activeColumns.filter(
    (c) =>
      ![
        'discountAmount',
        'taxAmount',
        'cgst',
        'sgst',
        'igst',
        'afterDiscount',
        'total',
        'productName',
      ].includes(c.id)
  );

  return (
    <div
      style={{
        padding: 'var(--sp-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-4)',
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className="invoice-item-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--sp-3)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            className="invoice-item-card__header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--sp-3)',
            }}
          >
            <span
              className="invoice-item-card__name"
              style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}
            >
              {item.productName || `Item ${idx + 1}`}
            </span>
            {items.length > 1 && (
              <button
                className="invoice-remove-btn"
                onClick={() => onRemove(idx)}
              >
                ✕
              </button>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
            <label className="form-label">Product</label>
            <select
              className="form-select"
              value={item.productId || ''}
              onChange={(e) => onUpdate(idx, 'productId', e.target.value)}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className="invoice-item-card__grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--sp-3)',
            }}
          >
            {inputCols.map((col) => {
              if (col.id === 'unit') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <select
                      className="form-select"
                      value={item.unit || 'pcs'}
                      onChange={(e) => onUpdate(idx, 'unit', e.target.value)}
                    >
                      {[
                        'pcs',
                        'kg',
                        'g',
                        'L',
                        'mL',
                        'box',
                        'set',
                        'pair',
                        'roll',
                        'm',
                      ].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (col.id === 'expiryDate') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={item.expiryDate || ''}
                      onChange={(e) =>
                        onUpdate(idx, 'expiryDate', e.target.value)
                      }
                    />
                  </div>
                );
              }
              const isNumber = [
                'quantity',
                'price',
                'discountPercent',
                'taxRate',
              ].includes(col.id);
              return (
                <div className="form-group" key={col.id}>
                  <label className="form-label">{col.label}</label>
                  <input
                    type={isNumber ? 'number' : 'text'}
                    onWheel={(e) => e.target.blur()}
                    className="form-input"
                    value={item[col.id] || ''}
                    onChange={(e) => onUpdate(idx, col.id, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-2)',
              marginTop: 'var(--sp-3)',
              borderTop: '1px solid var(--border)',
              paddingTop: 'var(--sp-3)',
            }}
          >
            {activeColumns.find((c) => c.id === 'discountAmount') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Discount:</span>
                <span>{formatCurrency(item.discountAmount || 0)}</span>
              </div>
            )}
            {activeColumns.find((c) => c.id === 'afterDiscount') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Taxable Amount:</span>
                <span>{formatCurrency(item.afterDiscount || 0)}</span>
              </div>
            )}
            {activeColumns.find((c) => c.id === 'taxAmount') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Tax Amount:</span>
                <span>{formatCurrency(item.taxAmount || 0)}</span>
              </div>
            )}
            {activeColumns.find((c) => c.id === 'total') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  fontSize: 'var(--fs-md)',
                  marginTop: 'var(--sp-1)',
                }}
              >
                <span>Total:</span>
                <span>{formatCurrency(item.total || 0)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
