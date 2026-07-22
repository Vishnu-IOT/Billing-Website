/* ===== INVENTORY STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchStockAdjustmentsAPI,
  addStockAdjustmentAPI,
  updateProductsBulkAPI,
  fetchProductBatchesAPI,
  addProductBatchAPI,
  deleteProductBatchAPI,
} from '../api';

const useInventoryStore = create((set, get) => ({
  adjustments: [],
  batches: {},
  loading: false,
  error: null,

  loadAdjustments: async () => {
    set({ loading: true });
    try {
      const data = await fetchStockAdjustmentsAPI();
      set({ adjustments: Array.isArray(data) ? data : data?.data ?? [], loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  addAdjustment: async (payload) => {
    const result = await addStockAdjustmentAPI(payload);
    await get().loadAdjustments();
    return result;
  },

  bulkUpdateStock: async (updates) => {
    set({ loading: true });
    try {
      const result = await updateProductsBulkAPI(updates);
      set({ loading: false });
      return result;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  loadBatches: async (productId) => {
    try {
      const data = await fetchProductBatchesAPI(productId);
      const bList = Array.isArray(data) ? data : data?.data ?? [];
      set((s) => ({ batches: { ...s.batches, [productId]: bList } }));
      return bList;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  addBatch: async (productId, batchData) => {
    const result = await addProductBatchAPI(productId, batchData);
    await get().loadBatches(productId);
    return result;
  },

  deleteBatch: async (productId, batchId) => {
    await deleteProductBatchAPI(productId, batchId);
    await get().loadBatches(productId);
  },
}));

export default useInventoryStore;
