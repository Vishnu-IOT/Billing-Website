/* ===== SALES STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchSaleBillsByDateAPI,
  fetchSaleBillsAPI,
  addSaleBillAPI,
  deleteSaleBillAPI,
  updatePaymentInAPI,
  updateSaleBillAPI,
} from '../api';

const useSalesStore = create((set, get) => ({
  saleBills: [],
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
      const data = await fetchSaleBillsByDateAPI(f, dr);
      const bills = (Array.isArray(data) ? data : (data?.data ?? [])).map(
        (b) => ({
          ...b,
          invoiceNo: b.invoiceNo || b.invoiceNumber || '',
        })
      );
      set({ saleBills: bills, loading: false });
    } catch (err) {
      console.error('Failed to load sale bills', err);
      set({ loading: false, error: err.message });
    }
  },

  loadAllBills: async () => {
    set({ loading: true });
    try {
      const data = await fetchSaleBillsAPI();
      const bills = Array.isArray(data) ? data : (data?.data ?? []);
      set({ saleBills: bills, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  addBill: async (payload) => {
    await addSaleBillAPI(payload);
    await get().loadBills();
  },

  updateBill: async (id, payload) => {
    await updateSaleBillAPI(id, payload);
    await get().loadBills();
  },

  deleteBill: async (id) => {
    await deleteSaleBillAPI(id);
    set((s) => ({
      saleBills: s.saleBills.filter(
        (b) => String(b.id || b._id) !== String(id)
      ),
    }));
  },

  updatePaymentStatus: async (id, payload) => {
    const status = typeof payload === 'string' ? payload : payload.paymentStatus;
    await updatePaymentInAPI({ id, ...(typeof payload === 'object' ? payload : { paymentStatus: payload }) });
    set((s) => ({
      saleBills: s.saleBills.map((b) =>
        String(b.id || b._id) === String(id)
          ? { ...b, paymentStatus: status, ...(typeof payload === 'object' ? payload : {}) }
          : b
      ),
    }));
  },
}));

export default useSalesStore;
