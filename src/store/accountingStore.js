import { create } from 'zustand';
import {
  fetchChartOfAccountsAPI,
  createAccountAPI,
  fetchJournalEntriesAPI,
  createJournalEntryAPI,
  fetchPartyLedgerAPI,
  fetchTrialBalanceAPI,
  fetchProfitAndLossAPI,
  fetchBalanceSheetAPI,
} from '../api/accounting';

const useAccountingStore = create((set, get) => ({
  accounts: [],
  journalEntries: [],
  partyLedger: null,
  trialBalance: null,
  profitAndLoss: null,
  balanceSheet: null,
  loading: false,

  loadChartOfAccounts: async () => {
    set({ loading: true });
    try {
      const accounts = await fetchChartOfAccountsAPI();
      set({ accounts, loading: false });
      return accounts;
    } catch (err) {
      set({ loading: false });
      return [];
    }
  },

  addAccount: async (payload) => {
    try {
      const res = await createAccountAPI(payload);
      await get().loadChartOfAccounts();
      return res;
    } catch (err) {
      throw err;
    }
  },

  loadJournalEntries: async () => {
    set({ loading: true });
    try {
      const journalEntries = await fetchJournalEntriesAPI();
      set({ journalEntries, loading: false });
      return journalEntries;
    } catch (err) {
      set({ loading: false });
      return [];
    }
  },

  addJournalEntry: async (payload) => {
    try {
      const res = await createJournalEntryAPI(payload);
      await get().loadJournalEntries();
      return res;
    } catch (err) {
      throw err;
    }
  },

  loadPartyLedger: async (partyId) => {
    set({ loading: true });
    try {
      const data = await fetchPartyLedgerAPI(partyId);
      set({ partyLedger: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      return null;
    }
  },

  loadTrialBalance: async () => {
    set({ loading: true });
    try {
      const data = await fetchTrialBalanceAPI();
      set({ trialBalance: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      return null;
    }
  },

  loadProfitAndLoss: async () => {
    set({ loading: true });
    try {
      const data = await fetchProfitAndLossAPI();
      set({ profitAndLoss: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      return null;
    }
  },

  loadBalanceSheet: async () => {
    set({ loading: true });
    try {
      const data = await fetchBalanceSheetAPI();
      set({ balanceSheet: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      return null;
    }
  },
}));

export default useAccountingStore;
