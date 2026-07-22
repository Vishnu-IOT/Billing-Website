/* ===== POS STORE — Zustand cart state for B2C POS ===== */
import { create } from 'zustand';
import { calcItemRow, calcBillTotals, createEmptyItem } from '../utils/invoice';
import { toFloat } from '../utils/currency';
import useSettingsStore from '../store/settingsStore';

const usePOSStore = create((set, get) => ({
  /* ── Cart ── */
  cart: [],

  /* ── Customer ── */
  customerInfo: { name: '', phone: '', userId: '' },

  /* ── Payment ── */
  paymentMethod: 'Cash', // Cash | UPI | Card | Split

  /* ── Global Discount ── */
  globalDiscount: 0,

  /* ── Invoice Meta ── */
  invoiceNo: '',
  saleDate: new Date().toISOString().split('T')[0],

  /* ── POS Settings (synced with settingsStore) ── */
  scannerEnabled: useSettingsStore.getState().scannerEnabled,
  cameraEnabled: useSettingsStore.getState().cameraEnabled,
  printerWidth: useSettingsStore.getState().printerWidth,
  autoPrint: useSettingsStore.getState().autoPrint,

  /* ─────────────────────────────────────────
     CART ACTIONS
  ───────────────────────────────────────── */

  /**
   * Add product to cart.
   * If product already exists → increment qty.
   * Else → add new row.
   */
  addToCart: (product) => {
    set((state) => {
      const existingIdx = state.cart.findIndex(
        (item) => String(item.productId) === String(product.id || product._id)
      );

      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...state.cart];
        const item = { ...updated[existingIdx] };
        item.quantity = (item.quantity || 1) + 1;
        const recalculated = calcItemRow(item);
        updated[existingIdx] = recalculated;
        return { cart: updated };
      } else {
        // Add new row
        const newItem = calcItemRow({
          ...createEmptyItem(),
          productId: String(product.id || product._id),
          productName: product.name,
          hsnCode: product.HSNCode || product.hsnCode || '',
          barcode: product.barcode || '',
          sku: product.sku || product.HSNCode || '',
          mrp: toFloat(product.MRP || product.mrp),
          price: toFloat(product.salesPrice || product.price),
          taxRate: toFloat(product.taxRate),
          discountPercent: toFloat(product.discount),
          unit: product.unit || 'pcs',
          quantity: 1,
        });
        return { cart: [...state.cart, newItem] };
      }
    });
  },

  /**
   * Update a specific field of a cart item and recalculate.
   */
  updateCartItem: (productId, field, value) => {
    set((state) => {
      const updated = state.cart.map((item) => {
        if (String(item.productId) !== String(productId)) return item;
        const updated = {
          ...item,
          [field]: ['quantity', 'price', 'discountPercent', 'taxRate'].includes(
            field
          )
            ? Math.max(0, toFloat(value))
            : value,
        };
        return calcItemRow(updated);
      });
      return { cart: updated };
    });
  },

  /**
   * Remove item from cart by productId.
   */
  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter(
        (item) => String(item.productId) !== String(productId)
      ),
    }));
  },

  /**
   * Clear entire cart and reset session.
   */
  clearCart: () => {
    set({
      cart: [],
      customerInfo: { name: '', phone: '' },
      paymentMethod: 'Cash',
      globalDiscount: 0,
    });
  },

  /* ── Setters ── */
  setCustomerInfo: (info) =>
    set((state) => ({ customerInfo: { ...state.customerInfo, ...info } })),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setGlobalDiscount: (val) => set({ globalDiscount: toFloat(val) }),

  setInvoiceNo: (no) => set({ invoiceNo: no }),

  setSaleDate: (date) => set({ saleDate: date }),

  setPOSSetting: (key, value) => {
    useSettingsStore.getState().updateSettings({ [key]: value });
    set({ [key]: value });
  },

  /* ── Computed Totals (derived from cart) ── */
  getComputedTotals: () => {
    const { cart, globalDiscount } = get();
    return calcBillTotals(cart, globalDiscount);
  },
}));

export default usePOSStore;
