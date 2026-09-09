/* ===== BILL TEMPLATE STORE — Zustand, persisted ===== */
// Kept separate from settingsStore-DB.js on purpose: that store syncs to the
// backend company-settings API with its own shape/validation, and this is a
// purely presentational, per-browser preference. No backend dependency.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ITEM_COLUMNS, mergeItemColumns } from '../features/billing/invoices/templates/itemColumnsConfig';

const useBillTemplateStore = create(
  persist(
    (set, get) => ({
      // 'classic' = existing B2BInvoice.js (default, untouched, always available)
      // 'modern'  = B2BInvoiceTemplate.js (GST-detailed template, customizable columns)
      billTemplate: 'classic',
      itemColumns: DEFAULT_ITEM_COLUMNS,

      setBillTemplate: (value) => set({ billTemplate: value }),

      setItemColumns: (columns) => set({ itemColumns: columns }),

      toggleColumn: (key) => {
        const columns = get().itemColumns.map((c) =>
          c.key === key ? { ...c, enabled: !c.enabled } : c
        );
        set({ itemColumns: columns });
      },

      reorderColumn: (key, direction) => {
        // direction: -1 (move up/left) or +1 (move down/right)
        const columns = [...get().itemColumns].sort((a, b) => a.order - b.order);
        const idx = columns.findIndex((c) => c.key === key);
        const swapIdx = idx + direction;
        if (idx === -1 || swapIdx < 0 || swapIdx >= columns.length) return;

        const tmpOrder = columns[idx].order;
        columns[idx].order = columns[swapIdx].order;
        columns[swapIdx].order = tmpOrder;
        set({ itemColumns: columns });
      },

      setColumnWidth: (key, width) => {
        const columns = get().itemColumns.map((c) =>
          c.key === key ? { ...c, width } : c
        );
        set({ itemColumns: columns });
      },

      resetColumns: () => set({ itemColumns: DEFAULT_ITEM_COLUMNS }),
    }),
    {
      name: 'erp-bill-template', // localStorage key
      version: 1,
      migrate: (persistedState) => ({
        ...persistedState,
        itemColumns: mergeItemColumns(persistedState?.itemColumns),
      }),
    }
  )
);

export default useBillTemplateStore;
