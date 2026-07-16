/* ===== useBillCalculations — Canonical GST/discount logic ===== */
/* Extracted from SaleBills.js + PurchaseBillsnew.js (were identical) */
import { useCallback } from 'react';
import { calcItemRow, createEmptyItem } from '../utils/invoice';

export function useBillCalculations() {
  /**
   * Update a single item field and recompute GST / totals
   */
  const updateItemField = useCallback((items, products, index, field, value, billType) => {
    const newItems = [...items];
    let item = { ...newItems[index] };

    if (field === 'productId') {
      const product = products.find(
        (p) => String(p.id || p._id) === String(value)
      );
      if (product) {
        item = {
          ...item,
          productId:      String(product.id || product._id),
          productName:    product.name,
          hsnCode:        product.HSNCode || product.hsnCode || '',
          sku:            product.sku || product.skuCode || '',
          batchNumber:    product.batchNumber || product.batchNo || '',
          serialNumber:   product.serialNumber ||product.serialNo|| '',
          expiryDate:     product.expiryDate || '',
          mrp:            Number(product.MRP || product.mrp) || 0,
          price:          Number(billType==='sales' ? product.salesPrice : product.purchasePrice) || 0,
          taxRate:        Number(product.taxRate) || 0,
          discountPercent:Number(product.discount) || 0,
          unit:           product.unit || 'pcs',
          quantity:       1,
        };
      }
    } else {
      item[field] = ['quantity', 'price', 'discountPercent', 'taxRate'].includes(field)
        ? Number(value) : value;
    }

    const calculated = calcItemRow(item);
    newItems[index] = calculated;

    // Auto-add blank row when last row gets a product
    if (index === newItems.length - 1 && calculated.productName) {
      newItems.push(createEmptyItem());
    }

    return newItems;
  }, []);

  const removeItem = useCallback((items, index) =>
    items.filter((_, i) => i !== index), []);

  const addItem = useCallback((items) =>
    [...items, createEmptyItem()], []);

  return { updateItemField, removeItem, addItem };
}
