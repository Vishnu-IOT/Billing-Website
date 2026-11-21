import {
  allocatePriceGroupQuantity,
  buildMrpPriceGroups,
  getPriceGroupKey,
} from './priceCheck';

const product = {
  id: 101,
  taxRate: 5,
  sellingPriceType: 'WITH_GST',
  unitType: 'PIECE',
};

const batches = [
  { id: 201, mrp: 200, salePrice: 180, gstPercentage: 5, availableQuantity: 2, createdAt: '2026-01-01' },
  { id: 202, mrp: 200, salePrice: 180, gstPercentage: 5, availableQuantity: 3, createdAt: '2026-01-02' },
  { id: 203, mrp: 400, salePrice: 360, gstPercentage: 5, availableQuantity: 5, createdAt: '2026-01-03' },
  { id: 204, mrp: 200, salePrice: 180, gstPercentage: 5, availableQuantity: 5, createdAt: '2026-01-04' },
];

test('groups compatible batches by unique MRP and sums their actual available stock', () => {
  const groups = buildMrpPriceGroups({ product, batches, today: '2026-11-17' });
  expect(groups).toHaveLength(2);
  expect(groups[0]).toMatchObject({ mrp: 200, salePrice: 180, availableQuantity: 10 });
  expect(groups[0].batches.map((batch) => batch.id)).toEqual([201, 202, 204]);
  expect(groups[1]).toMatchObject({ mrp: 400, salePrice: 360, availableQuantity: 5 });
});

test('keeps same-MRP batches separate when sale price or tax differs', () => {
  const groups = buildMrpPriceGroups({
    product,
    batches: [
      ...batches.slice(0, 1),
      { ...batches[1], salePrice: 175 },
      { ...batches[2], mrp: 200, gstPercentage: 12 },
    ],
    today: '2026-11-17',
  });
  expect(groups).toHaveLength(3);
  expect(new Set(groups.map((group) => group.key)).size).toBe(3);
});

test('excludes expired and empty batches and subtracts other cart allocations', () => {
  const groups = buildMrpPriceGroups({
    product,
    batches: [
      ...batches,
      { id: 205, mrp: 200, salePrice: 180, gstPercentage: 5, availableQuantity: 8, expiryDate: '2026-11-16' },
      { id: 206, mrp: 200, salePrice: 180, gstPercentage: 5, availableQuantity: 0 },
    ],
    cart: [{
      productId: '101',
      cartLineId: 'existing',
      batchAllocations: [{ batchId: '201', quantity: 1 }],
    }],
    today: '2026-11-17',
  });
  expect(groups[0].availableQuantity).toBe(9);
});

test('allocates requested quantity FIFO only within the selected MRP group', () => {
  const [group] = buildMrpPriceGroups({ product, batches, today: '2026-11-17' });
  expect(allocatePriceGroupQuantity(group, 5)).toEqual([
    { batchId: '201', quantity: 2 },
    { batchId: '202', quantity: 3 },
  ]);
  expect(allocatePriceGroupQuantity(group, 11)).toBeNull();
});

test('price group identity includes currency precision and tax treatment', () => {
  expect(getPriceGroupKey({
    mrp: 200,
    salePrice: 180,
    taxRate: 5,
    priceType: 'WITH_GST',
  })).not.toBe(getPriceGroupKey({
    mrp: 200,
    salePrice: 180,
    taxRate: 12,
    priceType: 'WITH_GST',
  }));
});
