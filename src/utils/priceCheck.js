import { normalizePriceType } from './gstPricing';
import { isWeightProduct, normalizeWeightQuantity } from './quantityUnits';

const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100);
const round3 = (value) => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;

function batchId(batch) {
  return String(batch.id || batch._id || '');
}

function isExpired(batch, today) {
  const expiry = String(batch.expiryDate || batch.expiry_date || '').slice(0, 10);
  return Boolean(expiry && expiry < today);
}

export function getPriceGroupKey({ mrp, salePrice, taxRate, priceType }) {
  return [
    cents(mrp),
    cents(salePrice),
    cents(taxRate),
    normalizePriceType(priceType),
  ].join(':');
}

function getReservedBatchQuantities(cart, productId, excludedCartLineId) {
  const reserved = new Map();
  (cart || []).forEach((item) => {
    if (
      String(item.productId) !== String(productId) ||
      String(item.cartLineId || item.productId) === String(excludedCartLineId || '')
    ) {
      return;
    }

    const allocations = Array.isArray(item.batchAllocations)
      ? item.batchAllocations
      : item.productBatchId || item.batchId
        ? [{ batchId: item.productBatchId || item.batchId, quantity: item.quantity }]
        : [];
    allocations.forEach((allocation) => {
      const id = String(allocation.batchId || allocation.productBatchId || '');
      const quantity = item.unitType === 'WEIGHT' && !item.batchAllocations
        ? normalizeWeightQuantity(item.quantity, item.quantityUnit || 'KG')
        : Number(allocation.quantity) || 0;
      if (!id || quantity <= 0) return;
      reserved.set(id, round3((reserved.get(id) || 0) + quantity));
    });
  });
  return reserved;
}

export function buildMrpPriceGroups({
  product,
  batches,
  cart = [],
  today = new Date().toISOString().slice(0, 10),
  excludedCartLineId,
}) {
  const productId = product.id || product._id;
  const reserved = getReservedBatchQuantities(cart, productId, excludedCartLineId);
  const groups = new Map();

  (batches || [])
    .filter((batch) => !isExpired(batch, today))
    .sort((a, b) => {
      const time = (batch) =>
        new Date(batch.createdAt || batch.created_at || batch.mfgDate || 0).getTime() || 0;
      return time(a) - time(b) || Number(batchId(a)) - Number(batchId(b));
    })
    .forEach((batch) => {
      const available = round3(
        Math.max(
          0,
          Number(batch.availableQuantity ?? batch.quantity ?? 0) -
            (reserved.get(batchId(batch)) || 0),
        ),
      );
      if (available <= 0) return;

      const mrp = Number(batch.mrp ?? batch.MRP);
      const salePrice = Number(batch.salePrice ?? batch.sellingPrice);
      const taxRate = Number(batch.gstPercentage ?? product.taxRate ?? 0);
      if (
        !Number.isFinite(mrp) || mrp < 0 ||
        !Number.isFinite(salePrice) || salePrice < 0 ||
        !Number.isFinite(taxRate) || taxRate < 0
      ) {
        return;
      }

      const priceType = normalizePriceType(product.sellingPriceType);
      const priceGroup = { mrp, salePrice, taxRate, priceType };
      const key = getPriceGroupKey(priceGroup);
      const group = groups.get(key) || {
        key,
        ...priceGroup,
        availableQuantity: 0,
        batches: [],
      };
      group.availableQuantity = round3(group.availableQuantity + available);
      group.batches.push({ ...batch, availableQuantity: available });
      groups.set(key, group);
    });

  return [...groups.values()].sort(
    (a, b) => a.mrp - b.mrp || a.salePrice - b.salePrice || a.taxRate - b.taxRate,
  );
}

export function allocatePriceGroupQuantity(group, quantity) {
  const requested = round3(Number(quantity));
  if (!Number.isFinite(requested) || requested <= 0) return null;

  const allocated = [];
  let remaining = requested;
  for (const batch of group.batches) {
    if (remaining <= 0) break;
    const take = round3(Math.min(Number(batch.availableQuantity) || 0, remaining));
    if (take <= 0) continue;
    allocated.push({ batchId: batchId(batch), quantity: take });
    remaining = round3(remaining - take);
  }
  return remaining > 0.001 ? null : allocated;
}

export function quantityInProductBaseUnit(quantity, quantityUnit, product) {
  return isWeightProduct(product)
    ? normalizeWeightQuantity(quantity, quantityUnit || 'KG')
    : Number(quantity);
}
