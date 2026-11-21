import { fetchProductBatchesAPI } from '../api/products';

const BATCH_CACHE_TTL_MS = 10000;
const BATCH_HISTORY_CACHE_TTL_MS = 60000;
const batchCache = new Map();

export function loadBatchesCached(
  productId,
  { availableOnly = false, includeBatchId, historyOnly = false } = {},
) {
  const key = `${productId}:${historyOnly ? 'history' : availableOnly ? 'available' : 'all'}:${includeBatchId || ''}`;
  const hit = batchCache.get(key);
  const ttl = historyOnly ? BATCH_HISTORY_CACHE_TTL_MS : BATCH_CACHE_TTL_MS;
  if (hit && Date.now() - hit.at < ttl) return hit.promise;
  const promise = fetchProductBatchesAPI(productId, {
    availableOnly,
    includeBatchId,
    historyOnly,
  }).catch((error) => {
    batchCache.delete(key);
    throw error;
  });
  batchCache.set(key, { at: Date.now(), promise });
  return promise;
}

export function invalidateBatchCache(productId) {
  if (productId === undefined) batchCache.clear();
  else {
    for (const key of batchCache.keys()) {
      if (key.startsWith(`${productId}:`)) batchCache.delete(key);
    }
  }
}
