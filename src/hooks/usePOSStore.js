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
   * Add a pre-calculated cart item directly (from API response).
   * Use this when loading existing bills for editing — no product lookup needed.
   * 
   * USAGE:
   *   const item = {
   *     productId: "7",
   *     productName: "Energy Chocolate",
   *     price: 90,
   *     quantity: 1,
   *     taxRate: 12,
   *     ...
   *   };
   *   addCartItemDirect(item);
   * 
   * @param {object} item - Cart item from API (already has quantity, taxAmount, etc.)
   */
  addCartItemDirect: (item) => {
    set((state) => {
      const existingIdx = state.cart.findIndex(
        (cartItem) => String(cartItem.productId) === String(item.productId)
      );

      if (existingIdx >= 0) {
        // Item already in cart → increment quantity and recalculate
        const updated = [...state.cart];
        updated[existingIdx].quantity += toFloat(item.quantity || 1);
        updated[existingIdx] = calcItemRow(updated[existingIdx]);
        return { cart: updated };
      } else {
        // Add new item directly with all API fields
        const newItem = {
          productId: String(item.productId),
          productName: item.productName || '',
          hsnCode: item.hsnCode || '',
          barcode: item.barcode || '',
          sku: item.sku || '',
          mrp: toFloat(item.mrp || 0),
          price: toFloat(item.price || 0),
          taxRate: toFloat(item.taxRate || 0),
          discountPercent: toFloat(item.discountPercent || 0),
          unit: item.unit || 'pcs',
          quantity: toFloat(item.quantity || 1),
          batchNumber: item.batchNumber || '',
          expiryDate: item.expiryDate || '',
          serialNumber: item.serialNumber || '',
          notes: item.notes || '',
        };
        return { cart: [...state.cart, newItem] };
      }
    });
  },

  /**
   * Add multiple pre-calculated items at once (batch add from API).
   * 
   * @param {array} items - Array of cart items from API
   */
  addMultipleCartItemsDirect: (items) => {
    set((state) => {
      let updated = [...state.cart];

      items.forEach((item) => {
        const existingIdx = updated.findIndex(
          (cartItem) => String(cartItem.productId) === String(item.productId)
        );

        if (existingIdx >= 0) {
          updated[existingIdx].quantity += toFloat(item.quantity || 1);
          updated[existingIdx] = calcItemRow(updated[existingIdx]);
        } else {
          const newItem = {
            productId: String(item.productId),
            productName: item.productName || '',
            hsnCode: item.hsnCode || '',
            barcode: item.barcode || '',
            sku: item.sku || '',
            mrp: toFloat(item.mrp || 0),
            price: toFloat(item.price || 0),
            taxRate: toFloat(item.taxRate || 0),
            discountPercent: toFloat(item.discountPercent || 0),
            unit: item.unit || 'pcs',
            quantity: toFloat(item.quantity || 1),
            batchNumber: item.batchNumber || '',
            expiryDate: item.expiryDate || '',
            serialNumber: item.serialNumber || '',
            notes: item.notes || '',
          };
          updated = [...updated, newItem];
        }
      });

      return { cart: updated };
    });
  },

  /**
   * Add product to cart.
   * If product already exists → increment qty.
   * Else → add new row.
   * 
   * Use this for adding from product catalog (needs product lookup).
   * Use addCartItemDirect() for API responses instead.
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
   * Update cart item fields (single or multiple).
   * 
   * USAGE:
   *   updateCartItem(id, { quantity: 2, price: 100 })  // Multi-field
   *   updateCartItem(id, 'quantity', 2)                // Single field (legacy)
   */
  updateCartItem: (productId, fieldOrObj, value) => {
    set((state) => {
      const numericFields = ['quantity', 'price', 'discountPercent', 'taxRate'];

      const updates = typeof fieldOrObj === 'object'
        ? fieldOrObj
        : { [fieldOrObj]: value };

      const updated = state.cart.map((item) => {
        if (String(item.productId) !== String(productId)) return item;

        const modified = { ...item };
        Object.entries(updates).forEach(([field, val]) => {
          modified[field] = numericFields.includes(field)
            ? Math.max(0, toFloat(val))
            : val;
        });

        return calcItemRow(modified);
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