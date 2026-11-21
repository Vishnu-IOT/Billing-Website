import usePOSStore from './usePOSStore';

jest.mock('../store/settingsStore-DB', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      scannerEnabled: false,
      cameraEnabled: false,
      printerWidth: '80',
      autoPrint: false,
    }),
  },
}));

describe('POS batch allocations', () => {
  beforeEach(() => {
    usePOSStore.getState().clearCart();
  });

  test('splitting preserves the price group and concrete batch allocations', () => {
    const store = usePOSStore.getState();
    const product = { id: '12', name: 'Rice', unitType: 'PIECE' };
    const group = {
      key: '12000:10000:0:WITHOUT_GST',
      mrp: 120,
      salePrice: 100,
      taxRate: 0,
      priceType: 'WITHOUT_GST',
    };
    store.addPriceCheckedCartItem(product, group, 4, [
      { batchId: '5', quantity: 2 },
      { batchId: '6', quantity: 2 },
    ]);

    store.addCartAllocation(usePOSStore.getState().cart[0]);

    const allocations = usePOSStore.getState().cart;
    expect(allocations).toHaveLength(2);
    expect(allocations.map((item) => item.quantity)).toEqual([2, 2]);
    expect(allocations.reduce((total, item) => total + item.quantity, 0)).toBe(4);
    expect(allocations.map((item) => item.batchAllocations)).toEqual([
      [{ batchId: '6', quantity: 2 }],
      [{ batchId: '5', quantity: 2 }],
    ]);
    expect(allocations.every((item) => item.priceGroupKey === group.key)).toBe(true);
  });

  test('splitting a line larger than its batch moves exactly the overflow', () => {
    const store = usePOSStore.getState();
    const product = { id: '12', name: 'Rice', unitType: 'PIECE' };
    const group = {
      key: '12000:10000:0:WITHOUT_GST',
      mrp: 120,
      salePrice: 100,
      taxRate: 0,
      priceType: 'WITHOUT_GST',
    };
    store.addPriceCheckedCartItem(product, group, 10, [
      { batchId: '5', quantity: 7 },
      { batchId: '6', quantity: 3 },
    ]);
    const line = usePOSStore.getState().cart[0];
    store.updateCartItem(line.cartLineId, { batchAvailableQuantity: 7 });
    usePOSStore.getState().addCartAllocation(usePOSStore.getState().cart[0]);
    const [first, second] = usePOSStore.getState().cart;
    expect(first.quantity).toBe(7);
    expect(second.quantity).toBe(3);
    expect(first.batchAllocations).toEqual([{ batchId: '5', quantity: 7 }]);
    expect(second.batchAllocations).toEqual([{ batchId: '6', quantity: 3 }]);
  });

  test('uses the exact batch sale price without applying the product discount', () => {
    const store = usePOSStore.getState();
    const product = {
      id: '18',
      name: 'Tea',
      salesPrice: 100,
      discount: 15,
      taxRate: 18,
    };
    const group = {
      key: '12000:4501:1800:WITH_GST',
      mrp: 120,
      salePrice: 45.01,
      taxRate: 18,
      priceType: 'WITH_GST',
    };
    store.addPriceCheckedCartItem(product, group, 2, [
      { batchId: '12', quantity: 2 },
    ]);

    expect(usePOSStore.getState().cart[0]).toMatchObject({
      price: 45.01,
      discountPercent: 0,
      total: expect.any(Number),
      priceGroupKey: group.key,
    });
    expect(usePOSStore.getState().cart[0].total).toBeCloseTo(90.02, 2);
  });

  test('adding a fractional weight quantity preserves the requested amount', () => {
    const product = {
      id: '20',
      name: 'Coffee',
      salesPrice: 99,
      discount: 50,
      unitType: 'WEIGHT',
      taxRate: 0,
    };
    const group = {
      key: '5000:4000:0:WITHOUT_GST',
      mrp: 50,
      salePrice: 40,
      taxRate: 0,
      priceType: 'WITHOUT_GST',
    };

    usePOSStore.getState().addPriceCheckedCartItem(product, group, 0.5, [
      { batchId: '20-A', quantity: 0.5 },
    ]);
    usePOSStore.getState().addPriceCheckedCartItem(product, group, 0.25, [
      { batchId: '20-A', quantity: 0.25 },
    ]);

    expect(usePOSStore.getState().cart[0]).toMatchObject({
      quantity: 0.75,
      quantityUnit: 'KG',
      total: 30,
    });
  });

  test('price-checked scans merge only within the same price group and preserve FIFO allocations', () => {
    const product = {
      id: '24',
      name: 'Cooking Oil',
      salesPrice: 100,
      taxRate: 5,
      sellingPriceType: 'WITHOUT_GST',
    };
    const firstGroup = {
      key: '20000:18000:500:WITHOUT_GST',
      mrp: 200,
      salePrice: 180,
      taxRate: 5,
      priceType: 'WITHOUT_GST',
    };
    const secondGroup = {
      key: '40000:36000:500:WITHOUT_GST',
      mrp: 400,
      salePrice: 360,
      taxRate: 5,
      priceType: 'WITHOUT_GST',
    };

    usePOSStore.getState().addPriceCheckedCartItem(product, firstGroup, 2, [
      { batchId: '51', quantity: 2 },
    ]);
    usePOSStore.getState().addPriceCheckedCartItem(product, firstGroup, 1, [
      { batchId: '52', quantity: 1 },
    ]);
    usePOSStore.getState().addPriceCheckedCartItem(product, secondGroup, 1, [
      { batchId: '53', quantity: 1 },
    ]);

    const cart = usePOSStore.getState().cart;
    expect(cart).toHaveLength(2);
    expect(cart[0]).toMatchObject({
      quantity: 3,
      mrp: 200,
      price: 180,
      batchAllocations: [
        { batchId: '51', quantity: 2 },
        { batchId: '52', quantity: 1 },
      ],
    });
    expect(cart[1]).toMatchObject({
      quantity: 1,
      mrp: 400,
      price: 360,
      batchAllocations: [{ batchId: '53', quantity: 1 }],
    });
  });
});