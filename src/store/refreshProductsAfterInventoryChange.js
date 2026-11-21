import useAppStore from './appStore';
import { invalidateBatchCache } from '../utils/productBatchCache';

export async function refreshProductsAfterInventoryChange(action) {
  invalidateBatchCache();
  try {
    await useAppStore.getState().refreshProducts();
  } catch (error) {
    const message = `${action} succeeded, but product stock could not be refreshed: ${
      error.message || 'Failed to load products'
    }`;
    console.error(message, error);
    throw new Error(message);
  }
}
