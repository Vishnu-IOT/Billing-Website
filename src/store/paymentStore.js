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
  // Last date filters used, so a refetch after add keeps the user's current view
  lastFiltersIn: { startDate: '', endDate: '' },
  lastFiltersOut: { startDate: '', endDate: '' },

  loadPaymentsIn: async (startDate = '', endDate = '') => {
    set({ loading: true, error: null, lastFiltersIn: { startDate, endDate } });

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
    // The POST response is the bare payment row (no Party / Sale joins), so
    // appending it leaves Party name and bill no. blank until a refresh.
    // Refetch the list (same joins as the GET) using the current filters.
    try {
      const { startDate, endDate } = get().lastFiltersIn;
      const data = await fetchPaymentsInAPI(startDate, endDate);
      set({ paymentsIn: Array.isArray(data) ? data : (data?.data ?? []) });
    } catch (err) {
      console.error('Refresh Payments In after add failed:', err);
    }
    return saved; // { success, data, paymentStatus, amountPaid, balanceDue }
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
      lastFiltersOut: { startDate, endDate },
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
    // Same as Payment In: refetch so Party / Purchase joins are populated.
    try {
      const { startDate, endDate } = get().lastFiltersOut;
      const data = await fetchPaymentsOutAPI(startDate, endDate);
      set({ paymentsOut: Array.isArray(data) ? data : (data?.data ?? []) });
    } catch (err) {
      console.error('Refresh Payments Out after add failed:', err);
    }
    return saved; // { success, data, paymentStatus, amountPaid, balanceDue }
  },

  deletePaymentOut: async (id) => {
    await deletePaymentOutAPI(id);
    set((s) => ({
      paymentsOut: s.paymentsOut.filter((p) => String(p.id || p._id) !== String(id)),
    }));
  },
}));

export default usePaymentStore;
