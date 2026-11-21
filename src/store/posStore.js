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

let shiftRequestVersion = 0;

const usePosStore = create((set, get) => ({
  activeShift: null,
  activeShiftContext: null,
  holdCarts: [],
  loadingShift: false,
  loadingHold: false,

  // Shift Management (history/report)
  shiftList: [],
  shiftListCount: 0,
  loadingShiftList: false,
  shiftFilters: {
    userId: '',
    counterId: '',
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
      if (filters.counterId) params.counterId = filters.counterId;
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
  clearActiveShift: () => {
    shiftRequestVersion += 1;
    set({ activeShift: null, activeShiftContext: null, loadingShift: false });
  },

  checkCurrentShift: async (userId, companyId) => {
    const requestVersion = ++shiftRequestVersion;
    if (!userId) {
      set({ activeShift: null, activeShiftContext: null, loadingShift: false });
      return null;
    }

    const context = {
      userId: Number(userId),
      companyId: companyId ? Number(companyId) : null,
    };
    set({
      activeShift: null,
      activeShiftContext: context,
      loadingShift: true,
    });
    try {
      const shift = await fetchCurrentShiftAPI(userId, companyId);
      if (requestVersion === shiftRequestVersion) {
        set({
          activeShift: shift,
          activeShiftContext: shift
            ? {
                userId: Number(userId),
                companyId: Number(shift.companyId ?? companyId) || null,
              }
            : context,
          loadingShift: false,
        });
      }
      return shift;
    } catch (err) {
      if (requestVersion === shiftRequestVersion) {
        set({ activeShift: null, loadingShift: false });
      }
      throw err;
    }
  },

  startShift: async (payload) => {
    const requestVersion = ++shiftRequestVersion;
    set({ loadingShift: true });
    try {
      const res = await startShiftAPI(payload);
      if (requestVersion === shiftRequestVersion && res.success) {
        set({
          activeShift: res.data,
          activeShiftContext: {
            userId: Number(payload.userId),
            companyId: Number(res.data.companyId ?? payload.companyId) || null,
          },
          loadingShift: false,
        });
      } else if (requestVersion === shiftRequestVersion) {
        set({ loadingShift: false });
      }
      return res;
    } catch (err) {
      if (requestVersion === shiftRequestVersion) set({ loadingShift: false });
      throw err;
    }
  },

  endShift: async (payload) => {
    const requestVersion = ++shiftRequestVersion;
    set({ loadingShift: true });
    try {
      const res = await endShiftAPI(payload);
      if (requestVersion === shiftRequestVersion && res.success) {
        set({
          activeShift: null,
          activeShiftContext: null,
          loadingShift: false,
        });
      } else if (requestVersion === shiftRequestVersion) {
        set({ loadingShift: false });
      }
      return res;
    } catch (err) {
      if (requestVersion === shiftRequestVersion) set({ loadingShift: false });
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