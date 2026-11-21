/* ===== POS SCREEN — Main B2C POS Layout ===== */
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  FiPauseCircle,
  FiXCircle,
  FiTrash2,
  FiClock,
  FiLayers,
  FiStar,
  FiArrowLeft,
  FiCalendar,
  FiCornerDownLeft,
  FiMaximize,
  FiArrowRight,
  FiMonitor,
  FiTag,
  FiPlus,
} from "react-icons/fi";
import useAppStore from "../../store/appStore";
import useSalesStore from "../../store/salesStore";
import usePOSStore from "../../hooks/usePOSStore";
import useAuthStore from "../../store/authStore";
import useSettingsStore from "../../store/settingsStore-DB";
import usePosStore from "../../store/posStore";
import { hasPermission } from "../../utils/permissions";
import { formatCurrency } from "../../utils/currency";
import { todayISO } from "../../utils/date";
import {
  getNextInvoiceNo,
  buildSaleBillPayload,
  calcBillTotals,
  calcItemRow,
  calcQuickSaleItemRow,
  getNonQuickSaleReceiptItems,
  applyPromotionPreviewPricing,
  getPromotionBatchAllocationKey,
} from "../../utils/invoice";
import {
  findProduct,
  normalizePriceType,
} from "../../utils/gstPricing";
import {
  fetchSaleBillByIdAPI,
  fetchSalesReturnCreditAPI,
} from "../../api";
import { resolveQuickSaleAPI } from "../../api/quickSales";
import { matchesProductSearch } from "../../utils/productSearch";
import { previewPromotionAPI } from "../../api/promotions";
import { useToast } from "../../hooks/useToast";
import { ToastContainer } from "../../components/ui";
import BarcodeInput from "../../components/pos/BarcodeInput";
import CameraScanner from "../../components/pos/CameraScanner";
import POSCartItem from "../../components/pos/POSCartItem";
import POSPaymentModal from "../../components/pos/POSPaymentModal";
import QuickSaleModal from "../../components/pos/QuickSaleModal";
import ThermalBill from "../../components/pos/ThermalBill";
import POSStartShiftModal from "../../components/pos/POSStartShiftModal";
import POSCloseShiftModal from "../../components/pos/POSCloseShiftModal";
import { money, rupees, Kbd } from "../../components/pos/posTerminal";
import { loyaltyTier } from "../../utils/loyaltyTier";
import {
  fetchCurrentShiftAPI,
  fetchAssignedPosCountersAPI,
} from "../../api/pos";
import { invalidateBatchCache } from "../../components/shared/BatchSelector";
import { loadBatchesCached } from "../../utils/productBatchCache";
import {
  buildMrpPriceGroups,
  allocatePriceGroupQuantity,
  getPriceGroupKey,
} from "../../utils/priceCheck";
import PriceCheckModal from "../../components/pos/PriceCheckModal";
import "../../styles/pos-b2c.css";
import "../../styles/pos-terminal.css";
// import '../../styles/thermal.css';
import {
  fetchFinancialDetailsAPI,
  previewNextInvoiceNumberAPI,
} from "../../api";
import ThermalInvoice from "../billing/invoices/ThermalInvoice";
import {
  formatQuantity,
  isWeightProduct,
  normalizeWeightQuantity,
} from "../../utils/quantityUnits";
import {
  getQuantityInProductBaseUnit,
  getProductStockLabel,
} from "../../utils/posStock";

/* ── Quantity and discount inputs for POS cart rows ── */
function POSQtyInput({
  value,
  onCommit,
  onEnter,
  ariaLabel,
  step = 1,
  allowDecimal = false,
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      step={step}
      className="pos-exact-qty-input"
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => {
        const v = e.target.value;
        const validPattern = allowDecimal
          ? /^\d*\.?\d{0,3}$/
          : /^\d*$/;
        if (v !== "" && !validPattern.test(v)) return;
        setDraft(v);
        const n = parseFloat(v);
        if (n > 0) {
          const result = onCommit(n);
          if (result === false) setDraft(String(value));
          else if (result && typeof result.then === "function") {
            result.then((saved) => {
              if (!saved) setDraft(String(value));
            });
          }
        }
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        if (!(parseFloat(draft) > 0)) setDraft(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.target.blur();
          if (onEnter) onEnter();
        }
      }}
    />
  );
}

/* Ticking date/time kept in its own component so the whole POS doesn't re-render each second */
function LiveClock({ date }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  return (
    <span className="bf-pill">
      <FiCalendar /> {date || now.toLocaleDateString("en-GB")} | {time}
    </span>
  );
}

function createPosIdempotencyKey() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function POSScreen({
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const companyRecord = useAppStore((s) => s.companies);
  const companyInfo = Array.isArray(companyRecord)
    ? companyRecord[0] || {}
    : companyRecord || {};
  const companyId = companyInfo.id;
  const brands = useAppStore((s) => s.brands);
  const brandNamesById = useMemo(
    () =>
      new Map(
        (brands || []).map((brand) => [
          String(brand.id || brand._id),
          brand.name || brand.brand || "",
        ]),
      ),
    [brands],
  );
  const categoryNamesById = useMemo(
    () =>
      new Map(
        (categories || []).map((category) => [
          String(category.id || category._id),
          category.category || category.name || "",
        ]),
      ),
    [categories],
  );
  const billingUser = useAuthStore((s) => s.user);
  const canViewShifts =
    hasPermission(billingUser, "shifts.management.view") ||
    hasPermission(billingUser, "pos.billing.access");
  const canCreateQuickSale = hasPermission(
    billingUser,
    "quick-sales.creation.create",
  );
  const shiftCompanyId = billingUser?.companyId || companyId;
  const settings = useSettingsStore();
  const saleBills = useSalesStore((s) => s.saleBills);
  const addBill = useSalesStore((s) => s.addBill);
  const updateBill = useSalesStore((s) => s.updateBill);
  const toast = useToast();
  const toastError = toast.error;

  /* ── POS Store ── */
  const cart = usePOSStore((s) => s.cart);
  const customerInfo = usePOSStore((s) => s.customerInfo);
  const customers = useAppStore((s) => s.customers);
  const paymentMethod = usePOSStore((s) => s.paymentMethod);
  const globalDiscount = usePOSStore((s) => s.globalDiscount);
  const invoiceNo = usePOSStore((s) => s.invoiceNo);
  const saleDate = usePOSStore((s) => s.saleDate);
  const printerWidth = useSettingsStore((s) => s.printerWidth);
  const autoPrint = useSettingsStore((s) => s.autoPrint);
  const scannerEnabled = useSettingsStore((s) => s.scannerEnabled);
  const cameraEnabled = useSettingsStore((s) => s.cameraEnabled);
  const addPriceCheckedCartItem = usePOSStore((s) => s.addPriceCheckedCartItem);
  const addQuickSaleCartItem = usePOSStore((s) => s.addQuickSaleCartItem);
  const addMultipleCartItemsDirect = usePOSStore(
    (s) => s.addMultipleCartItemsDirect,
  );
  const updateCartItem = usePOSStore((s) => s.updateCartItem);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);
  const clearCart = usePOSStore((s) => s.clearCart);
  const setCustomerInfo = usePOSStore((s) => s.setCustomerInfo);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const setGlobalDiscount = usePOSStore((s) => s.setGlobalDiscount);
  const setInvoiceNo = usePOSStore((s) => s.setInvoiceNo);

  // getNextInvoiceNo(saleBills, settings) only ever guesses from whatever is
  // currently loaded in the local saleBills store — on a fresh page load, or
  // after a filter/pagination narrows that list, it silently falls back to
  // "1". The backend's running counter is the only source of truth, so fetch
  // and use that instead (same fix already applied to the B2B create form).
  const refreshInvoiceNo = useCallback(async () => {
    try {
      let companyId = 1;
      const erpSettings = localStorage.getItem("erp-settings");
      if (erpSettings) {
        const companydata = JSON.parse(erpSettings);
        companyId = companydata?.state?.companyId || 1;
      }
      const res = await previewNextInvoiceNumberAPI(companyId);
      const realNext = res?.data?.nextInvoiceNumber;
      setInvoiceNo(realNext || getNextInvoiceNo(saleBills, settings));
    } catch {
      // fall back to the local guess only if the backend call fails
      setInvoiceNo(getNextInvoiceNo(saleBills, settings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleBills, settings]);
  const setSaleDate = usePOSStore((s) => s.setSaleDate);

  /* ── Shift & Hold Store ── */
  const storedActiveShift = usePosStore((s) => s.activeShift);
  const activeShift =
    Number(storedActiveShift?.userId) === Number(billingUser?.id) &&
    (!shiftCompanyId ||
      Number(storedActiveShift?.companyId) === Number(shiftCompanyId))
      ? storedActiveShift
      : null;
  const holdCarts = usePosStore((s) => s.holdCarts);
  const checkCurrentShift = usePosStore((s) => s.checkCurrentShift);
  const clearActiveShift = usePosStore((s) => s.clearActiveShift);
  const startShift = usePosStore((s) => s.startShift);
  const endShift = usePosStore((s) => s.endShift);
  const holdCartAction = usePosStore((s) => s.holdCart);
  const loadHoldCarts = usePosStore((s) => s.loadHoldCarts);
  const resumeHoldCart = usePosStore((s) => s.resumeHoldCart);
  const cancelHoldCart = usePosStore((s) => s.cancelHoldCart);

  /* ── Local State ── */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [priceCheck, setPriceCheck] = useState({
    open: false,
    product: null,
    groups: [],
    loading: false,
    error: "",
  });
  const priceCheckOpenRef = useRef(false);
  const priceCheckRequestRef = useRef(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastPrintedBill, setLastPrintedBill] = useState(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftCloseModal, setShiftCloseModal] = useState(false);
  const [closeSnapshot, setCloseSnapshot] = useState(null);
  const [closeRefreshing, setCloseRefreshing] = useState(false);
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [assignedCounters, setAssignedCounters] = useState([]);
  const [countersLoading, setCountersLoading] = useState(false);
  const [countersError, setCountersError] = useState("");
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [printReady, setPrintReady] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [redeemLoyaltyOptIn, setRedeemLoyaltyOptIn] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const posIdempotencyKeyRef = useRef("");
  const [promotionPreviews, setPromotionPreviews] = useState({});
  const [returnCredit, setReturnCredit] = useState(null);
  const [loadingReturnCredit, setLoadingReturnCredit] = useState(false);
  const [quickSaleDraft, setQuickSaleDraft] = useState(null);
  const [quickSaleResolving, setQuickSaleResolving] = useState(false);

  useEffect(() => {
    setRedeemLoyaltyOptIn(false);
    setLoyaltyPointsToRedeem(0);
  }, [customerInfo.phone]);

  useEffect(() => {
    if (!shiftModalOpen || !billingUser?.id) return undefined;
    let active = true;
    setCountersLoading(true);
    setCountersError("");
    fetchAssignedPosCountersAPI()
      .then((counters) => {
        if (!active) return;
        setAssignedCounters(counters);
        setSelectedCounterId((current) =>
          counters.some((counter) => String(counter.id) === String(current))
            ? current
            : String(counters[0]?.id || ""),
        );
      })
      .catch((error) => {
        if (!active) return;
        setAssignedCounters([]);
        setSelectedCounterId("");
        setCountersError(
          typeof error === "string" ? error : "Could not load assigned POS counters.",
        );
      })
      .finally(() => {
        if (active) setCountersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shiftModalOpen, billingUser?.id]);

  const pricedCart = useMemo(
    () =>
      cart.map((item) => {
        if (item.cartItemType === "QUICK_SALE") {
          return calcQuickSaleItemRow(item);
        }
        const regularItem = {
          ...item,
          productBatchId: item.productBatchId || item.batchId || "",
          batchId: item.productBatchId || item.batchId || "",
          batchNumber: item.batchNumber || item.batchNo || "",
          batchNo: item.batchNo || item.batchNumber || "",
          expiryDate: item.expiryDate || "",
        };
        const product = findProduct(products, item.productId);
        const priceGroup = item.priceGroup;
        return calcItemRow({
          ...regularItem,
          price: item.priceGroupKey
            ? Number(item.price ?? item.salePrice ?? priceGroup?.salePrice ?? 0)
            : 0,
          priceType: normalizePriceType(
            priceGroup?.priceType || item.priceType || "WITHOUT_GST",
          ),
          mrp: Number(priceGroup?.mrp ?? item.mrp) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          taxRate: Number(priceGroup?.taxRate ?? item.taxRate) || 0,
          unitType:
            item.unitType || (product && isWeightProduct(product) ? "WEIGHT" : "PIECE"),
        });
      }),
    [cart, products],
  );

  const promotionPreviewGroups = useMemo(() => {
    const groups = new Map();
    pricedCart.forEach((item) => {
      if (item.cartItemType === "QUICK_SALE") return;
      const product = findProduct(products, item.productId);
      const weightProduct = isWeightProduct(product || item);
      const normalizedQuantity = weightProduct
        ? normalizeWeightQuantity(item.quantity, item.quantityUnit || product?.baseUnit || 'KG')
        : Number(item.quantity) || 0;
      const key = `${item.productId}:${item.priceGroupKey || ''}`;
      const group = groups.get(key) || {
        productId: item.productId,
        priceGroupKey: item.priceGroupKey || '',
        priceGroup: item.priceGroup || null,
        paidQuantity: 0,
        quantityUnit: weightProduct ? 'KG' : 'PCS',
      };
      group.paidQuantity += normalizedQuantity;
      groups.set(key, group);
    });
    return [...groups.values()].map((group) => {
      const productItems = pricedCart.filter(
        (item) =>
          String(item.productId) === String(group.productId) &&
          String(item.priceGroupKey || '') === String(group.priceGroupKey || ''),
      );
      const selectedItems = productItems.filter(
        (item) =>
          item.productBatchId ||
          item.batchId ||
          (Array.isArray(item.batchAllocations) && item.batchAllocations.length > 0),
      );
      const allItemsHaveBatch = selectedItems.length === productItems.length;
      const batchQuantities = new Map();
      if (allItemsHaveBatch) {
        productItems.forEach((item) => {
          const itemAllocations = Array.isArray(item.batchAllocations)
            ? item.batchAllocations
            : [{
                batchId: item.productBatchId || item.batchId,
                quantity: isWeightProduct(findProduct(products, item.productId) || item)
                  ? normalizeWeightQuantity(item.quantity, item.quantityUnit || "KG")
                  : Number(item.quantity) || 0,
              }];
          itemAllocations.forEach(({ batchId, quantity }) => {
            const id = String(batchId || '');
            batchQuantities.set(
              id,
              (batchQuantities.get(id) || 0) + Number(quantity || 0),
            );
          });
        });
      }
      return {
        ...group,
        hasMixedBatchSelection:
          selectedItems.length > 0 && !allItemsHaveBatch,
        ...(allItemsHaveBatch &&
          selectedItems.length > 0 && {
            batchAllocations: [...batchQuantities.entries()].map(
              ([batchId, quantity]) => ({ batchId, quantity }),
            ),
          }),
        batchAllocationKey: getPromotionBatchAllocationKey(
          productItems,
        ),
      };
    });
  }, [pricedCart, products]);

  useEffect(() => {
    if (editMode || promotionPreviewGroups.length === 0) {
      setPromotionPreviews({});
      return undefined;
    }

    let active = true;
    const pending = Object.fromEntries(
      promotionPreviewGroups.map((group) => [
        `${group.productId}:${group.priceGroupKey || ''}`,
        { loading: true, batchAllocationKey: group.batchAllocationKey },
      ]),
    );
    setPromotionPreviews(pending);

    const timer = setTimeout(() => {
      Promise.all(
        promotionPreviewGroups.map(async (group) => {
          if (group.hasMixedBatchSelection) {
            return [`${group.productId}:${group.priceGroupKey || ''}`, {
              batchAllocationKey: group.batchAllocationKey,
              error: "Select a batch for every line of this product, or clear all batch selections.",
            }];
          }
          try {
            const response = await previewPromotionAPI({
              ...group,
              billType: 'B2C',
              companyId: shiftCompanyId,
              useProductSalesPrice: true,
            });
            return [`${group.productId}:${group.priceGroupKey || ''}`, {
              batchAllocationKey: group.batchAllocationKey,
              data: response?.data?.data || response?.data || response,
            }];
          } catch (error) {
            return [`${group.productId}:${group.priceGroupKey || ''}`, {
              batchAllocationKey: group.batchAllocationKey,
              error: error.message,
            }];
          }
        }),
      ).then((entries) => {
        if (active) setPromotionPreviews(Object.fromEntries(entries));
      });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [editMode, promotionPreviewGroups, shiftCompanyId]);

  const printRef = useRef(null);

  /* ── Add Item Form State ── */
  const [addItemSearch, setAddItemSearch] = useState("");
  const [addItemProduct, setAddItemProduct] = useState(null);
  const [addItemSuggestions, setAddItemSuggestions] = useState([]);
  const [addItemDropdownOpen, setAddItemDropdownOpen] = useState(false);
  const [addItemHighlightedIndex, setAddItemHighlightedIndex] = useState(-1);
  const formDropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const cartTableRef = useRef(null);
  const customerPhoneInputRef = useRef(null);
  const customerNameInputRef = useRef(null);

  const [companyFinancials, setCompanyFinancials] = useState({});

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchFinancialDetailsAPI(companyId);
        const financials = res?.data?.data || res?.data || {};
        if (!cancelled) setCompanyFinancials(financials);
      } catch (err) {
        console.error(
          "Could not load company financial details for receipt:",
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const companyForReceipt = { ...companyInfo, financials: companyFinancials };
  // console.log(companyForReceipt);

  /* ── Init & Edit Mode ── */
  useEffect(() => {
    if (editMode && billId) {
      const existingBill = saleBills.find(
        (b) => String(b.id) === String(billId),
      );

      if (!existingBill) return;

      // console.log("Initializing POS with existing bill:", existingBill);

      clearCart();

      // Invoice details
      setInvoiceNo(existingBill.invoiceNumber || existingBill.invoiceNo || "");

      setSaleDate(
        existingBill.saleDate
          ? existingBill.saleDate.split("T")[0]
          : todayISO(),
      );

      // Customer details
      const customerName =
        existingBill.Customer?.name ||
        existingBill.customerName ||
        existingBill.name ||
        "";

      const customerPhone =
        existingBill.Customer?.phone ||
        existingBill.customerPhone ||
        existingBill.phone ||
        "";

      const customerUserId =
        existingBill.User?.id ||
        existingBill.userId ||
        customerInfo?.userId ||
        null;

      setCustomerInfo({
        name: existingBill.Customer?.name || customerName,
        phone: existingBill.Customer?.phone || customerPhone,
        userId: existingBill.userId || customerUserId,
      });

      // Loyalty points
      setLoyaltyPoints(
        existingBill.Customer?.loyalty_points ||
          existingBill.customerLoyaltyPoints ||
          0,
      );

      // Discount
      setGlobalDiscount(
        existingBill.global_discount_amount || existingBill.globalDiscount || 0,
      );

      // Items
      const items =
        existingBill.SalesItems ||
        existingBill.saleItems ||
        existingBill.items ||
        [];

      if (Array.isArray(items) && items.length > 0) {
        const mappedItems = items.map((item) => {
          const productId = item.productId || item.product_id || item.id || "";
          const product = findProduct(products, productId);
          const batch = item.ProductBatch;
          const batchId = item.productBatchId || batch?.id || item.batchId || "";
          const priceType = normalizePriceType(
            item.priceType ||
              product?.sellingPriceType ||
              item.Product?.sellingPriceType,
          );
          const priceGroup = batch
            ? {
                mrp: Number(batch.mrp ?? item.mrp ?? 0),
                salePrice: Number(batch.salePrice ?? item.price ?? 0),
                taxRate: Number(batch.gstPercentage ?? item.taxPercentage ?? 0),
                priceType,
              }
            : null;

          return {
            productId: String(productId),
            productName: item.productName || item.product_name || item.name || "",
            price: Number(priceGroup?.salePrice ?? item.price ?? 0),
            priceType,
            quantity: Number(item.quantity || 1),
            quantityUnit: item.quantityUnit || "",
            taxRate: Number(priceGroup?.taxRate ?? item.taxPercentage ?? 0),
            discountPercent: Number(
              item.discountPercent ?? item.discountPercentage ?? 0,
            ),
            unit: item.unit || "pcs",
            unitType: product && isWeightProduct(product) ? "WEIGHT" : "PIECE",
            baseUnit: product?.baseUnit || "",
            hsnCode: item.hsnCode || item.hsn_code || "",
            barcode: item.barcode || "",
            sku: item.sku || "",
            mrp: Number(priceGroup?.mrp ?? item.mrp ?? 0),
            productBatchId: String(batchId),
            batchAllocations:
              batchId && priceGroup
                ? [{
                    batchId: String(batchId),
                    quantity: Number(item.paidQuantity ?? item.quantity ?? 0),
                  }]
                : undefined,
            batchAvailableQuantity: batch?.availableQuantity,
            priceGroupKey: priceGroup ? getPriceGroupKey(priceGroup) : "",
            priceGroup,
            batchNumber:
              item.batchNumber ||
              item.batchNo ||
              batch?.batchNumber ||
              item.batch_number ||
              "",
            expiryDate: item.expiryDate || item.expiry_date || "",
            serialNumber: item.serialNumber || item.serial_number || "",
            notes: item.notes || "",
          };
        });

        addMultipleCartItemsDirect(mappedItems);
      }
    } else if (!editMode) {
      // Only initialize a completely new bill here
      if (!invoiceNo) {
        refreshInvoiceNo();
      }

      if (!saleDate) {
        setSaleDate(todayISO());
      }
    }

    // IMPORTANT:
    // Do NOT put saleBills in this dependency list.
  }, [editMode, billId]);

  useEffect(() => {
    clearActiveShift();
    if (!billingUser?.id) return;

    setCustomerInfo((prev) => ({
      ...prev,
      userId: String(billingUser.id),
    }));
    if (!canViewShifts) return;
    checkCurrentShift(billingUser.id, shiftCompanyId).catch((err) => {
      toastError(typeof err === "string" ? err : "Failed to load active shift");
    });
  }, [
    billingUser?.id,
    canViewShifts,
    shiftCompanyId,
    clearActiveShift,
    checkCurrentShift,
    setCustomerInfo,
    toastError,
  ]);

  // Close-shift audit: read a fresh copy of the shift (read-only, store untouched)
  // so the ledger figures reflect every bill saved so far.
  useEffect(() => {
    if (!canViewShifts || !shiftCloseModal || !billingUser?.id) {
      setCloseSnapshot(null);
      return undefined;
    }
    let cancelled = false;
    setCloseRefreshing(true);
    fetchCurrentShiftAPI(billingUser.id, shiftCompanyId)
      .then((fresh) => {
        if (!cancelled && fresh && Number(fresh.id) === Number(activeShift?.id)) {
          setCloseSnapshot(fresh);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCloseRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewShifts, shiftCloseModal]);

  useEffect(() => {
    loadHoldCarts();
    // Load held carts once when POS mounts; their behavior is independent of shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        formDropdownRef.current &&
        !formDropdownRef.current.contains(e.target)
      ) {
        setAddItemDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayCart = applyPromotionPreviewPricing(pricedCart, promotionPreviews);
  const totals = calcBillTotals(displayCart, globalDiscount, 0, {
    roundToWholeRupee: settings.roundOffInvoices !== false,
  });
  const promotionPreviewLoading = Object.values(promotionPreviews).some(
    (preview) => preview.loading,
  );

  console.log("Computed totals:", totals);
  // Total item-level discount
  const itemDiscount = displayCart.reduce(
    (sum, item) => sum + (Number(item.discountAmount) || 0),
    0,
  );

  // Total discount (item discount + global discount)
  const totalDiscount = itemDiscount + (Number(globalDiscount) || 0);

  const actualTotal = Number(totals.grandTotal) || 0;
  const pendingQuickSaleRawAmount = displayCart.reduce(
    (sum, item) =>
      item.cartItemType === "QUICK_SALE" &&
      item.gstVerificationStatus === "GST_PENDING"
        ? sum + Number(item.total || 0)
        : sum,
    0,
  );
  const hasPendingQuickSaleItems = displayCart.some(
    (item) =>
      item.cartItemType === "QUICK_SALE" &&
      item.gstVerificationStatus === "GST_PENDING",
  );
  const quickSalePendingAmount = Number(
    Math.max(
      0,
      pendingQuickSaleRawAmount -
        (Number(totals.rawTotal) > 0
          ? (Number(totals.globalDiscountAmount || 0) *
              pendingQuickSaleRawAmount) /
            Number(totals.rawTotal)
          : 0),
    ).toFixed(2),
  );

  const returnCreditApplied = Math.min(
    Number(returnCredit?.remainingAmount) || 0,
    actualTotal,
  );
  const redemptionRateCents = Math.round(
    (Number(settings.loyaltyRedemptionAmountPerPoint) || 0) * 100,
  );
  const redemptionLimitPercentage = Math.min(
    100,
    Math.max(0, Number(settings.loyaltyMaxRedemptionPercentage) || 0),
  );
  const redemptionDueCents = Math.max(
    0,
    Math.round((actualTotal - returnCreditApplied) * 100),
  );
  const maximumRedemptionCents = Math.floor(
    (redemptionDueCents * Math.round(redemptionLimitPercentage * 100)) / 10000,
  );
  const minimumRedeemablePoints =
    Math.max(1, Number(settings.loyaltyMinimumRedemptionPoints) || 1);
  const calculatedMaximumRedeemablePoints =
    settings.loyaltyRedemptionEnabled === true && !editMode && redemptionRateCents > 0
      ? Math.min(
          Number(loyaltyPoints) || 0,
          Math.floor(maximumRedemptionCents / redemptionRateCents),
        )
      : 0;
  const maximumRedeemablePoints =
    calculatedMaximumRedeemablePoints >= minimumRedeemablePoints
      ? calculatedMaximumRedeemablePoints
      : 0;
  const boundedLoyaltyPointsToRedeem = Math.min(
    maximumRedeemablePoints,
    Math.max(0, Number(loyaltyPointsToRedeem) || 0),
  );
  const loyaltyRedemptionAmount = Number(
    ((boundedLoyaltyPointsToRedeem * redemptionRateCents) / 100).toFixed(2),
  );
  const payableTotal = Math.max(
    0,
    Number(
      (actualTotal - returnCreditApplied - loyaltyRedemptionAmount).toFixed(2),
    ),
  );

  const roundOff = Number(totals.roundOff?.toFixed(2));
  /* ── Add Item Form Handlers ── */
  const handleAddItemSearchChange = (e) => {
    const val = e.target.value;

    setAddItemSearch(val);
    setAddItemProduct(null);
    setAddItemHighlightedIndex(-1);

    if (!val.trim()) {
      setAddItemSuggestions([]);
      setAddItemDropdownOpen(false);
      return;
    }

    const matches = (products || [])
      .filter((product) =>
        matchesProductSearch(product, val, [
          brandNamesById.get(String(product.brandId)),
          categoryNamesById.get(String(product.categoryId)),
        ]),
      )
      .slice(0, 15);

    setAddItemSuggestions(matches);
    setAddItemDropdownOpen(matches.length > 0);

    // Automatically highlight first product
    if (matches.length > 0) {
      setAddItemHighlightedIndex(0);
    }
  };

  const applyReturnCredit = useCallback(async (value) => {
    const code = String(value || '')
      .trim()
      .replace(/^RETURN-CREDIT:/i, '');
    if (!code) {
      toast.error('Return credit barcode is empty');
      return null;
    }
    if (editMode) {
      toast.error('Return credits can only be used on a new B2C sale');
      return null;
    }
    if (returnCredit && returnCredit.code !== code) {
      toast.error('Remove the current return credit before scanning another');
      return null;
    }

    setLoadingReturnCredit(true);
    try {
      const credit = await fetchSalesReturnCreditAPI(code);
      if (Number(credit.remainingAmount) <= 0) {
        throw new Error('This return credit has already been fully used');
      }
      setReturnCredit(credit);
      toast.success(`Return credit applied: ${formatCurrency(credit.remainingAmount)}`);
      return { name: `Return credit ${credit.code}` };
    } catch (error) {
      toast.error(error.message || 'Could not validate return credit');
      return null;
    } finally {
      setLoadingReturnCredit(false);
    }
  }, [editMode, returnCredit, toast.error, toast.success]);

  const clearProductSearch = useCallback(() => {
    setAddItemSearch("");
    setAddItemProduct(null);
    setAddItemSuggestions([]);
    setAddItemDropdownOpen(false);
    setAddItemHighlightedIndex(-1);
  }, []);

  const addProductWithStockCheck = useCallback(
    async (product) => {
      if (!product || priceCheckRequestRef.current || priceCheckOpenRef.current) {
        return false;
      }

      priceCheckRequestRef.current = true;
      clearProductSearch();
      const productId = product.id || product._id;
      setPriceCheck({
        open: false,
        product,
        groups: [],
        loading: true,
        error: "",
      });

      try {
        invalidateBatchCache(productId);
        const response = await loadBatchesCached(productId, { availableOnly: true });
        const batches = response?.data?.data || response?.data || response || [];
        const groups = buildMrpPriceGroups({
          product,
          batches: Array.isArray(batches) ? batches : [],
          cart,
        });

        if (groups.length > 1) {
          priceCheckOpenRef.current = true;
          setPriceCheck({ open: true, product, groups, loading: false, error: "" });
          return true;
        }

        if (groups.length === 1) {
          const group = groups[0];
          const isWeight = isWeightProduct(product);
          const quantity = isWeight
            ? Math.min(1, group.availableQuantity)
            : group.availableQuantity >= 1
              ? 1
              : 0;
          const allocations = allocatePriceGroupQuantity(group, quantity);
          if (allocations) {
            addPriceCheckedCartItem(product, group, quantity, allocations);
            toast.success(`Added ${product.name}`);
            return true;
          }
        }

        toast.error(
          `No eligible batch stock is available for ${product.name}. POS sales require an unexpired batch with available quantity.`,
        );
        return false;
      } catch (error) {
        toast.error(error.message || `Could not check current batch prices for ${product.name}.`);
        return false;
      } finally {
        priceCheckRequestRef.current = false;
        setPriceCheck((current) =>
          current.open ? current : {
            open: false,
            product: null,
            groups: [],
            loading: false,
            error: "",
          },
        );
      }
    },
    [
      addPriceCheckedCartItem,
      cart,
      clearProductSearch,
      toast,
    ],
  );

  const confirmPriceCheck = useCallback(
    ({ group, quantity, batchAllocations }) => {
      if (!priceCheck.product) return;
      addPriceCheckedCartItem(priceCheck.product, group, quantity, batchAllocations);
      toast.success(`Added ${priceCheck.product.name}`);
      priceCheckOpenRef.current = false;
      setPriceCheck({ open: false, product: null, groups: [], loading: false, error: "" });
      if (searchInputRef.current) searchInputRef.current.focus();
    },
    [addPriceCheckedCartItem, priceCheck.product, toast],
  );

  const cancelPriceCheck = useCallback(() => {
    priceCheckOpenRef.current = false;
    setPriceCheck({ open: false, product: null, groups: [], loading: false, error: "" });
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  /* Add a product straight into the current order, then get ready for the next scan */
  const addProductToOrder = async (prod) => {
    if (!prod) return;
    if (!(await addProductWithStockCheck(prod))) return false;

    clearProductSearch();

    if (searchInputRef.current) searchInputRef.current.focus();
    return true;
  };

  async function openQuickSaleFromUnknown(value, forceBarcode = false) {
    const text = String(value || "").trim();
    if (!text) return;
    if (!canCreateQuickSale) {
      toast.error(`No product found for: "${text}"`);
      return;
    }

    const isBarcode = forceBarcode ||
      /^\d{8,14}$/.test(text) ||
      /^[a-z0-9._-]{10,}$/i.test(text);
    clearProductSearch();
    if (!isBarcode) {
      setQuickSaleDraft({ initialName: text, initialBarcode: "", alias: null });
      return;
    }

    setQuickSaleResolving(true);
    try {
      const result = await resolveQuickSaleAPI({
        companyId: shiftCompanyId,
        barcode: text,
      });
      if (result?.type === "REGISTERED") {
        await addProductToOrder(result.product);
        return;
      }
      if (result?.type === "BLOCKED") {
        toast.error(result.message || "This Quick Sale item needs administrator review.");
        return;
      }
      setQuickSaleDraft({
        initialName: result?.alias?.name || "",
        initialBarcode: text,
        alias: result?.alias || null,
      });
    } catch (error) {
      toast.error(error.message || "Could not check the scanned barcode.");
    } finally {
      setQuickSaleResolving(false);
    }
  }

  async function handleQuickSaleAdd(item) {
    setQuickSaleResolving(true);
    try {
      const result = await resolveQuickSaleAPI({
        companyId: shiftCompanyId,
        ...(item.barcode ? { barcode: item.barcode } : { name: item.name }),
      });
      if (result?.type === "REGISTERED") {
        setQuickSaleDraft(null);
        if (!(await addProductToOrder(result.product))) {
          throw new Error("This registered product has no eligible batch stock for POS billing.");
        }
        return;
      }
      if (result?.type === "BLOCKED") {
        throw new Error(result.message || "This alias needs administrator review.");
      }

      const alias = result?.type === "QUICK_SALE_ALIAS" ? result.alias : null;
      const identityKey = item.barcode
        ? `barcode:${item.barcode.trim().toUpperCase()}`
        : `name:${item.name
            .normalize("NFKC")
            .trim()
            .replace(/\s+/g, " ")
            .toLocaleLowerCase("en-IN")}`;
      addQuickSaleCartItem({
        identityKey,
        productName: item.name,
        barcode: item.barcode,
        mrp: item.mrp,
        price: item.sellingPrice,
        quantity: item.quantity,
        unit: "pcs",
        gstVerificationStatus: alias?.gstVerificationStatus || "GST_PENDING",
        quickSaleTaxRate: alias?.verifiedTaxRate ?? null,
        quickSalePriceType: alias?.verifiedPriceType ?? null,
        quickSaleAliasId: alias?.id || null,
      });
      setQuickSaleDraft(null);
      toast.success(`Added ${item.name} as a Quick Sale item`);
      if (searchInputRef.current) searchInputRef.current.focus();
    } finally {
      setQuickSaleResolving(false);
    }
  }

  const updateProductQuantity = async (item, quantity) => {
    if (item.cartItemType === "QUICK_SALE") {
      if (Number(quantity) <= 0) return false;
      updateCartItem(item.cartLineId, { quantity });
      return true;
    }
    const product = findProduct(products, item.productId) || item;
    const quantityUnit =
      item.quantityUnit || (isWeightProduct(product) ? "KG" : "PCS");
    if (!item.priceGroupKey) {
      toast.error(
        `${item.productName} has no batch price selection. Remove it and add it again after checking batch stock.`,
      );
      return false;
    }

    try {
      invalidateBatchCache(item.productId);
      const response = await loadBatchesCached(item.productId, {
        availableOnly: !editMode,
      });
      let batches = response?.data?.data || response?.data || response || [];
      if (editMode) {
        const restoredByBatch = new Map();
        cart
          .filter((line) => String(line.productId) === String(item.productId))
          .forEach((line) => {
            const allocations = Array.isArray(line.batchAllocations)
              ? line.batchAllocations
              : line.productBatchId || line.batchId
                ? [{
                    batchId: line.productBatchId || line.batchId,
                    quantity: getQuantityInProductBaseUnit(
                      line.quantity,
                      line.quantityUnit || (isWeightProduct(product) ? "KG" : "PCS"),
                      product,
                    ),
                  }]
                : [];
            allocations.forEach((allocation) => {
              const batchId = String(
                allocation.batchId || allocation.productBatchId || "",
              );
              if (!batchId) return;
              restoredByBatch.set(
                batchId,
                (restoredByBatch.get(batchId) || 0) +
                  Number(allocation.quantity || 0),
              );
            });
          });
        batches = batches.map((batch) => {
          const batchId = String(batch.id || batch._id || "");
          return {
            ...batch,
            availableQuantity:
              Number(batch.availableQuantity ?? batch.quantity ?? 0) +
              (restoredByBatch.get(batchId) || 0),
          };
        });
      }
      const groups = buildMrpPriceGroups({
        product,
        batches: Array.isArray(batches) ? batches : [],
        cart,
        excludedCartLineId: item.cartLineId || item.productId,
      });
      const group = groups.find((candidate) => candidate.key === item.priceGroupKey);
      const baseQuantity = getQuantityInProductBaseUnit(quantity, quantityUnit, product);
      const allocations = group && allocatePriceGroupQuantity(group, baseQuantity);
      if (!allocations) {
        toast.error(
          `Only ${formatQuantity(group?.availableQuantity || 0)} is available at this MRP and price.`,
        );
        return false;
      }
      updateCartItem(item.cartLineId || item.productId, {
        quantity,
        batchAllocations: allocations,
      });
      return true;
    } catch (error) {
      toast.error(error.message || "Could not refresh batch stock.");
      return false;
    }
  };

  const handleAddItemSearchKeyDown = (e) => {
    // Enter — works for barcode scanners (they type the code then press Enter)
    if (e.key === "Enter") {
      e.preventDefault();

      const typed = (e.currentTarget.value || "").trim();
      if (!typed) return;

      if (/^RETURN-CREDIT:/i.test(typed)) {
        setAddItemSearch("");
        setAddItemSuggestions([]);
        setAddItemDropdownOpen(false);
        void applyReturnCredit(typed);
        return;
      }

      const q = typed.toLowerCase();

      // 1) Exact barcode / SKU match always wins
      const exact = (products || []).find(
        (p) =>
          (p.barcode && String(p.barcode).trim().toLowerCase() === q) ||
          (p.sku && String(p.sku).trim().toLowerCase() === q),
      );
      if (exact) {
        addProductToOrder(exact);
        return;
      }

      // 2) Otherwise use the highlighted suggestion (or the only suggestion)
      if (addItemSuggestions.length > 0) {
        const picked =
          addItemSuggestions[
            addItemHighlightedIndex >= 0 ? addItemHighlightedIndex : 0
          ];
        if (picked) {
          addProductToOrder(picked);
          return;
        }
      }

      void openQuickSaleFromUnknown(typed);
      return;
    }

    if (!addItemDropdownOpen || addItemSuggestions.length === 0) {
      return;
    }

    // Down Arrow
    if (e.key === "ArrowDown") {
      e.preventDefault();

      setAddItemHighlightedIndex((prev) => {
        if (prev < addItemSuggestions.length - 1) {
          return prev + 1;
        }

        return 0;
      });

      return;
    }

    // Up Arrow
    if (e.key === "ArrowUp") {
      e.preventDefault();

      setAddItemHighlightedIndex((prev) => {
        if (prev > 0) {
          return prev - 1;
        }

        return addItemSuggestions.length - 1;
      });

      return;
    }

    // Escape
    if (e.key === "Escape") {
      e.preventDefault();

      setAddItemDropdownOpen(false);
      setAddItemHighlightedIndex(-1);
    }
  };

  // Clicking a suggestion adds it to the current order directly
  const handleSelectFormProduct = (prod) => {
    addProductToOrder(prod);
  };

  /* ── Shift handlers ── */
  async function handleStartShift(shiftDetails) {
    if (!billingUser?.id) {
      toast.error("An authenticated user is required to start a shift");
      return;
    }
    if (!shiftDetails?.counterId) {
      toast.error("Select an assigned POS counter before starting a shift");
      return;
    }
    setShiftSubmitting(true);
    try {
      await startShift({
        userId: billingUser.id,
        companyId: shiftCompanyId,
        ...shiftDetails,
      });
      toast.success("Shift started ✓");
      setShiftModalOpen(false);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to start shift");
    } finally {
      setShiftSubmitting(false);
    }
  }

  async function handleEndShift(shiftDetails) {
    if (!activeShift) return;
    setShiftSubmitting(true);
    try {
      const res = await endShift({
        shiftId: activeShift.id,
        ...shiftDetails,
      });
      toast.success(
        `Shift closed. Difference: ${formatCurrency(res?.data?.difference || 0)}`,
      );
      setShiftCloseModal(false);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to close shift");
    } finally {
      setShiftSubmitting(false);
    }
  }

  /* ── Hold cart handler ── */
  async function handleHoldCart() {
    if (cart.length === 0) {
      toast.error("Cart is empty – nothing to hold");
      return;
    }
    try {
      await holdCartAction({
        userId: customerInfo.userId || null,
        customerName: customerInfo.name || "Walk-in Customer",
        customerPhone: customerInfo.phone || "",
        cartData: cart,
        totalAmount: totals.grandTotal,
        note: holdNote || "",
      });
      toast.success("Cart held successfully ✓");
      clearCart();
      setHoldNote("");
      refreshInvoiceNo();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to hold cart");
    }
  }

  /* ── Resume held cart ── */
  async function handleResumeCart(id) {
    try {
      const res = await resumeHoldCart(id);
      const data = res?.data || res;

      console.log("RESUME DATA:", data);

      // Clear cart first
      clearCart();

      const items = Array.isArray(data.cartData)
        ? data.cartData
        : JSON.parse(data.cartData || "[]");

      if (items.length > 0) {
        addMultipleCartItemsDirect(items);
      }

      // Restore customer AFTER clearCart()
      setCustomerInfo({
        name: data.customerName || "",
        phone: data.customerPhone || "",
        userId: data.userId || "",
      });

      console.log("Customer restored:", {
        name: data.customerName,
        phone: data.customerPhone,
        userId: data.userId,
      });

      toast.success("Held cart restored ✓");
      setHoldDrawerOpen(false);
    } catch (err) {
      console.error("Resume cart error:", err);
      toast.error("Failed to resume cart");
    }
  }
  /* ── Add to cart handler (from scanner) ── */
  const handleAddProduct = useCallback(
    (product) => {
      addProductWithStockCheck(product);
    },
    [addProductWithStockCheck],
  );

  /* ── Barcode not found ── */
  const handleBarcodeNotFound = useCallback(
    (val) => {
      void openQuickSaleFromUnknown(val, true);
    },
    [canCreateQuickSale, shiftCompanyId],
  );

  /* ── Camera scan result ── */
  const handleCameraScan = useCallback(
    (decodedText) => {
      if (/^RETURN-CREDIT:/i.test(decodedText.trim())) {
        void applyReturnCredit(decodedText);
        return { name: 'Return credit' };
      }

      const v = decodedText.trim().toLowerCase();
      const product =
        products.find((p) => p.barcode && p.barcode === decodedText) ||
        products.find((p) => p.sku && p.sku.toLowerCase() === v) ||
        products.find((p) => p.HSNCode && p.HSNCode.toLowerCase() === v) ||
        products.find((p) => p.name && p.name.toLowerCase() === v) ||
        null;

      if (product) {
        handleAddProduct(product);
      } else {
        void openQuickSaleFromUnknown(decodedText, true);
      }
      return product;
    },
    [products, handleAddProduct, applyReturnCredit, toast],
  );

  /* Phone lookup for B2C */
  function handlePhoneChange(e) {
    const value = e.target.value;

    // BLOCK anything except digits
    if (value !== "" && !/^[0-9]+$/.test(value)) {
      return;
    }

    // BLOCK more than 10 digits
    if (value.length > 10) {
      return;
    }

    let existing = null;

    // Find customer when exactly 10 digits are entered
    if (value.length === 10) {
      existing = customers.find(
        (p) => String(p.phone || "").trim() === value.trim(),
      );
    }

    setCustomerInfo({
      ...customerInfo,
      phone: value,
      name: existing ? existing.name : customerInfo.name,
    });

    setLoyaltyPoints(existing?.loyalty_points || 0);
  }

  const handleCustomerNameChange = (e) => {
    const value = e.target.value;

    // Allow only alphabets and spaces
    if (!/^[A-Za-z\s]*$/.test(value)) {
      return;
    }

    setCustomerInfo({
      ...customerInfo,
      name: value,
    });
  };

  /* ── Save bill ── */
  async function handleSave(paymentDetails, receiptPaymentDetails) {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    for (const item of cart) {
      if (item.cartItemType === "QUICK_SALE") continue;
      const allocations = item.batchAllocations;
      if (
        !item.priceGroup ||
        item.priceGroupKey !== getPriceGroupKey(item.priceGroup) ||
        !Array.isArray(allocations) ||
        allocations.length === 0 ||
        allocations.some(
          (allocation) =>
            !allocation.batchId ||
            !Number.isFinite(Number(allocation.quantity)) ||
            Number(allocation.quantity) <= 0,
        )
      ) {
        toast.error(
          `${item.productName} has no valid batch price and allocation. Remove it and add it again after checking batch stock.`,
        );
        return;
      }

      const product = findProduct(products, item.productId) || item;
      const lineQuantity = getQuantityInProductBaseUnit(
        item.quantity,
        item.quantityUnit || (isWeightProduct(product) ? "KG" : "PCS"),
        product,
      );
      const allocatedQuantity = allocations.reduce(
        (total, allocation) => total + Number(allocation.quantity),
        0,
      );
      if (Math.abs(allocatedQuantity - lineQuantity) > 0.001) {
        toast.error(
          `Batch allocations do not match the quantity for ${item.productName}. Refresh the selected batch price group.`,
        );
        return;
      }
    }

    const loggedInUserId = billingUser?.id;
    const loggedInCompanyId = shiftCompanyId;

    if (!customerInfo.name || !customerInfo.phone) {
      toast.error("Customer Details is Required!!");
      return;
    }

    if (!loggedInUserId) {
      toast.error("User Details is Required!!");
      return;
    }
    if (!loggedInCompanyId) {
      toast.error("Company Details is Required!!");
      return;
    }

    const finalCustomerInfo = {
      ...customerInfo,
      userId: loggedInUserId,
    };

    setSaving(true);

    try {
      if (!editMode && !posIdempotencyKeyRef.current) {
        posIdempotencyKeyRef.current = createPosIdempotencyKey();
      }
      const payload = buildSaleBillPayload({
        billForm: {
          invoiceNo,
          date: saleDate,
          items: displayCart,
          globalDiscount,
        },
        customerForm: finalCustomerInfo,
        validItems: displayCart,
        products,
      });
      const posBillItems = payload.items;

      const extraFields = {
        bill_type: "B2C",
        paymentStatus: "Paid",
        paymentMethod,
        shiftId: activeShift?.id || null,
        paymentDetails: paymentDetails || null,
        companyId: loggedInCompanyId || null,
        useProductSalesPrice: true,
        ...(!editMode && {
          posIdempotencyKey: posIdempotencyKeyRef.current,
        }),
        ...(!editMode && returnCredit && {
          returnCreditCode: returnCredit.code,
          returnCreditAmount: returnCreditApplied,
        }),
        ...(!editMode && redeemLoyaltyOptIn && boundedLoyaltyPointsToRedeem > 0
          ? {
              redeemLoyaltyPoints: true,
              loyaltyPointsToRedeem: boundedLoyaltyPointsToRedeem,
            }
          : {}),
      };

      if (editMode && billId) {
        await updateBill(billId, {
          ...payload,
          items: posBillItems,
          ...extraFields,
        });
        if (loggedInUserId && canViewShifts) {
          await checkCurrentShift(loggedInUserId, loggedInCompanyId).catch(() => {
            toast.warning("Invoice updated, but shift totals could not be refreshed.");
          });
        }

        toast.success("Invoice updated ✓");

        // Clear edited bill data from POS store
        clearCart();
        setReturnCredit(null);

        setCustomerInfo({
          name: "",
          phone: "",
          userId: loggedInUserId,
        });

        setLoyaltyPoints(0);
        setRedeemLoyaltyOptIn(false);
        setLoyaltyPointsToRedeem(0);
        setGlobalDiscount(0);
        setPaymentOpen(false);

        if (onSaved) {
          onSaved();
        } else if (onBack) {
          onBack();
        }

        return;
      } else {
        const created = await addBill({
          ...payload,
          items: posBillItems,
          ...extraFields,
        });
        posIdempotencyKeyRef.current = "";
        if (loggedInUserId && canViewShifts) {
          await checkCurrentShift(loggedInUserId, loggedInCompanyId).catch(() => {
            toast.warning("Invoice saved, but shift totals could not be refreshed.");
          });
        }

        toast.success("Invoice saved ✓");

        const createdSale =
          created?.data?.data ?? created?.data ?? created ?? null;

        // The create call only returns a summary; fetch the saved invoice so the
        // receipt shows the backend-calculated taxable value / GST / totals.
        let savedBill = null;
        try {
          const savedId = createdSale?.id;
          if (savedId) {
            const res = await fetchSaleBillByIdAPI(savedId);
            savedBill = res?.data ?? res ?? null;
          }
        } catch {
          savedBill = null;
        }
        // Stock changed on the server: drop cached batch lists so the next
        // scan shows the true remaining quantity per batch.
        invalidateBatchCache();
        const backendInvoiceNo =
          createdSale?.invoiceNumber ||
          savedBill?.invoiceNumber ||
          invoiceNo;
        const savedItems = savedBill?.SalesItems || savedBill?.items || [];
        const num = (v, fallback) =>
          v !== undefined && v !== null && !isNaN(Number(v))
            ? Number(v)
            : fallback;
        const receiptCreatedAt =
          savedBill?.createdAt ||
          savedBill?.created_at ||
          createdSale?.createdAt ||
          createdSale?.created_at ||
          new Date().toISOString();
        const receiptSourceItems = getNonQuickSaleReceiptItems(savedItems, cart);
        const receiptItems = receiptSourceItems.map((sourceItem, i) => {
          const saved = savedItems.length ? sourceItem : null;
          const original = saved
            ? cart.find(
                (cartItem) =>
                  String(cartItem.productId) === String(saved.productId) &&
                  (!saved.productBatchId ||
                    String(cartItem.productBatchId) === String(saved.productBatchId)),
              )
            : sourceItem;
          const item = saved ? { ...original, ...saved } : sourceItem;
          return {
            ...item,

            productName:
              item.productName || item.name || item.Product?.name || "Item",

            quantity: Number(saved?.quantity ?? item.quantity) || 1,
            paidQuantity:
              saved?.paidQuantity ?? item.paidQuantity ?? item.quantity,
            freeQuantity: saved?.freeQuantity ?? item.freeQuantity ?? 0,
            totalQuantity:
              saved?.totalQuantity ??
              item.totalQuantity ??
              (Number(item.paidQuantity ?? item.quantity) +
                Number(item.freeQuantity || 0)),
            offerId: saved?.offerId ?? item.offerId,
            offerName: saved?.offerName ?? item.offerName,
            promotionName: saved?.promotionName ?? item.promotionName,
            itemRole: saved?.itemRole ?? item.itemRole,
            productBatchId:
              saved?.productBatchId ?? item.productBatchId,
            batchNumber:
              saved?.batchNumber ?? saved?.batchNo ?? item.batchNumber,
            quantityUnit: saved?.quantityUnit || item.quantityUnit,
            enteredQuantity: Number(saved?.quantity ?? item.quantity) || 1,
            enteredQuantityUnit: item.quantityUnit,

            price:
              (saved?.itemRole ?? item.itemRole) === "GIFT"
                ? Number(saved?.price) || 0
                : Number(item.price) || 0,
            mrp: Number(
              saved?.mrp ??
                saved?.ProductBatch?.mrp ??
                saved?.ProductBatch?.MRP ??
                saved?.Product?.MRP ??
                item.mrp,
            ) || 0,

            // Backend-calculated line values when available (never re-taxed here)
            ...(saved && {
              afterDiscount: num(saved.baseRate, item.afterDiscount),
              taxAmount: num(saved.taxAmount, item.taxAmount),
              total: num(saved.netRate, item.total),
              taxRate: num(saved.taxPercentage, item.taxRate),
            }),

            netRate:
              Number(saved ? saved.netRate : item.total) ||
              Number(item.netRate) ||
              (Number(item.quantity) || 1) * (Number(item.price) || 0),
          };
        });
        const savedQuickSaleItems =
          createdSale?.quickSaleItems ||
          savedBill?.quickSaleItems ||
          savedBill?.QuickSaleItems ||
          [];
        const quickSaleReceiptItems = cart
          .filter((item) => item.cartItemType === "QUICK_SALE")
          .map((item) => {
            const saved = savedQuickSaleItems.find(
              (candidate) =>
                String(candidate.barcode || "") === String(item.barcode || "") &&
                String(candidate.productName || candidate.productNameSnapshot || "") ===
                  String(item.productName || ""),
            );
            return {
              ...item,
              ...(saved || {}),
              cartItemType: "QUICK_SALE",
              productName:
                saved?.productName ||
                saved?.productNameSnapshot ||
                item.productName,
              quantity: Number(saved?.quantity ?? item.quantity) || 0,
              mrp: Number(saved?.mrp ?? item.mrp) || 0,
              price: Number(saved?.sellingPrice ?? item.price) || 0,
              netRate: Number(saved?.netAmount ?? item.total) || 0,
              total: Number(saved?.netAmount ?? item.total) || 0,
              taxRate:
                saved?.taxPercentage ?? item.taxRate ?? null,
              taxAmount:
                saved?.taxAmount ?? item.taxAmount ?? null,
              gstVerificationStatus:
                saved?.gstVerificationStatus || item.gstVerificationStatus,
              itemType: "QUICK_SALE",
            };
          });
        receiptItems.push(...quickSaleReceiptItems);
        const totalMrp = receiptItems.reduce(
          (sum, item) =>
            sum + (Number(item.mrp) || 0) * (Number(item.quantity) || 1),
          0,
        );
        const finalBillTotal = num(
          savedBill?.totalAmount,
          num(createdSale?.totalAmount, Number(totals.grandTotal) || 0),
        );
        const todaySavings = Math.max(0, totalMrp - finalBillTotal);
        const receiptCustomer = finalCustomerInfo.phone
          ? customers.find(
              (customer) =>
                String(customer.phone || "").trim() ===
                String(finalCustomerInfo.phone).trim(),
            )
          : null;

        const billForPrint = {
          bill_type: "B2C",
          invoiceNumber: backendInvoiceNo,
          invoiceNo: backendInvoiceNo,

          saleDate: savedBill?.saleDate || createdSale?.saleDate || saleDate,
          createdAt: receiptCreatedAt,

          items: receiptItems,

          customerName: finalCustomerInfo.name || "Walk-in Customer",

          customerPhone: finalCustomerInfo.phone || "",
          customerAddress:
            savedBill?.Customer?.address || receiptCustomer?.address || "",
          loyaltyPointsEarned: Number(createdSale?.loyaltyPointsEarned) || 0,
          loyaltyPointsRedeemed:
            Number(createdSale?.loyaltyPointsRedeemed) || 0,
          loyaltyRedemptionAmount:
            Number(createdSale?.loyaltyRedemptionAmount) || 0,
          loyaltyPointsBalance:
            createdSale?.loyaltyPointsBalance ??
            savedBill?.Customer?.loyalty_points ??
            null,

          paymentMethod,

          discountAmount: Number(globalDiscount) || 0,

          baseRate: num(savedBill?.baseRate, Number(totals.subtotal) || 0),

          tax: num(savedBill?.tax, Number(totals.totalTax) || 0),
          gstClassificationPending:
            createdSale?.gstClassificationPending ??
            savedBill?.gstClassificationPending ??
            hasPendingQuickSaleItems,

          totalAmount: num(
            savedBill?.totalAmount,
            num(createdSale?.totalAmount, Number(totals.grandTotal) || 0),
          ),
          roundOff: num(savedBill?.roundOff, Number(totals.roundOff) || 0),
          returnCreditAmount: Number(
            createdSale?.returnCredit?.appliedAmount ?? returnCreditApplied,
          ) || 0,
          amountReceived: Number(
            receiptPaymentDetails?.amountReceived ?? payableTotal,
          ),
          amountReturned: Number(receiptPaymentDetails?.amountReturned) || 0,
          todaySavings,

          User: {
            name:
              billingUser?.name ||
              activeShift?.user?.name ||
              "Store Manager",
          },

          ...extraFields,
        };

        // console.log("PRINT BILL:", billForPrint);

        setLastPrintedBill(billForPrint);
        setPaymentOpen(false);
        setRedeemLoyaltyOptIn(false);
        setLoyaltyPointsToRedeem(0);
        setPrintReady(true);

        clearCart();
        setReturnCredit(null);

        let newBillUserId = "";
        const storedAuthAfterSave = localStorage.getItem("thrive-auth-storage");

        if (storedAuthAfterSave) {
          try {
            const authData = JSON.parse(storedAuthAfterSave);
            newBillUserId = String(authData?.state?.user?.id || "");
          } catch (error) {
            console.error("Failed to read user:", error);
          }
        }

        setCustomerInfo({
          name: "",
          phone: "",
          userId: newBillUserId,
        });

        setLoyaltyPoints(0);
        setGlobalDiscount(0);

        refreshInvoiceNo();
        setSaleDate(todayISO());
      }
    } catch (err) {
      console.error(err);
      toast.error(
        "Failed to save invoice: " + (err.message || "Unknown error"),
      );
    } finally {
      setSaving(false);
    }
  }

  /* ── New bill / Void bill ── */
  function handleNewBill() {
    const storedAuth = localStorage.getItem("thrive-auth-storage");
    let loggedInUserId = "";

    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        loggedInUserId = String(authData?.state?.user?.id || "");
      } catch (error) {
        console.error("Failed to read user:", error);
      }
    }

    clearCart();
    setReturnCredit(null);

    setCustomerInfo({
      name: "",
      phone: "",
      userId: loggedInUserId,
    });

    setLoyaltyPoints(0);
    setGlobalDiscount(0);

    refreshInvoiceNo();
    setSaleDate(todayISO());
  }

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (paymentOpen) {
          setPaymentOpen(false);
          return;
        }
        if (priceCheck.open) {
          cancelPriceCheck();
          return;
        }
        if (cameraOpen) {
          setCameraOpen(false);
          return;
        }
        if (holdDrawerOpen) {
          setHoldDrawerOpen(false);
          return;
        }
        if (shiftModalOpen) {
          setShiftModalOpen(false);
          return;
        }
        if (shiftCloseModal) {
          setShiftCloseModal(false);
          return;
        }
        if (addItemDropdownOpen) {
          setAddItemDropdownOpen(false);
          setAddItemHighlightedIndex(-1);
          return;
        }

        const target = e.target;
        const isEditing =
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.matches("input, textarea, select"));
        if (!isEditing) onBack?.();
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (
        paymentOpen ||
        priceCheck.open ||
        cameraOpen ||
        holdDrawerOpen ||
        shiftModalOpen ||
        shiftCloseModal
      ) {
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        customerPhoneInputRef.current?.focus();
      } else if (e.key === "F5") {
        e.preventDefault();
        cartTableRef.current?.querySelector(".pos-exact-qty-input")?.focus();
      } else if (e.key === "F6") {
        e.preventDefault();
        customerNameInputRef.current?.focus();
      } else if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0) setPaymentOpen(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        if (
          cart.length === 0 ||
          window.confirm("Start a new bill and clear the current cart?")
        ) {
          handleNewBill();
        }
      } else if (e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) {
          handleHoldCart();
        } else {
          setHoldDrawerOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    cart,
    paymentOpen,
    priceCheck.open,
    cancelPriceCheck,
    cameraOpen,
    holdDrawerOpen,
    shiftModalOpen,
    shiftCloseModal,
    addItemDropdownOpen,
    onBack,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!printReady || !lastPrintedBill) return;

    const timer = setTimeout(() => {
      // console.log("Printing bill:", lastPrintedBill);

      const thermal = document.getElementById("thermal-bill-print");

      // console.log("Thermal element:", thermal);

      if (!thermal) {
        console.error("Thermal invoice element not found");
        return;
      }

      document.body.classList.add("printing-thermal-receipt");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
    }, 500);

    const afterPrint = () => {
      document.body.classList.remove("printing-thermal-receipt");

      setPrintReady(false);
      setLastPrintedBill(null);
    };

    window.addEventListener("afterprint", afterPrint);

    return () => {
      clearTimeout(timer);

      window.removeEventListener("afterprint", afterPrint);

      document.body.classList.remove("printing-thermal-receipt");
    };
  }, [printReady, lastPrintedBill]);

  const formattedDateTimeStr = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const brandNameFor = (product) => {
    if (!product) return "";
    const direct = product.brandName || product.brand?.name;
    if (direct) return direct;
    const id = product.brandId;
    if (id == null || id === "") return "";
    const found = (brands || []).find((b) => String(b.id ?? b._id) === String(id));
    return found?.name || "";
  };

  // MRP saving per line (display only): MRP above the selling rate, per unit sold
  const mrpSavings = displayCart.reduce((sum, item) => {
    const mrp = Number(item.mrp) || 0;
    const rate = Number(item.price) || 0;
    if (mrp <= rate) return sum;
    const qty =
      item.unitType === "WEIGHT" && item.quantityUnit === "GRAM"
        ? normalizeWeightQuantity(item.quantity, item.quantityUnit)
        : Number(item.quantity) || 0;
    return sum + (mrp - rate) * qty;
  }, 0);
  const totalSavings = mrpSavings + totalDiscount;
  const gstTotal = Number(totals.totalTax) || 0;
  const cgstHalf = Number((gstTotal / 2).toFixed(2));
  const sgstHalf = Number((gstTotal - cgstHalf).toFixed(2));
  const totalPieces = displayCart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
  const cashierName = billingUser?.name || billingUser?.username || "";
  const terminalId =
    activeShift?.counterNameSnapshot ||
    activeShift?.counter?.counterName ||
    activeShift?.terminalId ||
    "—";
  const customerTier =
    customerInfo.phone && (loyaltyPoints > 0 || customerInfo.name)
      ? loyaltyTier(loyaltyPoints)
      : null;

  return (
    <>
      {/* ── Thermal Bill (print-only) ── */}
      {lastPrintedBill && (
        <ThermalInvoice
          bill={lastPrintedBill}
          companies={companyForReceipt}
          party={{
            name: lastPrintedBill.customerName || "Walk-in Customer",
            phone: lastPrintedBill.customerPhone || "",
            address: lastPrintedBill.customerAddress || "",
          }}
          items={lastPrintedBill.items || []}
          invoiceLabel="INVOICE"
          partyLabel="Customer"
          printRef={printRef}
          showActionBar={false}
          showBatch={false}
        />
      )}

      <div className="pos-b2c-root bf-pos">
        <ToastContainer toasts={toast.toasts} />

        {quickSaleDraft && (
          <QuickSaleModal
            initialName={quickSaleDraft.initialName}
            initialBarcode={quickSaleDraft.initialBarcode}
            alias={quickSaleDraft.alias}
            saving={quickSaleResolving}
            onClose={() => {
              setQuickSaleDraft(null);
              if (searchInputRef.current) searchInputRef.current.focus();
            }}
            onAdd={handleQuickSaleAdd}
          />
        )}

        <PriceCheckModal
          open={priceCheck.open}
          product={priceCheck.product}
          groups={priceCheck.groups}
          loading={priceCheck.loading}
          error={priceCheck.error}
          onConfirm={confirmPriceCheck}
          onCancel={cancelPriceCheck}
        />

        {/* ── Camera Scanner Modal ── */}
        <CameraScanner
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onScan={handleCameraScan}
        />

        {/* ── Payment Modal ── */}
        <POSPaymentModal
          open={paymentOpen}
          totals={{
            ...totals,
            grandTotal: payableTotal,
            preCreditGrandTotal: actualTotal,
            roundOff: roundOff,
            returnCreditAmount: returnCreditApplied,
            loyaltyRedemptionAmount,
            itemDiscount,
            quickSalePendingAmount,
            hasPendingQuickSale: hasPendingQuickSaleItems,
          }}
          loyaltyRedemptionEnabled={
            settings.loyaltyRedemptionEnabled === true &&
            !editMode &&
            Boolean(customerInfo.phone) &&
            maximumRedeemablePoints > 0
          }
          availableLoyaltyPoints={Number(loyaltyPoints) || 0}
          loyaltyPointsToRedeem={boundedLoyaltyPointsToRedeem}
          maximumRedeemablePoints={maximumRedeemablePoints}
          minimumRedeemablePoints={minimumRedeemablePoints}
          loyaltyRedemptionAmountPerPoint={
            Number(settings.loyaltyRedemptionAmountPerPoint) || 0
          }
          redeemLoyaltyOptIn={redeemLoyaltyOptIn}
          onRedeemLoyaltyOptInChange={(enabled) => {
            setRedeemLoyaltyOptIn(enabled);
            setLoyaltyPointsToRedeem(0);
          }}
          onLoyaltyPointsToRedeemChange={setLoyaltyPointsToRedeem}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          customerInfo={customerInfo}
          invoiceNo={invoiceNo}
          onConfirm={handleSave}
          onClose={() => {
            setPaymentOpen(false);
            setRedeemLoyaltyOptIn(false);
            setLoyaltyPointsToRedeem(0);
          }}
          onHold={async () => {
            await handleHoldCart();
            setPaymentOpen(false);
            setRedeemLoyaltyOptIn(false);
            setLoyaltyPointsToRedeem(0);
          }}
          saving={saving}
          operatorName={cashierName}
          operatorId={billingUser?.id}
          terminalId={terminalId}
          tierLabel={customerTier?.label}
          printerLabel={`THERMAL ${printerWidth || "80"}MM · AUTO-PRINT ${autoPrint ? "ON" : "OFF"}`}
        />

        {/* ═══ TOP TOOLBAR ═══ */}
        <div className="bf-toolbar">
          {onBack && (
            <button
              type="button"
              className="bf-iconbtn"
              onClick={() => {
                onBack();
                setCustomerInfo({ name: "", phone: "", userId: "" });
                setLoyaltyPoints(0);
                clearCart();
                setReturnCredit(null);
              }}
              title="Back (Esc)"
              aria-label="Back"
            >
              <FiArrowLeft />
            </button>
          )}
          <button
            type="button"
            className={`bf-scanbadge ${scannerEnabled ? "" : "is-off"}`}
            onClick={() => cameraEnabled && setCameraOpen(true)}
            title={cameraEnabled ? "Scan barcode with camera" : "Camera scanning is disabled in settings"}
          >
            <FiMaximize />
            <span>EAN-13</span>
          </button>
          <div className="bf-searchwrap">
            <input
              type="text"
              placeholder="Scan barcode [EAN-13] or search product by name / SKU…"
              className="bf-searchinput"
              ref={searchInputRef}
              autoFocus
              role="combobox"
              aria-label="Scan barcode or search products"
              aria-autocomplete="list"
              aria-expanded={addItemDropdownOpen && addItemSuggestions.length > 0}
              aria-controls="pos-product-suggestions"
              aria-activedescendant={
                addItemHighlightedIndex >= 0
                  ? `pos-product-suggestion-${addItemHighlightedIndex}`
                  : undefined
              }
              value={addItemSearch}
              onChange={handleAddItemSearchChange}
              onKeyDown={handleAddItemSearchKeyDown}
              onFocus={() => {
                if (addItemSuggestions.length > 0) {
                  setAddItemDropdownOpen(true);
                  if (addItemHighlightedIndex === -1) setAddItemHighlightedIndex(0);
                }
              }}
            />
            <button
              type="button"
              className="bf-enterbtn"
              onClick={() =>
                handleAddItemSearchKeyDown({
                  key: "Enter",
                  preventDefault: () => {},
                  stopPropagation: () => {},
                  target: searchInputRef.current,
                  currentTarget: searchInputRef.current,
                })
              }
            >
              <FiCornerDownLeft /> ENTER
            </button>
            {canCreateQuickSale && (
              <button
                type="button"
                className="bf-pill"
                disabled={quickSaleResolving}
                onClick={() => {
                  const search = addItemSearch.trim();
                  if (search) {
                    void openQuickSaleFromUnknown(search);
                  } else {
                    setQuickSaleDraft({
                      initialName: "",
                      initialBarcode: "",
                      alias: null,
                    });
                  }
                }}
              >
                <FiPlus /> Quick Sale
              </button>
            )}
            {addItemDropdownOpen && addItemSuggestions.length > 0 && (
              <div
                className="bf-dropdown"
                id="pos-product-suggestions"
                role="listbox"
                ref={formDropdownRef}
              >
                {addItemSuggestions.map((item, index) => (
                  <div
                    key={item.id || item._id}
                    id={`pos-product-suggestion-${index}`}
                    className={`bf-dropdown__item ${index === addItemHighlightedIndex ? "is-active" : ""}`}
                    role="option"
                    aria-selected={index === addItemHighlightedIndex}
                    onMouseEnter={() => setAddItemHighlightedIndex(index)}
                    onClick={() => handleSelectFormProduct(item)}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      {(item.sku || item.barcode) && (
                        <span className="bf-dropdown__sub" style={{ textAlign: "left" }}>
                          {item.sku || ""}
                          {item.sku && item.barcode ? " · " : ""}
                          {item.barcode || ""}
                        </span>
                      )}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <strong>Batch price check on add</strong>
                      {getProductStockLabel(item) && (
                        <span className="bf-dropdown__sub">
                          Stock: {getProductStockLabel(item)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className="bf-pill">INV: {invoiceNo || "—"}</span>
          <LiveClock date={saleDate} />
          {canViewShifts && (
            <button
              type="button"
              className={`bf-pill ${activeShift ? "is-live" : ""}`}
              onClick={() => (activeShift ? setShiftCloseModal(true) : setShiftModalOpen(true))}
              title={activeShift ? `Shift #${activeShift.id} active — click to close` : "Start new shift"}
            >
              <FiClock /> {activeShift ? `Shift #${activeShift.id}` : "Start Shift"}
            </button>
          )}
          <button
            type="button"
            className="bf-pill"
            onClick={() => (cart.length > 0 ? handleHoldCart() : setHoldDrawerOpen(true))}
            title={cart.length > 0 ? "Hold current bill (F10)" : "View held bills (F10)"}
          >
            <FiLayers /> {cart.length > 0 ? "Hold Bill" : "Held Bills"}
            <span className="bf-count">{holdCarts.length}</span>
          </button>
        </div>

        {/* ═══ CUSTOMER IDENTIFICATION ═══ */}
        <div className="bf-custrow">
          <div className="bf-phone">
            <span>+91</span>
            <input
              type="tel"
              name="phone"
              ref={customerPhoneInputRef}
              placeholder="Customer phone"
              aria-label="Customer phone number"
              value={customerInfo.phone || ""}
              onChange={handlePhoneChange}
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>
          <div className="bf-namefield">
            <input
              type="text"
              name="name"
              className="bf-custname"
              ref={customerNameInputRef}
              aria-label="Customer name"
              placeholder="Customer name"
              value={customerInfo.name}
              onChange={handleCustomerNameChange}
            />
          </div>
          <span className="bf-loyal" title="Loyalty points balance (points are awarded when the bill is saved)">
            <FiStar />
            {customerTier && <span className="bf-loyal__tier">{customerTier.label.toUpperCase()}</span>}
            <span>{Number(loyaltyPoints) || 0} pts</span>
          </span>
          <div className="bf-shortcuts" aria-label="Keyboard shortcuts">
            <span><b>F2</b>Search</span>
            <span><b>F4</b>Phone</span>
            <span><b>F5</b>Qty</span>
            <span><b>F6</b>Name</span>
            <span><b>F8</b>Pay</span>
            <span><b>F9</b>New</span>
            <span><b>F10</b>Hold</span>
          </div>
        </div>

        {/* ═══ MAIN: LEDGER + CHECKOUT PANEL ═══ */}
        <div className="bf-main">
          <section className="bf-cart" aria-label="Active cart ledger">
            <div className="bf-cart__head">
              <h2 className="bf-cart__title">ACTIVE CART LEDGER</h2>
              <span className="bf-tag bf-tag--dark">{cart.length} Items</span>
              <span className="bf-cart__sub">
                {hasPendingQuickSaleItems
                  ? "Quick Sale lines await GST verification"
                  : "Auto-calculated with GST / HSN"}
              </span>
              <span className="bf-spacer" />
              <span className="bf-cart__sub">
                Scanner: <b style={{ color: scannerEnabled ? "#059669" : "#64748b" }}>{scannerEnabled ? "ONLINE" : "OFF"}</b>
              </span>
            </div>
            <div className="bf-cart__scroll" ref={cartTableRef}>
              <table className="bf-table">
                <colgroup>
                  <col style={{ width: 42 }} />
                  <col />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 150 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 64 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 48 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="c">#</th>
                    <th>Item Description &amp; Brand</th>
                    <th>SKU / EAN</th>
                    <th className="c">Quantity</th>
                    <th className="r">Rate (₹)</th>
                    <th className="r">MRP (₹)</th>
                    <th className="r">Discount</th>
                    <th className="r">GST</th>
                    <th className="r">Net Total (₹)</th>
                    <th className="c">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="10">
                        <div className="bf-empty">
                          <strong>No items in order</strong>
                          Scan a barcode or search in the toolbar and press Enter to add products.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayCart.map((item, idx) => {
                        const displayItem = item;
                        const isQuickSaleItem = item.cartItemType === "QUICK_SALE";
                        const productStock = findProduct(products, item.productId);
                        const totalStockLabel = isQuickSaleItem
                          ? ""
                          : getProductStockLabel(productStock);
                        const lineTotal = Number(displayItem.total) || 0;
                        const isFirstProductLine = !isQuickSaleItem && cart.findIndex(
                          (candidate) =>
                            String(candidate.productId) === String(item.productId) &&
                            String(candidate.priceGroupKey || '') === String(item.priceGroupKey || ''),
                        ) === idx;
                        const promotionPreview = isFirstProductLine
                          ? promotionPreviews[`${item.productId}:${item.priceGroupKey || ''}`]
                          : null;
                        const previewData = promotionPreview?.data;
                        const currentProductQuantity = cart
                          .filter(
                            (line) =>
                              String(line.productId) === String(item.productId) &&
                              String(line.priceGroupKey || '') === String(item.priceGroupKey || ''),
                          )
                          .reduce(
                            (total, line) =>
                              total +
                              (isWeightProduct(line)
                                ? normalizeWeightQuantity(
                                    line.quantity,
                                    line.quantityUnit || "KG",
                                  )
                                : Number(line.quantity) || 0),
                            0,
                          );
                        const previewPaidQuantity = Number(
                          previewData?.product?.paidQuantity ??
                            previewData?.pricing?.paidQuantity,
                        );
                        const previewMatchesCart =
                          Number.isFinite(previewPaidQuantity) &&
                          Math.abs(previewPaidQuantity - currentProductQuantity) <=
                            0.0005;
                        const previewPromotion = previewMatchesCart
                          ? previewData?.promotion
                          : null;
                        const storedFreeQuantity = Number(item.freeQuantity) || 0;
                        const previewFreeQuantity = Number(
                          previewMatchesCart
                            ? previewData?.pricing?.freeQuantity ??
                                previewData?.product?.freeQuantity ??
                                previewPromotion?.freeQuantity ??
                                0
                            : 0,
                        );
                        const giftProductId =
                          previewPromotion?.giftProductId ??
                          previewPromotion?.giftProduct?.id;
                        const hasDifferentProductGift =
                          giftProductId != null &&
                          String(giftProductId) !== String(item.productId);
                        const freeQuantityForDisplay =
                          item.itemRole !== "GIFT" && storedFreeQuantity > 0
                            ? storedFreeQuantity
                            : item.itemRole !== "GIFT" &&
                                isFirstProductLine &&
                                !hasDifferentProductGift
                              ? previewFreeQuantity
                              : 0;
                        const isWeightLine = !isQuickSaleItem && isWeightProduct(item);
                        const unitMultiplier =
                          isWeightLine && item.quantityUnit === "GRAM" ? 1000 : 1;
                        const paidQuantityForDisplay =
                          storedFreeQuantity > 0
                            ? Number(
                                item.paidQuantity ??
                                  Math.max(0, Number(item.quantity) - storedFreeQuantity),
                              )
                            : isFirstProductLine && previewFreeQuantity > 0
                              ? cart
                                  .filter(
                                    (line) =>
                                      String(line.productId) === String(item.productId) &&
                                      String(line.priceGroupKey || '') === String(item.priceGroupKey || ''),
                                  )
                                  .reduce(
                                    (total, line) =>
                                      total +
                                      (isWeightLine
                                        ? normalizeWeightQuantity(
                                            line.quantity,
                                            line.quantityUnit || "KG",
                                          )
                                        : Number(line.quantity) || 0),
                                    0,
                                  ) * unitMultiplier
                              : Number(item.quantity) || 0;
                        const totalQuantity = Number(
                          item.totalQuantity ?? item.quantity,
                        );
                        const paidOnlyAmount =
                          storedFreeQuantity > 0 && totalQuantity > 0
                            ? (lineTotal *
                                (Number(item.paidQuantity) ||
                                  Math.max(0, totalQuantity - storedFreeQuantity))) /
                              totalQuantity
                            : lineTotal;
                        const itemTotal = paidOnlyAmount;
                        const rate = Number(item.price) || 0;
                        const mrpValue = Number(item.mrp) || 0;
                        const brandName = isQuickSaleItem ? "" : brandNameFor(productStock);
                        const batchLabel = item.batchNumber || item.batchNo || "";
                        const unitLabel = isWeightLine
                          ? item.quantityUnit === "GRAM" ? "g" : "kg"
                          : item.unit || "pcs";
                        const lowStock = (() => {
                          const avail = Number(item.batchAvailableQuantity);
                          return Number.isFinite(avail) && avail >= 0 && avail <= 5 && !isWeightLine;
                        })();

                        return (
                          <tr key={item.cartLineId || item.productId || idx}>
                            <td className="c serial">{String(idx + 1).padStart(2, "0")}</td>
                            <td>
                              <div className="bf-item__name">{item.productName}</div>
                              <div className="bf-item__meta">
                                {isQuickSaleItem && (
                                  <span className="bf-quick-sale-status">
                                    Quick Sale · {item.gstVerificationStatus === "GST_PENDING"
                                      ? "GST pending verification"
                                      : "GST verified"}
                                  </span>
                                )}
                                {brandName && <>Brand: {brandName}</>}
                                {batchLabel && <>{brandName ? " | " : ""}Batch: {batchLabel}</>}
                                {item.hsnCode && <>{brandName || batchLabel ? " | " : ""}HSN: {item.hsnCode}</>}
                                {item.priceGroupKey && (
                                  <>{brandName || batchLabel || item.hsnCode ? " | " : ""}MRP Group · {item.batchAllocations?.length || 0} FIFO batch{item.batchAllocations?.length === 1 ? "" : "es"}</>
                                )}
                              </div>
                              {totalStockLabel && (
                                <div className="bf-item__meta">Stock: {totalStockLabel}</div>
                              )}
                              {lowStock && (
                                <span className="bf-stock-low">LOW: {formatQuantity(item.batchAvailableQuantity)} LEFT IN BATCH</span>
                              )}
                              {promotionPreview?.loading && isFirstProductLine && (
                                <div className="bf-offer is-loading">Checking offers…</div>
                              )}
                              {promotionPreview?.error && isFirstProductLine && (
                                <div className="bf-offer is-warning" role="status">
                                  Promotion preview failed: {promotionPreview.error}
                                </div>
                              )}
                              {previewPromotion && isFirstProductLine && (
                                <div className="bf-offer">
                                  <strong><FiTag /> OFFER APPLIED: {previewPromotion.name}</strong>
                                  {(Number(previewPromotion.discountPercentage) > 0 || Number(previewPromotion.discountAmount) > 0) && (
                                    <span>
                                      Discount{" "}
                                      {Number(previewPromotion.discountPercentage) > 0
                                        ? `${Number(previewPromotion.discountPercentage)}%`
                                        : formatCurrency(previewPromotion.discountAmount)}
                                    </span>
                                  )}
                                  {previewPromotion.giftProduct?.name && (
                                    <span>FREE GIFT: {previewPromotion.giftProduct.name}</span>
                                  )}
                                  {previewData.pricing?.payableAmount !== undefined && (
                                    <span>Offer total: {formatCurrency(previewData.pricing.payableAmount)}</span>
                                  )}
                                  <small>Final offer and amount are rechecked at checkout.</small>
                                </div>
                              )}
                            </td>
                            <td>
                              <div>{item.sku || "—"}</div>
                              {item.barcode && <div className="bf-item__meta">{item.barcode}</div>}
                            </td>
                            <td className="c">
                              <div className="bf-qty">
                                <button
                                  type="button"
                                  aria-label={`Decrease ${item.productName} quantity`}
                                  onClick={() =>
                                    updateProductQuantity(
                                      item,
                                      isWeightLine || isQuickSaleItem
                                        ? Math.max(
                                            isWeightLine && item.quantityUnit === "GRAM" ? 1 : 0.001,
                                            Number(
                                              (
                                                item.quantity -
                                                (isWeightLine && item.quantityUnit === "GRAM"
                                                  ? 1
                                                  : 0.001)
                                              ).toFixed(3),
                                            ),
                                          )
                                        : Math.max(1, item.quantity - 1),
                                    )
                                  }
                                >
                                  −
                                </button>
                                <POSQtyInput
                                  value={item.quantity}
                                  ariaLabel={`Quantity for ${item.productName}`}
                                  step={
                                    (isWeightLine || isQuickSaleItem) &&
                                    (!isWeightLine || item.quantityUnit !== "GRAM")
                                      ? 0.001
                                      : 1
                                  }
                                  allowDecimal={
                                    (isWeightLine || isQuickSaleItem) &&
                                    (!isWeightLine || item.quantityUnit !== "GRAM")
                                  }
                                  onCommit={(n) =>
                                    updateProductQuantity(
                                      item,
                                      isWeightLine
                                        ? Math.max(
                                            item.quantityUnit === "GRAM"
                                              ? 1
                                              : 0.001,
                                            n,
                                          )
                                        : isQuickSaleItem
                                          ? Math.max(0.001, Number(n.toFixed(3)))
                                          : Math.max(1, Math.round(n)),
                                    )
                                  }
                                  onEnter={() => {
                                    if (searchInputRef.current)
                                      searchInputRef.current.focus();
                                  }}
                                />
                                <button
                                  type="button"
                                  aria-label={`Increase ${item.productName} quantity`}
                                  onClick={() =>
                                    updateProductQuantity(
                                      item,
                                      item.quantity +
                                        ((isWeightLine || isQuickSaleItem) &&
                                        (!isWeightLine || item.quantityUnit !== "GRAM")
                                          ? 0.001
                                          : 1),
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <span className="bf-unit">
                                {unitLabel}
                                {freeQuantityForDisplay > 0 &&
                                  ` · ${formatQuantity(paidQuantityForDisplay)}+${formatQuantity(freeQuantityForDisplay * unitMultiplier)} free`}
                              </span>
                              {isWeightProduct(item) && (
                                <select
                                  className="bf-unitselect"
                                  aria-label={`Quantity unit for ${item.productName}`}
                                  value={item.quantityUnit || "KG"}
                                  onChange={(event) => {
                                    const nextUnit = event.target.value;
                                    const baseQuantity = normalizeWeightQuantity(
                                      item.quantity,
                                      item.quantityUnit || "KG",
                                    );
                                    updateCartItem(item.cartLineId || item.productId, {
                                      quantityUnit: nextUnit,
                                      quantity:
                                        nextUnit === "GRAM"
                                          ? Number((baseQuantity * 1000).toFixed(3))
                                          : Number(baseQuantity.toFixed(3)),
                                    });
                                  }}
                                >
                                  <option value="GRAM">GRAM</option>
                                  <option value="KG">KG</option>
                                </select>
                              )}
                            </td>
                            <td className="r">
                              <strong>{money(rate)}</strong>
                              {isWeightProduct(item) && <span className="bf-unit">/ KG</span>}
                            </td>
                            <td className="r">
                              {mrpValue > 0 ? <span className="bf-mrp">{money(mrpValue)}</span> : "—"}
                            </td>
                            <td className="r">
                              <span className="bf-disc">
                                {Number(item.discountPercent) > 0 ? `${Number(item.discountPercent)}%` : "—"}
                                {item.discountAmount > 0 && <small>(-{money(item.discountAmount)})</small>}
                              </span>
                            </td>
                            <td className="r">
                              {isQuickSaleItem &&
                              item.gstVerificationStatus === "GST_PENDING" ? (
                                <div className="bf-item__meta">GST pending</div>
                              ) : (
                                <>
                                  <div>{Number(item.taxRate) || 0}%</div>
                                  <div className="bf-item__meta">{money(item.taxAmount || 0)}</div>
                                </>
                              )}
                            </td>
                            <td className="r"><span className="bf-total">{money(itemTotal)}</span></td>
                            <td className="c">
                              <button
                                type="button"
                                className="bf-remove"
                                onClick={() => removeFromCart(item.cartLineId || item.productId)}
                                title="Remove item"
                                aria-label={`Remove ${item.productName}`}
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bf-cart__foot">
              <span>Rows: {cart.length} &nbsp; Total pieces: {formatQuantity(totalPieces)}</span>
              <span>[F5] Edit qty · [Tab] Move between controls · [F9] New bill</span>
            </div>
          </section>

          <aside className="bf-side" aria-label="Checkout summary">
            <div className="bf-term">
              <div className="bf-term__icon"><FiMonitor /></div>
              <div className="bf-term__body">
                <strong>COUNTER {terminalId}</strong>
                <span>
                  Cashier: {cashierName || "—"}
                  {billingUser?.id ? ` (ID #${billingUser.id})` : ""}
                </span>
              </div>
              {canViewShifts && (
                <button
                  type="button"
                  className={`bf-badge ${activeShift ? "" : "is-off"}`}
                  onClick={() => (activeShift ? setShiftCloseModal(true) : setShiftModalOpen(true))}
                  title="Manage shift"
                >
                  {activeShift ? `SHIFT #${activeShift.id}` : "NO SHIFT"}
                </button>
              )}
            </div>

            <div className="bf-actions">
              <button type="button" className="bf-action" onClick={handleHoldCart} disabled={cart.length === 0}>
                <span><FiPauseCircle /> HOLD</span>
                <small>[F10]</small>
              </button>
              <button type="button" className="bf-action bf-action--void" onClick={handleNewBill}>
                <span><FiXCircle /> VOID / NEW</span>
                <small>[F9]</small>
              </button>
            </div>

            <div className="bf-summary">
              {returnCredit && (
                <div className="bf-sum bf-sum--green">
                  <span>
                    Return credit
                    <small>
                      {returnCredit.code}
                      {Number(returnCredit.remainingAmount) > returnCreditApplied &&
                        ` · ${formatCurrency(Number(returnCredit.remainingAmount) - returnCreditApplied)} remains`}
                    </small>
                  </span>
                  <span>
                    <strong>-{rupees(returnCreditApplied)}</strong>{" "}
                    <button
                      type="button"
                      className="bf-link"
                      onClick={() => setReturnCredit(null)}
                      disabled={loadingReturnCredit}
                      aria-label="Remove return credit"
                    >
                      REMOVE
                    </button>
                  </span>
                </div>
              )}
              <div className="bf-sum"><span>Subtotal (taxable):</span><strong>{rupees(totals.subtotal)}</strong></div>
              {hasPendingQuickSaleItems && (
                <div className="bf-sum bf-sum--warning">
                  <span>Quick Sale · GST pending:</span>
                  <strong>{rupees(quickSalePendingAmount)}</strong>
                </div>
              )}
              {itemDiscount > 0 && (
                <div className="bf-sum bf-sum--green"><span>Item discounts (applied):</span><strong>{rupees(itemDiscount)}</strong></div>
              )}
              {globalDiscount > 0 && (
                <div className="bf-sum bf-sum--green"><span>Bill discount:</span><strong>-{rupees(globalDiscount)}</strong></div>
              )}
              <div className="bf-sum bf-sum--tint">
                <span>
                  GST
                  <small>CGST {rupees(cgstHalf)} + SGST {rupees(sgstHalf)}</small>
                </span>
                <strong>{rupees(gstTotal)}</strong>
              </div>
              {roundOff !== 0 && (
                <div className="bf-sum">
                  <span>Total before round-off:</span>
                  <strong>{rupees(totals.afterGlobalDiscount)}</strong>
                </div>
              )}
              {roundOff !== 0 && (
                <div className="bf-sum">
                  <span>Round-off:</span>
                  <strong>{roundOff > 0 ? "+" : "-"}{rupees(Math.abs(roundOff))}</strong>
                </div>
              )}
              <div className="bf-savings">
                <span>TOTAL BILL SAVINGS</span>
                <span>{rupees(totalSavings)}</span>
              </div>
            </div>

            <div className="bf-net">
              <div className="bf-net__top">
                <span>{returnCreditApplied > 0 ? "AMOUNT DUE" : "NET PAYABLE AMOUNT"}</span>
                <span>{promotionPreviewLoading ? "CHECKING OFFERS…" : cart.length ? "AWAITING SETTLEMENT" : "EMPTY CART"}</span>
              </div>
              <div className="bf-net__amt">{rupees(payableTotal)}</div>
              <div className="bf-net__foot">
                {hasPendingQuickSaleItems
                  ? "GST classification pending on Quick Sale line(s)"
                  : "INCLUSIVE OF ALL STATE &amp; FEDERAL TAXES"}
              </div>
            </div>
            <button
              type="button"
              className="bf-paybtn"
              onClick={() => setPaymentOpen(true)}
              disabled={cart.length === 0 || loadingReturnCredit || promotionPreviewLoading}
            >
              PROCEED TO PAY <Kbd>F8</Kbd> <FiArrowRight />
            </button>
          </aside>
        </div>

        {/* ═══ BOTTOM STATUS BAR ═══ */}
        <div className="bf-statusbar">
          <div className={`bf-dev ${scannerEnabled ? "" : "is-off"}`}><b>SCANNER</b><span>{scannerEnabled ? "Enabled" : "Disabled"}</span></div>
          <div className={`bf-dev ${cameraEnabled ? "" : "is-off"}`}><b>CAMERA</b><span>{cameraEnabled ? "Enabled" : "Disabled"}</span></div>
          <div className="bf-dev"><b>PRINTER</b><span>Thermal {printerWidth || "80"}mm{autoPrint ? " · auto" : ""}</span></div>
          <span className="bf-spacer" />
          <span className="bf-cart__sub">Status reflects POS settings</span>
        </div>

        {/* ═══ START SHIFT ═══ */}
        <POSStartShiftModal
          open={shiftModalOpen}
          onClose={() => setShiftModalOpen(false)}
          onStart={handleStartShift}
          submitting={shiftSubmitting}
          operatorName={cashierName}
          operatorId={billingUser?.id}
          counters={assignedCounters}
          countersLoading={countersLoading}
          countersError={countersError}
          selectedCounterId={selectedCounterId}
          onCounterChange={setSelectedCounterId}
        />

        {/* ═══ CLOSE SHIFT ═══ */}
        <POSCloseShiftModal
          open={shiftCloseModal && !!activeShift}
          shift={closeSnapshot || activeShift}
          refreshing={closeRefreshing}
          onClose={() => setShiftCloseModal(false)}
          onConfirm={handleEndShift}
          submitting={shiftSubmitting}
          operatorName={activeShift?.user?.name || cashierName}
          operatorId={activeShift?.userId ?? billingUser?.id}
        />

        {/* ═══ HELD CARTS DRAWER ═══ */}
        {holdDrawerOpen && (
          <div
            className="bf-drawer"
            onClick={(e) => {
              if (e.target === e.currentTarget) setHoldDrawerOpen(false);
            }}
          >
            <div className="bf-drawer__panel">
              <div className="bf-drawer__head">
                <h3>HELD CARTS ({holdCarts.length})</h3>
                <button onClick={() => setHoldDrawerOpen(false)}>✕</button>
              </div>
              <div className="bf-drawer__body">
                {holdCarts.length === 0 ? (
                  <div className="bf-empty">
                    No held sales found
                  </div>
                ) : (
                  holdCarts.map((h) => {
                    const items = Array.isArray(h.cartData) ? h.cartData : [];
                    return (
                      <div key={h.id} className="bf-held">
                        <div className="bf-held__top">
                          <div>
                            <strong>
                              {h.customerName || "Walk-in Customer"}
                            </strong>
                            <div>
                              {h.holdNumber} · {items.length} items
                            </div>
                          </div>
                          <div className="bf-total">
                            {formatCurrency(h.totalAmount || 0)}
                          </div>
                        </div>
                        <div className="bf-held__row">
                          <button
                            className="bf-btn bf-btn--blue"
                            onClick={() => handleResumeCart(h.id)}
                          >
                            Resume
                          </button>
                          <button
                            className="bf-btn"
                            onClick={() => {
                              cancelHoldCart(h.id);
                              toast.success("Held cart cancelled");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
