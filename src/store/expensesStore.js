/* ===== EXPENSES STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchExpensesAPI,
  addExpenseAPI,
  deleteExpenseAPI,
  fetchAnalyticsAPI,
} from '../api';

const INITIAL_EXPENSES = [
  { id: 'exp-1', name: 'Office Rent - May', category: 'Rent', amount: 25000, date: '2026-05-15', status: 'Paid' },
  { id: 'exp-2', name: 'Broadband Internet bill', category: 'Utilities', amount: 1500, date: '2026-05-12', status: 'Paid' },
  { id: 'exp-3', name: 'Packaging boxes inventory', category: 'Supplies', amount: 4800, date: '2026-05-10', status: 'Paid' },
  { id: 'exp-4', name: 'Printer toner refilling', category: 'Maintenance', amount: 800, date: '2026-05-08', status: 'Paid' },
  { id: 'exp-5', name: 'Office snacks & refreshments', category: 'Pantry', amount: 1200, date: '2026-05-05', status: 'Paid' },
];

const useExpensesStore = create((set, get) => ({
  expenses: INITIAL_EXPENSES,
  analyticsSummary: null,
  loading: false,
  error: null,

  loadExpenses: async () => {
    set({ loading: true });
    try {
      const data = await fetchExpensesAPI();
      if (Array.isArray(data) && data.length > 0) {
        set({ expenses: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  addExpense: async (payload) => {
    set({ loading: true });
    try {
      const result = await addExpenseAPI(payload);
      const newExp = result?.data || result || {
        id: `exp-${Date.now()}`,
        ...payload,
        status: 'Paid',
      };
      set((s) => ({ expenses: [newExp, ...s.expenses], loading: false }));
      return newExp;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  deleteExpense: async (id) => {
    try {
      await deleteExpenseAPI(id);
      set((s) => ({
        expenses: s.expenses.filter((e) => String(e.id || e._id) !== String(id)),
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  loadAnalytics: async () => {
    set({ loading: true });
    try {
      const data = await fetchAnalyticsAPI();
      set({ analyticsSummary: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },
}));

export default useExpensesStore;
