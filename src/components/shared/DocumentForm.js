/* ===== DOCUMENT FORM — Shared parameterized bill/document form ===== */
import React, { useEffect, useState, useMemo } from "react";
import useAppStore from "../../store/appStore";
import useDocumentStore from "../../store/documentStore";
import useSalesStore from "../../store/salesStore";
import usePurchaseStore from "../../store/purchaseStore";
import useAuthStore from "../../store/authStore";
import { PartySelector } from "./PartySelector";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { Button, ConfirmModal, ToastContainer } from "../ui";
import { useBillCalculations } from "../../hooks/useBillCalculations";
import { useToast } from "../../hooks/useToast";
import { formatCurrency } from "../../utils/currency";
import { todayISO } from "../../utils/date";
import {
  calcBillTotals,
  calcPurchaseBillTotals,
  calcItemRow,
  calcPurchaseRowFromFinalAmount,
  getNextInvoiceNo,
  buildDocumentPayload,
  buildSaleBillPayload,
  buildPurchaseBillPayload,
  createEmptyItem,
  addScannedPurchaseProduct,
  mapLineItemsFromBill,
} from "../../utils/invoice";
import {
  getDocumentConfig,
  getDocumentPrefix,
  isInvoiceDocType,
} from "../../utils/documents";
import { fetchCompanyUsersAPI, previewNextInvoiceNumberAPI, previewNextDocumentNumberAPI } from "../../api";
import { fetchFinancialDetailsAPI } from "../../api/company";
import { fetchPurchaseBillByIdAPI } from "../../api/purchase";
import { lookupProductByBarcodeAPI } from "../../api/products";
import { invalidateBatchCache } from "./BatchSelector";
import { ProductCreationModal } from "../../features/products/Products";
import {
  GST_STATE_NAMES,
  stateCodeFromGSTIN,
  stateNameFromCode,
} from "../../utils/gstStates";
import DateInput from "./DateInput";
import "../../styles/bills.css";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function getPartyGstRegistrationType(party) {
  if (party?.gstRegistrationType === "REGISTERED" ||
      party?.gstRegistrationType === "UNREGISTERED") {
    return party.gstRegistrationType;
  }
  return GSTIN_PATTERN.test(String(party?.GST || "").trim().toUpperCase())
    ? "REGISTERED"
    : "UNREGISTERED";
}

function getGstinStateCode(value) {
  const gstin = String(value || "").trim().toUpperCase();
  return GSTIN_PATTERN.test(gstin) ? gstin.slice(0, 2) : "";
}

function isEnabled(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export default function DocumentForm({
  docType,
  documentType: documentTypeProp,
  billingType = "B2B",
  editMode = false,
  documentId = null,
  billId = null,
  onBack,
  onSaved,
  onConvert,
}) {
  const documentType = docType || documentTypeProp;
  const config = getDocumentConfig(documentType);
  const isInvoice = isInvoiceDocType(documentType);
  const recordId = documentId || billId;

  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const brands = useAppStore((s) => s.brands);
  const parties = useAppStore((s) => s.parties);
  const companies = useAppStore((s) => s.companies);
  const companyInfo = Array.isArray(companies) ? companies[0] || {} : companies || {};
  const companyId = companyInfo.id;
  const billingUser = useAuthStore((s) => s.user);
  const settings = useAppStore((s) => s.settings);
  const saleBills = useSalesStore((s) => s.saleBills);
  const purchaseBills = usePurchaseStore((s) => s.purchaseBills);
  const addSaleBill = useSalesStore((s) => s.addBill);
  const updateSaleBill = useSalesStore((s) => s.updateBill);
  const addPurchaseBill = usePurchaseStore((s) => s.addBill);
  const updatePurchaseBill = usePurchaseStore((s) => s.updateBill);
  const getDocuments = useDocumentStore((s) => s.getDocuments);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const updateDocument = useDocumentStore((s) => s.updateDocument);
  const convertToInvoice = useDocumentStore((s) => s.convertToInvoice);

  const toast = useToast();
  const { updateItemField, removeItem, addItem } = useBillCalculations();

  const existingDocs = getDocuments(documentType);
  const numberingBills = useMemo(() => {
    if (documentType === "SALE_INVOICE") return saleBills;
    if (documentType === "PURCHASE_BILL") return purchaseBills;
    return existingDocs;
  }, [documentType, saleBills, purchaseBills, existingDocs]);

  const docPrefix = getDocumentPrefix(documentType, settings);
  const numberingSettings = useMemo(
    () => ({ ...settings, invoicePrefix: docPrefix, dateStr: todayISO() }),
    [settings, docPrefix],
  );

  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [editLoadError, setEditLoadError] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [purchaseTaxForm, setPurchaseTaxForm] = useState({
    invoiceType: "",
    taxTypeOverride: "",
    placeOfSupplyStateCode: "",
    reverseCharge: false,
    reverseChargeAmount: "",
    itcEligible: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [missingProductBarcode, setMissingProductBarcode] = useState("");
  const [companyFinancials, setCompanyFinancials] = useState({});
  const [users, setUsers] = useState([]);
  const [close, setClose] = useState(false);
  const [address, setAddress] = useState("");
  const selectedParty = parties.find(
    (party) => String(party.id || party._id) === String(selectedPartyId),
  ) || address || null;
  const selectedPartyRegistrationType = getPartyGstRegistrationType(selectedParty);
  const supplierStateCode = stateCodeFromGSTIN(selectedParty?.GST);
  const rawCompanyStateCode = String(companyInfo.state_code || "").trim();
  const companyStateCode =
    getGstinStateCode(companyFinancials.gstin) ||
    (/^\d{1,2}$/.test(rawCompanyStateCode)
      ? rawCompanyStateCode.padStart(2, "0")
      : "");
  const placeOfSupplyStateCode =
    purchaseTaxForm.placeOfSupplyStateCode ||
    supplierStateCode ||
    companyStateCode;
  const automaticTaxType =
    placeOfSupplyStateCode && /^\d{2}$/.test(companyStateCode)
      ? placeOfSupplyStateCode === companyStateCode
        ? "CGST_SGST"
        : "IGST"
      : "";
  const purchaseTaxType =
    purchaseTaxForm.taxTypeOverride || automaticTaxType;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchFinancialDetailsAPI(companyId);
        const financials = response?.data?.data || response?.data || {};
        if (!cancelled) setCompanyFinancials(financials);
      } catch (error) {
        console.error("Could not load company GST details:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const [billForm, setBillForm] = useState({
    invoiceNo:
      documentType === "PURCHASE_BILL"
        ? ""
        : getNextInvoiceNo(numberingBills, numberingSettings),
    date: todayISO(),
    items: Array.from({ length: 3 }, createEmptyItem),
    globalDiscount: 0,
    globalDiscountPercent: "",
  });

  // The local getNextInvoiceNo() guess above is only ever right by coincidence —
  // it depends on saleBills/existingDocs already being loaded into the store.
  // For a fresh page load (or a filtered/partial list) it silently falls back
  // to "1". The backend's running counter/count is the only source of truth,
  // so fetch and use that instead for every document type — this is just what
  // will be shown/created; the server generates the real number on save
  // regardless of what's in this field.
  const DOCUMENT_TYPES_WITH_BACKEND_PREVIEW = [
    "QUOTATION",
    "SALES_ORDER",
    "PROFORMA",
    "DELIVERY_CHALLAN",
    "CREDIT_NOTE",
    "DEBIT_NOTE",
    "PURCHASE_ORDER",
  ];

  useEffect(() => {
    if (editMode) return;
    const isSaleInvoice = documentType === "SALE_INVOICE";
    const isOtherDocument = DOCUMENT_TYPES_WITH_BACKEND_PREVIEW.includes(documentType);
    if (!isSaleInvoice && !isOtherDocument) return; // PURCHASE_BILL keeps its manual number entry

    let cancelled = false;
    async function loadRealNextNumber() {
      try {
        let realNext;
        if (isSaleInvoice) {
          let companyId = 1;
          const erpSettings = localStorage.getItem("erp-settings");
          if (erpSettings) {
            const companydata = JSON.parse(erpSettings);
            companyId = companydata?.state?.companyId || 1;
          }
          const res = await previewNextInvoiceNumberAPI(companyId);
          realNext = res?.data?.nextInvoiceNumber;
        } else {
          const res = await previewNextDocumentNumberAPI(documentType);
          realNext = res?.data?.nextNumber;
        }
        if (realNext && !cancelled) {
          setBillForm((f) => ({ ...f, invoiceNo: realNext }));
        }
      } catch {
        // fall back silently to the local guess already in state
      }
    }
    loadRealNextNumber();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, editMode]);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    userId: "",
    phone: "",
    poNumber: "",
    ewayBill: "",
    referenceNo: "",
    validUntil: "",
    transportRef: "",
    state: "",
  });

  useEffect(() => {
    async function loadUsers() {
      if (!config.requireUserRep && documentType !== "SALE_INVOICE") return;
      try {
        const data = await fetchCompanyUsersAPI(billingUser?.companyId);
        setUsers(data.data || []);
      } catch {
        toast.error("Failed to load user listing.");
      }
    }
    loadUsers();
  }, [billingUser?.companyId, config.requireUserRep, documentType]);

  useEffect(() => {
    if (!editMode || !recordId || loaded) return undefined;

    let cancelled = false;
    async function loadExisting() {
      let existing = null;
      if (documentType === "PURCHASE_BILL") {
        setLoadingExisting(true);
        setEditLoadError("");
        try {
          existing = await fetchPurchaseBillByIdAPI(recordId);
        } catch (error) {
          if (!cancelled) {
            setEditLoadError(error.message);
            toast.error(error.message);
            setLoadingExisting(false);
          }
          return;
        }
      } else if (documentType === "SALE_INVOICE") {
        existing = saleBills.find(
          (b) => String(b.id || b._id) === String(recordId),
        );
      } else {
        existing = existingDocs.find(
          (d) => String(d.id || d._id) === String(recordId),
        );
      }

      if (!existing || cancelled) {
        if (!existing && documentType === "PURCHASE_BILL" && !cancelled) {
          setEditLoadError("Purchase bill was not found.");
          setLoadingExisting(false);
        }
        return;
      }

      setSelectedPartyId(existing.partyId || existing.Party?.id || "");
      setAddress(existing.Party || null);
      if (documentType === "PURCHASE_BILL") {
        setPurchaseTaxForm({
          invoiceType: existing.invoiceType || "",
          taxTypeOverride: existing.taxType || "",
          placeOfSupplyStateCode:
            existing.placeOfSupplyStateCodeSnapshot ||
            stateCodeFromGSTIN(existing.Party?.GST) ||
            "",
          reverseCharge: isEnabled(existing.reverseCharge),
          reverseChargeAmount: existing.reverseChargeAmount || "",
          itcEligible: isEnabled(existing.itcEligible),
        });
      }

      const items =
        existing[config.itemsField] ||
        existing.SalesItems ||
        existing.PurchaseItems ||
        existing.DocumentItems ||
        existing.items ||
        [];

      const dateVal =
        existing[config.dateField] ||
        existing.saleDate ||
        existing.purchaseDate ||
        existing.documentDate;

      setBillForm({
        invoiceNo:
          existing.invoiceNumber ||
          existing.invoiceNo ||
          existing.documentNumber ||
          "",
        date: dateVal ? dateVal.split("T")[0] : todayISO(),
        ...(() => {
          const amount = Number(existing.global_discount_amount) || 0;
          const percent = Number(existing.global_discount_percentage) || 0;
          const loadedItems = mapLineItemsFromBill(items, {
            side: documentType === "PURCHASE_BILL" ? "purchase" : "sales",
            products,
            globalDiscountAmount: amount,
            globalDiscountPercent: percent,
          });
          return {
            items: loadedItems,
            globalDiscount: percent > 0 ? 0 : amount,
            globalDiscountPercent: percent > 0 ? String(percent) : "",
            paymentStatus: existing.paymentStatus || "Unpaid",
          };
        })(),
      });

      setCustomerForm({
        name: existing.name || existing.Party?.name || "",
        userId: existing.userId || existing.UserId || existing.User?.id || "",
        phone: existing.phone || existing.Party?.phone || "",
        poNumber: existing.po_number || "",
        ewayBill: existing.eway_bill || "",
        referenceNo: existing.referenceNo || "",
        validUntil: existing.validUntil ? existing.validUntil.split("T")[0] : "",
        transportRef: existing.transportRef || "",
        state: existing.state || "",
      });

      setLoaded(true);
      setLoadingExisting(false);
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [
    editMode,
    recordId,
    documentType,
    saleBills,
    existingDocs,
    config,
    loaded,
    products,
  ]);

  useEffect(() => {
    setLoaded(false);
  }, [recordId, editMode]);

  const purchaseItemsForCalculation =
    documentType === "PURCHASE_BILL" &&
    purchaseTaxForm.invoiceType !== "GST_INVOICE"
      ? billForm.items.map((item) => {
          if (!item.productName?.trim()) return item;
          const noTaxItem = { ...item, priceType: "WITHOUT_GST", taxRate: 0 };
          return item.purchaseCalculationMode === "FINAL_AMOUNT"
            ? calcPurchaseRowFromFinalAmount(
                noTaxItem,
                item.purchaseFinalAmount ?? item.total,
              )
            : calcItemRow(noTaxItem);
        })
      : billForm.items;
  const validItems = purchaseItemsForCalculation.filter((i) => i.productName?.trim());
  const totals = documentType === "PURCHASE_BILL"
    ? calcPurchaseBillTotals(
        validItems,
        billForm.globalDiscount,
        billForm.globalDiscountPercent,
      )
    : calcBillTotals(
        validItems,
        billForm.globalDiscount,
        billForm.globalDiscountPercent,
      );
  // GST-aware bills (sales invoice / purchase bill) price items using the
  // product's saved price mode; other documents keep the original handling.
  const isGstBill =
    documentType === "SALE_INVOICE" || documentType === "PURCHASE_BILL";
  const billCalcType =
    (isGstBill ? "" : "document-") +
    (config.side === "purchase" ? "purchase" : "sales");

  function handleItemUpdate(idx, field, value) {
    if (field === "quantity" && (value <= 0 || !String(value).trim())) {
      toast.error("Qty can't be empty or 0");
    }
    setBillForm((prev) => ({
      ...prev,
      items: updateItemField(
        prev.items,
        products,
        idx,
        field,
        value,
        billCalcType,
      ),
    }));
  }

  async function handlePurchaseBarcodeScan(barcode) {
    const response = await lookupProductByBarcodeAPI(barcode);
    const result = response?.data;
    const product = result?.product;
    if (!product?.id) {
      throw new Error("Barcode lookup returned no product");
    }

    setBillForm((previous) => {
      const { items } = addScannedPurchaseProduct(
        previous.items,
        products,
        product,
        updateItemField,
      );
      return { ...previous, items };
    });

    return result;
  }

  function handleCreatedPurchaseProduct(product) {
    setBillForm((previous) => {
      const { items } = addScannedPurchaseProduct(
        previous.items,
        products,
        product,
        updateItemField,
      );
      return { ...previous, items };
    });
    setMissingProductBarcode("");
    toast.success(`${product.name} added to purchase items`);
    window.setTimeout(
      () =>
        document
          .querySelector('[aria-label="Search product or scan barcode"]')
          ?.focus({ preventScroll: true }),
      0,
    );
  }

  async function handleSave() {
    if (editMode && !loaded) {
      toast.error("Wait for the purchase bill details to finish loading.");
      return;
    }
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    // if (!customerForm.validUntil) {
    //   toast.error('Select a proper valid date');
    //   return;
    // }

    if (documentType === "QUOTATION") {
      if (!customerForm.validUntil) {
        toast.error("Valid until date is required");
        return;
      }
    }

    if (!selectedPartyId) {
      toast.error(
        config.side === "purchase" ? "Select a vendor" : "Select a party",
      );
      return;
    }
    if (documentType === "PURCHASE_BILL") {
      const validCombination =
        (selectedPartyRegistrationType === "REGISTERED" &&
          ["GST_INVOICE", "BILL_OF_SUPPLY"].includes(purchaseTaxForm.invoiceType)) ||
        (selectedPartyRegistrationType === "UNREGISTERED" &&
          purchaseTaxForm.invoiceType === "NON_GST_INVOICE");
      if (!validCombination) {
        toast.error(
          selectedPartyRegistrationType === "REGISTERED"
            ? "Registered suppliers require a GST Invoice or Bill of Supply."
            : "Unregistered suppliers require a Non-GST Invoice.",
        );
        return;
      }
      if (
        purchaseTaxForm.invoiceType === "GST_INVOICE" &&
        !purchaseTaxType
      ) {
        toast.error("Set the company state/GSTIN or select CGST + SGST or IGST.");
        return;
      }
      const rcmAmount = Number(purchaseTaxForm.reverseChargeAmount || 0);
      if (!Number.isFinite(rcmAmount) || rcmAmount < 0) {
        toast.error("Reverse-charge amount must be a non-negative number.");
        return;
      }
      if (!purchaseTaxForm.reverseCharge && rcmAmount > 0) {
        toast.error("Enable reverse charge before entering its amount.");
        return;
      }
      if (
        purchaseTaxForm.itcEligible &&
        purchaseTaxForm.invoiceType !== "GST_INVOICE"
      ) {
        toast.error("ITC eligibility can only be marked on a GST Invoice.");
        return;
      }
    }
    if (config.requireUserRep && !customerForm.userId) {
      toast.error("Select a User/Rep");
      return;
    }
    if (!billForm.date) {
      toast.error("Select a proper date");
      return;
    }
    if (documentType === "PURCHASE_BILL" && !billForm.invoiceNo.trim()) {
      toast.error("Purchase Bill No is required");
      return;
    }

    setSaving(true);
    try {
      let createdRecord = null;
      if (documentType === "SALE_INVOICE") {
        let companyId = null;

        try {
          const erpSettings = localStorage.getItem("erp-settings");
          console.log("ERP Settings from localStorage:", erpSettings);
          if (erpSettings) {
            const companydata = JSON.parse(erpSettings);
            companyId = companydata?.state?.companyId;
          }
        } catch (error) {
          console.error("Error reading company ID:", error);
        }

        if (!companyId) {
          toast.error("Company ID not found");
          return;
        }

        const payload = buildSaleBillPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
          products,
        });

        const salePayload = {
          ...payload,
          companyId: Number(companyId),
          bill_type: billingType,
        };

        if (editMode) {
          await updateSaleBill(recordId, salePayload);
          toast.success("Invoice updated ✓");
        } else {
          createdRecord = await addSaleBill(salePayload); // ← capture it here
          toast.success("Invoice saved ✓");
        }
      } else if (documentType === "PURCHASE_BILL") {
        let companyId;
        try {
          const erpSettings = localStorage.getItem("erp-settings");
          companyId = erpSettings
            ? JSON.parse(erpSettings)?.state?.companyId
            : null;
        } catch {
          companyId = null;
        }
        if (!companyId || !billingUser?.id) {
          toast.error("Company and user details are required for purchase");
          return;
        }
        const payload = buildPurchaseBillPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
          products,
          companyId,
          userId: billingUser.id,
          invoiceType: purchaseTaxForm.invoiceType,
          taxTypeOverride: purchaseTaxForm.taxTypeOverride || undefined,
          placeOfSupplyStateCode:
            purchaseTaxForm.placeOfSupplyStateCode || undefined,
          reverseCharge: purchaseTaxForm.reverseCharge,
          reverseChargeAmount: purchaseTaxForm.reverseCharge
            ? Number(purchaseTaxForm.reverseChargeAmount || 0)
            : 0,
          itcEligible: purchaseTaxForm.itcEligible,
          paymentStatus: editMode
            ? billForm.paymentStatus || "Unpaid"
            : "Unpaid",
        });
        if (editMode) {
          await updatePurchaseBill(recordId, payload);
          toast.success("Purchase bill updated ✓");
        } else {
          const created = await addPurchaseBill(payload);
          // Show what the backend actually recorded (billed vs received).
          const saved = created?.data;
          const lines = Array.isArray(saved?.items) ? saved.items : [];
          const freeUnits = lines.reduce(
            (sum, line) => sum + (Number(line.freeQuantity) || 0),
            0,
          );
          const receivedUnits = lines.reduce(
            (sum, line) => sum + (Number(line.quantity) || 0),
            0,
          );
          toast.success(
            saved?.invoiceNumber
              ? `Purchase ${saved.invoiceNumber} saved ✓` +
                  (lines.length
                    ? ` · Received ${receivedUnits} (${freeUnits} free)`
                    : "") +
                  (saved.totalAmount !== undefined
                    ? ` · Billed ₹${Number(saved.totalAmount).toFixed(2)}`
                    : "")
              : "Purchase bill saved ✓",
          );
        }
      } else {
        const payload = buildDocumentPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
          documentType,
        });
        if (editMode) {
          await updateDocument(recordId, payload);
          toast.success(`${config.label} updated ✓`);
        } else {
          await addDocument(payload);
          toast.success(`${config.label} saved ✓`);
        }
      }
      if (documentType === "PURCHASE_BILL") {
        invalidateBatchCache();
      }
      if (documentType === "SALE_INVOICE" && !editMode) {
        onSaved?.(createdRecord?.data);
      } else {
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
      // Show the API's message (e.g. unsupported tax rate, missing product price)
      toast.error(
        isGstBill && err?.message
          ? err.message
          : `Failed to save ${config.label.toLowerCase()}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert() {
    if (!config.convertible || !recordId) return;
    setConverting(true);
    try {
      const result = await convertToInvoice(recordId, documentType);
      if (result?.saleBill || result?.data || result?.success) {
        toast.success("Converted to sale invoice ✓");
        onConvert?.(result);
        return;
      }
      const salePayload = buildSaleBillPayload({
        billForm: {
          ...billForm,
          invoiceNo: getNextInvoiceNo(saleBills, {
            ...settings,
            invoicePrefix: settings.invoicePrefix || "INV",
            dateStr: todayISO(),
          }),
        },
        customerForm,
        // Quotation-style documents always treated the rate as GST-exclusive,
        // so keep that meaning when the lines become a sales invoice.
        validItems: validItems.map((i) => ({
          ...i,
          priceType: i.priceType || "WITHOUT_GST",
        })),
        partyId: selectedPartyId,
        products,
      });
      await addSaleBill({
        ...salePayload,
        bill_type: "B2B",
        convertedFrom: recordId,
      });
      await updateDocument(recordId, {
        ...buildDocumentPayload({
          billForm,
          customerForm,
          validItems,
          partyId: selectedPartyId,
          documentType,
        }),
        status: "converted",
      });
      toast.success("Converted to sale invoice ✓");
      onConvert?.();
    } catch (err) {
      console.error(err);
      toast.error("Conversion failed");
    } finally {
      setConverting(false);
    }
  }

  const saveLabel = editMode
    ? documentType === "SALE_INVOICE"
      ? "Update Invoice"
      : documentType === "PURCHASE_BILL"
        ? "Update Bill"
        : `Update ${config.label}`
    : documentType === "SALE_INVOICE"
      ? "Save Invoice"
      : documentType === "PURCHASE_BILL"
        ? "Save Bill"
        : `Save ${config.label}`;

  if (loadingExisting) {
    return (
      <div className="page-loading" role="status">
        Loading purchase bill and item details…
      </div>
    );
  }

  if (editLoadError) {
    return (
      <div className="invoice-layout">
        <div className="invoice-main">
          <ToastContainer toasts={toast.toasts} />
          <p role="alert">Could not load this purchase bill: {editLoadError}</p>
          <Button variant="secondary" onClick={onBack}>
            Back to Purchase Bills
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}
    >
      <ToastContainer toasts={toast.toasts} />

      <ConfirmModal
        open={!!close}
        onClose={() => setClose(false)}
        onConfirm={onBack}
        title={`Discard ${config.label}?`}
        confirmLabel="Discard"
        icon={isInvoice ? "🧾" : "📄"}
      />

      <div className="page-header">
        <div className="page-header__left">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--sp-3)",
            }}
          >
            <Button variant="ghost" size="sm" onClick={() => setClose(true)}>
              ← Back
            </Button>
            <h1>
              {editMode ? `Edit ${config.label}` : `New ${config.label}`}
              {documentType === "SALE_INVOICE" && billingType
                ? ` (${billingType})`
                : ""}
            </h1>
          </div>
        </div>
        {/* {documentType === 'SALE_INVOICE' && (
          <div className="page-header__actions">
            <div className="bill-type-toggle">
              <button className={`bill-type-btn ${billingType === 'B2B' ? 'active' : ''}`} type="button">
                B2B
              </button>
              <button className={`bill-type-btn ${billingType === 'B2C' ? 'active' : ''}`} type="button">
                B2C
              </button>
            </div>
          </div>
        )} */}
      </div>

      <div className="invoice-layout">
        <div className="invoice-main">
          <div className="bill-form-card">
            <div className="bill-form-card__header">
              <span className="card__title">{config.label} Details</span>
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                }}
              >
                {billForm.invoiceNo}
              </span>
            </div>
            <div className="bill-form-card__body">
              <div
                className={
                  documentType === "PURCHASE_BILL"
                    ? "purchase-bill-details-grid"
                    : "form-grid-3"
                }
                style={{ marginBottom: "var(--sp-4)" }}
              >
                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">
                      {config.partyLabel || "Select Party *"}
                    </label>
                    <PartySelector
                      value={selectedPartyId}
                      onChange={(id, party) => {
                        setSelectedPartyId(id);
                        setAddress(party);
                        if (documentType === "PURCHASE_BILL") {
                          setPurchaseTaxForm((previous) => ({
                            ...previous,
                            taxTypeOverride: "",
                            placeOfSupplyStateCode:
                              stateCodeFromGSTIN(party?.GST) ||
                              companyStateCode,
                          }));
                        }
                      }}
                    />
                  </div>
                  {address && (
                    <>
                      <div className="form-group">
                        <label className="form-label">GST No</label>
                        <input
                          type="text"
                          className="form-input"
                          value={address?.GST ?? ""}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          className="form-input"
                          value={address?.address ?? ""}
                          readOnly
                        />
                      </div>
                    </>
                  )}
                  {documentType !== "PURCHASE_BILL" && address && (
                    <div className="form-group">
                      <label className="form-label">GST Registration</label>
                      <input
                        type="text"
                        className="form-input"
                        value={
                          selectedPartyRegistrationType === "REGISTERED"
                            ? "Registered"
                            : "Unregistered"
                        }
                        readOnly
                      />
                    </div>
                  )}
                </div>

                {documentType === "PURCHASE_BILL" && (
                  <div className="form-flex-2-1">
                    <div className="form-group">
                      <label className="form-label">Supplier GST State</label>
                      <input
                        type="text"
                        className="form-input"
                        value={
                          supplierStateCode
                            ? `${stateNameFromCode(supplierStateCode)} (${supplierStateCode})`
                            : "Not available from a valid GSTIN"
                        }
                        readOnly
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Place of Supply</label>
                      <select
                        className="form-select"
                        value={
                          placeOfSupplyStateCode
                        }
                        disabled={!["Owner", "Admin"].includes(billingUser?.role)}
                        onChange={(event) =>
                          setPurchaseTaxForm((previous) => ({
                            ...previous,
                            placeOfSupplyStateCode: event.target.value,
                            taxTypeOverride: "",
                          }))
                        }
                      >
                        <option value="">Select state</option>
                        {Object.entries(GST_STATE_NAMES).map(([code, name]) => (
                          <option key={code} value={code}>
                            {name} ({code})
                          </option>
                        ))}
                      </select>
                      <small className="form-hint">
                        Defaults to supplier GST state when valid; confirm the legally applicable place of supply.
                      </small>
                    </div>
                    {address && (
                      <div className="form-group">
                        <label className="form-label">GST Registration</label>
                        <input
                          type="text"
                          className="form-input"
                          value={
                            selectedPartyRegistrationType === "REGISTERED"
                              ? "Registered"
                              : "Unregistered"
                          }
                          readOnly
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Supplier Invoice Type *</label>
                      <select
                        className="form-select"
                        value={purchaseTaxForm.invoiceType}
                        onChange={(event) =>
                          setPurchaseTaxForm((previous) => ({
                            ...previous,
                            invoiceType: event.target.value,
                            itcEligible:
                              event.target.value === "GST_INVOICE"
                                ? previous.itcEligible
                                : false,
                          }))
                        }
                      >
                        <option value="">Select invoice type</option>
                        {selectedPartyRegistrationType === "REGISTERED" ? (
                          <>
                            <option value="GST_INVOICE">GST Invoice</option>
                            <option value="BILL_OF_SUPPLY">Bill of Supply</option>
                          </>
                        ) : (
                          <option value="NON_GST_INVOICE">Non-GST Invoice</option>
                        )}
                      </select>
                    </div>
                  {/* )} */}
                  {documentType === "PURCHASE_BILL" &&
                    purchaseTaxForm.invoiceType === "GST_INVOICE" && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Tax Type</label>
                          <select
                            className="form-select"
                            value={purchaseTaxForm.taxTypeOverride}
                            onChange={(event) =>
                              setPurchaseTaxForm((previous) => ({
                                ...previous,
                                taxTypeOverride: event.target.value,
                              }))
                            }
                          >
                            <option value="">
                              Automatic{automaticTaxType ? ` (${automaticTaxType === "IGST" ? "IGST" : "CGST + SGST"})` : ""}
                            </option>
                            <option value="CGST_SGST">CGST + SGST</option>
                            <option value="IGST">IGST</option>
                          </select>
                          {!purchaseTaxType && (
                            <small className="form-hint">
                              Company and supplier state codes are unavailable; choose the tax type.
                            </small>
                          )}
                        </div>
                        <label className="form-checkbox">
                          <input
                            type="checkbox"
                            checked={purchaseTaxForm.itcEligible}
                            onChange={(event) =>
                              setPurchaseTaxForm((previous) => ({
                                ...previous,
                                itcEligible: event.target.checked,
                              }))
                            }
                          />
                          <span>Eligible for input tax credit (ITC)</span>
                        </label>
                      </>
                    )}
                  {documentType === "PURCHASE_BILL" && (
                    <>
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={purchaseTaxForm.reverseCharge}
                          onChange={(event) =>
                            setPurchaseTaxForm((previous) => ({
                              ...previous,
                              reverseCharge: event.target.checked,
                              reverseChargeAmount: event.target.checked
                                ? previous.reverseChargeAmount
                                : "",
                            }))
                          }
                        />
                        <span>Reverse charge applies</span>
                      </label>
                      {purchaseTaxForm.reverseCharge && (
                        <div className="form-group">
                          <label className="form-label">Reverse-charge amount</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input"
                            value={purchaseTaxForm.reverseChargeAmount}
                            onChange={(event) =>
                              setPurchaseTaxForm((previous) => ({
                                ...previous,
                                reverseChargeAmount: event.target.value,
                              }))
                            }
                          />
                          <small className="form-hint">
                            Recorded separately; not added to the supplier invoice total.
                          </small>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                )}

                {(config.requireUserRep || documentType === "SALE_INVOICE") && (
                  <div className="form-flex-2-1">
                    <div className="form-group">
                      <label className="form-label">
                        User/Rep ID{config.requireUserRep ? " *" : ""}
                      </label>
                      <select
                        className="form-input"
                        value={customerForm.userId}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            userId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select User</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">
                      {config.dateLabel || "Date"}
                    </label>
                    <DateInput
                      className="form-input"
                      value={billForm.date}
                      onChange={(e) =>
                        setBillForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                  {config.showValidUntil && (
                    <div className="form-group">
                      <label className="form-label">
                        {config.validUntilLabel || "Valid Until"}
                      </label>
                      <DateInput
                        className="form-input"
                        min={new Date().toISOString().split("T")[0]}
                        value={customerForm.validUntil}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            validUntil: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  )}
                  {config.showState && (
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input
                        className="form-input"
                        value={customerForm.state}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            state: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="form-flex-2-1">
                  <div className="form-group">
                    <label className="form-label">
                      {config.numberLabel || "Document No"}
                    </label>
                    <input
                      className="form-input"
                      value={billForm.invoiceNo}
                      onChange={(e) =>
                        setBillForm((p) => ({
                          ...p,
                          invoiceNo: e.target.value,
                        }))
                      }
                      readOnly={
                        documentType !== "PURCHASE_BILL" &&
                        (editMode || isInvoice)
                      }
                      placeholder={
                        documentType === "PURCHASE_BILL"
                          ? "Enter vendor bill number"
                          : "Document No"
                      }
                    />
                  </div>
                  {config.referenceLabel && (
                    <div className="form-group">
                      <label className="form-label">
                        {config.referenceLabel}
                      </label>
                      <input
                        className="form-input"
                        value={customerForm.referenceNo}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            referenceNo: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">PO Number</label>
                    <input
                      className="form-input"
                      value={customerForm.poNumber}
                      onChange={(e) =>
                        setCustomerForm((p) => ({
                          ...p,
                          poNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {config.transportLabel && (
                    <div className="form-group">
                      <label className="form-label">
                        {config.transportLabel}
                      </label>
                      <input
                        className="form-input"
                        value={customerForm.transportRef}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            transportRef: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                  {documentType !== "DELIVERY_CHALLAN" && (
                    <div className="form-group">
                      <label className="form-label">E-Way Bill No</label>
                      <input
                        className="form-input"
                        value={customerForm.ewayBill}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            ewayBill: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <InvoiceItemsTable
            items={purchaseItemsForCalculation}
            products={products}
            categories={categories}
            brands={brands}
            onUpdateItem={handleItemUpdate}
            onRemoveItem={(idx) =>
              setBillForm((prev) => ({
                ...prev,
                items: removeItem(prev.items, idx),
              }))
            }
            onAddItem={() =>
              setBillForm((prev) => ({ ...prev, items: addItem(prev.items) }))
            }
            gstPricing={
              isGstBill &&
              (documentType !== "PURCHASE_BILL" ||
                purchaseTaxForm.invoiceType === "GST_INVOICE")
            }
            priceSide={config.side === "purchase" ? "purchase" : "sales"}
            taxType={documentType === "PURCHASE_BILL" ? purchaseTaxType : null}
            onBarcodeScan={
              documentType === "PURCHASE_BILL"
                ? handlePurchaseBarcodeScan
                : undefined
            }
            onCreateMissingBarcode={
              documentType === "PURCHASE_BILL"
                ? setMissingProductBarcode
                : undefined
            }
          />
        </div>

        <div className="invoice-sidebar">
          <div className="totals-card">
            <div className="totals-card__row">
              <span>Items</span>
              <span style={{ fontWeight: 600 }}>{validItems.length}</span>
            </div>
            {config.showTax && (
              <>
                <div className="totals-card__row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="totals-card__row">
                  <span>
                    {documentType === "PURCHASE_BILL" &&
                    purchaseTaxForm.invoiceType !== "GST_INVOICE"
                      ? "Supplier GST"
                      : "GST"}
                    {documentType === "PURCHASE_BILL" &&
                      purchaseTaxForm.invoiceType === "GST_INVOICE" &&
                      purchaseTaxType &&
                      ` (${purchaseTaxType === "IGST" ? "IGST" : "CGST + SGST"})`}
                  </span>
                  <span>{formatCurrency(totals.totalTax)}</span>
                </div>
                {documentType === "PURCHASE_BILL" &&
                  purchaseTaxForm.invoiceType === "GST_INVOICE" &&
                  purchaseTaxType === "CGST_SGST" && (
                    <>
                      <div className="totals-card__row">
                        <span>CGST</span>
                        <span>{formatCurrency(totals.totalTax / 2)}</span>
                      </div>
                      <div className="totals-card__row">
                        <span>SGST</span>
                        <span>{formatCurrency(totals.totalTax - totals.totalTax / 2)}</span>
                      </div>
                    </>
                  )}
                {documentType === "PURCHASE_BILL" &&
                  purchaseTaxForm.invoiceType === "GST_INVOICE" &&
                  purchaseTaxType === "IGST" && (
                    <div className="totals-card__row">
                      <span>IGST</span>
                      <span>{formatCurrency(totals.totalTax)}</span>
                    </div>
                  )}
                {documentType === "PURCHASE_BILL" &&
                  purchaseTaxForm.reverseCharge && (
                    <div className="totals-card__row">
                      <span>Reverse charge (separate)</span>
                      <span>
                        {formatCurrency(purchaseTaxForm.reverseChargeAmount || 0)}
                      </span>
                    </div>
                  )}
                <div className="totals-card__row totals-card__row--discount">
                  <span>Discount (%)</span>
                  <input
                    className="totals-inline-input"
                    type="number"
                    min="0"
                    max="100"
                    onWheel={(e) => e.target.blur()}
                    value={billForm.globalDiscountPercent ?? ""}
                    onChange={(e) =>
                      setBillForm((p) => ({
                        ...p,
                        globalDiscount: 0,
                        globalDiscountPercent: e.target.value,
                      }))
                    }
                    placeholder="0"
                    style={
                      isInvoice
                        ? {
                            background: "var(--danger-light)",
                            color: "var(--danger)",
                            borderColor: "var(--danger-light)",
                          }
                        : {}
                    }
                  />
                </div>
                {totals.globalDiscountAmount > 0 && (
                  <div className="totals-card__row">
                    <span>Discount Amount</span>
                    <span style={{ color: "var(--danger)" }}>
                      −{formatCurrency(totals.globalDiscountAmount)}
                    </span>
                  </div>
                )}
                {config.showRoundOff && (
                  <div className="totals-card__row">
                    <span>Round Off</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {totals.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="totals-card__row totals-card__row--grand">
                  <span>TOTAL</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--sp-3)",
            }}
          >
            <Button
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              loading={saving}
              onClick={handleSave}
            >
              {saveLabel}
            </Button>
            {/* {config.convertible && editMode && (
              <Button
                variant="success"
                style={{ width: "100%" }}
                loading={converting}
                onClick={handleConvert}
              >
                {config.convertLabel}
              </Button>
            )} */}
            <Button
              variant="secondary"
              style={{ width: "100%" }}
              onClick={() => setClose(true)}
            >
              Discard
            </Button>
          </div>
        </div>
      </div>
      {documentType === "PURCHASE_BILL" && missingProductBarcode && (
        <ProductCreationModal
          barcode={missingProductBarcode}
          onCreated={handleCreatedPurchaseProduct}
          onClose={() => setMissingProductBarcode("")}
        />
      )}
    </div>
  );
}
