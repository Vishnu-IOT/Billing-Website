/* ===== useBillCalculations — Canonical GST/discount logic ===== */
/* Extracted from SaleBills.js + PurchaseBillsnew.js (were identical) */
import { useCallback } from 'react';
import {
  calcItemRow,
  calcPurchaseRowFromFinalAmount,
  createEmptyItem,
} from '../utils/invoice';
import {
  findProduct,
  getDiscountedSalesPrice,
  getProductPricing,
} from '../utils/gstPricing';
import { isWeightProduct, normalizeWeightQuantity } from '../utils/quantityUnits';

export function useBillCalculations() {
  /**
   * Update a single item field and recompute GST / totals.
   * billType: 'sales' | 'purchase' are GST-aware bills (price mode comes from
   * the product). Any other value (e.g. 'document-sales' for quotations,
   * challans, notes) keeps the original price handling.
   */
  const updateItemField = useCallback((items, products, index, field, value, billType) => {
    const newItems = [...items];
    let item = { ...newItems[index] };
    const gstBill = billType === 'sales' || billType === 'purchase';
    const side = String(billType).includes('purchase') ? 'purchase' : 'sales';

    if (field === 'productId') {
      const product = products.find(
        (p) => String(p.id || p._id) === String(value)
      );
      if (product) {
        // Default to the product's saved price + price mode for this side
        const saved = getProductPricing(product, side);
        item = {
          ...item,
          productId: String(product.id || product._id),
          productBatchId: '',
          batchAvailableQuantity: undefined,
          productName: product.name,
          hsnCode: product.HSNCode || product.hsnCode || '',
          sku: product.sku || product.skuCode || '',
          batchNumber: product.batchNumber || product.batchNo || '',
          serialNumber: product.serialNumber || product.serialNo || '',
          mfgDate: product.mfgDate || '',
          expiryDate: product.expiryDate || '',
          mrp: Number(product.MRP || product.mrp) || 0,
          salePrice:
            side === 'purchase'
              ? getDiscountedSalesPrice(product)
              : Number(product.sellingPrice ?? product.salesPrice) || 0,
          price: saved.price,
          priceType: gstBill ? saved.priceType : undefined,
          taxRate: Number(product.taxRate) || 0,
          discountPercent:
            side === 'purchase' ? 0 : Number(product.discount) || 0,
          unit: product.unit || 'pcs',
          unitType: isWeightProduct(product) ? 'WEIGHT' : 'PIECE',
          baseUnit: isWeightProduct(product) ? 'KG' : 'PCS',
          quantityUnit: isWeightProduct(product) ? 'KG' : '',
          quantity: 1,
          paidQuantity: 1,
          freeQuantity: 0,
          totalQuantity: 1,
          ...(billType === 'purchase' && {
            purchaseCalculationMode: 'RATE',
            purchaseFinalAmount: undefined,
          }),
        };
      }
    } else if (field === 'quantityUnit' && item.unitType === 'WEIGHT') {
      const baseQuantity = normalizeWeightQuantity(
        item.quantity,
        item.quantityUnit || 'KG',
      );
      item.quantityUnit = String(value).toUpperCase();
      item.quantity =
        item.quantityUnit === 'GRAM'
          ? Number((baseQuantity * 1000).toFixed(3))
          : Number(baseQuantity.toFixed(3));
    } else {
      if (field === 'finalAmount' && billType === 'purchase') {
        item.purchaseFinalAmount = String(value ?? '');
      } else if (field === 'discountPercent') {
        const discountPercent = Number(value);
        item.discountPercent = Number.isFinite(discountPercent)
          ? Math.min(Math.max(discountPercent, 0), 100)
          : 0;
      } else {
        item[field] = ['quantity', 'price', 'salePrice', 'mrp', 'taxRate'].includes(field)
          ? Number(value) : value;
      }
      if (field === 'quantity') {
        item.paidQuantity = Number(value) || 0;
        item.totalQuantity =
          item.paidQuantity + (Number(item.freeQuantity) || 0);
      } else if (field === 'freeQuantity') {
        item.freeQuantity = Number(value) || 0;
        item.totalQuantity =
          (Number(item.quantity) || 0) + item.freeQuantity;
      }
      // A line loaded from a saved bill has no price mode of its own: use the
      // product's saved mode so the preview matches what the backend will use.
      if (gstBill && !item.priceType) {
        const product = findProduct(products, item.productId);
        if (product) {
          item.priceType = getProductPricing(product, side).priceType;
        }
      }

      if (
        billType === 'purchase' &&
        (field === 'price' || field === 'priceType')
      ) {
        item.purchaseCalculationMode = 'RATE';
        item.purchaseFinalAmount = undefined;
      }
    }

    const calculated =
      billType === 'purchase' &&
      (field === 'finalAmount' ||
        item.purchaseCalculationMode === 'FINAL_AMOUNT')
        ? calcPurchaseRowFromFinalAmount(
            { ...item, purchaseCalculationMode: 'FINAL_AMOUNT' },
            field === 'finalAmount' ? value : item.purchaseFinalAmount,
          )
        : calcItemRow(item);
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
