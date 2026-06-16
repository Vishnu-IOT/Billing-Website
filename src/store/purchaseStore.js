/* ===== PURCHASE STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchPurchaseBillsByDateAPI,
  fetchPurchaseBillsAPI,
  addPurchaseBillAPI,
  deletePurchaseBillAPI,
  updatePaymentOutAPI,
  updatePurchaseBillAPI,
} from '../api';

const usePurchaseStore = create((set, get) => ({
  purchaseBills: [],
  filter: 'thisMonth',
  dateRange: { startDate: '', endDate: '' },
  loading: false,
  error: null,

  setFilter: (filter) => set({ filter }),
  setDateRange: (dateRange) => set({ dateRange }),

  loadBills: async (filter, dateRange) => {
    const f = filter ?? get().filter;
    const dr = dateRange ?? get().dateRange;
    set({ loading: true });
    try {
      const data = await fetchPurchaseBillsByDateAPI(f, dr);
      const bills = (Array.isArray(data) ? data : (data?.data ?? [])).map(
        (b) => ({
          ...b,
          invoiceNo: b.invoiceNo || b.invoiceNumber || '',
        })
      );
      set({ purchaseBills: bills, loading: false });
    } catch (err) {
      console.error('Failed to load purchase bills', err);
      set({ loading: false, error: err.message });
    }
  },

  loadAllBills: async () => {
    set({ loading: true });
    try {
      const data = await fetchPurchaseBillsAPI();
      const bills = Array.isArray(data) ? data : (data?.data ?? []);
      set({ purchaseBills: bills, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  addBill: async (payload) => {
    await addPurchaseBillAPI(payload);
    await get().loadBills();
  },

  updateBill: async (id, payload) => {
    await updatePurchaseBillAPI(id, payload);
    await get().loadBills();
  },

  deleteBill: async (id) => {
    await deletePurchaseBillAPI(id);
    set((s) => ({
      purchaseBills: s.purchaseBills.filter(
        (b) => String(b.id || b._id) !== String(id)
      ),
    }));
  },

  updatePaymentStatus: async (id, status) => {
    await updatePaymentOutAPI(id, { paymentStatus: status });
    set((s) => ({
      purchaseBills: s.purchaseBills.map((b) =>
        String(b.id || b._id) === String(id)
          ? { ...b, paymentStatus: status }
          : b
      ),
    }));
  },
}));

export default usePurchaseStore;
