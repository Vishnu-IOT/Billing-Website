/* ===== PRODUCTS MODULE ===== */
import React, { useState, useMemo, useEffect } from "react";
import DateInput from "../../components/shared/DateInput";
import useAppStore from "../../store/appStore";
import {
  Button,
  Modal,
  ConfirmModal,
  EmptyState,
  Badge,
  Pagination,
  ToastContainer,
} from "../../components/ui";
import { usePagination } from "../../hooks/usePagination";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../hooks/useToast";
import { formatCurrency } from "../../utils/currency";
import {
  calculateProfitMargin,
  formatProfitAmount,
  formatProfitMargin,
} from "../../utils/profitMargin";
import {
  PRICE_TYPE,
  PRICE_TYPE_OPTIONS,
  GST_RATES,
  normalizePriceType,
  priceTypeLabel,
  readAmount,
  splitGstPrice,
  round2,
} from "../../utils/gstPricing";
import "../../styles/products.css";
import useSalesStore from "../../store/salesStore";
import usePurchaseStore from "../../store/purchaseStore";
import BrandManagerModal from "../../components/shared/BrandManagerModal";
import ProductVariantModal from "../../components/shared/ProductVariantModal";
import { MdOutlineEdit } from "react-icons/md";
import SearchableOptionSelect from "../../components/shared/SearchableOptionSelect";
import {
  formatQuantity,
  isWeightProduct,
  normalizeWeightQuantity,
} from "../../utils/quantityUnits";
import { matchesProductSearch } from "../../utils/productSearch";

const EMPTY_FORM = {
  name: "",
  SKU: "",
  barcode: "",
  HSNCode: "",
  MRP: "",
  salesPrice: "",
  purchasePrice: "",
  purchasePriceType: PRICE_TYPE.WITH_GST,
  sellingPriceType: PRICE_TYPE.WITH_GST,
  discount: 0,
  taxRate: "",
  categoryId: "",
  stockQuantity: 0,
  unbatchedAcquisitionCost: "",
  stockUnit: "PCS",
  unitType: "PIECE",
  baseUnit: "PCS",
  allowDecimalQuantity: false,
  minStockLevel: 5,
  unit: "pcs",
  sku: "",
  batchNo: "",
  expiryDate: "",
  serialNo: "",
};

// Clamp any discount value to a safe 0-100 number.
function clampDiscount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
}

// Calculates the Sales Price (as it must be ENTERED for the current price mode)
// from a target Profit Margin %, using the values of `data` (a form-like object).
//   discountedSellBase = purchaseBase / (1 - margin/100)
//   sellBase (before discount) = discountedSellBase / (1 - discount/100)
//   entered price = sellBase (+ GST when the mode is "With GST")
// Returns a string, or null when it cannot be calculated yet.
function computeSalesPriceFromMargin(data, marginText) {
  if (marginText === "" || marginText === null || marginText === undefined) {
    return null;
  }
  const pct = Number(marginText);
  if (!Number.isFinite(pct) || pct >= 100) return null;

  const rate = readAmount(data.taxRate);
  if (rate === null) return null;

  const purchase = splitGstPrice(
    data.purchasePrice,
    data.purchasePriceType,
    data.taxRate,
  );
  if (!purchase) return null;

  const discountFactor = 1 - clampDiscount(data.discount) / 100;
  if (discountFactor <= 0) return null;

  const discountedSellBase = purchase.base / (1 - pct / 100);
  const sellBase = discountedSellBase / discountFactor;
  const entered =
    normalizePriceType(data.sellingPriceType) === PRICE_TYPE.WITH_GST
      ? sellBase * (1 + rate / 100)
      : sellBase;

  return String(round2(entered));
}

// Small "Taxable + GST = Total" line under a price field (live preview).
function PriceGstHint({ price, preview, taxRate }) {
  if (readAmount(price) === null) return null;
  if (!preview) {
    return taxRate === "" ? (
      <span className="price-gst-hint">
        Select GST % to see the GST breakup
      </span>
    ) : null;
  }
  return (
    <span className="price-gst-hint">
      Taxable {formatCurrency(preview.base)} + GST {formatCurrency(preview.gst)}{" "}
      = {formatCurrency(preview.total)}
    </span>
  );
}

export default function Products({
  embeddedCreate = false,
  initialValues,
  onProductCreated,
  onClose,
} = {}) {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const brands = useAppStore((s) => s.brands);
  const addProduct = useAppStore((s) => s.addProduct);
  const addCategory = useAppStore((s) => s.addCategory);
  const addBrand = useAppStore((s) => s.addBrand);
  const refreshCategories = useAppStore((s) => s.refreshCategories);
  const refreshBrands = useAppStore((s) => s.refreshBrands);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const loadAllSalesBills = useSalesStore((s) => s.loadAllBills);
  const saleBills = useSalesStore((s) => s.saleBills);
  const loadAllPurchaseBills = usePurchaseStore((s) => s.loadAllBills);
  const purchaseBills = usePurchaseStore((s) => s.purchaseBills);
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(embeddedCreate);
  const [deleteId, setDeleteId] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(embeddedCreate ? initialValues || {} : {}),
    ...(embeddedCreate ? { stockQuantity: 0 } : {}),
  }));
  const [saving, setSaving] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [quickBrandModalOpen, setQuickBrandModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [quickCreateError, setQuickCreateError] = useState("");
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);

  const [logoPreview, setLogoPreview] = useState(null);

  const [txnPage, setTxnPage] = useState(1);
  const TXN_ITEMS_PER_PAGE = 5;

  const debouncedSearch = useDebounce(search, 250);

  // GST preview of each entered price (taxable base / GST / total) using the
  // product's selected GST rate. Preview only - the backend stores the real values.
  const purchasePreview = useMemo(
    () =>
      splitGstPrice(form.purchasePrice, form.purchasePriceType, form.taxRate),
    [form.purchasePrice, form.purchasePriceType, form.taxRate],
  );
  const sellingPreview = useMemo(
    () => splitGstPrice(form.salesPrice, form.sellingPriceType, form.taxRate),
    [form.salesPrice, form.sellingPriceType, form.taxRate],
  );

  const discountAmount = useMemo(() => {
    const salesPrice = Number(form.salesPrice) || 0;
    const discount = Number(form.discount) || 0;

    return Number(((salesPrice * discount) / 100).toFixed(2));
  }, [form.salesPrice, form.discount]);

  const finalSellingPrice = useMemo(() => {
    const salesPrice = Number(form.salesPrice) || 0;
    return Number((salesPrice - discountAmount).toFixed(2));
  }, [form.salesPrice, discountAmount]);

  const profitAmount = useMemo(() => {
    const purchasePrice = Number(form.purchasePrice) || 0;

    return Number((finalSellingPrice - purchasePrice).toFixed(2));
  }, [finalSellingPrice, form.purchasePrice]);

  const profitMargin = useMemo(() => {
    const purchasePrice = Number(form.purchasePrice) || 0;

    if (purchasePrice <= 0) return 0;

    return Number(((profitAmount / purchasePrice) * 100).toFixed(2));
  }, [profitAmount, form.purchasePrice]);

  // Product discount (%) used for the profit / margin figures.
  const discountPct = useMemo(
    () => clampDiscount(form.discount),
    [form.discount],
  );

  // GST-exclusive selling base AFTER the product discount. Profit and profit
  // margin are measured on this value, not on the undiscounted selling price.
  const discountedSellingBase = useMemo(() => {
    if (!sellingPreview) return null;
    return round2(sellingPreview.base * (1 - discountPct / 100));
  }, [sellingPreview, discountPct]);

  // Until a price, price mode, GST rate or discount is changed, an existing
  // product shows the profit values the backend saved (only when it has no
  // discount, because those saved values are before discount). After a change
  // they are previewed from the GST-exclusive base prices, with the product
  // discount applied to the selling base.
  const [pricingDirty, setPricingDirty] = useState(false);
  const margin = useMemo(() => {
    if (
      editProduct &&
      !pricingDirty &&
      discountPct === 0 &&
      editProduct.profitAmount !== undefined &&
      editProduct.profitAmount !== null
    ) {
      const profitAmount = Number(editProduct.profitAmount);
      const profitMargin =
        editProduct.profitMargin === undefined ||
        editProduct.profitMargin === null
          ? null
          : Number(editProduct.profitMargin);
      return {
        isReady: true,
        profitAmount,
        profitMargin,
        isLoss: profitAmount < 0,
        isZeroSelling: profitMargin === null,
      };
    }
    return calculateProfitMargin(
      purchasePreview ? purchasePreview.base : null,
      discountedSellingBase,
    );
  }, [
    editProduct,
    pricingDirty,
    discountPct,
    purchasePreview,
    discountedSellingBase,
  ]);

  // Profit Margin (%) is editable. `marginDraft` holds the margin the user typed.
  //  - While it is not null the MARGIN drives the Sales Price: any change to the
  //    purchase price, GST %, price modes or product discount recalculates the
  //    Sales Price so the typed margin still holds.
  //  - Typing a Sales Price yourself clears it, and the margin is then calculated
  //    from the Sales Price (after the product discount).
  const [marginDraft, setMarginDraft] = useState(null);
  const marginValue =
    marginDraft !== null
      ? marginDraft
      : margin.isReady && margin.profitMargin !== null
        ? String(margin.profitMargin)
        : "";
  const [finalSellingPriceDraft, setFinalSellingPriceDraft] = useState(null);
  const displayedFinalSellingPrice =
    finalSellingPriceDraft ??
    (form.salesPrice === "" ? "" : finalSellingPrice);

  // Any price / price-mode / GST-rate / discount edit (they all feed the profit figures)
  function handlePriceChange(field, value) {
    setFinalSellingPriceDraft(null);
    const next = { ...form, [field]: value };

    if (field === "salesPrice") {
      // Sales Price typed by the user -> it drives profit & margin again.
      setMarginDraft(null);
    } else if (marginDraft !== null) {
      // Margin is driving: recalculate the Sales Price for the new inputs and
      // keep the typed margin as it is.
      const recalculated = computeSalesPriceFromMargin(next, marginDraft);
      if (recalculated !== null) {
        next.salesPrice = recalculated;
      }
    } else {
      setMarginDraft(null);
    }

    setPricingDirty(true);
    setForm(next);
  }

  function handleFinalSellingPriceChange(value) {
    setFinalSellingPriceDraft(value);
    setMarginDraft(null);
    setPricingDirty(true);
    setFormErrors((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors.finalSellingPrice;
      return nextErrors;
    });

    if (value.trim() === "") {
      setFinalSellingPriceDraft(null);
      return;
    }

    const salesPrice = Number(form.salesPrice);
    const finalPrice = Number(value);
    if (!Number.isFinite(salesPrice) || salesPrice <= 0) {
      setFormErrors((errors) => ({
        ...errors,
        finalSellingPrice: "Enter a Sales Price before setting the final price",
      }));
      return;
    }
    if (!Number.isFinite(finalPrice) || finalPrice < 0) return;
    if (finalPrice > salesPrice) {
      setFormErrors((errors) => ({
        ...errors,
        finalSellingPrice: "Final Selling Price cannot exceed Sales Price",
      }));
      return;
    }

    const discount = salesPrice === 0
      ? 0
      : Number((((salesPrice - finalPrice) / salesPrice) * 100).toFixed(6));
    setForm((current) => ({ ...current, discount }));
    setPricingDirty(true);
  }

  // Typing a Profit Margin % calculates the Sales Price (after the product
  // discount, excl. GST). The Profit Amount then follows from that Sales Price.
  function handleMarginChange(value) {
    setFinalSellingPriceDraft(null);
    setMarginDraft(value);

    const recalculated = computeSalesPriceFromMargin(form, value);
    if (recalculated === null) {
      return; // need Purchase Price + GST % first, and margin below 100%
    }

    setPricingDirty(true);
    setForm((f) => ({ ...f, salesPrice: recalculated }));
  }

  // Load lifetime sales and purchase records on mount
  useEffect(() => {
    if (!embeddedCreate) {
      loadAllSalesBills();
      loadAllPurchaseBills();
    }
    refreshCategories().catch((error) => {
      toast.error(error.message || "Failed to load categories");
    });
    refreshBrands().catch((error) => {
      toast.error(error.message || "Failed to load brands");
    });
  }, [
    embeddedCreate,
    loadAllSalesBills,
    loadAllPurchaseBills,
    refreshCategories,
    refreshBrands,
    toast.error,
  ]);

  const brandNamesById = useMemo(
    () =>
      new Map(
        brands.map((brand) => [
          String(brand.id || brand._id),
          brand.name || brand.brand || "",
        ]),
      ),
    [brands],
  );
  const categoryNamesById = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          String(category.id || category._id),
          category.category || category.name || "",
        ]),
      ),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      matchesProductSearch(product, debouncedSearch, [
        brandNamesById.get(String(product.brandId)),
        categoryNamesById.get(String(product.categoryId)),
      ]),
    );
  }, [products, debouncedSearch, brandNamesById, categoryNamesById]);

  // Auto-select first product if none active
  useEffect(() => {
    if (filteredProducts.length > 0 && !activeProduct) {
      setActiveProduct(filteredProducts[0]);
    }
  }, [filteredProducts, activeProduct]);

  function openAdd() {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setMarginDraft(null);
    setFinalSellingPriceDraft(null);
    setPricingDirty(false);
    setModalOpen(true);
  }

  function closeProductForm() {
    setModalOpen(false);
    setFormErrors({});
    if (embeddedCreate) onClose?.();
  }

  async function saveQuickCategory(event) {
    event.preventDefault();
    if (quickCreateSaving) return;
    const name = categoryName.trim();
    if (!name) {
      setQuickCreateError("Category name is required");
      return;
    }
    if (
      categories.some(
        (category) =>
          String(category.category || category.name || "")
            .trim()
            .toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setQuickCreateError("A category with this name already exists");
      return;
    }
    setQuickCreateSaving(true);
    setQuickCreateError("");
    try {
      const created = await addCategory({ category: name });
      const id = created?.id || created?._id;
      if (!id) throw new Error("Category was created but its ID was not returned");
      setForm((current) => ({ ...current, categoryId: id }));
      setCategoryModalOpen(false);
      setCategoryName("");
      toast.success("Category added and selected");
    } catch (error) {
      setQuickCreateError(error.message || "Failed to create category");
    } finally {
      setQuickCreateSaving(false);
    }
  }

  async function saveQuickBrand(event) {
    event.preventDefault();
    if (quickCreateSaving) return;
    const name = brandName.trim();
    if (!name) {
      setQuickCreateError("Brand name is required");
      return;
    }
    if (
      brands.some(
        (brand) =>
          String(brand.name || "").trim().toLocaleLowerCase() ===
          name.toLocaleLowerCase(),
      )
    ) {
      setQuickCreateError("A brand with this name already exists");
      return;
    }
    setQuickCreateSaving(true);
    setQuickCreateError("");
    try {
      const created = await addBrand({ name });
      const id = created?.id || created?._id;
      if (!id) throw new Error("Brand was created but its ID was not returned");
      setForm((current) => ({ ...current, brandId: id }));
      setQuickBrandModalOpen(false);
      setBrandName("");
      toast.success("Brand added and selected");
    } catch (error) {
      setQuickCreateError(error.message || "Failed to create brand");
    } finally {
      setQuickCreateSaving(false);
    }
  }

  function openEdit(prod) {
    setEditProduct(prod);
    setFinalSellingPriceDraft(null);
    setForm({
      ...EMPTY_FORM,
      ...prod,
      unitType: isWeightProduct(prod) ? "WEIGHT" : "PIECE",
      baseUnit: prod.baseUnit || (isWeightProduct(prod) ? "KG" : "PCS"),
      allowDecimalQuantity: prod.allowDecimalQuantity ?? isWeightProduct(prod),
      stockUnit: prod.stockUnit || (isWeightProduct(prod) ? "KG" : "PCS"),
      categoryId: prod.categoryId || prod.category,
      // The API calls it sellingPrice; this form keeps using the salesPrice key.
      salesPrice: prod.sellingPrice ?? prod.salesPrice ?? "",
      purchasePriceType: normalizePriceType(prod.purchasePriceType),
      sellingPriceType: normalizePriceType(prod.sellingPriceType),
      taxRate:
        prod.taxRate === undefined || prod.taxRate === null
          ? ""
          : String(prod.taxRate),
      discount: prod.discount ?? 0,
    });
    setMarginDraft(null);
    setPricingDirty(false);
    setModalOpen(true);
  }

  function validateForm() {
    const errors = {};
    // Product Name
    if (!form.name.trim()) {
      errors.name = "Product name is required";
    }
    // HSN Code is optional, but validate its format when provided.
    const hsnLength = form.HSNCode.trim().length;
    if (
      hsnLength > 0 &&
      hsnLength !== 2 &&
      hsnLength !== 4 &&
      hsnLength !== 6 &&
      hsnLength !== 8
    ) {
      errors.HSNCode = "HSN Code must contain 2, 4, 6, or 8 digits";
    }

    if (!form.barcode) {
      errors.barcode = "Barcode is required";
    }
    // Purchase Price
    if (form.purchasePrice === "" || Number(form.purchasePrice) <= 0) {
      errors.purchasePrice = "Purchase price must be greater than 0";
    }
    // Sales Price
    if (form.salesPrice === "" || Number(form.salesPrice) <= 0) {
      errors.salesPrice = "Sales price must be greater than 0";
    }
    if (
      form.discount === "" ||
      !Number.isFinite(Number(form.discount)) ||
      Number(form.discount) < 0 ||
      Number(form.discount) > 100
    ) {
      errors.discount = "Discount must be between 0 and 100%";
    }
    if (finalSellingPriceDraft !== null && finalSellingPriceDraft !== "") {
      const finalPrice = Number(finalSellingPriceDraft);
      const salesPrice = Number(form.salesPrice);
      if (!Number.isFinite(finalPrice) || finalPrice < 0) {
        errors.finalSellingPrice = "Enter a valid non-negative final price";
      } else if (salesPrice <= 0) {
        errors.finalSellingPrice = "Enter a Sales Price before setting the final price";
      } else if (finalPrice > salesPrice) {
        errors.finalSellingPrice = "Final Selling Price cannot exceed Sales Price";
      }
    }
    // MRP
    if (form.MRP === "" || Number(form.MRP) <= 0) {
      errors.MRP = "MRP must be greater than 0";
    }
    // Tax Rate
    if (form.taxRate === "") {
      errors.taxRate = "Tax rate is required";
    } else if (!GST_RATES.includes(String(form.taxRate))) {
      errors.taxRate = "Select a valid GST rate (0, 5, 12, 18 or 28%)";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Optional validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Show selected image immediately
    const imageUrl = URL.createObjectURL(file);
    setLogoPreview(imageUrl);

    // Keep the file if you want to upload it to backend later
    // setLogoFile(file);
  };

  // Builds the request body, following GST-PRICING-API.md:
  //   purchasePrice, purchasePriceType, sellingPrice, sellingPriceType, taxRate
  // - The form keeps its price in `salesPrice`; the API input is `sellingPrice`.
  // - Values the backend calculates (base / GST amounts, gstRate, profitAmount,
  //   profitMargin) are never sent back: the backend recomputes and ignores them.
  function buildProductPayload() {
    const {
      /* eslint-disable no-unused-vars */
      salesPrice,
      unitType,
      baseUnit,
      allowDecimalQuantity,
      stockUnit,
      unbatchedAcquisitionCost,
      calculatedProfit,
      profit,
      profitAmount,
      profitMargin,
      purchaseBasePrice,
      purchaseGSTAmount,
      sellingBasePrice,
      sellingGSTAmount,
      gstRate,
      /* eslint-enable no-unused-vars */
      ...rest
    } = form;
    return {
      ...rest,
      purchasePrice: form.purchasePrice,
      purchasePriceType: normalizePriceType(form.purchasePriceType),
      sellingPrice: form.salesPrice,
      sellingPriceType: normalizePriceType(form.sellingPriceType),
      discount: Number(form.discount),
      taxRate: String(form.taxRate),
      unitType: unitType === "WEIGHT" ? "WEIGHT" : "PIECE",
      baseUnit: baseUnit || (unitType === "WEIGHT" ? "KG" : "PCS"),
      allowDecimalQuantity: Boolean(allowDecimalQuantity),
      ...(!editProduct &&
        unitType === "WEIGHT" &&
        form.stockQuantity !== "" && {
          stockUnit: stockUnit || "KG",
        }),
      ...(embeddedCreate && { stockQuantity: 0 }),
      ...(editProduct &&
        unbatchedAcquisitionCost !== "" && {
          unbatchedAcquisitionCost: Number(unbatchedAcquisitionCost),
        }),
    };
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload = buildProductPayload();

      if (editProduct) {
        const id = editProduct.id || editProduct._id;

        await updateProduct(id, payload);

        toast.success("Product Updated Successfully!");

        // Show the backend-recalculated values (base prices, GST, margin)
        const refreshed = useAppStore
          .getState()
          .products.find((p) => String(p.id || p._id) === String(id));
        setActiveProduct(refreshed || { ...editProduct, ...form });

        // Close modal after editing
        setModalOpen(false);
      } else {
        const createdResponse = await addProduct(payload);

        if (embeddedCreate) {
          const createdProduct =
            createdResponse?.data?.product ??
            createdResponse?.data?.data ??
            createdResponse?.data ??
            createdResponse;
          if (!createdProduct?.id && !createdProduct?._id) {
            throw new Error("Product was created but its details were not returned");
          }
          await onProductCreated?.(createdProduct);
          closeProductForm();
          return;
        }

        toast.success("Product Added Successfully!");

        // Reset form for the next product
        setForm({ ...EMPTY_FORM });
        setMarginDraft(null);
        setFinalSellingPriceDraft(null);
        setPricingDirty(false);
        setEditProduct(null);
        setLogoPreview(null);
        setFormErrors({});

        // Keep modal open for adding another product
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Product save error:", error);
      toast.error(error?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteProduct(deleteId);
      toast.success("Product Deleted Successfully!");
      setActiveProduct(null);
    } catch (error) {
      console.error("Product delete error:", error);
      toast.error(error?.message || "Failed to delete product");
    } finally {
      setDeleteId(null);
    }
  }

  // Profit (excl. GST) of the selected product AFTER its product discount:
  // discounted selling base = sellingBasePrice * (1 - discount/100),
  // profit = discounted selling base - purchaseBasePrice.
  const activeProfit = useMemo(() => {
    if (!activeProduct) return null;
    const sellBase = activeProduct.sellingBasePrice;
    const purBase = activeProduct.purchaseBasePrice;
    if (
      sellBase === undefined ||
      sellBase === null ||
      purBase === undefined ||
      purBase === null
    ) {
      return null;
    }
    const d = clampDiscount(activeProduct.discount);
    return calculateProfitMargin(
      Number(purBase),
      round2(Number(sellBase) * (1 - d / 100)),
    );
  }, [activeProduct]);

  // Aggregate stats (Total Purchase Qty, Total Sales Qty, Purchase Amt, Sales Amt, Margins/Profit)
  const productMetrics = useMemo(() => {
    if (!activeProduct) return null;
    const pId = activeProduct.id || activeProduct._id;

    let totalSalesQty = 0;
    let totalSalesAmt = 0;
    let totalSalesBase = 0; // taxable value (GST-exclusive), backend baseRate
    (saleBills || []).forEach((bill) => {
      const matchingItems = (bill.SalesItems || []).filter(
        (item) => String(item.productId) === String(pId),
      );
      matchingItems.forEach((item) => {
        totalSalesQty += Number(item.quantity || 0);
        const lineTotal = Number(
          item.netRate || item.total || item.price * item.quantity || 0,
        );
        totalSalesAmt += lineTotal;
        totalSalesBase += Number(item.baseRate ?? lineTotal);
      });
    });

    let totalPurchaseQty = 0;
    let totalPurchaseAmt = 0;
    (purchaseBills || []).forEach((bill) => {
      const matchingItems = (bill.PurchaseItems || []).filter(
        (item) => String(item.productId) === String(pId),
      );
      matchingItems.forEach((item) => {
        totalPurchaseQty += Number(item.quantity || 0);
        totalPurchaseAmt += Number(
          item.netRate || item.total || item.price * item.quantity || 0,
        );
      });
    });

    const purchasePrice = Number(activeProduct.purchasePrice || 0);
    // Profit is measured on GST-exclusive values: taxable sales value minus the
    // purchase base price (backend purchaseBasePrice) for the quantity sold.
    const purchaseBase = Number(
      activeProduct.purchaseBasePrice ?? activeProduct.purchasePrice ?? 0,
    );
    const profit = totalSalesBase - totalSalesQty * purchaseBase;

    return {
      totalSalesQty,
      totalSalesAmt,
      totalSalesBase,
      totalPurchaseQty,
      totalPurchaseAmt,
      purchaseRate: purchasePrice,
      salesRate: Number(
        activeProduct.sellingPrice ?? activeProduct.salesPrice ?? 0,
      ),
      profit,
    };
  }, [activeProduct, saleBills, purchaseBills]);

  // Combined Sales and Purchase Transaction History Table
  const combinedTransactions = useMemo(() => {
    if (!activeProduct) return [];
    const pId = activeProduct.id || activeProduct._id;
    const txns = [];

    // Gather Sales
    (saleBills || []).forEach((bill) => {
      const matchingItems = (bill.SalesItems || []).filter(
        (item) => String(item.productId) === String(pId),
      );
      if (matchingItems.length > 0) {
        const qtySold = matchingItems.reduce(
          (sum, i) => sum + Number(i.quantity || 0),
          0,
        );
        const totalAmt = matchingItems.reduce(
          (sum, i) =>
            sum + Number(i.netRate || i.total || i.price * i.quantity || 0),
          0,
        );
        const rate = matchingItems[0]?.price || activeProduct.salesPrice || 0;
        const partyName = bill.name || bill.Party?.name || "Walk-in Customer";

        txns.push({
          id: `sale-${bill.id || bill._id}-${matchingItems[0]?.id || 0}`,
          invoiceNo: bill.invoiceNumber || bill.invoiceNo || "—",
          billType: "Sales",
          partyName,
          quantity: qtySold,
          rate,
          totalAmount: totalAmt,
          date: bill.saleDate || bill.date || "—",
          timestamp: new Date(bill.saleDate || bill.date).getTime(),
        });
      }
    });

    // Gather Purchases
    (purchaseBills || []).forEach((bill) => {
      const matchingItems = (bill.PurchaseItems || []).filter(
        (item) => String(item.productId) === String(pId),
      );
      if (matchingItems.length > 0) {
        const qtyPur = matchingItems.reduce(
          (sum, i) => sum + Number(i.quantity || 0),
          0,
        );
        const totalAmt = matchingItems.reduce(
          (sum, i) =>
            sum + Number(i.netRate || i.total || i.price * i.quantity || 0),
          0,
        );
        const rate =
          matchingItems[0]?.price || activeProduct.purchasePrice || 0;
        const partyName = bill.Party?.name || "Supplier";

        txns.push({
          id: `purchase-${bill.id || bill._id}-${matchingItems[0]?.id || 0}`,
          invoiceNo: bill.invoiceNumber || bill.invoiceNo || "—",
          billType: "Purchase",
          partyName,
          quantity: qtyPur,
          rate,
          totalAmount: totalAmt,
          date: bill.purchaseDate || bill.date || "—",
          timestamp: new Date(bill.purchaseDate || bill.date).getTime(),
        });
      }
    });

    // Sort chronologically, descending
    return txns.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeProduct, saleBills, purchaseBills]);

  // Paginated transactions for active product
  const paginatedTransactions = useMemo(() => {
    const start = (txnPage - 1) * TXN_ITEMS_PER_PAGE;
    return combinedTransactions.slice(start, start + TXN_ITEMS_PER_PAGE);
  }, [combinedTransactions, txnPage]);

  const totalTxnPages = Math.ceil(
    combinedTransactions.length / TXN_ITEMS_PER_PAGE,
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "var(--sp-4)",
      }}
    >
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product?"
      />

      {/* Brand Manager Modal */}
      <BrandManagerModal
        open={brandModalOpen}
        onClose={() => {
          setBrandModalOpen(false);
          refreshBrands();
        }}
      />

      {/* Product Variant Manager Modal */}
      <ProductVariantModal
        open={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        product={activeProduct}
      />

      <Modal
        open={modalOpen}
        onClose={closeProductForm}
        title={embeddedCreate ? "Create Product for Purchase" : editProduct ? "Edit Product" : "Add Product"}
        size="xlg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeProductForm}
            >
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save Product
            </Button>
          </>
        }
      >
        <div className="form-grid-4">
          <div className="com-pro-form-img">
            <img
              src={logoPreview || "/mps.png"}
              alt="LOGO"
              className="company-logo"
            />

            <label htmlFor="logo-upload" className="logo-edit-btn">
              <MdOutlineEdit />
            </label>

            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              hidden
            />
          </div>
          <div className="form-col-full form-group">
            <label className="form-label">
              Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="Enter Product Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {formErrors.name && (
              <span className="um-error-text">{formErrors.name}</span>
            )}
          </div>
          <div className="form-group form-col-fulls">
            <label className="form-label">
              Barcode <span style={{ color: "red" }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="Enter Barcode"
              value={form.barcode}
              onChange={(e) =>
                setForm((f) => ({ ...f, barcode: e.target.value }))
              }
            />
            {formErrors.barcode && (
              <span className="um-error-text">{formErrors.barcode}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              HSN Code <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
            </label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="Enter HSN Code (optional)"
              value={form.HSNCode}
              onChange={(e) => {
                const value = e.target.value;

                // Allow only numbers and max 8 digits
                if (/^\d{0,8}$/.test(value)) {
                  setForm((f) => ({
                    ...f,
                    HSNCode: value,
                  }));
                }
              }}
            />
            {formErrors.HSNCode && (
              <span className="um-error-text">{formErrors.HSNCode}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">SKU Code</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter SKU Code"
              value={form.sku || ""}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label">Category</label>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setCategoryName("");
                  setQuickCreateError("");
                  setCategoryModalOpen(true);
                }}
              >
                + Add Category
              </button>
            </div>
            <SearchableOptionSelect
              options={categories.map((category) => ({
                value: category.id || category._id,
                label: category.category || category.name || "",
              }))}
              value={form.categoryId}
              onChange={(categoryId) =>
                setForm((current) => ({ ...current, categoryId }))
              }
              placeholder="None"
              searchPlaceholder="Search categories..."
              emptyMessage="No matching categories found."
            />
            {formErrors.categoryId && (
              <span className="um-error-text">{formErrors.categoryId}</span>
            )}
          </div>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label">Brand</label>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setBrandName("");
                  setQuickCreateError("");
                  setQuickBrandModalOpen(true);
                }}
              >
                + Add Brand
              </button>
            </div>
            <SearchableOptionSelect
              options={[
                { value: "", label: "No Brand" },
                ...brands.map((brand) => ({
                  value: brand.id || brand._id,
                  label: brand.name || "",
                })),
              ]}
              value={form.brandId || ""}
              onChange={(brandId) =>
                setForm((current) => ({ ...current, brandId: brandId || null }))
              }
              placeholder="No Brand"
              searchPlaceholder="Search brands..."
              emptyMessage="No matching brands found."
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              GST % <span style={{ color: "red" }}>*</span>
            </label>
            <select
              className="form-select"
              value={form.taxRate}
              onChange={(e) => handlePriceChange("taxRate", e.target.value)}
            >
              <option value="">Select GST %</option>
              {GST_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
            {formErrors.taxRate && (
              <span className="um-error-text">{formErrors.taxRate}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              MRP (₹) <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              placeholder="Enter MRP"
              value={form.MRP}
              onChange={(e) => setForm((f) => ({ ...f, MRP: e.target.value }))}
            />
            {formErrors.MRP && (
              <span className="um-error-text">{formErrors.MRP}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              Purchase Price (₹) <span style={{ color: "red" }}>*</span>
            </label>
            <div className="price-input-group">
              <input
                type="number"
                className="form-input"
                onWheel={(e) => e.target.blur()}
                placeholder="Enter Purchase Price"
                value={form.purchasePrice}
                onChange={(e) =>
                  handlePriceChange("purchasePrice", e.target.value)
                }
              />
              <select
                className="form-select price-input-group__mode"
                aria-label="Purchase price GST mode"
                value={normalizePriceType(form.purchasePriceType)}
                onChange={(e) =>
                  handlePriceChange("purchasePriceType", e.target.value)
                }
              >
                {PRICE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <PriceGstHint
              price={form.purchasePrice}
              preview={purchasePreview}
              taxRate={form.taxRate}
            />
            {formErrors.purchasePrice && (
              <span className="um-error-text">{formErrors.purchasePrice}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Sales Price (₹) <span style={{ color: "red" }}>*</span>
            </label>
            <div className="price-input-group">
              <input
                type="number"
                className="form-input"
                onWheel={(e) => e.target.blur()}
                placeholder="Enter Sales Price"
                value={form.salesPrice}
                onChange={(e) =>
                  handlePriceChange("salesPrice", e.target.value)
                }
              />
              <select
                className="form-select price-input-group__mode"
                aria-label="Selling price GST mode"
                value={normalizePriceType(form.sellingPriceType)}
                onChange={(e) =>
                  handlePriceChange("sellingPriceType", e.target.value)
                }
              >
                {PRICE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <PriceGstHint
              price={form.salesPrice}
              preview={sellingPreview}
              taxRate={form.taxRate}
            />
            <span className="price-gst-hint">
              Sales Price is before the product discount.
            </span>
            {formErrors.salesPrice && (
              <span className="um-error-text">{formErrors.salesPrice}</span>
            )}
          </div>
          {/* Profit Margin — same field style as Sales / Purchase Price */}
          <div className="form-group">
            <label className="form-label" htmlFor="pm-profit-margin">
              Profit Margin (%) <small>(after discount, excl. GST)</small>
            </label>
            <input
              id="pm-profit-margin"
              type="number"
              step="0.01"
              className={`form-input ${
                margin.isReady && margin.isLoss ? "pm-loss" : ""
              }`}
              onWheel={(e) => e.target.blur()}
              placeholder={
                margin.isReady && margin.isZeroSelling
                  ? "N/A (Sales Price is 0)"
                  : "Enter Margin %"
              }
              value={marginValue}
              onChange={(e) => handleMarginChange(e.target.value)}
            />
            {Number(marginValue) >= 100 && marginValue !== "" && (
              <span className="um-error-text">
                Margin must be below 100% (it is calculated on the discounted
                Sales Price)
              </span>
            )}
            {margin.isReady && margin.isLoss && !margin.isZeroSelling && (
              <span className="um-error-text">
                Sales Price after discount is below Purchase Price (loss)
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pm-profit-amount">
              Profit Amount (₹) <small>(after discount, excl. GST)</small>
            </label>
            <input
              id="pm-profit-amount"
              type="text"
              readOnly
              tabIndex={-1}
              className={`form-input pm-readonly ${
                margin.isReady ? (margin.isLoss ? "pm-loss" : "pm-profit") : ""
              }`}
              placeholder="Auto calculated"
              value={
                margin.isReady ? formatProfitAmount(margin.profitAmount) : ""
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="product-discount">
              Product Discount (%)
            </label>
            <input
              id="product-discount"
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              placeholder="0"
              value={form.discount ?? 0}
              onChange={(e) => handlePriceChange("discount", e.target.value)}
            />
            <span className="price-gst-hint">
              Applied automatically when this product is added to a bill.
            </span>
            {formErrors.discount && (
              <span className="um-error-text">{formErrors.discount}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Discount Amount (₹)</label>
            <input
              type="text"
              className="form-input"
              value={formatCurrency(discountAmount)}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Final Selling Price (₹)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              placeholder="Enter Final Selling Price"
              value={displayedFinalSellingPrice}
              onChange={(e) => handleFinalSellingPriceChange(e.target.value)}
            />
            <PriceGstHint
              price={displayedFinalSellingPrice}
              preview={splitGstPrice(
                displayedFinalSellingPrice,
                form.sellingPriceType,
                form.taxRate,
              )}
              taxRate={form.taxRate}
            />
            <span className="price-gst-hint">
              Enter the price after discount; Sales Price above stays unchanged
              and the product discount is calculated from both prices.
            </span>
            {formErrors.finalSellingPrice && (
              <span className="um-error-text">
                {formErrors.finalSellingPrice}
              </span>
            )}
          </div>
        </div>
        <div className="form-para">
          <p>Inventory</p>
        </div>
        <div className="form-grid-4">
          <div className="form-group">
            <label className="form-label">Unit Type</label>
            <select
              className="form-select"
              value={form.unitType || "PIECE"}
              disabled={
                !!editProduct &&
                Number(editProduct.stockQuantity) > 0 &&
                form.unitType !==
                  (isWeightProduct(editProduct) ? "WEIGHT" : "PIECE")
              }
              onChange={(e) => {
                const unitType = e.target.value;
                setForm((current) => ({
                  ...current,
                  unitType,
                  baseUnit: unitType === "WEIGHT" ? "KG" : "PCS",
                  allowDecimalQuantity: unitType === "WEIGHT",
                  stockUnit: unitType === "WEIGHT" ? "KG" : "PCS",
                  stockQuantity: "0",
                }));
              }}
            >
              <option value="PIECE">Piece</option>
              <option value="WEIGHT">Weight</option>
            </select>
            {editProduct && Number(editProduct.stockQuantity) > 0 && (
              <span className="price-gst-hint">
                Unit type cannot be changed while stock exists. The backend also
                prevents changes when transaction history exists.
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Base Unit</label>
            <input
              className="form-input"
              value={form.baseUnit || "PCS"}
              readOnly
            />
          </div>
          <div className="form-group">
            <label className="form-label">Decimal Quantity</label>
            <input
              className="form-input"
              value={form.allowDecimalQuantity ? "Enabled" : "Disabled"}
              readOnly
            />
          </div>
        </div>
        <div className="form-grid-4">
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select
              className="form-select"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="L">Liters (L)</option>
              <option value="mL">Milliliters (mL)</option>
              <option value="box">Box</option>
              <option value="m">Meters (m)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Initial Stock (
              {form.unitType === "WEIGHT" ? form.stockUnit : "PCS"})
            </label>
            <input
              type="number"
              min="0"
              step={
                form.unitType !== "WEIGHT" || form.stockUnit === "GRAM"
                  ? "1"
                  : "0.001"
              }
              className="form-input"
              onWheel={(e) => e.target.blur()}
              value={form.stockQuantity}
              disabled={embeddedCreate}
              onChange={(e) =>
                setForm((f) => ({ ...f, stockQuantity: e.target.value }))
              }
            />
            {embeddedCreate && (
              <span className="price-gst-hint">
                Stock is received only when this purchase bill is saved.
              </span>
            )}
          </div>
          {editProduct &&
            Number(form.stockQuantity) > Number(editProduct.stockQuantity || 0) && (
              <div className="form-group">
                <label className="form-label">
                  Acquisition Cost for Added Unbatched Stock (₹/unit)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="form-input"
                  onWheel={(e) => e.target.blur()}
                  value={form.unbatchedAcquisitionCost}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      unbatchedAcquisitionCost: e.target.value,
                    }))
                  }
                />
                <span className="price-gst-hint">
                  Required when this stock increase adds unbatched quantity.
                </span>
              </div>
            )}
          {form.unitType === "WEIGHT" && (
            <div className="form-group">
              <label className="form-label">Opening Stock Unit</label>
              <select
                className="form-select"
                value={form.stockUnit || "KG"}
                onChange={(e) => {
                  const stockUnit = e.target.value;
                  setForm((current) => {
                    if (current.stockQuantity === "") {
                      return { ...current, stockUnit };
                    }
                    const baseQuantity = normalizeWeightQuantity(
                      current.stockQuantity,
                      current.stockUnit || "KG",
                    );
                    return {
                      ...current,
                      stockUnit,
                      stockQuantity:
                        stockUnit === "GRAM"
                          ? String(Number((baseQuantity * 1000).toFixed(3)))
                          : String(Number(baseQuantity.toFixed(3))),
                    };
                  });
                }}
              >
                <option value="KG">KG</option>
                <option value="GRAM">GRAM</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Min Stock Level</label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              value={form.minStockLevel}
              onChange={(e) =>
                setForm((f) => ({ ...f, minStockLevel: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Batch Number</label>
            <input
              type="text"
              className="form-input"
              value={form.batchNo || ""}
              placeholder="Batch Number (optional)"
              onChange={(e) =>
                setForm((f) => ({ ...f, batchNo: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Serial Number</label>
            <input
              type="text"
              className="form-input"
              value={form.serialNo || ""}
              placeholder="Serial Number (optional)"
              onChange={(e) =>
                setForm((f) => ({ ...f, serialNo: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <DateInput
              className="form-input"
              min={new Date().toISOString().split("T")[0]}
              value={form.expiryDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiryDate: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add Category"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCategoryModalOpen(false)}
              disabled={quickCreateSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={quickCreateSaving}
              onClick={saveQuickCategory}
            >
              Add Category
            </Button>
          </>
        }
      >
        <form onSubmit={saveQuickCategory}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              className="form-input"
              autoFocus
              value={categoryName}
              onChange={(event) => {
                setCategoryName(event.target.value);
                setQuickCreateError("");
              }}
              aria-label="Category name"
            />
            {quickCreateError && (
              <span className="um-error-text" role="alert">
                {quickCreateError}
              </span>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={quickBrandModalOpen}
        onClose={() => setQuickBrandModalOpen(false)}
        title="Add Brand"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setQuickBrandModalOpen(false)}
              disabled={quickCreateSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={quickCreateSaving}
              onClick={saveQuickBrand}
            >
              Add Brand
            </Button>
          </>
        }
      >
        <form onSubmit={saveQuickBrand}>
          <div className="form-group">
            <label className="form-label">Brand Name *</label>
            <input
              className="form-input"
              autoFocus
              value={brandName}
              onChange={(event) => {
                setBrandName(event.target.value);
                setQuickCreateError("");
              }}
              aria-label="Brand name"
            />
            {quickCreateError && (
              <span className="um-error-text" role="alert">
                {quickCreateError}
              </span>
            )}
          </div>
        </form>
      </Modal>

      {!embeddedCreate && (
        <>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>Products</h1>
          <p className="page-header__sub">
            Manage inventory and pricing analytics in a premium split-panel
            layout
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* <Button
            variant="secondary"
            onClick={() => setBrandModalOpen(true)}
          >
            🏷️ Manage Brands
          </Button> */}
          {/* {activeProduct && (
            <Button
              variant="secondary"
              onClick={() => setVariantModalOpen(true)}
            >
              📦 Variants
            </Button>
          )} */}
          <Button variant="primary" onClick={openAdd}>
            + Add Product
          </Button>
        </div>
      </div>

      {/* Upgraded Split Layout */}
      <div className="products-split-container">
        {/* Left Side: Product Selection Pane */}
        <div className="products-list-pane">
          <div className="products-pane-header">
            <div className="search-bar" style={{ width: "100%" }}>
              <span className="search-bar__icon">🔍</span>
              <input
                placeholder="Search Name, SKU, HSN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="products-pane-scroll">
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No products found
              </div>
            ) : (
              filteredProducts.map((p) => {
                const qty = Number(p.stockQuantity) || 0;
                const min = parseInt(p.minStockLevel) || 5;
                const isOut = qty <= 0;
                const isLow = qty > 0 && qty < min;

                let stockLabel = "In Stock";
                let stockStyle = { color: "var(--success)" };
                if (isOut) {
                  stockLabel = "Out of Stock";
                  stockStyle = { color: "var(--danger)" };
                } else if (isLow) {
                  stockLabel = "Low Stock";
                  stockStyle = { color: "var(--warning)" };
                }

                const isActive =
                  activeProduct &&
                  (activeProduct.id || activeProduct._id) === (p.id || p._id);

                return (
                  <div
                    key={p.id || p._id}
                    className={`product-item-card ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveProduct(p);
                      setTxnPage(1);
                    }}
                  >
                    <div className="product-item-card__title-row">
                      <span className="product-item-card__name">{p.name}</span>
                    </div>
                    <div className="product-item-card__meta-row">
                      <span className="product-item-card__sku">
                        {p.barcode || p.SKU || p.sku || "—"}
                      </span>
                      <span
                        className="product-item-card__stock"
                        style={stockStyle}
                      >
                        {formatQuantity(qty)}{" "}
                        {isWeightProduct(p) ? "KG" : "PCS"} ({stockLabel})
                      </span>
                    </div>
                    <div className="product-item-card__meta-row">
                      <span className="product-item-card__sku">
                        Sell {formatCurrency(p.sellingPrice ?? p.salesPrice)} (
                        {priceTypeLabel(normalizePriceType(p.sellingPriceType))}
                        )
                      </span>
                      <span className="product-item-card__sku">
                        Buy {formatCurrency(p.purchasePrice)} (
                        {priceTypeLabel(
                          normalizePriceType(p.purchasePriceType),
                        )}
                        )
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Metrics, Analytics, and History Pane */}
        <div className="product-analytics-pane">
          {!activeProduct ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 40 }}>📦</span>
              <h3>No Product Selected</h3>
              <p>Select a product from the list to view stats & history</p>
            </div>
          ) : (
            <>
              {/* Product Header */}
              <div className="product-analytics-header">
                <div>
                  <div className="product-analytics-title">
                    {activeProduct.name}
                  </div>
                  <div className="product-analytics-meta">
                    <span>
                      Barcode:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {activeProduct.barcode ||
                          activeProduct.SKU ||
                          activeProduct.sku ||
                          "—"}
                      </strong>
                    </span>
                    <span>
                      HSN Code:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {activeProduct.HSNCode || activeProduct.hsnCode || "—"}
                      </strong>
                    </span>
                    <span>
                      MRP:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(activeProduct.MRP)}
                      </strong>
                    </span>
                    <span>
                      GST:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {activeProduct.taxRate || 0}%
                      </strong>
                    </span>
                  </div>
                  <div className="product-analytics-meta">
                    <span>
                      Purchase:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(activeProduct.purchasePrice)} (
                        {priceTypeLabel(
                          normalizePriceType(activeProduct.purchasePriceType),
                        )}
                        )
                      </strong>
                      {activeProduct.purchaseBasePrice !== undefined && (
                        <>
                          {" "}
                          · Base{" "}
                          {formatCurrency(activeProduct.purchaseBasePrice)} +
                          GST {formatCurrency(activeProduct.purchaseGSTAmount)}
                        </>
                      )}
                    </span>
                    <span>
                      Selling:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(
                          activeProduct.sellingPrice ??
                            activeProduct.salesPrice,
                        )}{" "}
                        (
                        {priceTypeLabel(
                          normalizePriceType(activeProduct.sellingPriceType),
                        )}
                        )
                      </strong>
                      {activeProduct.sellingBasePrice !== undefined && (
                        <>
                          {" "}
                          · Base{" "}
                          {formatCurrency(activeProduct.sellingBasePrice)} + GST{" "}
                          {formatCurrency(activeProduct.sellingGSTAmount)}
                        </>
                      )}
                    </span>
                    {activeProfit && activeProfit.isReady && (
                      <span>
                        Profit (after discount, excl. GST):{" "}
                        <strong
                          style={{
                            color: activeProfit.isLoss
                              ? "var(--danger)"
                              : "var(--success)",
                          }}
                        >
                          {formatProfitAmount(
                            Number(activeProfit.profitAmount),
                          )}{" "}
                          (
                          {activeProfit.profitMargin === null ||
                          activeProfit.profitMargin === undefined
                            ? "N/A"
                            : `${Number(activeProfit.profitMargin).toFixed(2)}%`}
                          )
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="product-analytics-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(activeProduct)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() =>
                      setDeleteId(activeProduct.id || activeProduct._id)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Product Info & Scrollable Analytics */}
              <div className="product-analytics-scroll">
                {/* KPIs Grid */}
                {productMetrics && (
                  <div className="analytics-metrics-grid">
                    <div className="kpi-card kpi-card--sales">
                      <span className="kpi-card__label">Sales Stats</span>
                      <span className="kpi-card__value">
                        {formatCurrency(productMetrics.totalSalesAmt)}
                      </span>
                      <div className="kpi-card__sub">
                        <span>Qty Sold: {productMetrics.totalSalesQty}</span>
                        <span>
                          Rate: {formatCurrency(productMetrics.salesRate)}
                        </span>
                      </div>
                    </div>

                    <div className="kpi-card kpi-card--purchase">
                      <span className="kpi-card__label">Purchase Stats</span>
                      <span className="kpi-card__value">
                        {formatCurrency(productMetrics.totalPurchaseAmt)}
                      </span>
                      <div className="kpi-card__sub">
                        <span>
                          Qty Bought: {productMetrics.totalPurchaseQty}
                        </span>
                        <span>
                          Rate: {formatCurrency(productMetrics.purchaseRate)}
                        </span>
                      </div>
                    </div>

                    <div className="kpi-card kpi-card--profit">
                      <span className="kpi-card__label">Profit Summary</span>
                      <span
                        className="kpi-card__value"
                        style={{
                          color:
                            productMetrics.profit >= 0
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {formatCurrency(productMetrics.profit)}
                      </span>
                      <div className="kpi-card__sub">
                        <span>Margin Margin</span>
                        <span
                          className={`profit-badge ${
                            productMetrics.profit >= 0
                              ? "profit-badge--positive"
                              : "profit-badge--negative"
                          }`}
                        >
                          {productMetrics.totalSalesBase > 0
                            ? `${Math.round((productMetrics.profit / productMetrics.totalSalesBase) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Combined Transaction Table */}
                <div style={{ marginTop: "var(--sp-2)" }}>
                  <h3
                    style={{
                      fontSize: "var(--fs-md)",
                      fontWeight: 700,
                      marginBottom: "var(--sp-3)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Combined Transaction History
                  </h3>

                  {combinedTransactions.length === 0 ? (
                    <div
                      style={{
                        padding: 30,
                        textAlign: "center",
                        color: "var(--text-muted)",
                        background: "var(--bg-hover)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      No transactions recorded for this product
                    </div>
                  ) : (
                    <>
                      <div
                        className="table-wrapper sticky-header-table"
                        style={{ maxHeight: 300 }}
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              {/* <th>Invoice No</th> */}
                              <th>Bill Type</th>
                              <th>Party Name</th>
                              <th>Quantity</th>
                              <th>Rate</th>
                              <th>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedTransactions.map((txn) => (
                              <tr key={txn.id}>
                                <td
                                  style={{
                                    fontSize: "var(--fs-xs)",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {txn.date
                                    ? new Date(txn.date).toLocaleDateString(
                                        "en-IN",
                                        {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        },
                                      )
                                    : "—"}
                                </td>
                                {/* <td style={{ fontWeight: 600 }}>
                                  {txn.invoiceNo}
                                </td> */}
                                <td>
                                  <Badge
                                    variant={
                                      txn.billType === "Sales"
                                        ? "success"
                                        : "warning"
                                    }
                                  >
                                    {txn.billType}
                                  </Badge>
                                </td>
                                <td>{txn.partyName}</td>
                                <td>{txn.quantity}</td>
                                <td>{formatCurrency(txn.rate)}</td>
                                <td style={{ fontWeight: 600 }}>
                                  {formatCurrency(txn.totalAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalTxnPages > 1 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "var(--sp-4)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--fs-xs)",
                              color: "var(--text-muted)",
                            }}
                          >
                            Showing page {txnPage} of {totalTxnPages}
                          </span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={txnPage === 1}
                              onClick={() => setTxnPage((p) => p - 1)}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={txnPage === totalTxnPages}
                              onClick={() => setTxnPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export function ProductCreationModal({ barcode, onCreated, onClose }) {
  return (
    <Products
      embeddedCreate
      initialValues={{ barcode: String(barcode || ""), stockQuantity: 0 }}
      onProductCreated={onCreated}
      onClose={onClose}
    />
  );
}
