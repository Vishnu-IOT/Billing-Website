/* ===== POS STORE — Zustand cart state for B2C POS ===== */
import { create } from "zustand";
import {
  calcItemRow,
  calcQuickSaleItemRow,
  calcBillTotals,
  createEmptyItem,
} from "../utils/invoice";
import { normalizePriceType } from "../utils/gstPricing";
import { toFloat } from "../utils/currency";
import { todayISO } from "../utils/date";
import useSettingsStore from "../store/settingsStore-DB";
import { isWeightProduct, normalizeWeightQuantity } from "../utils/quantityUnits";

function addCartQuantities(existingItem, incomingItem) {
  if (!isWeightProduct(existingItem)) {
    return toFloat(existingItem.quantity || 1) + toFloat(incomingItem.quantity || 1);
  }
  const totalKg =
    normalizeWeightQuantity(
      existingItem.quantity,
      existingItem.quantityUnit || "KG",
    ) +
    normalizeWeightQuantity(
      incomingItem.quantity,
      incomingItem.quantityUnit || "KG",
    );
  return existingItem.quantityUnit === "GRAM"
    ? Number((totalKg * 1000).toFixed(3))
    : Number(totalKg.toFixed(3));
}

function createCartLineId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sameCartPricingLine(cartItem, item) {
  const itemBatchId = String(item.productBatchId || item.batchId || '');
  const cartBatchId = String(cartItem.productBatchId || cartItem.batchId || '');
  return (
    String(cartItem.productId) === String(item.productId) &&
    String(cartItem.priceGroupKey || '') === String(item.priceGroupKey || '') &&
    cartBatchId === itemBatchId
  );
}

const usePOSStore = create((set, get) => ({
  /* ── Cart ── */
  cart: [],

  /* ── Customer ── */
  customerInfo: { name: "", phone: "", userId: "" },

  /* ── Payment ── */
  paymentMethod: "Cash", // Cash | UPI | Card | Split

  /* ── Global Discount ── */
  globalDiscount: 0,

  /* ── Invoice Meta ── */
  invoiceNo: "",
  saleDate: todayISO(),

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
        (cartItem) => sameCartPricingLine(cartItem, item),
      );

      if (existingIdx >= 0) {
        // Item already in cart → increment quantity and recalculate
        const updated = [...state.cart];
        updated[existingIdx].quantity = addCartQuantities(
          updated[existingIdx],
          item,
        );
        if (Array.isArray(updated[existingIdx].batchAllocations) ||
            Array.isArray(item.batchAllocations)) {
          const allocations = new Map();
          [
            ...(updated[existingIdx].batchAllocations || []),
            ...(item.batchAllocations || []),
          ].forEach((allocation) => {
            const batchId = String(allocation.batchId || allocation.productBatchId || '');
            allocations.set(
              batchId,
              Number(((allocations.get(batchId) || 0) + Number(allocation.quantity || 0)).toFixed(3)),
            );
          });
          updated[existingIdx].batchAllocations = [...allocations.entries()].map(
            ([batchId, quantity]) => ({ batchId, quantity }),
          );
        }
        updated[existingIdx].paidQuantity = updated[existingIdx].quantity;
        updated[existingIdx].freeQuantity = 0;
        updated[existingIdx].totalQuantity = updated[existingIdx].quantity;
        updated[existingIdx].offerId = undefined;
        updated[existingIdx].offerName = undefined;
        updated[existingIdx] = calcItemRow(updated[existingIdx]);
        return { cart: updated };
      } else {
        // Add new item directly with all API fields
        const newItem = {
          cartLineId: item.cartLineId || createCartLineId(),
          productId: String(item.productId),
          productName: item.productName || "",
          hsnCode: item.hsnCode || "",
          barcode: item.barcode || "",
          sku: item.sku || "",
          mrp: toFloat(item.mrp || 0),
          price: toFloat(item.price || 0),
          priceType: normalizePriceType(item.priceType),
          taxRate: toFloat(item.taxRate || 0),
          discountPercent: toFloat(item.discountPercent || 0),
          unit: item.unit || "pcs",
          unitType:
            item.unitType || item.Product?.unitType || item.product?.unitType || "PIECE",
          baseUnit:
            item.baseUnit || item.Product?.baseUnit || item.product?.baseUnit || "PCS",
          allowDecimalQuantity: item.allowDecimalQuantity || false,
          quantityUnit: item.quantityUnit || "",
          quantity: toFloat(item.quantity || 1),
          batchNumber: item.batchNumber || "",
          productBatchId: item.productBatchId || item.batchId || "",
          batchAvailableQuantity: item.batchAvailableQuantity,
          priceGroupKey: item.priceGroupKey || "",
          priceGroup: item.priceGroup || null,
          batchAllocations: Array.isArray(item.batchAllocations)
            ? item.batchAllocations.map((allocation) => ({ ...allocation }))
            : undefined,
          paidQuantity: item.paidQuantity,
          freeQuantity: item.freeQuantity,
          totalQuantity: item.totalQuantity,
          offerId: item.offerId,
          offerName: item.offerName,
          expiryDate: item.expiryDate || "",
          serialNumber: item.serialNumber || "",
          notes: item.notes || "",
        };
        return { cart: [...state.cart, newItem] };
      }
    });
  },

  /**
   * Add multiple pre-calculated items at once (batch add from API).
   * ✅ IMPROVED: Better field mapping and null handling
   *
   * @param {array} items - Array of cart items from API
   */
  addMultipleCartItemsDirect: (items) => {
    set((state) => {
      let updated = [...state.cart];

      if (!Array.isArray(items)) {
        console.warn(
          "addMultipleCartItemsDirect: items is not an array",
          items,
        );
        return { cart: updated };
      }

      items.forEach((item) => {
        if (!item) return;

        const productId = String(
          item.productId || item.product_id || item.id || "",
        );

        if (!productId) {
          console.warn("Skipping item without productId:", item);
          return;
        }

        const existingIdx = updated.findIndex(
          (cartItem) => sameCartPricingLine(cartItem, { ...item, productId }),
        );

        const newItem = {
          cartLineId: item.cartLineId || createCartLineId(),
          productId: productId,
          productName: item.productName || item.product_name || item.name || "",
          hsnCode: item.hsnCode || item.hsn_code || item.HSNCode || "",
          barcode: item.barcode || "",
          sku: item.sku || "",
          mrp: toFloat(item.mrp || item.MRP || 0),
          price: toFloat(item.price || item.rate || item.unitPrice || 0),
          priceType: normalizePriceType(item.priceType),
          taxRate: toFloat(
            item.taxRate || item.tax_rate || item.gstPercentage || 0,
          ),
          discountPercent: toFloat(
            item.discountPercent || item.discount_percent || item.discount || 0,
          ),
          unit: item.unit || "pcs",
          unitType:
            item.unitType || item.Product?.unitType || item.product?.unitType || "PIECE",
          baseUnit:
            item.baseUnit || item.Product?.baseUnit || item.product?.baseUnit || "PCS",
          allowDecimalQuantity: item.allowDecimalQuantity || false,
          quantityUnit: item.quantityUnit || "",
          quantity: toFloat(item.quantity || 1),
          batchNumber: item.batchNumber || item.batch_number || "",
          productBatchId: item.productBatchId || item.batchId || "",
          batchAvailableQuantity: item.batchAvailableQuantity,
          priceGroupKey: item.priceGroupKey || "",
          priceGroup: item.priceGroup || null,
          batchAllocations: Array.isArray(item.batchAllocations)
            ? item.batchAllocations.map((allocation) => ({ ...allocation }))
            : undefined,
          paidQuantity: item.paidQuantity,
          freeQuantity: item.freeQuantity,
          totalQuantity: item.totalQuantity,
          offerId: item.offerId,
          offerName: item.offerName,
          expiryDate: item.expiryDate || item.expiry_date || "",
          serialNumber: item.serialNumber || item.serial_number || "",
          notes: item.notes || "",
        };

        if (existingIdx >= 0) {
          // Item already exists - increment quantity
          updated[existingIdx].quantity = addCartQuantities(
            updated[existingIdx],
            newItem,
          );
          if (Array.isArray(updated[existingIdx].batchAllocations) ||
              Array.isArray(newItem.batchAllocations)) {
            const allocations = new Map();
            [
              ...(updated[existingIdx].batchAllocations || []),
              ...(newItem.batchAllocations || []),
            ].forEach((allocation) => {
              const batchId = String(allocation.batchId || allocation.productBatchId || '');
              allocations.set(
                batchId,
                Number(((allocations.get(batchId) || 0) + Number(allocation.quantity || 0)).toFixed(3)),
              );
            });
            updated[existingIdx].batchAllocations = [...allocations.entries()].map(
              ([batchId, quantity]) => ({ batchId, quantity }),
            );
          }
          updated[existingIdx].paidQuantity = updated[existingIdx].quantity;
          updated[existingIdx].freeQuantity = 0;
          updated[existingIdx].totalQuantity = updated[existingIdx].quantity;
          updated[existingIdx].offerId = undefined;
          updated[existingIdx].offerName = undefined;
          updated[existingIdx] = calcItemRow(updated[existingIdx]);
        } else {
          // Recalculate before adding
          const calculated = calcItemRow(newItem);
          updated = [...updated, calculated];
        }
      });

      return { cart: updated };
    });
  },

  addQuickSaleCartItem: (item) => {
    set((state) => {
      const identityKey = item.identityKey || (
        String(item.barcode || "").trim()
          ? `barcode:${String(item.barcode).trim().toUpperCase()}`
          : `name:${String(item.productName || "")
              .normalize("NFKC")
              .trim()
              .replace(/\s+/g, " ")
              .toLocaleLowerCase("en-IN")}`
      );
      const existingIndex = state.cart.findIndex(
        (cartItem) =>
          cartItem.cartItemType === "QUICK_SALE" &&
          cartItem.identityKey === identityKey &&
          Number(cartItem.price) === Number(item.price) &&
          Number(cartItem.mrp) === Number(item.mrp) &&
          cartItem.gstVerificationStatus === item.gstVerificationStatus &&
          Number(cartItem.quickSaleTaxRate ?? -1) === Number(item.quickSaleTaxRate ?? -1),
      );
      const incoming = calcQuickSaleItemRow({
        ...item,
        identityKey,
        cartLineId: item.cartLineId || createCartLineId(),
      });

      if (existingIndex < 0) {
        return { cart: [...state.cart, incoming] };
      }

      const updated = [...state.cart];
      updated[existingIndex] = calcQuickSaleItemRow({
        ...updated[existingIndex],
        quantity: addCartQuantities(updated[existingIndex], incoming),
      });
      return { cart: updated };
    });
  },

  addPriceCheckedCartItem: (product, group, quantity, batchAllocations) => {
    set((state) => {
      const productId = String(product.id || product._id);
      const existingIdx = state.cart.findIndex(
        (item) =>
          String(item.productId) === productId &&
          item.priceGroupKey === group.key,
      );
      const allocationsByBatch = new Map();
      const mergeAllocations = (allocations) => {
        (allocations || []).forEach((allocation) => {
          const batchId = String(allocation.batchId);
          allocationsByBatch.set(
            batchId,
            Number(
              (
                (allocationsByBatch.get(batchId) || 0) +
                Number(allocation.quantity || 0)
              ).toFixed(3),
            ),
          );
        });
      };

      if (existingIdx >= 0) {
        const updated = [...state.cart];
        const item = { ...updated[existingIdx] };
        mergeAllocations(item.batchAllocations);
        mergeAllocations(batchAllocations);
        item.batchAllocations = [...allocationsByBatch.entries()].map(
          ([batchId, allocatedQuantity]) => ({
            batchId,
            quantity: allocatedQuantity,
          }),
        );
        item.quantity = addCartQuantities(item, { quantity });
        item.paidQuantity = item.quantity;
        item.freeQuantity = 0;
        item.totalQuantity = item.quantity;
        updated[existingIdx] = calcItemRow(item);
        return { cart: updated };
      }

      const newItem = calcItemRow({
        ...createEmptyItem(),
        cartLineId: createCartLineId(),
        productId,
        productName: product.name || '',
        hsnCode: product.HSNCode || product.hsnCode || '',
        barcode: product.barcode || '',
        sku: product.sku || product.HSNCode || '',
        mrp: Number(group.mrp),
        price: Number(group.salePrice),
        priceType: normalizePriceType(group.priceType),
        taxRate: Number(group.taxRate),
        discountPercent: 0,
        unit: product.unit || 'pcs',
        unitType: isWeightProduct(product) ? 'WEIGHT' : 'PIECE',
        baseUnit: isWeightProduct(product) ? 'KG' : 'PCS',
        allowDecimalQuantity: isWeightProduct(product),
        quantityUnit: isWeightProduct(product) ? 'KG' : 'PCS',
        quantity: Number(quantity),
        priceGroupKey: group.key,
        priceGroup: {
          mrp: Number(group.mrp),
          salePrice: Number(group.salePrice),
          taxRate: Number(group.taxRate),
          priceType: normalizePriceType(group.priceType),
        },
        batchAllocations,
      });
      return { cart: [...state.cart, newItem] };
    });
  },

  addCartAllocation: (item) => {
    set((state) => {
      const currentQuantity = toFloat(item.quantity);
      const currentBaseQuantity =
        isWeightProduct(item) && item.quantityUnit === 'GRAM'
          ? normalizeWeightQuantity(currentQuantity, 'GRAM')
          : currentQuantity;
      const allocations = Array.isArray(item.batchAllocations)
        ? item.batchAllocations
        : [];
      const allocatedQuantity = allocations.reduce(
        (total, allocation) => total + Number(allocation.quantity || 0),
        0,
      );
      if (
        allocations.length < 2 ||
        Math.abs(allocatedQuantity - currentBaseQuantity) > 0.001
      ) {
        return state;
      }

      const batchStock = Number(item.batchAvailableQuantity);
      const splitOverflow =
        Number.isFinite(batchStock) &&
        batchStock > 0 &&
        currentBaseQuantity > batchStock;
      const splitBaseQuantity = splitOverflow
        ? Number((currentBaseQuantity - batchStock).toFixed(3))
        : Number((currentBaseQuantity / 2).toFixed(3));
      if (splitBaseQuantity <= 0 || splitBaseQuantity >= currentBaseQuantity) {
        return state;
      }

      let splitRemaining = splitBaseQuantity;
      const splitAllocations = [];
      const remainingAllocations = [];
      const orderedAllocations = splitOverflow
        ? [...allocations].reverse()
        : allocations;
      orderedAllocations.forEach((allocation) => {
        const quantity = Number(allocation.quantity) || 0;
        const split = Math.min(quantity, splitRemaining);
        const remainder = Number((quantity - split).toFixed(3));
        if (split > 0) {
          splitAllocations.push({ ...allocation, quantity: Number(split.toFixed(3)) });
          splitRemaining = Number((splitRemaining - split).toFixed(3));
        }
        if (remainder > 0) {
          remainingAllocations.push({ ...allocation, quantity: remainder });
        }
      });
      if (splitRemaining > 0.001) return state;
      if (splitOverflow) {
        splitAllocations.reverse();
        remainingAllocations.reverse();
      }

      const toEnteredQuantity = (value) =>
        isWeightProduct(item) && item.quantityUnit === 'GRAM'
          ? Number((value * 1000).toFixed(3))
          : value;
      const remainingQuantity = Number(
        (currentBaseQuantity - splitBaseQuantity).toFixed(3),
      );
      const updatedCart = state.cart.map((cartItem) =>
        (cartItem.cartLineId || cartItem.productId) ===
        (item.cartLineId || item.productId)
          ? calcItemRow({
              ...cartItem,
              quantity: toEnteredQuantity(remainingQuantity),
              paidQuantity: toEnteredQuantity(remainingQuantity),
              freeQuantity: 0,
              totalQuantity: toEnteredQuantity(remainingQuantity),
              batchAllocations: remainingAllocations,
              offerId: undefined,
              offerName: undefined,
            })
          : cartItem,
      );
      const allocation = calcItemRow({
        ...item,
        cartLineId: createCartLineId(),
        quantity: toEnteredQuantity(splitBaseQuantity),
        paidQuantity: toEnteredQuantity(splitBaseQuantity),
        freeQuantity: 0,
        totalQuantity: toEnteredQuantity(splitBaseQuantity),
        batchAllocations: splitAllocations,
        offerId: undefined,
        offerName: undefined,
      });
      return { cart: [...updatedCart, allocation] };
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
      const numericFields = ["quantity", "price", "discountPercent", "taxRate"];

      const updates =
        typeof fieldOrObj === "object" ? fieldOrObj : { [fieldOrObj]: value };

      const updated = state.cart.map((item) => {
        if (String(item.cartLineId || item.productId) !== String(productId)) return item;

        const modified = { ...item };
        Object.entries(updates).forEach(([field, val]) => {
          modified[field] = numericFields.includes(field)
            ? Math.max(0, toFloat(val))
            : val;
        });

        if (Object.prototype.hasOwnProperty.call(updates, "quantity")) {
          modified.paidQuantity = modified.quantity;
          modified.freeQuantity = 0;
          modified.totalQuantity = modified.quantity;
          modified.offerId = undefined;
          modified.offerName = undefined;
        }

        return modified.cartItemType === "QUICK_SALE"
          ? calcQuickSaleItemRow(modified)
          : calcItemRow(modified);
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
        (item) => String(item.cartLineId || item.productId) !== String(productId),
      ),
    }));
  },

  /**
   * Clear entire cart and reset session.
   */
  clearCart: () => {
    set({
      cart: [],
      customerInfo: {
        name: "",
        phone: "",
        userId: "",
      },
      paymentMethod: "Cash",
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
