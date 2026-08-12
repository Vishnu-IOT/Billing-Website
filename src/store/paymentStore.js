import { create } from 'zustand';
import {
  fetchPaymentsInAPI,
  addPaymentInAPI,
  deletePaymentInAPI,
  fetchPaymentsOutAPI,
  addPaymentOutAPI,
  deletePaymentOutAPI,
} from '../api';

const usePaymentStore = create((set, get) => ({
  paymentsIn: [],
  paymentsOut: [],
  loading: false,
  error: null,

  loadPaymentsIn: async (startDate = '', endDate = '') => {
    set({ loading: true, error: null });

    try {
      const data = await fetchPaymentsInAPI(
        startDate,
        endDate
      );

      set({
        paymentsIn: Array.isArray(data)
          ? data
          : (data?.data ?? []),
        loading: false,
      });

    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
    }
  },

  addPaymentIn: async (payment) => {
    const saved = await addPaymentInAPI(payment);
    if (saved) {
      set((s) => ({ paymentsIn: [...s.paymentsIn, saved?.data ?? saved] }));
    }
    return saved?.data ?? saved;
  },

  deletePaymentIn: async (id) => {
    await deletePaymentInAPI(id);
    set((s) => ({
      paymentsIn: s.paymentsIn.filter((p) => String(p.id || p._id) !== String(id)),
    }));
  },

  loadPaymentsOut: async (startDate = '', endDate = '') => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await fetchPaymentsOutAPI(
        startDate,
        endDate
      );

      set({
        paymentsOut: Array.isArray(data)
          ? data
          : (data?.data ?? []),
        loading: false,
      });

    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
    }
  },
  
  addPaymentOut: async (payment) => {
    const saved = await addPaymentOutAPI(payment);
    if (saved) {
      set((s) => ({ paymentsOut: [...s.paymentsOut, saved?.data ?? saved] }));
    }
    return saved?.data ?? saved;
  },

  deletePaymentOut: async (id) => {
    await deletePaymentOutAPI(id);
    set((s) => ({
      paymentsOut: s.paymentsOut.filter((p) => String(p.id || p._id) !== String(id)),
    }));
  },
}));

export default usePaymentStore;
