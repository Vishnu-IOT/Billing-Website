/* ===== COMPLIANCE STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchEInvoicesAPI,
  fetchEWayBillsAPI,
  generateEInvoiceAPI,
  generateEWayBillAPI,
  cancelEInvoiceAPI,
  cancelEWayBillAPI,
  fetchGSTR1ReportAPI,
  fetchGSTR3BReportAPI,
} from '../api';

const useComplianceStore = create((set, get) => ({
  eInvoices: [],
  eWayBills: [],
  gstr1Data: { sections: [], summary: {} },
  gstr3bData: { sections: [], summary: {} },
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true });
    try {
      const [eInvoices, eWayBills] = await Promise.all([
        fetchEInvoicesAPI(),
        fetchEWayBillsAPI(),
      ]);
      set({
        eInvoices: Array.isArray(eInvoices) ? eInvoices : eInvoices?.data ?? [],
        eWayBills: Array.isArray(eWayBills) ? eWayBills : eWayBills?.data ?? [],
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  generateEInvoice: async (billId, billType) => {
    const result = await generateEInvoiceAPI(billId, billType);
    await get().loadAll();
    return result;
  },

  generateEWayBill: async (billId, billType) => {
    const result = await generateEWayBillAPI(billId, billType);
    await get().loadAll();
    return result;
  },

  cancelEInvoice: async (irn) => {
    await cancelEInvoiceAPI(irn);
    await get().loadAll();
  },

  cancelEWayBill: async (ewbNo) => {
    await cancelEWayBillAPI(ewbNo);
    await get().loadAll();
  },

  fetchGSTR1Report: async (params) => {
    set({ loading: true });
    try {
      const data = await fetchGSTR1ReportAPI(params);
      const report = data?.data ?? data ?? { sections: [], summary: {} };
      set({ gstr1Data: report, loading: false });
      return report;
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  fetchGSTR3BReport: async (params) => {
    set({ loading: true });
    try {
      const data = await fetchGSTR3BReportAPI(params);
      const report = data?.data ?? data ?? { sections: [], summary: {} };
      set({ gstr3bData: report, loading: false });
      return report;
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },
}));

export default useComplianceStore;
