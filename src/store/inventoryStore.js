import { create } from 'zustand';
import {
  fetchWarehousesAPI,
  createWarehouseAPI,
  updateWarehouseAPI,
  deleteWarehouseAPI,
  fetchStockLedgerAPI,
  fetchReorderAlertsAPI,
  fetchStockTransfersAPI,
  createStockTransferAPI,
  receiveStockTransferAPI,
} from '../api/inventory';

const useInventoryStore = create((set, get) => ({
  warehouses: [],
  stockLedger: [],
  reorderAlerts: [],
  transfers: [],
  loadingWarehouses: false,
  loadingLedger: false,
  loadingTransfers: false,

  // Warehouses Actions
  loadWarehouses: async () => {
    set({ loadingWarehouses: true });
    try {
      const warehouses = await fetchWarehousesAPI();
      set({ warehouses, loadingWarehouses: false });
      return warehouses;
    } catch (err) {
      set({ loadingWarehouses: false });
      return [];
    }
  },

  addWarehouse: async (payload) => {
    try {
      const res = await createWarehouseAPI(payload);
      await get().loadWarehouses();
      return res;
    } catch (err) {
      throw err;
    }
  },

  editWarehouse: async (id, payload) => {
    try {
      const res = await updateWarehouseAPI(id, payload);
      await get().loadWarehouses();
      return res;
    } catch (err) {
      throw err;
    }
  },

  removeWarehouse: async (id) => {
    try {
      const res = await deleteWarehouseAPI(id);
      await get().loadWarehouses();
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Stock Ledger & Alerts
  loadStockLedger: async (params = {}) => {
    set({ loadingLedger: true });
    try {
      const ledger = await fetchStockLedgerAPI(params);
      set({ stockLedger: ledger, loadingLedger: false });
      return ledger;
    } catch (err) {
      set({ loadingLedger: false });
      return [];
    }
  },

  loadReorderAlerts: async () => {
    try {
      const alerts = await fetchReorderAlertsAPI();
      set({ reorderAlerts: alerts });
      return alerts;
    } catch (err) {
      return [];
    }
  },

  // Stock Transfers
  loadTransfers: async () => {
    set({ loadingTransfers: true });
    try {
      const transfers = await fetchStockTransfersAPI();
      set({ transfers, loadingTransfers: false });
      return transfers;
    } catch (err) {
      set({ loadingTransfers: false });
      return [];
    }
  },

  createTransfer: async (payload) => {
    try {
      const res = await createStockTransferAPI(payload);
      await get().loadTransfers();
      return res;
    } catch (err) {
      throw err;
    }
  },

  receiveTransfer: async (id) => {
    try {
      const res = await receiveStockTransferAPI(id);
      await get().loadTransfers();
      return res;
    } catch (err) {
      throw err;
    }
  },
}));

export default useInventoryStore;
