/* ===== InvoiceItemsTable — Shared (used by Sale + Purchase forms) ===== */
import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatCurrency } from '../../utils/currency';
import useInvoiceColumnStore from '../../store/invoiceColumnStore';
import { ColumnSettingsDrawer } from './ColumnSettingsDrawer';
import { FiSettings } from 'react-icons/fi';
import { ProductSelector } from './ProductSelector';
import BatchPriceHistory from './BatchPriceHistory';
import {
  PRICE_TYPE_OPTIONS,
  findProduct,
  getDiscountedSalesPrice,
  getProductPricing,
} from '../../utils/gstPricing';
import { getProductBaseUnit, isWeightProduct } from '../../utils/quantityUnits';
import BatchSelector from './BatchSelector';
import DateInput from './DateInput';

function applyBatchSelection(onUpdate, idx, batch, side, products, item) {
  onUpdate(idx, 'productBatchId', batch?.id || batch?._id || '');
  onUpdate(idx, 'batchNumber', batch?.batchNumber || batch?.batchNo || '');
  if (side === 'purchase' && batch) {
    onUpdate(idx, 'mfgDate', batch.mfgDate || '');
    onUpdate(idx, 'expiryDate', batch.expiryDate || '');
  }
  if (!batch) {
    const product = findProduct(products, item.productId);
    const saved = getProductPricing(product, side);
    onUpdate(idx, 'price', saved.price);
    onUpdate(idx, 'priceType', saved.priceType);
    if (side === 'purchase') {
      onUpdate(
        idx,
        'salePrice',
        getDiscountedSalesPrice(product),
      );
    }
    onUpdate(idx, 'mrp', Number(product?.MRP ?? product?.mrp) || 0);
    onUpdate(
      idx,
      'discountPercent',
      side === 'purchase' ? 0 : Number(product?.discount) || 0,
    );
    onUpdate(idx, 'taxRate', Number(product?.taxRate) || 0);
    return;
  }
  const price = side === 'purchase' ? batch.purchasePrice : (batch.salePrice ?? batch.sellingPrice);
  if (price !== undefined && price !== null) onUpdate(idx, 'price', price);
  const mrp = batch.MRP ?? batch.mrp;
  if (mrp !== undefined && mrp !== null) onUpdate(idx, 'mrp', mrp);
  if (side !== 'purchase' && batch.discount !== undefined) {
    onUpdate(idx, 'discountPercent', batch.discount);
  }
  if (batch.gstPercentage !== undefined) {
    onUpdate(idx, 'taxRate', batch.gstPercentage);
  }
  if (side === 'purchase' && batch.salePrice !== undefined) {
    onUpdate(idx, 'salePrice', batch.salePrice);
  } else if (side === 'purchase') {
    const product = findProduct(products, item.productId);
    onUpdate(
      idx,
      'salePrice',
      getDiscountedSalesPrice(product),
    );
  }
}

// Price mode a line is using: its own override, else the product's saved mode.
function effectivePriceType(item, products, side) {
  return (
    item.priceType ||
    getProductPricing(findProduct(products, item.productId), side).priceType
  );
}

// Rate + GST price-mode dropdown in one input group (sales / purchase bills).
function PriceWithMode({ item, products, side, onUpdate, idx, inputClass, selectClass }) {
  const weightProduct = isWeightProduct(findProduct(products, item.productId));
  const priceInput = (
    <input
      className={inputClass}
      type="number"
      onWheel={(e) => e.target.blur()}
      value={item.price || ''}
      onChange={(e) => onUpdate(idx, 'price', e.target.value)}
      placeholder="Price"
    />
  );
  return (
    <div>
    <div className="price-input-group">
      {side === 'purchase' ? (
        <BatchPriceHistory productId={item.productId} priceType="purchase">
          {priceInput}
        </BatchPriceHistory>
      ) : priceInput}
      <select
        className={`${selectClass} price-input-group__mode`}
        value={effectivePriceType(item, products, side)}
        onChange={(e) => onUpdate(idx, 'priceType', e.target.value)}
        aria-label="Price includes GST?"
        title="Price mode for this line"
      >
        {PRICE_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
    {weightProduct && (
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
        Price per KG
      </div>
    )}
    </div>
  );
}

function SalesPriceInput({ item, idx, onUpdate, inputClass, style }) {
  return (
    <BatchPriceHistory productId={item.productId} priceType="sales">
      <input
        type="number"
        min="0"
        step="0.01"
        onWheel={(e) => e.target.blur()}
        className={inputClass}
        style={style}
        value={item.salePrice ?? ''}
        onChange={(e) => onUpdate(idx, 'salePrice', e.target.value)}
        placeholder="Sales Price"
        aria-label={`Sales price for ${item.productName}`}
      />
    </BatchPriceHistory>
  );
}

function PurchasePriceInput({ item, idx, onUpdate, inputClass, style }) {
  return (
    <BatchPriceHistory productId={item.productId} priceType="purchase">
      <input
        className={inputClass}
        style={style}
        type="number"
        onWheel={(e) => e.target.blur()}
        value={item.price || ''}
        onChange={(e) => onUpdate(idx, 'price', e.target.value)}
        placeholder="Price"
      />
    </BatchPriceHistory>
  );
}

export function InvoiceItemsTable({
  items,
  products,
  categories,
  brands,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  gstPricing = false,
  priceSide = 'sales',
  taxType = null,
  onBarcodeScan,
  onCreateMissingBarcode,
}) {
  const isMobile = useIsMobile();
  const { columns } = useInvoiceColumnStore();
  const [showSettings, setShowSettings] = useState(false);

  const activeColumns = columns.filter(
    (column) =>
      (column.visible || (priceSide === 'purchase' && column.id === 'total')) &&
      (priceSide === 'purchase'
        ? true
        : column.id !== 'freeQuantity' &&
          column.id !== 'mrp' &&
          column.id !== 'salesPrice'),
  );

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
        <button
          className="btn btn--secondary btn--sm"
          onClick={() => setShowSettings(true)}
          title="Column Settings"
        >
          <FiSettings /> <span style={{ marginLeft: 4 }}>Columns</span>
        </button>
      </div>

      {isMobile ? (
        <MobileItems
          items={items}
          products={products}
          categories={categories}
          brands={brands}
          onUpdate={onUpdateItem}
          onRemove={onRemoveItem}
          activeColumns={activeColumns}
          gstPricing={gstPricing}
          priceSide={priceSide}
          taxType={taxType}
          onBarcodeScan={onBarcodeScan}
          onCreateMissingBarcode={onCreateMissingBarcode}
        />
      ) : (
        <DesktopTable
          items={items}
          products={products}
          categories={categories}
          brands={brands}
          onUpdate={onUpdateItem}
          onRemove={onRemoveItem}
          activeColumns={activeColumns}
          gstPricing={gstPricing}
          priceSide={priceSide}
          taxType={taxType}
          onBarcodeScan={onBarcodeScan}
          onCreateMissingBarcode={onCreateMissingBarcode}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          padding: 'var(--sp-3) var(--sp-4)',
        }}
      >
        <button className="btn btn--outline btn--sm" onClick={onAddItem}>
          + Add Row
        </button>
      </div>

      <ColumnSettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

function PurchaseFreeQuantityCell({ item, idx, onUpdate, products, inputClass }) {
  const unit =
    item.quantityUnit ||
    getProductBaseUnit(findProduct(products, item.productId));
  const paidQuantity = Number(item.quantity) || 0;
  const freeQuantity = Number(item.freeQuantity) || 0;
  const totalReceived = paidQuantity + freeQuantity;

  return (
    <div className="purchase-quantity-cell">
      <input
        className={inputClass}
        type="number"
        min="0"
        step={item.unitType === 'WEIGHT' && item.quantityUnit !== 'GRAM' ? '0.001' : '1'}
        value={item.freeQuantity ?? 0}
        onChange={(event) => onUpdate(idx, 'freeQuantity', event.target.value)}
        aria-label={`Free quantity for ${item.productName}`}
      />
      <span className="purchase-quantity-summary">
        Received: {totalReceived} {unit}
      </span>
      {totalReceived > 0 && (
        <span
          className="purchase-quantity-summary"
          title="Purchase line amount divided by total units received"
        >
          Cost/received: {formatCurrency(Number(item.total || 0) / totalReceived)}
        </span>
      )}
    </div>
  );
}

function getTaxBreakdown(item, priceSide, taxType) {
  const taxAmount = Number(item.taxAmount) || 0;
  if (priceSide === 'purchase' && taxType === 'IGST') {
    return { cgst: 0, sgst: 0, igst: taxAmount };
  }
  const cgst = Math.round((taxAmount / 2 + Number.EPSILON) * 100) / 100;
  return {
    cgst,
    sgst: priceSide === 'purchase' ? taxAmount - cgst : cgst,
    igst: priceSide === 'purchase' ? 0 : taxAmount,
  };
}

function DesktopTable({
  items,
  products,
  categories,
  brands,
  onUpdate,
  onRemove,
  activeColumns,
  gstPricing,
  priceSide,
  taxType,
  onBarcodeScan,
  onCreateMissingBarcode,
}) {
  console.log(items);
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
            categories={categories}
            brands={brands}
            value={item.productId}
            onBarcodeScan={priceSide === 'purchase' ? onBarcodeScan : undefined}
            onCreateMissingBarcode={
              priceSide === 'purchase' ? onCreateMissingBarcode : undefined
            }
            autoFocus={priceSide === 'purchase' && idx === 0}
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
          <DateInput
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
        if (isWeightProduct(findProduct(products, item.productId))) {
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                className="invoice-input"
                style={{ width: '100%', minWidth: 72 }}
                type="number"
                min="0.001"
                step={item.quantityUnit === 'GRAM' ? '1' : '0.001'}
                onWheel={(e) => e.target.blur()}
                placeholder="Qty"
                value={item.quantity ?? ''}
                onChange={(e) => onUpdate(idx, 'quantity', e.target.value)}
              />
              <select
                className="invoice-select"
                aria-label={`Quantity unit for ${item.productName}`}
                value={item.quantityUnit || 'KG'}
                onChange={(e) => onUpdate(idx, 'quantityUnit', e.target.value)}
              >
                <option value="GRAM">GRAM</option>
                <option value="KG">KG</option>
              </select>
            </div>
          );
        }
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
      case 'freeQuantity':
        return priceSide === 'purchase' ? (
          <PurchaseFreeQuantityCell
            item={item}
            idx={idx}
            onUpdate={onUpdate}
            products={products}
            inputClass="invoice-input"
          />
        ) : null;
      case 'unit':
        if (isWeightProduct(findProduct(products, item.productId))) {
          return (
            <span style={{ fontSize: 'var(--fs-sm)' }}>KG</span>
          );
        }
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
        if (gstPricing) {
          return (
            <PriceWithMode
              item={item}
              products={products}
              side={priceSide}
              onUpdate={onUpdate}
              idx={idx}
              inputClass="invoice-input"
              selectClass="invoice-select"
            />
          );
        }
        if (priceSide === 'purchase') {
          return (
            <PurchasePriceInput
              item={item}
              onUpdate={onUpdate}
              idx={idx}
              inputClass="invoice-input"
              style={{ width: '100%' }}
            />
          );
        }
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
      case 'mrp':
        return (
          <input
            className="invoice-input"
            style={{ width: '100%' }}
            type="number"
            min="0"
            onWheel={(e) => e.target.blur()}
            value={item.mrp || ''}
            onChange={(e) => onUpdate(idx, 'mrp', e.target.value)}
            placeholder="MRP"
          />
        );
      case 'salesPrice': {
        const product = findProduct(products, item.productId);
        const priceMode = getProductPricing(product, 'sales').priceType;
        return (
          <div>
            <SalesPriceInput
              item={item}
              idx={idx}
              onUpdate={onUpdate}
              inputClass="invoice-input"
              style={{ width: '100%' }}
            />
            <div className="price-gst-hint">
              {priceMode === 'WITH_GST' ? 'Includes GST' : 'Excludes GST'}
            </div>
          </div>
        );
      }
      case 'discountPercent':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                className="invoice-input"
                style={{ width: '100%' }}
                type="number"
                min="0"
                max="100"
                step="0.01"
                onWheel={(e) => e.target.blur()}
                value={
                  priceSide === 'purchase'
                    ? Number(item.discountPercent) || ''
                    : item.discountPercent || 0
                }
                onChange={(e) => onUpdate(idx, 'discountPercent', e.target.value)}
                aria-label={`Discount percentage for ${item.productName}`}
              />
              <span>%</span>
            </div>
            {priceSide === 'purchase' && item.discountAmount > 0 && (
              <div className="price-gst-hint">
                Discount: {formatCurrency(item.discountAmount)}
              </div>
            )}
          </div>
        );
      case 'taxRate':
        // GST rate of a sales / purchase line always comes from the product
        if (gstPricing) {
          return (
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
              {item.productId ? `${item.taxRate || 0}%` : '—'}
            </div>
          );
        }
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
      case 'unitBaseRate':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency(item.unitBaseRate || 0)}
          </div>
        );
      case 'baseAmount':
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-primary)',
            }}
          >
            {formatCurrency(item.baseAmount || 0)}
          </div>
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
        const cgstAmount = getTaxBreakdown(item, priceSide, taxType).cgst;
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency(cgstAmount)}
          </div>
        );
      case 'sgst':
        const sgstAmount = getTaxBreakdown(item, priceSide, taxType).sgst;
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency(sgstAmount)}
          </div>
        );
      case 'igst':
      case 'taxAmount':
        const igstAmount = getTaxBreakdown(item, priceSide, taxType).igst;
        return (
          <div
            style={{
              textAlign: 'right',
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {formatCurrency(col.id === 'igst' ? igstAmount : item.taxAmount || 0)}
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
        if (priceSide === 'purchase') {
          return (
            <input
              className="invoice-input"
              style={{ width: '100%', textAlign: 'right', fontWeight: 600 }}
              type="number"
              min="0"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={
                item.productId
                  ? item.purchaseFinalAmount ?? item.total ?? ''
                  : ''
              }
              onChange={(e) => onUpdate(idx, 'finalAmount', e.target.value)}
              placeholder={gstPricing ? 'Final amount incl. GST' : 'Final amount'}
              aria-label={`Final purchase amount ${gstPricing ? 'including GST' : 'without GST'} for ${item.productName || 'item'}`}
              title={`Enter the supplier's final line amount${gstPricing ? ' including GST' : ''}`}
            />
          );
        }
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
      productName: 190,
      hsnCode: 80,
      sku: 90,
      batchNumber: 100,
      expiryDate: 120,
      serialNumber: 100,
      notes: 140,
      quantity: 78,
      freeQuantity: 104,
      unit: 56,
      price: gstPricing ? 190 : 90,
      mrp: 90,
      salesPrice: 110,
      unitBaseRate: 110,
      baseAmount: 110,
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
        className={`invoice-table ${priceSide === 'purchase' ? 'invoice-table--purchase' : ''}`}
        style={{ width: '100%', minWidth: 'max-content' }}
      >
        <thead>
          <tr>
            {activeColumns.map((col) => (
              <th
                key={col.id}
                style={{
                  width: getColWidth(col.id),
                  minWidth: col.id === 'quantity' ? 78 : col.id === 'freeQuantity' ? 104 : undefined,
                  textAlign: [
                    'unitBaseRate',
                    'baseAmount',
                    'mrp',
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
                {priceSide === 'purchase' && col.id === 'quantity'
                  ? 'Paid Qty'
                  : priceSide === 'purchase' && col.id === 'total'
                    ? 'Final Amount'
                    : col.label}
              </th>
            ))}
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              {activeColumns.map((col) => (
                <td
                  key={col.id}
                  style={{
                    width: getColWidth(col.id),
                    minWidth: col.id === 'quantity' ? 78 : col.id === 'freeQuantity' ? 104 : undefined,
                  }}
                >
                  {renderCell(col, item, idx)}
                  {priceSide === 'purchase' && col.id === 'productName' && (
                    <div className="purchase-batch-selector">
                      {item.productId && (
                        <BatchSelector
                          productId={item.productId}
                          side="purchase"
                          value={item.productBatchId}
                          onSelect={(batch) =>
                            applyBatchSelection(
                              onUpdate,
                              idx,
                              batch,
                              'purchase',
                              products,
                              item,
                            )
                          }
                        />
                      )}
                    </div>
                  )}
                </td>
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

function MobileItems({
  items,
  products,
  categories,
  brands,
  onUpdate,
  onRemove,
  activeColumns,
  gstPricing,
  priceSide,
  taxType,
  onBarcodeScan,
  onCreateMissingBarcode,
}) {
  // Mobile stacks the fields. We filter out the read-only totals to group them at the bottom.
  const inputCols = activeColumns.filter(
    (c) =>
      ![
        'unitBaseRate',
        'baseAmount',
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
            <ProductSelector
              products={products}
              categories={categories}
              brands={brands}
              value={item.productId}
              onBarcodeScan={priceSide === 'purchase' ? onBarcodeScan : undefined}
              onCreateMissingBarcode={
                priceSide === 'purchase' ? onCreateMissingBarcode : undefined
              }
              autoFocus={priceSide === 'purchase' && idx === 0}
              onChange={(productId) => onUpdate(idx, 'productId', productId)}
            />
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
              if (col.id === 'quantity' && priceSide === 'purchase') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">Paid Qty</label>
                    {isWeightProduct(findProduct(products, item.productId)) ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="number"
                          min="0.001"
                          step={item.quantityUnit === 'GRAM' ? '1' : '0.001'}
                          className="form-input"
                          value={item.quantity ?? ''}
                          onChange={(e) => onUpdate(idx, 'quantity', e.target.value)}
                        />
                        <select
                          className="form-select"
                          aria-label={`Quantity unit for ${item.productName}`}
                          value={item.quantityUnit || 'KG'}
                          onChange={(e) => onUpdate(idx, 'quantityUnit', e.target.value)}
                        >
                          <option value="GRAM">GRAM</option>
                          <option value="KG">KG</option>
                        </select>
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-input"
                        value={item.quantity ?? ''}
                        onChange={(e) => onUpdate(idx, 'quantity', e.target.value)}
                      />
                    )}
                    {item.productId && (
                      <div style={{ marginTop: 'var(--sp-2)' }}>
                        <label className="form-label">Product Batch</label>
                        <BatchSelector
                          productId={item.productId}
                          side="purchase"
                          value={item.productBatchId}
                          onSelect={(batch) =>
                            applyBatchSelection(
                              onUpdate,
                              idx,
                              batch,
                              'purchase',
                              products,
                              item,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              }
              if (col.id === 'freeQuantity' && priceSide === 'purchase') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">Free Qty</label>
                    <PurchaseFreeQuantityCell
                      item={item}
                      idx={idx}
                      onUpdate={onUpdate}
                      products={products}
                      inputClass="form-input"
                    />
                  </div>
                );
              }
              if (col.id === 'unit') {
                if (isWeightProduct(findProduct(products, item.productId))) {
                  return (
                    <div className="form-group" key={col.id}>
                      <label className="form-label">{col.label}</label>
                      <input className="form-input" value="KG" readOnly />
                    </div>
                  );
                }
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
                    <DateInput
                      className="form-input"
                      value={item.expiryDate || ''}
                      onChange={(e) =>
                        onUpdate(idx, 'expiryDate', e.target.value)
                      }
                    />
                  </div>
                );
              }
              if (gstPricing && col.id === 'price') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <PriceWithMode
                      item={item}
                      products={products}
                      side={priceSide}
                      onUpdate={onUpdate}
                      idx={idx}
                      inputClass="form-input"
                      selectClass="form-select"
                    />
                  </div>
                );
              }
              if (!gstPricing && col.id === 'price' && priceSide === 'purchase') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <PurchasePriceInput
                      item={item}
                      idx={idx}
                      onUpdate={onUpdate}
                      inputClass="form-input"
                    />
                  </div>
                );
              }
              if (gstPricing && col.id === 'taxRate') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <input
                      className="form-input"
                      style={{ background: 'var(--bg-input)', cursor: 'default' }}
                      readOnly
                      tabIndex={-1}
                      value={item.productId ? `${item.taxRate || 0}%` : ''}
                    />
                  </div>
                );
              }
              if (col.id === 'salesPrice') {
                const product = findProduct(products, item.productId);
                const priceMode = getProductPricing(product, 'sales').priceType;
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <SalesPriceInput
                      item={item}
                      idx={idx}
                      onUpdate={onUpdate}
                      inputClass="form-input"
                    />
                    <div className="price-gst-hint">
                      {priceMode === 'WITH_GST' ? 'Includes GST' : 'Excludes GST'}
                    </div>
                  </div>
                );
              }
              if (
                col.id === 'quantity' &&
                isWeightProduct(findProduct(products, item.productId))
              ) {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="number"
                        min="0.001"
                        step={item.quantityUnit === 'GRAM' ? '1' : '0.001'}
                        className="form-input"
                        value={item.quantity ?? ''}
                        onChange={(e) => onUpdate(idx, 'quantity', e.target.value)}
                      />
                      <select
                        className="form-select"
                        aria-label={`Quantity unit for ${item.productName}`}
                        value={item.quantityUnit || 'KG'}
                        onChange={(e) =>
                          onUpdate(idx, 'quantityUnit', e.target.value)
                        }
                      >
                        <option value="GRAM">GRAM</option>
                        <option value="KG">KG</option>
                      </select>
                    </div>
                  </div>
                );
              }
              if (col.id === 'salesPrice') {
                const product = findProduct(products, item.productId);
                const priceMode = getProductPricing(product, 'sales').priceType;
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label}</label>
                    <SalesPriceInput
                      item={item}
                      idx={idx}
                      onUpdate={onUpdate}
                      inputClass="form-input"
                    />
                    <div className="price-gst-hint">
                      {priceMode === 'WITH_GST' ? 'Includes GST' : 'Excludes GST'}
                    </div>
                  </div>
                );
              }
              if (col.id === 'discountPercent') {
                return (
                  <div className="form-group" key={col.id}>
                    <label className="form-label">{col.label} (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      onWheel={(e) => e.target.blur()}
                      className="form-input"
                      value={
                        priceSide === 'purchase'
                          ? Number(item.discountPercent) || ''
                          : item.discountPercent ?? 0
                      }
                      onChange={(e) =>
                        onUpdate(idx, 'discountPercent', e.target.value)
                      }
                      aria-label={`Discount percentage for ${item.productName}`}
                    />
                    {priceSide === 'purchase' && item.discountAmount > 0 && (
                      <div className="price-gst-hint">
                        Discount: {formatCurrency(item.discountAmount)}
                      </div>
                    )}
                  </div>
                );
              }
              const isNumber = [
                'price',
                'mrp',
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
            {activeColumns.find((c) => c.id === 'unitBaseRate') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Base Rate (excl. GST):</span>
                <span>{formatCurrency(item.unitBaseRate || 0)}</span>
              </div>
            )}
            {activeColumns.find((c) => c.id === 'baseAmount') && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Base Amount:</span>
                <span>{formatCurrency(item.baseAmount || 0)}</span>
              </div>
            )}
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
            {priceSide === 'purchase' &&
              taxType === 'CGST_SGST' &&
              activeColumns.find((c) => c.id === 'cgst') && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST:</span>
                  <span>{formatCurrency(getTaxBreakdown(item, priceSide, taxType).cgst)}</span>
                </div>
              )}
            {priceSide === 'purchase' &&
              taxType === 'CGST_SGST' &&
              activeColumns.find((c) => c.id === 'sgst') && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST:</span>
                  <span>{formatCurrency(getTaxBreakdown(item, priceSide, taxType).sgst)}</span>
                </div>
              )}
            {priceSide === 'purchase' &&
              taxType === 'IGST' &&
              activeColumns.find((c) => c.id === 'igst') && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IGST:</span>
                  <span>{formatCurrency(getTaxBreakdown(item, priceSide, taxType).igst)}</span>
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
                <span>
                  {priceSide === 'purchase'
                    ? gstPricing
                      ? 'Final amount (incl. GST):'
                      : 'Final amount:'
                    : 'Total:'}
                </span>
                {priceSide === 'purchase' ? (
                  <input
                    className="form-input"
                    style={{ maxWidth: 180, textAlign: 'right', fontWeight: 700 }}
                    type="number"
                    min="0"
                    step="0.01"
                    onWheel={(e) => e.target.blur()}
                    value={
                      item.productId
                        ? item.purchaseFinalAmount ?? item.total ?? ''
                        : ''
                    }
                    onChange={(e) => onUpdate(idx, 'finalAmount', e.target.value)}
                    placeholder="0.00"
                    aria-label={`Final purchase amount ${gstPricing ? 'including GST' : 'without GST'} for ${item.productName || 'item'}`}
                  />
                ) : (
                  <span>{formatCurrency(item.total || 0)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
