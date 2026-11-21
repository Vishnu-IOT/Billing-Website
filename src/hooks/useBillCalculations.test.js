import { act, renderHook } from '@testing-library/react';
import { useBillCalculations } from './useBillCalculations';
import {
  addScannedPurchaseProduct,
  createEmptyItem,
} from '../utils/invoice';

describe('purchase bill amount/rate entry', () => {
  test('keeps the final amount authoritative until the rate is edited', () => {
    const { result } = renderHook(() => useBillCalculations());
    let items = [{
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      paidQuantity: 2,
      freeQuantity: 3,
      price: 100,
      priceType: 'WITH_GST',
      taxRate: 5,
      discountPercent: 7.5,
    }];

    act(() => {
      items = result.current.updateItemField(
        items,
        [],
        0,
        'finalAmount',
        '185.03',
        'purchase',
      );
    });
    expect(items[0].total).toBe(185.03);
    expect(items[0].purchaseCalculationMode).toBe('FINAL_AMOUNT');

    act(() => {
      items = result.current.updateItemField(items, [], 0, 'quantity', '4', 'purchase');
    });
    expect(items[0].total).toBe(185.03);
    expect(items[0].price).toBeCloseTo(185.03 / 4 / 0.925, 8);
    expect(items[0].freeQuantity).toBe(3);

    act(() => {
      items = result.current.updateItemField(items, [], 0, 'price', '120', 'purchase');
    });
    expect(items[0].purchaseCalculationMode).toBe('RATE');
    expect(items[0].purchaseFinalAmount).toBeUndefined();
    expect(items[0].total).not.toBe(185.03);
  });

  test('normalizes out-of-range purchase line discounts before saving', () => {
    const { result } = renderHook(() => useBillCalculations());
    let items = [{
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      priceType: 'WITHOUT_GST',
      taxRate: 5,
      discountPercent: 0,
    }];

    act(() => {
      items = result.current.updateItemField(
        items,
        [],
        0,
        'discountPercent',
        '-10',
        'purchase',
      );
    });

    expect(items[0]).toMatchObject({
      discountPercent: 0,
      discountAmount: 0,
      total: 210,
    });
  });

  test('barcode scans use purchase defaults and increment an unbatched line without changing its price', () => {
    const { result } = renderHook(() => useBillCalculations());
    const product = {
      id: 42,
      name: 'Tea',
      barcode: '890123',
      HSNCode: '0902',
      purchasePrice: 100,
      purchasePriceType: 'WITH_GST',
      salesPrice: 150,
      MRP: 180,
      taxRate: 5,
      unitType: 'PIECE',
      baseUnit: 'PCS',
    };

    let scanned = addScannedPurchaseProduct(
      [createEmptyItem()],
      [product],
      product,
      result.current.updateItemField,
    );
    expect(scanned.merged).toBe(false);
    expect(scanned.items[0]).toMatchObject({
      productId: '42',
      productName: 'Tea',
      price: 100,
      priceType: 'WITH_GST',
      taxRate: 5,
      mrp: 180,
      quantity: 1,
      freeQuantity: 0,
    });

    let edited = result.current.updateItemField(
      scanned.items,
      [product],
      0,
      'price',
      '125',
      'purchase',
    );
    scanned = addScannedPurchaseProduct(
      edited,
      [product],
      product,
      result.current.updateItemField,
    );
    expect(scanned.merged).toBe(true);
    expect(scanned.items[0]).toMatchObject({
      quantity: 2,
      price: 125,
      priceType: 'WITH_GST',
    });
  });

  test('barcode scans do not merge into an existing batch-linked purchase line', () => {
    const { result } = renderHook(() => useBillCalculations());
    const product = {
      id: 8,
      name: 'Rice',
      purchasePrice: 60,
      purchasePriceType: 'WITHOUT_GST',
      taxRate: 5,
      MRP: 90,
      salesPrice: 75,
    };
    const existing = {
      ...createEmptyItem(),
      productId: '8',
      productName: 'Rice',
      productBatchId: 31,
      batchNumber: 'RICE-31',
      quantity: 4,
      price: 55,
      mrp: 85,
      salePrice: 70,
    };

    const scanned = addScannedPurchaseProduct(
      [existing, createEmptyItem()],
      [product],
      product,
      result.current.updateItemField,
    );

    expect(scanned.merged).toBe(false);
    expect(scanned.items[0]).toMatchObject({
      productBatchId: 31,
      batchNumber: 'RICE-31',
      quantity: 4,
      price: 55,
      mrp: 85,
      salePrice: 70,
    });
    expect(scanned.items[1]).toMatchObject({
      productId: '8',
      quantity: 1,
      price: 60,
      priceType: 'WITHOUT_GST',
    });
  });

  test('a newly created scanned product is appended without changing existing purchase lines', () => {
    const { result } = renderHook(() => useBillCalculations());
    const existingProduct = {
      id: 8,
      name: 'Rice',
      purchasePrice: 60,
      purchasePriceType: 'WITHOUT_GST',
      taxRate: 5,
      MRP: 90,
    };
    const createdProduct = {
      id: 42,
      name: 'New Soap',
      barcode: '89000042',
      purchasePrice: 100,
      purchasePriceType: 'WITH_GST',
      taxRate: 5,
      MRP: 120,
    };
    const existingLine = {
      ...createEmptyItem(),
      productId: '8',
      productName: 'Rice',
      quantity: 3,
      price: 55,
      batchNumber: 'R-1',
    };

    const scanned = addScannedPurchaseProduct(
      [existingLine, createEmptyItem()],
      [existingProduct],
      createdProduct,
      result.current.updateItemField,
    );

    expect(scanned.merged).toBe(false);
    expect(scanned.items[0]).toMatchObject({
      productId: '8',
      quantity: 3,
      price: 55,
      batchNumber: 'R-1',
    });
    expect(scanned.items[1]).toMatchObject({
      productId: '42',
      productName: 'New Soap',
      quantity: 1,
      price: 100,
      priceType: 'WITH_GST',
      total: 100,
    });
  });
});
