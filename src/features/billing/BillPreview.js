/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: BillPreview.js  (UPDATED SECTION ONLY — see comments for what changed)
   LOCATION: frontend/src/features/billing/BillPreview.js

   WHAT CHANGED vs your original:
   1. New imports for the new templates + adapter + financial fetch
   2. company data is now loaded via fetchCompanyForInvoice() (async, hits the
      real Financial API) instead of being read straight off `companies[0]`
   3. Added a toggle so you can switch between your existing B2B/B2C templates
      and the new ones without breaking anything
   ═══════════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useState, useEffect } from "react";
import useAppStore from "../../store/appStore";
import { Button } from "../../components/ui";
import "../../styles/Billpreview.css";
import { useToast } from "../../hooks/useToast";
import B2CInvoice from "./invoices/B2CInvoice";
import B2BInvoice from "./invoices/B2BInvoice";
import { fetchFinancialDetailsAPI } from "../../api/company";

// ── NEW IMPORTS ──
import CustomizableInvoice from "./invoices/templates/CustomizableInvoice";
import B2BInvoiceTemplate from "./invoices/templates/B2BInvoiceTemplate";
import {
  adaptBillToInvoice,
  fetchCompanyForInvoice,
} from "./invoices/templates/adaptBillData";
import "./invoices/templates/CustomizableInvoice.css";
import "./invoices/templates/B2BInvoiceTemplate.css";
import ThermalInvoice from "./invoices/ThermalInvoice";
import html2pdf from "html2pdf.js";
import useBillTemplateStore from "../../store/billTemplateStore";
import { returnSaleItemAPI } from "../../api/sales";
import { refreshProductsAfterInventoryChange } from "../../store/refreshProductsAfterInventoryChange";
import {
  formatQuantity,
  getReadableQuantity,
  isWeightProduct,
  normalizeWeightQuantity,
} from "../../utils/quantityUnits";

export default function BillPreview({ bill, billType = "SALE", onBack }) {
  const companies = useAppStore((s) => s.companies);
  const toast = useToast();
  const printRef = useRef(null);

  // ── NEW STATE ──
  const [invoiceData, setInvoiceData] = useState(null); // { invoice, company }
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [companyFinancials, setCompanyFinancials] = useState({});
  const [returnItem, setReturnItem] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnUnit, setReturnUnit] = useState("KG");
  const [returnReason, setReturnReason] = useState("");
  const [returnKey, setReturnKey] = useState("");
  const [returning, setReturning] = useState(false);
  const [returnResult, setReturnResult] = useState(null);
  const [pendingReturn, setPendingReturn] = useState(null);
  const pendingReturnsRef = useRef(new Map());

  const isSale = billType === "SALE";
  const isB2B = bill.bill_type === "B2B";
  const party = bill.Party || {};
  const registeredItems = bill.SalesItems || bill.saleItems || bill.items || [];
  const quickSaleItems = (bill.QuickSaleItems || bill.quickSaleItems || []).map((item) => ({
    ...item,
    itemType: "QUICK_SALE",
    cartItemType: "QUICK_SALE",
    productName: item.productName || item.productNameSnapshot || "Quick Sale item",
    quantity: Number(item.quantity) || 0,
    paidQuantity: Number(item.quantity) || 0,
    price: Number(item.price ?? item.sellingPrice) || 0,
    netRate: Number(item.netRate ?? item.netAmount) || 0,
    total: Number(item.netRate ?? item.netAmount) || 0,
    taxPercentage: item.taxPercentage ?? null,
    taxAmount: item.taxAmount ?? null,
  }));
  const items = isSale && !isB2B
    ? [...registeredItems, ...quickSaleItems]
    : registeredItems;
  const hasPendingQuickSaleItems = Boolean(bill.gstClassificationPending) ||
    quickSaleItems.some((item) => item.gstVerificationStatus === "GST_PENDING");
  const companyBasic = companies?.[0] || companies || {};

  // Only B2B invoices get the "Modern" template option, and only when the
  // person has explicitly picked it in Settings → Bill Templates. Every
  // other case (B2C, or B2B with the default "classic" choice) renders
  // through the exact same path as before this feature existed.
  const savedBillTemplate = useBillTemplateStore((s) => s.billTemplate);
  const useNewTemplate = isB2B && savedBillTemplate === "modern";

  // ── Fetch real GST/bank data from the Financial API when the modern
  //    template is active (not on every render) ──
  useEffect(() => {
    if (!useNewTemplate || !companyBasic?.id) return;

    let cancelled = false;
    setLoadingFinancials(true);

    (async () => {
      const company = await fetchCompanyForInvoice(companyBasic.id, companyBasic);
      const adapted = adaptBillToInvoice(bill, party, items, company);
      if (!cancelled) {
        setInvoiceData(adapted);
        setLoadingFinancials(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNewTemplate, bill.id]); // re-fetch if the user opens a different bill

  useEffect(() => {
    if (!companyBasic?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchFinancialDetailsAPI(companyBasic.id);
        const financials = res?.data?.data || res?.data || {};
        if (!cancelled) setCompanyFinancials(financials);
      } catch (err) {
        console.error("Could not load company financial details:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyBasic?.id]);

  const companiesForDisplay = {
    ...companyBasic,
    financials: companyFinancials,
  };

  if (!bill) return null;

  function handlePrint() {
    const el = printRef.current;
    if (!el) {
      toast.error("Error: Unable to prepare invoice for printing");
      return;
    }
    try {
      window.print();
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to print invoice");
    }
  }

  function handleSavePDF() {
    const element = printRef.current;

    if (!element) {
      toast.error("Error: Unable to prepare invoice");
      return;
    }

    try {
      const options = {
        margin: 0,
        filename: `${bill.invoiceNumber || "Invoice"}.pdf`,
        image: {
          type: "jpeg",
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      };

      html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("PDF save error:", error);
      toast.error("Failed to save invoice as PDF");
    }
  }

  function openReturn(item) {
    const itemId = String(item.id || item.saleItemId);
    const pending = pendingReturnsRef.current.get(itemId);
    if (pending) {
      setReturnKey(pending.key);
      setReturnQuantity(String(pending.request.quantity));
      setReturnUnit(pending.request.quantityUnit);
      setReturnReason(pending.request.reason);
      setPendingReturn(pending);
    } else {
      const key =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `weight-return-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setReturnKey(key);
      setReturnQuantity("");
      const unit = isWeightProduct(item)
        ? item.quantityUnit || "KG"
        : item.quantityUnit || item.Product?.baseUnit || item.unit || "PCS";
      setReturnUnit(unit);
      setReturnReason("");
      setPendingReturn(null);
    }
    setReturnItem(item);
    setReturnResult(null);
  }

  async function submitWeightReturn(event) {
    event.preventDefault();
    const quantity = Number(returnQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a return quantity greater than zero");
      return;
    }

    const itemId = String(returnItem.id || returnItem.saleItemId);
    const pending =
      pendingReturnsRef.current.get(itemId) || {
        key: returnKey,
        request: {
          saleItemId: returnItem.id || returnItem.saleItemId,
          quantity,
          quantityUnit: returnUnit,
          reason: returnReason.trim(),
          idempotencyKey: returnKey,
        },
      };
    if (!pendingReturnsRef.current.has(itemId)) {
      pendingReturnsRef.current.set(itemId, pending);
    }
    setPendingReturn(pending);
    setReturning(true);
    try {
      const response = await returnSaleItemAPI(
        bill.id || bill._id,
        pending.request,
        pending.key,
      );
      const result = response?.data || response;
      setReturnResult(result);
      pendingReturnsRef.current.delete(itemId);
      toast.success("Inventory return recorded");
      try {
        await refreshProductsAfterInventoryChange("Inventory return");
      } catch (error) {
        console.error("Weight return succeeded, but inventory refresh failed:", error);
        toast.error("Return recorded, but inventory could not be refreshed");
      }
    } catch (error) {
      toast.error(error.message || "Failed to record inventory return");
    } finally {
      setReturning(false);
    }
  }

  const invoiceLabel = isB2B
    ? "TAX INVOICE"
    : isSale
      ? hasPendingQuickSaleItems
        ? "CASH BILL"
        : "INVOICE"
      : "PURCHASE BILL";
  const partyLabel = isSale ? "Billed To" : "Supplier";

  const LegacyTemplate = isB2B ? B2BInvoice : ThermalInvoice;
  const NewTemplate = isB2B ? B2BInvoiceTemplate : CustomizableInvoice;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}
    >
      {isSale && isB2B && items.length > 0 && (
        <section className="card" style={{ padding: "var(--sp-4)" }}>
          <h3 style={{ margin: "0 0 var(--sp-3)" }}>Sales returns</h3>
          <p className="text-muted" style={{ marginTop: 0 }}>
            Returns are validated and processed by the backend against the original sale allocation.
          </p>
          {items.map((item) => {
            const saleItemId = item.id || item.saleItemId;
            return (
              <div
                key={saleItemId || item.productId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--sp-3)",
                  padding: "var(--sp-2) 0",
                }}
              >
                <span>
                  {item.productName || item.Product?.name || "Product"} —{" "}
                  {getReadableQuantity(item)}
                  {(item.batchNumber || item.batchNo) && ` · Batch ${item.batchNumber || item.batchNo}`}
                  {item.itemRole === "GIFT" && " · FREE GIFT"}
                  {(Number(item.freeQuantity) > 0 || item.offerName) &&
                    ` · Paid ${item.paidQuantity ?? item.quantity}, Free ${item.freeQuantity || 0}`}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!saleItemId}
                  onClick={() => openReturn(item)}
                >
                  Return stock
                </Button>
              </div>
            );
          })}
          {returnResult && (
            <div className="alert alert-success" role="status">
              Remaining returnable: {formatQuantity(returnResult.remainingReturnableQuantity)} {returnUnit}
              {" · "}Updated stock: {formatQuantity(returnResult.stockQuantity)}
              {returnResult.replayed ? " · Previously processed request" : ""}
            </div>
          )}
        </section>
      )}
      {returnItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-return-title"
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setReturnItem(null);
          }}
        >
          <form
            className="modal"
            onSubmit={submitWeightReturn}
            style={{ maxWidth: 480, padding: "var(--sp-5)" }}
          >
            <h2 id="sale-return-title">Return sale item</h2>
            <p>
              {returnItem.productName || returnItem.Product?.name || "Product"} — sold{" "}
              {getReadableQuantity(returnItem)}
            </p>
            <p className="text-muted">
              The backend validates returnable quantity, restores the original batch, and applies configured financial adjustments.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="weight-return-quantity">Quantity</label>
              <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                <input
                  id="weight-return-quantity"
                  className="form-input"
                  type="number"
                  min={isWeightProduct(returnItem) ? "0.001" : "1"}
                  step={
                    isWeightProduct(returnItem)
                      ? returnUnit === "GRAM" ? "1" : "0.001"
                      : "1"
                  }
                  required
                  value={returnQuantity}
                  disabled={!!pendingReturn}
                  onChange={(event) => setReturnQuantity(event.target.value)}
                />
                {isWeightProduct(returnItem) ? (
                  <select
                    className="form-select"
                    value={returnUnit}
                    disabled={!!pendingReturn}
                    onChange={(event) => {
                      const nextUnit = event.target.value;
                      const baseQuantity = normalizeWeightQuantity(
                        returnQuantity,
                        returnUnit,
                      );
                      setReturnUnit(nextUnit);
                      setReturnQuantity(
                        nextUnit === "GRAM"
                          ? String(Number((baseQuantity * 1000).toFixed(3)))
                          : String(Number(baseQuantity.toFixed(3))),
                      );
                    }}
                  >
                    <option value="GRAM">GRAM</option>
                    <option value="KG">KG</option>
                  </select>
                ) : (
                  <span className="form-input" style={{ width: 90 }}>{returnUnit}</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="weight-return-reason">Reason</label>
              <input
                id="weight-return-reason"
                className="form-input"
                value={returnReason}
                disabled={!!pendingReturn}
                onChange={(event) => setReturnReason(event.target.value)}
                maxLength={500}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)" }}>
              <Button variant="ghost" type="button" onClick={() => setReturnItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={returning || !!returnResult}>
                {returning ? "Recording..." : pendingReturn ? "Retry return" : "Record stock return"}
              </Button>
            </div>
          </form>
        </div>
      )}
      <div className="page-header">
        <div
          className="page-header__left"
          style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "row",
            gap: "var(--sp-3)",
          }}
        >
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h1>Preview Invoice</h1>
        </div>

        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <Button variant="secondary" onClick={handleSavePDF} icon="📄">
            Save as PDF
          </Button>
          <Button variant="primary" onClick={handlePrint} icon="🖨️">
            Print Invoice
          </Button>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          // padding: "var(--sp-8)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          maxWidth: 880,
          margin: "0 auto",
          // width: '100%',
        }}
      >
        {useNewTemplate ? (
          loadingFinancials || !invoiceData ? (
            <div style={{ textAlign: "center", padding: "var(--sp-8)" }}>
              Loading company financial details...
            </div>
          ) : (
            <div ref={printRef} className="print-area invoice-modern">
              <NewTemplate
                invoice={invoiceData.invoice}
                company={invoiceData.company}
              />
            </div>
          )
        ) : (
          <LegacyTemplate
            bill={bill}
            companies={companiesForDisplay}
            party={party}
            items={items}
            invoiceLabel={invoiceLabel}
            partyLabel={partyLabel}
            printRef={printRef}
            showActionBar={false}
          />
        )}
      </div>
    </div>
  );
}
