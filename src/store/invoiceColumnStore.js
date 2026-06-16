import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_COLUMNS = [
  { id: 'productName', label: 'Product Name', visible: true, disabled: true },
  { id: 'hsnCode', label: 'HSN/SAC', visible: true, disabled: false },
  { id: 'sku', label: 'SKU', visible: false, disabled: false },
  { id: 'batchNumber', label: 'Batch No.', visible: false, disabled: false },
  { id: 'expiryDate', label: 'Expiry Date', visible: false, disabled: false },
  { id: 'serialNumber', label: 'Serial No.', visible: false, disabled: false },
  { id: 'quantity', label: 'Quantity', visible: true, disabled: true },
  { id: 'unit', label: 'Unit', visible: true, disabled: false },
  { id: 'price', label: 'Rate (₹)', visible: true, disabled: true },
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
    }
  )
);

export default useInvoiceColumnStore;
