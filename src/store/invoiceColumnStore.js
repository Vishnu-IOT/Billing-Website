import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_COLUMNS = [
  { id: 'productName', label: 'Product Name', visible: true, disabled: true },
  { id: 'hsnCode', label: 'HSN/SAC', visible: true, disabled: false },
  { id: 'mrp', label: 'MRP (₹)', visible: true, disabled: false },
  { id: 'salesPrice', label: 'Sales Price (₹)', visible: true, disabled: false },
  { id: 'sku', label: 'SKU', visible: false, disabled: false },
  { id: 'batchNumber', label: 'Batch No.', visible: false, disabled: false },
  { id: 'expiryDate', label: 'Expiry Date', visible: false, disabled: false },
  { id: 'serialNumber', label: 'Serial No.', visible: false, disabled: false },
  { id: 'quantity', label: 'Quantity', visible: true, disabled: true },
  { id: 'freeQuantity', label: 'Free Qty', visible: true, disabled: true },
  { id: 'unit', label: 'Unit', visible: true, disabled: false },
  { id: 'price', label: 'Rate (₹)', visible: true, disabled: true },
  { id: 'unitBaseRate', label: 'Base Rate(exl. GST)', visible: true, disabled: false },
  { id: 'baseAmount', label: 'Base Amt', visible: true, disabled: false },
  { id: 'discountPercent', label: 'Disc %', visible: true, disabled: false },
  { id: 'discountAmount', label: 'Disc Amt', visible: false, disabled: false },
  { id: 'taxRate', label: 'GST %', visible: true, disabled: false },
  { id: 'cgst', label: 'CGST', visible: false, disabled: false },
  { id: 'sgst', label: 'SGST', visible: false, disabled: false },
  { id: 'igst', label: 'IGST', visible: false, disabled: false },
  { id: 'taxAmount', label: 'Tax Amt', visible: true, disabled: false },
  {
    id: 'afterDiscount',
    label: 'Taxable Amt',
    visible: false,
    disabled: false,
  },
  { id: 'total', label: 'Total', visible: true, disabled: true },
  { id: 'notes', label: 'Notes', visible: false, disabled: false },
];

const useInvoiceColumnStore = create(
  persist(
    (set) => ({
      columns: DEFAULT_COLUMNS,

      toggleColumn: (id) =>
        set((state) => ({
          columns: state.columns.map((c) =>
            c.id === id && !c.disabled ? { ...c, visible: !c.visible } : c
          ),
        })),

      reorderColumn: (startIndex, endIndex) =>
        set((state) => {
          const result = Array.from(state.columns);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return { columns: result };
        }),

      resetToDefault: () => set({ columns: DEFAULT_COLUMNS }),
    }),
    {
      name: 'NithiX-invoice-columns',
      version: 1,
      migrate: (persisted) => {
        if (!Array.isArray(persisted?.columns)) return persisted;
        const columns = [...persisted.columns];
        const moved = ['mrp', 'salesPrice'].map((id) =>
          columns.find((column) => column.id === id),
        ).filter(Boolean);
        const remaining = columns.filter(
          (column) => !['mrp', 'salesPrice'].includes(column.id),
        );
        const hsnIndex = remaining.findIndex((column) => column.id === 'hsnCode');
        remaining.splice(hsnIndex < 0 ? 0 : hsnIndex + 1, 0, ...moved);
        return { ...persisted, columns: remaining };
      },
      // Older saved settings may pre-date newer columns; insert missing
      // defaults after their default predecessor.
      merge: (persisted, current) => {
        const saved = persisted?.columns;
        if (!Array.isArray(saved)) return current;
        const columns = [...saved];
        const have = new Set(saved.map((c) => c.id));
        DEFAULT_COLUMNS.forEach((col, i) => {
          if (have.has(col.id)) return;
          const prevId = DEFAULT_COLUMNS[i - 1]?.id;
          const at = columns.findIndex((c) => c.id === prevId);
          columns.splice(at >= 0 ? at + 1 : columns.length, 0, col);
        });
        return { ...current, ...persisted, columns };
      },
    }
  )
);

export default useInvoiceColumnStore;
