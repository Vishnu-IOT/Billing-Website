import {
  buildPurchaseBillPayload,
  buildSaleBillPayload,
  applyPromotionPreviewPricing,
  getPromotionBatchAllocationKey,
  calcBillTotals,
  calcPurchaseBillTotals,
  calcItemRow,
  calcQuickSaleItemRow,
  getNonQuickSaleReceiptItems,
  calcPurchaseRowFromFinalAmount,
  mapLineItemsFromBill,
} from './invoice';
import { getDiscountedSalesPrice, round2 } from './gstPricing';

test('receipt fallback excludes Quick Sale rows before their saved rows are appended', () => {
  const cartItems = [
    { productId: 1, productName: 'Regular product' },
    { cartItemType: 'QUICK_SALE', productName: 'Quick Sale 1' },
    { itemType: 'QUICK_SALE', productName: 'Quick Sale 2' },
  ];

  expect(getNonQuickSaleReceiptItems([], cartItems)).toEqual([cartItems[0]]);
  expect(
    getNonQuickSaleReceiptItems(
      [{ productId: 2, productName: 'Saved regular product' }],
      cartItems,
    ),
  ).toEqual([{ productId: 2, productName: 'Saved regular product' }]);
});

describe('batch and quantity invoice fields', () => {
  test('GST-inclusive batch sale price remains exact in POS totals', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Product',
      quantity: 2,
      price: 45,
      priceType: 'WITH_GST',
      taxRate: 18,
      discountPercent: 0,
    });

    expect(item).toMatchObject({
      baseAmount: 76.28,
      discountAmount: 0,
      taxAmount: 13.72,
      total: 90,
      netRate: 45,
    });
  });

  test('purchase rate entry still calculates a GST-inclusive discounted total', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      priceType: 'WITH_GST',
      taxRate: 5,
      discountPercent: 7.5,
    });

    expect(item.total).toBe(185);
  });

  test('final purchase amount preserves paise, reverses discount once, and ignores free quantity', () => {
    const item = calcPurchaseRowFromFinalAmount(
      {
        productId: '4',
        productName: 'Biscuit',
        quantity: 2,
        paidQuantity: 2,
        freeQuantity: 3,
        price: 100,
        priceType: 'WITHOUT_GST',
        taxRate: 5,
        discountPercent: 7.5,
      },
      '185.03',
    );
    const payload = buildPurchaseBillPayload({
      billForm: {
        invoiceNo: 'PUR-FINAL',
        date: '2026-11-12',
        globalDiscountPercent: '5',
      },
      customerForm: {},
      validItems: [item],
      products: [],
      companyId: 1,
      userId: 9,
    });
    const line = payload.items[0];
    const backendUnitBase = round2(round2(line.price) / 1.05);
    const backendBaseBeforeDiscount = round2(backendUnitBase * line.paidQuantity);
    const backendBaseAfterDiscount = round2(
      backendBaseBeforeDiscount - round2(line.discountAmount),
    );
    const backendTax = round2(backendBaseAfterDiscount * 0.05);

    expect(item.total).toBe(185.03);
    expect(item.priceType).toBe('WITH_GST');
    expect(item.price).toBeCloseTo(185.03 / 2 / 0.925, 8);
    expect(payload).toMatchObject({
      global_discount_percentage: 5,
      global_discount_amount: 0,
    });
    expect(line).toMatchObject({
      quantity: 2,
      paidQuantity: 2,
      freeQuantity: 3,
      discountPercentage: 7.5,
    });
    expect(round2(backendBaseAfterDiscount + backendTax)).toBe(185.03);
    expect(calcPurchaseBillTotals([item], 0, 5)).toMatchObject({
      subtotal: 167.41,
      totalTax: 8.37,
      globalDiscountAmount: 8.81,
      afterGlobalDiscount: 175.78,
      grandTotal: 176,
    });
    const fixedDiscountPayload = buildPurchaseBillPayload({
      billForm: {
        invoiceNo: 'PUR-FIXED-GLOBAL',
        date: '2026-11-12',
        globalDiscount: 5.03,
      },
      customerForm: {},
      validItems: [item],
      products: [],
    });
    expect(fixedDiscountPayload).toMatchObject({
      global_discount_percentage: 0,
      global_discount_amount: 5.03,
    });
    expect(calcPurchaseBillTotals([item], 5.03).afterGlobalDiscount).toBe(180);
  });

  test('purchase percentage discount applies to taxable subtotal before GST', () => {
    const items = [
      calcItemRow({
        productName: 'Low GST',
        quantity: 1,
        price: 100,
        taxRate: 5,
      }),
      calcItemRow({
        productName: 'High GST',
        quantity: 1,
        price: 100,
        taxRate: 18,
      }),
    ];
    const totals = calcPurchaseBillTotals(items, 0, 10);

    expect(totals).toMatchObject({
      subtotal: 180,
      totalTax: 20.7,
      rawTotal: 223,
      globalDiscountAmount: 20,
      afterGlobalDiscount: 200.7,
      grandTotal: 201,
    });

  });

  test('purchase row calculations never create a negative line discount', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      priceType: 'WITHOUT_GST',
      taxRate: 5,
      discountPercent: -10,
    });

    expect(item).toMatchObject({
      discountPercent: 0,
      discountAmount: 0,
      total: 210,
    });
  });

  test('discounted GST-inclusive sale lines use backend per-unit rounding', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 5,
      price: 10,
      priceType: 'WITH_GST',
      taxRate: 5,
      discountPercent: 1,
    });

    expect(item).toMatchObject({
      unitBaseRate: 9.52,
      baseAmount: 47.6,
      discountAmount: 0.48,
      afterDiscount: 47.12,
      taxAmount: 2.36,
      total: 49.48,
    });
  });

  test('non-GST purchase lines keep the entered amount untaxed and retain tax policy metadata', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Notebook',
      quantity: 4,
      freeQuantity: 2,
      price: 125,
      priceType: 'WITHOUT_GST',
      taxRate: 0,
      discountPercent: 10,
    });
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-BOS', date: '2026-11-12' },
      customerForm: {},
      validItems: [item],
      products: [{ id: 4, taxRate: 18 }],
      invoiceType: 'BILL_OF_SUPPLY',
      reverseCharge: true,
      reverseChargeAmount: 22.5,
      itcEligible: false,
    });

    expect(item.total).toBe(450);
    expect(payload).toMatchObject({
      invoiceType: 'BILL_OF_SUPPLY',
      reverseCharge: true,
      reverseChargeAmount: 22.5,
      itcEligible: false,
    });
    expect(payload.items[0]).toMatchObject({
      quantity: 4,
      freeQuantity: 2,
      price: 125,
      discountPercentage: 10,
      gstPercentage: 0,
    });
  });

  test('zero-discount final amount works with decimal paid quantities', () => {
    const item = calcPurchaseRowFromFinalAmount(
      {
        productId: '4',
        productName: 'Rice',
        quantity: 2.5,
        paidQuantity: 2.5,
        freeQuantity: 0,
        taxRate: 5,
        discountPercent: 0,
      },
      '250.03',
    );
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-DECIMAL', date: '2026-11-12' },
      customerForm: {},
      validItems: [item],
      products: [],
    });
    const line = payload.items[0];
    const baseBeforeDiscount = round2(
      round2(round2(line.price) / 1.05) * line.paidQuantity,
    );
    const baseAfterDiscount = round2(baseBeforeDiscount - line.discountAmount);
    const tax = round2(baseAfterDiscount * 0.05);

    expect(item.total).toBe(250.03);
    expect(item.discountPercent).toBe(0);
    expect(round2(baseAfterDiscount + tax)).toBe(250.03);
  });

  test('editing a globally discounted purchase restores supplier line totals', () => {
    const items = mapLineItemsFromBill(
      [
        {
          productId: 4,
          productName: 'Biscuit',
          quantity: 2,
          paidQuantity: 2,
          freeQuantity: 3,
          totalQuantity: 5,
          price: 100.02,
          priceType: 'WITH_GST',
          discountPercentage: 7.5,
          discountAmount: 23.11,
          baseRate: 167.41,
          taxPercentage: 5,
          taxAmount: 8.37,
          netRate: 175.78,
          Product: { id: 4, purchasePriceType: 'WITH_GST' },
        },
        {
          productId: 5,
          productName: 'Rice',
          quantity: 1,
          paidQuantity: 1,
          freeQuantity: 0,
          totalQuantity: 1,
          price: 50.01,
          priceType: 'WITH_GST',
          discountPercentage: 0,
          discountAmount: 2.38,
          baseRate: 45.25,
          taxPercentage: 5,
          taxAmount: 2.26,
          netRate: 47.51,
          Product: { id: 5, purchasePriceType: 'WITH_GST' },
        },
      ],
      {
        side: 'purchase',
        globalDiscountAmount: 11.75,
        globalDiscountPercent: 5,
      },
    );

    expect(items[0]).toMatchObject({
      quantity: 2,
      freeQuantity: 3,
      discountAmount: 14.3,
      afterDiscount: 176.22,
      taxAmount: 8.81,
      total: 185.03,
    });
    expect(items[1].total).toBe(50.01);
    expect(calcPurchaseBillTotals(items, 0, 5).rawTotal).toBe(235.04);
    expect(calcPurchaseBillTotals(items, 0, 5).afterGlobalDiscount).toBeCloseTo(223.29, 2);
  });

  test('editing a purchase with a base-rate global discount restores raw taxable lines', () => {
    const items = mapLineItemsFromBill(
      [
        {
          productId: 4,
          productName: 'Biscuit',
          quantity: 2,
          paidQuantity: 2,
          freeQuantity: 3,
          price: 100.02,
          discountPercentage: 7.5,
          discountAmount: 23.11,
          baseRate: 167.41,
          taxPercentage: 5,
          taxAmount: 8.37,
          netRate: 175.78,
        },
        {
          productId: 5,
          productName: 'Rice',
          quantity: 1,
          paidQuantity: 1,
          price: 50.01,
          discountPercentage: 0,
          discountAmount: 2.38,
          baseRate: 45.25,
          taxPercentage: 5,
          taxAmount: 2.26,
          netRate: 47.51,
        },
      ],
      {
        side: 'purchase',
        globalDiscountAmount: 11.19,
        globalDiscountPercent: 5,
      },
    );

    expect(items.map((item) => item.total)).toEqual([185.03, 50.01]);
    expect(items.map((item) => item.discountAmount)).toEqual([14.3, 0]);
    expect(calcPurchaseBillTotals(items, 0, 5)).toMatchObject({
      subtotal: 212.66,
      totalTax: 10.63,
      afterGlobalDiscount: 223.29,
    });
  });

  test('editing restores per-line price mode and fixed global discount', () => {
    const [item] = mapLineItemsFromBill(
      [{
        productId: 4,
        productName: 'Biscuit',
        quantity: 2,
        paidQuantity: 2,
        freeQuantity: 1,
        totalQuantity: 3,
        price: 105,
        priceType: 'WITH_GST',
        discountPercentage: 0,
        discountAmount: 0,
        baseRate: 200,
        taxPercentage: 5,
        taxAmount: 10,
        netRate: 210,
        Product: { id: 4, purchasePriceType: 'WITHOUT_GST' },
      }],
      { side: 'purchase' },
    );

    expect(item.priceType).toBe('WITH_GST');
    expect(calcPurchaseBillTotals([item], 5.25)).toMatchObject({
      globalDiscountAmount: 5.25,
      afterGlobalDiscount: 204.75,
    });
  });

  test('editing a legacy purchase with a negative stored discount normalizes it to zero', () => {
    const [item] = mapLineItemsFromBill(
      [{
        productId: 4,
        productName: 'Biscuit',
        quantity: 1,
        price: 105,
        priceType: 'WITH_GST',
        discountPercentage: 0,
        discountAmount: -2,
        baseRate: 100,
        taxPercentage: 5,
        taxAmount: 5,
        netRate: 105,
      }],
      { side: 'purchase' },
    );

    expect(item.discountAmount).toBe(0);
    expect(item.total).toBe(105);
  });

  test('product sales price includes its discount for sales without a selected batch', () => {
    expect(getDiscountedSalesPrice({
      salesPrice: 100,
      discount: 15,
    })).toBe(85);
  });

  test('sale rate stays unchanged while amount reflects discount and tax', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      taxRate: 10,
      discountPercent: 20,
    });

    expect(item).toMatchObject({
      price: 100,
      discountPercent: 20,
      total: 176,
    });
  });

  test('promotion previews update payable totals without charging free units', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 1,
      price: 100,
      taxRate: 10,
    });
    const pricedItems = applyPromotionPreviewPricing([item], {
      4: {
        data: {
          product: { paidQuantity: 1, freeQuantity: 1 },
          promotion: { type: 'BUY_X_GET_Y_FREE', freeQuantity: 1 },
          pricing: {
            paidQuantity: 1,
            freeQuantity: 1,
            payableAmount: 110,
            baseRate: 100,
            taxAmount: 10,
          },
        },
      },
    });

    expect(calcBillTotals(pricedItems).grandTotal).toBe(110);
    expect(pricedItems[0].total).toBe(110);
    expect(item.total).toBe(110);
  });

  test('POS keeps paise on each item and rounds only the aggregate payable total', () => {
    const items = [
      [314.5, 1],
      [45.75, 2],
      [9.99, 3],
    ].map(([price, quantity], index) =>
      calcItemRow({
        productName: `Product ${index + 1}`,
        quantity,
        price,
        priceType: 'WITHOUT_GST',
        taxRate: 0,
      }),
    );
    const roundedTotals = calcBillTotals(items, 0, 0, {
      roundToWholeRupee: true,
    });
    const exactTotals = calcBillTotals(items, 0, 0, {
      roundToWholeRupee: false,
    });

    expect(items.map((item) => item.price)).toEqual([314.5, 45.75, 9.99]);
    expect(items.map((item) => item.total)).toEqual([314.5, 91.5, 29.97]);
    expect(items.map((item) => item.netRate)).toEqual([314.5, 45.75, 9.99]);
    expect(roundedTotals).toMatchObject({
      rawTotal: 435.97,
      afterGlobalDiscount: 435.97,
      grandTotal: 436,
      roundOff: 0.03,
    });
    expect(exactTotals).toMatchObject({
      rawTotal: 435.97,
      grandTotal: 435.97,
      roundOff: 0,
    });

    const additionalLines = [
      [45.01, 1],
      [25.58, 2],
    ].map(([price, quantity], index) =>
      calcItemRow({
        productName: `Additional product ${index + 1}`,
        quantity,
        price,
        priceType: 'WITHOUT_GST',
        taxRate: 0,
      }),
    );
    expect(additionalLines.map((item) => item.total)).toEqual([45.01, 51.16]);
  });

  test('batch pricing preview updates the displayed rate, MRP, and amount without a promotion', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      mrp: 120,
      productBatchId: '5',
      taxRate: 0,
    });
    const pricedItems = applyPromotionPreviewPricing([item], {
      4: {
        data: {
          product: { paidQuantity: 2 },
          availableBatches: [{ id: 5, availableQuantity: 5, mrp: 90 }],
          pricing: {
            unitPrice: 75,
            paidQuantity: 2,
            payableAmount: 150,
            baseRate: 150,
            taxAmount: 0,
            discountAmount: 0,
          },
        },
      },
    });

    expect(pricedItems[0]).toMatchObject({
      price: 75,
      mrp: 90,
      total: 150,
    });
  });

  test('batch preview keeps ₹314.50 on the line and rounds only the invoice total', () => {
    const item = calcItemRow({
      productId: '142',
      productName: 'KETO SOAP 100G',
      quantity: 1,
      price: 314.5,
      priceType: 'WITH_GST',
      taxRate: 5,
      mrp: 340,
    });
    const [previewItem] = applyPromotionPreviewPricing([item], {
      142: {
        data: {
          product: { paidQuantity: 1 },
          pricing: {
            unitPrice: 314.5,
            paidQuantity: 1,
            payableAmount: 314.5,
            baseRate: 299.52,
            taxAmount: 14.98,
            discountAmount: 0,
          },
        },
      },
    });
    const totals = calcBillTotals([previewItem], 0, 0, {
      roundToWholeRupee: true,
    });

    expect(previewItem.total).toBe(314.5);
    expect(previewItem.netRate).toBe(314.5);
    expect(totals).toMatchObject({
      rawTotal: 314.5,
      afterGlobalDiscount: 314.5,
      grandTotal: 315,
      roundOff: 0.5,
    });
  });

  test('an unselected product keeps its product MRP during batch availability preview', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      mrp: 120,
      taxRate: 0,
    });
    const pricedItems = applyPromotionPreviewPricing([item], {
      4: {
        data: {
          product: { paidQuantity: 2 },
          availableBatches: [{ id: 5, availableQuantity: 5, mrp: 90 }],
          pricing: {
            unitPrice: 100,
            paidQuantity: 2,
            payableAmount: 200,
            baseRate: 200,
            taxAmount: 0,
            discountAmount: 0,
          },
        },
      },
    });

    expect(pricedItems[0].mrp).toBe(120);
  });

  test('percentage promotion preview discounts payable amount and ignores stale quantities', () => {
    const item = calcItemRow({
      productId: '9',
      productName: 'Tea',
      quantity: 2,
      price: 100,
      taxRate: 5,
    });
    const discounted = applyPromotionPreviewPricing([item], {
      9: {
        data: {
          product: { paidQuantity: 2 },
          promotion: { type: 'PERCENTAGE_DISCOUNT', discountPercentage: 10 },
          pricing: {
            paidQuantity: 2,
            payableAmount: 189,
            baseRate: 180,
            taxAmount: 9,
          },
        },
      },
    });
    const stale = applyPromotionPreviewPricing([item], {
      9: {
        data: {
          product: { paidQuantity: 1 },
          promotion: { type: 'PERCENTAGE_DISCOUNT', discountPercentage: 10 },
          pricing: { paidQuantity: 1, payableAmount: 94.5, baseRate: 90, taxAmount: 4.5 },
        },
      },
    });

    expect(calcBillTotals(discounted).grandTotal).toBe(189);
    expect(stale[0].total).toBe(item.total);
  });

  test('batch change ignores a promotion preview calculated from the previous rate', () => {
    const item = calcItemRow({
      productId: '9',
      productName: 'Tea',
      quantity: 2,
      price: 150,
      productBatchId: '12',
      taxRate: 0,
    });
    const previousBatchPreview = {
      batchAllocationKey: JSON.stringify([
        { batchId: '8', price: 100, quantity: 2 },
      ]),
      data: {
        product: { paidQuantity: 2 },
        promotion: { type: 'PERCENTAGE_DISCOUNT', discountPercentage: 10 },
        pricing: { paidQuantity: 2, payableAmount: 180, baseRate: 180, taxAmount: 0 },
      },
    };

    const priced = applyPromotionPreviewPricing([item], { 9: previousBatchPreview });

    expect(getPromotionBatchAllocationKey([item])).not.toBe(
      previousBatchPreview.batchAllocationKey,
    );
    expect(priced[0].total).toBe(300);
  });

  test('supplier free quantity does not increase the purchase amount', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 10,
      freeQuantity: 10,
      price: 100,
      mrp: 120,
      salePrice: 110,
      taxRate: 0,
      batchNumber: 'A-1001',
      expiryDate: '2028-07-01',
    });
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-1', date: '2025-01-01', items: [item] },
      validItems: [item],
      customerForm: {},
      products: [],
      companyId: 1,
      userId: 9,
    });

    expect(calcBillTotals([item]).grandTotal).toBe(1000);
    expect(payload).toMatchObject({ companyId: 1, userId: 9 });
    expect(payload.items[0]).toMatchObject({
      quantity: 10,
      paidQuantity: 10,
      freeQuantity: 10,
      price: 100,
      purchasePrice: 100,
      mrp: 120,
      salePrice: 110,
      batchNumber: 'A-1001',
      expiryDate: '2028-07-01',
      gstPercentage: 0,
    });

  });

  test('purchase payload sends the entered rate and both line discount values', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      priceType: 'WITH_GST',
      taxRate: 10,
      discountPercent: 7.5,
    });

    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-6', date: '2026-11-12', items: [item] },
      validItems: [item],
      customerForm: {},
      products: [{ id: 4, purchasePrice: 500, purchasePriceType: 'WITHOUT_GST' }],
    });

    expect(payload.items[0]).toMatchObject({
      price: 100,
      purchasePrice: 100,
      priceType: 'WITH_GST',
      discountPercentage: 7.5,
      discountAmount: 13.64,
    });
  });

  test('purchase batch sales price defaults to product sales price after product discount', () => {
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-DISCOUNT', date: '2026-11-12', items: [] },
      customerForm: {},
      validItems: [{ productId: '4', productName: 'Biscuit', quantity: 1 }],
      products: [{
        id: 4,
        salesPrice: 100,
        discount: 15,
      }],
    });

    expect(payload.items[0].salePrice).toBe(85);
  });

  test('sales payload sends batch selection without client-calculated offers', () => {
    const item = {
      productId: '8',
      productName: 'Tomato',
      quantity: 11,
      paidQuantity: 10,
      freeQuantity: 1,
      totalQuantity: 11,
      productBatchId: 12,
      offerId: 3,
      offerName: 'Buy 10 Get 1',
    };
    const payload = buildSaleBillPayload({
      billForm: { invoiceNo: 'INV-1', date: '2025-01-01', items: [item] },
      customerForm: {},
      validItems: [item],
      products: [],
    });

    expect(payload.items[0]).toMatchObject({
      quantity: 11,
      batchId: 12,
    });
    expect(payload.items[0]).not.toHaveProperty('productBatchId');
    expect(payload.items[0]).not.toHaveProperty('offerId');
    expect(payload.items[0]).not.toHaveProperty('offerName');
    expect(payload.items[0]).not.toHaveProperty('freeQuantity');
  });

  test('sales payload sends entered quantity and batch ID only', () => {
    const payload = buildSaleBillPayload({
      billForm: { invoiceNo: 'INV-2', date: '2025-01-01', items: [] },
      customerForm: {},
      validItems: [{ productId: '2', productName: 'Rice', quantity: 5 }],
      products: [],
    });

    expect(payload.items[0].quantity).toBe(5);
    expect(payload.items[0]).not.toHaveProperty('totalQuantity');
  });

  test('POS sales payload sends the selected group and every batch allocation', () => {
    const priceGroup = {
      mrp: 120,
      salePrice: 45.01,
      taxRate: 18,
      priceType: 'WITH_GST',
    };
    const item = {
      productId: '2',
      productName: 'Rice',
      quantity: 2,
      price: 45.01,
      discountPercent: 0,
      priceGroupKey: '12000:4501:1800:WITH_GST',
      priceGroup,
      batchAllocations: [
        { batchId: '51', quantity: 1 },
        { batchId: '52', quantity: 1 },
      ],
    };
    const payload = buildSaleBillPayload({
      billForm: { invoiceNo: 'INV-POS-BATCH', date: '2025-01-01', items: [item] },
      customerForm: {},
      validItems: [item],
      products: [],
    });

    expect(payload.items[0]).toMatchObject({
      productId: 2,
      quantity: 2,
      priceGroupKey: '12000:4501:1800:WITH_GST',
      priceGroup,
      batchAllocations: [
        { batchId: 51, quantity: 1 },
        { batchId: 52, quantity: 1 },
      ],
    });
    expect(payload.items[0]).not.toHaveProperty('price');
  });

  test('saved backend gift lines are not resubmitted as purchased items', () => {
    const payload = buildSaleBillPayload({
      billForm: { invoiceNo: 'INV-3', date: '2025-01-01', items: [] },
      customerForm: {},
      validItems: [
        { productId: '2', productName: 'Rice', quantity: 2 },
        { productId: '5', productName: 'Oil', quantity: 1, itemRole: 'GIFT' },
      ],
      products: [],
    });

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].productId).toBe(2);
  });

  test('loaded transaction items retain quantities and batch identifiers', () => {
    const [item] = mapLineItemsFromBill([
      {
        productId: 8,
        productName: 'Tomato',
        quantity: 11,
        paidQuantity: 10,
        freeQuantity: 1,
        totalQuantity: 11,
        productBatchId: 12,
      },
    ]);

    expect(item).toMatchObject({
      quantity: 11,
      paidQuantity: 10,
      freeQuantity: 1,
      totalQuantity: 11,
      productBatchId: 12,
    });
  });
  test('purchase payload omits blank batch number and expiry date', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Rice',
      quantity: 10,
      freeQuantity: 2,
      price: 65,
      batchNumber: '',
      expiryDate: '',
    });
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-2', date: '2026-11-09', items: [item] },
      validItems: [item],
      customerForm: {},
      products: [],
      companyId: 1,
      userId: 9,
    });
    expect(payload.items[0]).toMatchObject({ paidQuantity: 10, freeQuantity: 2 });
    expect(payload.items[0]).not.toHaveProperty('batchNumber');
    expect(payload.items[0]).not.toHaveProperty('expiryDate');
  });

  test('editing a saved purchase loads billed quantity, not total received', () => {
    const [item] = mapLineItemsFromBill(
      [{ productId: 12, productName: 'Shirt', quantity: 12, paidQuantity: 10, freeQuantity: 2 }],
      { side: 'purchase' },
    );
    expect(item).toMatchObject({ quantity: 10, paidQuantity: 10, freeQuantity: 2 });
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-3', date: '2026-11-09', items: [item] },
      validItems: [item],
      customerForm: {},
      products: [],
      companyId: 1,
      userId: 9,
    });
    expect(payload.items[0]).toMatchObject({ paidQuantity: 10, freeQuantity: 2 });
  });

  test('purchase edit loads HSN code from the associated product details', () => {
    const [item] = mapLineItemsFromBill(
      [{
        productId: 12,
        productName: 'Shirt',
        quantity: 2,
        Product: { id: 12, HSNCode: '6109' },
      }],
      { side: 'purchase' },
    );

    expect(item.hsnCode).toBe('6109');
  });

  test('purchase bill edits load and submit the selected batch sales price', () => {
    const [item] = mapLineItemsFromBill(
      [{
        productId: 12,
        productName: 'Shirt',
        quantity: 2,
        price: 50,
        productBatchId: 44,
        ProductBatch: { id: 44, salePrice: '79.50' },
      }],
      { side: 'purchase' },
    );
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-4', date: '2026-11-09', items: [item] },
      validItems: [item],
      customerForm: {},
      products: [],
      companyId: 1,
      userId: 9,
    });

    expect(item.salePrice).toBe(79.5);
    expect(payload.items[0]).toMatchObject({
      productId: 12,
      productBatchId: 44,
      salePrice: 79.5,
    });
  });

  test('purchase edits use batch-specific MRP, dates, and place of supply in payload', () => {
    const [item] = mapLineItemsFromBill(
      [{
        productId: 12,
        productName: 'Shirt',
        quantity: 2,
        price: 50,
        productBatchId: 44,
        ProductBatch: {
          id: 44,
          batchNumber: 'SHIRT-44',
          mfgDate: '2026-01-02',
          expiryDate: '2027-01-02',
          mrp: '120.00',
          salePrice: '79.50',
        },
      }],
      { side: 'purchase' },
    );
    const payload = buildPurchaseBillPayload({
      billForm: { invoiceNo: 'PUR-44', date: '2026-11-09', items: [item] },
      validItems: [item],
      customerForm: {},
      products: [],
      companyId: 1,
      userId: 9,
      placeOfSupplyStateCode: '33',
    });

    expect(item).toMatchObject({
      batchNumber: 'SHIRT-44',
      mfgDate: '2026-01-02',
      expiryDate: '2027-01-02',
      mrp: '120.00',
    });
    expect(payload).toMatchObject({
      placeOfSupplyStateCode: '33',
      items: [{
        productBatchId: 44,
        batchNumber: 'SHIRT-44',
        mfgDate: '2026-01-02',
        expiryDate: '2027-01-02',
        mrp: 120,
        salePrice: 79.5,
      }],
    });
  });

  test('purchase payload preserves global discount percentage for create and edit', () => {
    const item = calcItemRow({
      productId: '4',
      productName: 'Biscuit',
      quantity: 2,
      price: 100,
      taxRate: 10,
    });
    const payload = buildPurchaseBillPayload({
      billForm: {
        invoiceNo: 'PUR-5',
        date: '2026-11-10',
        items: [item],
        globalDiscountPercent: '5',
        globalDiscount: 0,
      },
      validItems: [item],
      customerForm: {},
      products: [],
      companyId: 1,
      userId: 9,
    });

    expect(payload).toMatchObject({
      global_discount_percentage: 5,
      global_discount_amount: 0,
    });
  });

  test('pending Quick Sale keeps the entered amount payable without assuming GST', () => {
    const item = calcQuickSaleItemRow({
      productName: 'Unregistered item',
      quantity: 2,
      price: 12.5,
      gstVerificationStatus: 'GST_PENDING',
      quickSaleTaxRate: null,
    });

    expect(item).toMatchObject({
      cartItemType: 'QUICK_SALE',
      total: 25,
      afterDiscount: 0,
      taxAmount: 0,
      taxRate: null,
    });
    expect(calcBillTotals([item], 0, 0, { roundToWholeRupee: false })).toMatchObject({
      subtotal: 0,
      totalTax: 0,
      rawTotal: 25,
      grandTotal: 25,
    });
  });
});
