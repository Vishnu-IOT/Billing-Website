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

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getCurrentMonthRange = () => {
  const today = new Date();

  return {
    startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const usePurchaseStore = create((set, get) => ({
  purchaseBills: [],
  filter: 'thisMonth',
  // dateRange: { startDate: '', endDate: '' },
  dateRange: getCurrentMonthRange(),
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

  updatePaymentStatus: async (id, payload) => {
    const status = typeof payload === 'string' ? payload : payload.paymentStatus;
    await updatePaymentOutAPI(id, typeof payload === 'object' ? payload : { paymentStatus: payload });
    set((s) => ({
      purchaseBills: s.purchaseBills.map((b) =>
        String(b.id || b._id) === String(id)
          ? { ...b, paymentStatus: status, ...(typeof payload === 'object' ? payload : {}) }
          : b
      ),
    }));
  },
}));

export default usePurchaseStore;
