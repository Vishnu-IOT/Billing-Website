import { create } from 'zustand';
import {
  fetchCurrentShiftAPI,
  startShiftAPI,
  endShiftAPI,
  holdCartAPI,
  fetchHoldCartsAPI,
  resumeHoldCartAPI,
  cancelHoldCartAPI,
  fetchShiftDetailsAPI,
} from '../api/pos';
import { todayISO } from '../utils/date';

const usePosStore = create((set, get) => ({
  activeShift: null,
  holdCarts: [],
  loadingShift: false,
  loadingHold: false,

  // Shift Management (history/report)
  shiftList: [],
  shiftListCount: 0,
  loadingShiftList: false,
  shiftFilters: {
    userId: '',
    fromDate: todayISO(),
    toDate: todayISO(),
    status: '',
  },

  setShiftFilters: (filters) => {
    set((state) => ({ shiftFilters: { ...state.shiftFilters, ...filters } }));
  },

  loadShiftDetails: async (overrideFilters) => {
    const filters = { ...get().shiftFilters, ...(overrideFilters || {}) };
    set({ loadingShiftList: true, shiftFilters: filters });
    try {
      const params = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.status) params.status = filters.status;

      const res = await fetchShiftDetailsAPI(params);
      set({
        shiftList: res?.data || [],
        shiftListCount: res?.count || 0,
        loadingShiftList: false,
      });
      return res;
    } catch (err) {
      set({ loadingShiftList: false, shiftList: [], shiftListCount: 0 });
      throw err;
    }
  },

  // Shift Management
  checkCurrentShift: async (userId) => {
    set({ loadingShift: true });
    try {
      const shift = await fetchCurrentShiftAPI(userId);
      set({ activeShift: shift, loadingShift: false });
      return shift;
    } catch (err) {
      set({ loadingShift: false });
      return null;
    }
  },

  startShift: async (payload) => {
    set({ loadingShift: true });
    try {
      const res = await startShiftAPI(payload);
      if (res.success) {
        set({ activeShift: res.data, loadingShift: false });
      }
      return res;
    } catch (err) {
      set({ loadingShift: false });
      throw err;
    }
  },

  endShift: async (payload) => {
    set({ loadingShift: true });
    try {
      const res = await endShiftAPI(payload);
      if (res.success) {
        set({ activeShift: null, loadingShift: false });
      }
      return res;
    } catch (err) {
      set({ loadingShift: false });
      throw err;
    }
  },

  // Hold Carts Management
  loadHoldCarts: async () => {
    set({ loadingHold: true });
    try {
      const carts = await fetchHoldCartsAPI();
      set({ holdCarts: carts, loadingHold: false });
      return carts;
    } catch (err) {
      set({ loadingHold: false });
      return [];
    }
  },

  holdCart: async (payload) => {
    try {
      const res = await holdCartAPI(payload);
      await get().loadHoldCarts();
      return res;
    } catch (err) {
      throw err;
    }
  },

  resumeHoldCart: async (id) => {
    try {
      const res = await resumeHoldCartAPI(id);
      await get().loadHoldCarts();
      return res;
    } catch (err) {
      throw err;
    }
  },

  cancelHoldCart: async (id) => {
    try {
      const res = await cancelHoldCartAPI(id);
      await get().loadHoldCarts();
      return res;
    } catch (err) {
      throw err;
    }
  },
}));

export default usePosStore;