/*
═══════════════════════════════════════════════════════════════════════════════
FILE: ThermalInvoice.js

DESCRIPTION:
Thermal invoice template for 58mm / 80mm printers.

Props are now aligned with B2CInvoice:
- bill
- companies
- party
- items
- invoiceLabel
- partyLabel
- printRef

The thermal design and CSS classes are preserved.
═══════════════════════════════════════════════════════════════════════════════
*/

import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import useSettingsStore from "../../../store/settingsStore-DB";
import "./ThermalInvoice.css";
import { QRCodeSVG } from "qrcode.react";
import {
  formatQuantity,
  getReadableQuantity,
} from "../../../utils/quantityUnits";
import { getCompanyLogo } from "../../../utils/logo";
import { numberToWords } from "../../../utils/numbers";

const ThermalInvoice = ({
  bill,
  companies,
  party,
  items,
  invoiceLabel,
  partyLabel,
  printRef,
  showActionBar = true,
  showBatch = true,
}) => {
  const finalSettings = useSettingsStore(
    useShallow((s) => ({
      printerWidth: s.printerWidth,
      defaultTaxRate: s.defaultTaxRate,
      receiptHeader: s.receiptHeader,
      receiptFooter: s.receiptFooter,
      showUpiQr: s.showUpiQr,
      termsAndConditions: s.termsAndConditions,
      showSignature: s.showSignature,
    })),
  );

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const pageStyle = document.createElement("style");
    const updatePageSize = () => {
      const invoice = printRef?.current ||
        document.getElementById("thermal-bill-print");
      const receipt = invoice?.querySelector(".thermal-receipt");
      const receiptHeight = receipt?.getBoundingClientRect().height;
      if (!receiptHeight) return;

      const width = Number(finalSettings.printerWidth) === 58 ? 58 : 80;
      const height = Math.ceil(
        (receiptHeight * 25.4 / 96 + 0.5) * 10,
      ) / 10;
      pageStyle.textContent =
        `@page { size: ${width}mm ${height}mm; margin: 0; }`;
    };

    document.head.appendChild(pageStyle);
    updatePageSize();
    window.addEventListener("beforeprint", updatePageSize);

    return () => {
      window.removeEventListener("beforeprint", updatePageSize);
      pageStyle.remove();
    };
  }, [finalSettings.printerWidth, printRef]);

  // ═══════════════════════════════════════════════════════════════════════════
  // B2C BILL DATA
  // Same data structure used by B2CInvoice
  // ═══════════════════════════════════════════════════════════════════════════

  const invoiceNumber = bill?.invoiceNumber || "";
  const isB2C = bill?.bill_type === "B2C" || bill?.billType === "B2C";
  const hasPendingQuickSaleItems = Boolean(bill?.gstClassificationPending) ||
    (items || []).some(
      (item) =>
        (item?.cartItemType === "QUICK_SALE" || item?.itemType === "QUICK_SALE") &&
        item?.gstVerificationStatus === "GST_PENDING",
    );
  const companyLogo = getCompanyLogo(companies);

  const invoiceDate = bill?.saleDate || bill?.purchaseDate || new Date();

  const customerName =
    bill?.Customer?.name ||
    bill?.customerName ||
    bill?.name ||
    "Walk-in Customer";

  const customerPhone =
    bill?.Customer?.phone || bill?.customerPhone || bill?.phone || "";
  const customerAddress =
    bill?.Customer?.address || bill?.customerAddress || party?.address || "";

  const paymentMethod = bill?.paymentMethod || "";

  // ═══════════════════════════════════════════════════════════════════════════
  // Calculate Totals
  // ═══════════════════════════════════════════════════════════════════════════

  const savedLineAmount = (item) => {
    const savedAmount = item?.netRate ?? item?.total;
    if (
      savedAmount !== undefined &&
      savedAmount !== null &&
      savedAmount !== ""
    ) {
      return Number(savedAmount) || 0;
    }

    const savedBase = item?.baseRate ?? item?.base_rate ?? item?.baserate;
    const savedTax = item?.taxAmount ?? item?.tax_amount;
    if (savedBase !== undefined && savedBase !== null && savedBase !== "") {
      return (
        (Number(savedBase) || 0) +
        (savedTax !== undefined && savedTax !== null
          ? Number(savedTax) || 0
          : 0)
      );
    }

    return 0;
  };

  const totals = {
    discountAmount:
      Number(bill?.discountAmount ?? bill?.globalDiscount ?? 0) || 0,
    roundOff: Number(bill?.roundOff) || 0,
    total:
      bill?.totalAmount !== undefined && bill?.totalAmount !== null
        ? Number(bill.totalAmount) || 0
        : bill?.baseRate !== undefined && bill?.baseRate !== null
          ? (Number(bill.baseRate) || 0) + (Number(bill?.tax) || 0)
          : (items || []).reduce((sum, item) => {
              const savedAmount = item?.netRate ?? item?.total;
              if (
                savedAmount !== undefined &&
                savedAmount !== null &&
                savedAmount !== ""
              ) {
                return sum + (Number(savedAmount) || 0);
              }

              const hasSavedBase = [
                item?.baseRate,
                item?.base_rate,
                item?.baserate,
              ].some(
                (value) =>
                  value !== undefined && value !== null && value !== "",
              );
              if (hasSavedBase) {
                return sum + savedLineAmount(item);
              }

              const quantity =
                Number(
                  isB2C
                    ? (item?.paidQuantity ?? item?.quantity)
                    : item?.quantity,
                ) || 0;
              return (
                sum +
                Math.max(
                  0,
                  quantity * (Number(item?.price) || 0) -
                    (Number(item?.discountAmount) || 0),
                ) +
                (Number(item?.taxAmount ?? item?.tax_amount) || 0)
              );
            }, 0),
  };
  const pendingQuickSaleSubtotal = (items || []).reduce((sum, item) => {
    const isQuickSale =
      item?.cartItemType === "QUICK_SALE" || item?.itemType === "QUICK_SALE";
    if (!isQuickSale || item?.gstVerificationStatus !== "GST_PENDING") {
      return sum;
    }
    return sum + savedLineAmount(item);
  }, 0);
  const subtotal =
    (Number(bill?.baseRate ?? bill?.subtotal ?? bill?.base_rate) || 0) +
    pendingQuickSaleSubtotal;
  const taxAmount =
    Number(
      bill?.tax ??
        bill?.totalTax ??
        (items || []).reduce(
            (sum, item) =>
              sum + (Number(item?.taxAmount ?? item?.tax_amount) || 0),
            0,
        ),
    ) || 0;

  const taxSummary = (items || []).reduce((summary, item) => {
    const taxAmount = item?.taxAmount ?? item?.tax_amount;
    if (taxAmount === undefined || taxAmount === null || taxAmount === "") {
      return summary;
    }

    const rate =
      Number(
        item?.taxPercentage ??
          item?.taxRate ??
          item?.tax_rate ??
          item?.gstPercentage ??
          0,
      ) || 0;
    const savedCgst = item?.cgstAmount ?? item?.cgst_amount;
    const savedSgst = item?.sgstAmount ?? item?.sgst_amount;
    const cgst = Number(savedCgst);
    const sgst = Number(savedSgst);
    const savedTaxAmount = Number(taxAmount) || 0;
    const fallbackCgst = Number((savedTaxAmount / 2).toFixed(2));
    const fallbackSgst = Number((savedTaxAmount - fallbackCgst).toFixed(2));

    if (!summary[rate]) {
      summary[rate] = { cgst: 0, sgst: 0 };
    }

    summary[rate].cgst +=
      savedCgst !== undefined &&
      savedCgst !== null &&
      savedCgst !== "" &&
      Number.isFinite(cgst)
        ? cgst
        : fallbackCgst;
    summary[rate].sgst +=
      savedSgst !== undefined &&
      savedSgst !== null &&
      savedSgst !== "" &&
      Number.isFinite(sgst)
        ? sgst
        : fallbackSgst;
    return summary;
  }, {});
  const taxSummaryRows = Object.entries(taxSummary)
    .sort(([rateA], [rateB]) => Number(rateA) - Number(rateB))
    .filter(
      ([rate, values]) => Number(rate) > 0 && values.cgst + values.sgst > 0,
    );

  const itemCount = new Set(
    (items || [])
      .filter((item) => item?.itemRole !== "GIFT")
      .map(
        (item, index) =>
          item?.productId ??
          item?.product?.id ??
          item?.productName ??
          item?.name ??
          index,
      ),
  ).size;
  const totalQuantity = (items || []).reduce(
    (sum, item) => sum + (Number(item?.totalQuantity ?? item?.quantity) || 0),
    0,
  );
  const currentPoints =
    bill?.loyaltyPointsBalance === null ||
    bill?.loyaltyPointsBalance === undefined
      ? null
      : Number(bill.loyaltyPointsBalance) || 0;
  const pointsEarned = Number(bill?.loyaltyPointsEarned) || 0;
  const pointsRedeemed = Number(bill?.loyaltyPointsRedeemed) || 0;
  const loyaltyRedemptionAmount =
    Number(bill?.loyaltyRedemptionAmount) || 0;
  const openingPoints =
    currentPoints === null
      ? null
      : Math.max(0, currentPoints - pointsEarned + pointsRedeemed);
  const couponAmount =
    Number(
      bill?.couponAmount ?? bill?.couponDiscount ?? bill?.coupon_amount ?? 0,
    ) || 0;
  // const companyAddress =
  //   companies?.address ||
  //   companies?.companyAddress ||
  //   companies?.businessAddress ||
  //   [
  //     companies?.addressLine1 ||
  //       companies?.address_line1 ||
  //       companies?.address_line_1,
  //     companies?.addressLine2 ||
  //       companies?.address_line2 ||
  //       companies?.address_line_2,
  //     companies?.city,
  //     companies?.state || companies?.state_code,
  //     companies?.pincode || companies?.postalCode,
  //   ]
  //     .filter(Boolean)
  //     .join(", ");
  const addressLine1 =
    companies?.addressLine1 ||
    companies?.address_line1 ||
    companies?.address_line_1;

  const addressLine2 =
    companies?.addressLine2 ||
    companies?.address_line2 ||
    companies?.address_line_2;

  const remainingAddress = [
    addressLine2,
    companies?.city,
    companies?.state || companies?.state_code,
    companies?.pincode || companies?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const companyAddress = [
    addressLine1 ||
      companies?.address ||
      companies?.companyAddress ||
      companies?.businessAddress,
    remainingAddress,
  ]
    .filter(Boolean)
    .join("\n");
  const companyPhone =
    companies?.companyPhone || companies?.phone || companies?.mobile || "";
  const gstNumber =
    companies?.financials?.gstin ||
    companies?.companyGstin ||
    companies?.gstin ||
    companies?.gstNumber ||
    companies?.gst_no ||
    "";
  const billTypeLabel =
    hasPendingQuickSaleItems && isB2C
      ? "CASH BILL"
      : bill?.bill_type === "B2B" || bill?.billType === "B2B"
      ? invoiceLabel || "TAX INVOICE"
      : bill?.purchaseDate
        ? invoiceLabel || "PURCHASE BILL"
        : "CASH BILL";
  const dateLabel = new Date(invoiceDate).toLocaleDateString("en-GB");
  const timeLabel = bill?.createdAt
    ? new Date(bill.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--";

  // ═══════════════════════════════════════════════════════════════════════════
  // Print Function
  // ═══════════════════════════════════════════════════════════════════════════

  const handlePrint = () => {
    setIsLoading(true);

    setTimeout(() => {
      window.print();
      setIsLoading(false);
    }, 500);
  };

  const upiId = "vishnubharani153@oksbi";

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        bill?.legal_name ||
          bill?.companyName ||
          companies?.legal_name ||
          companies?.name ||
          "Store",
      )}&am=${totals.total || 0}&cu=INR&tn=${
        bill?.invoiceNo || bill?.invoiceNumber || "Bill"
      }`
    : null;

  return (
    <div
      ref={printRef}
      id="thermal-bill-print"
      className={`thermal-invoice thermal-reference${isB2C ? " thermal-invoice--b2c" : ""} thermal-${finalSettings.printerWidth}mm`}
    >
      {showActionBar && (
        <div className="thermal-controls">
          <button type="button" onClick={handlePrint} disabled={isLoading}>
            {isLoading ? "Preparing..." : "Print Receipt"}
          </button>
        </div>
      )}

      <div className="thermal-receipt receipt-reference">
        <header className="receipt-reference__header">
          {companyLogo && (
            <img
              className="thermal-company-logo"
              src={companyLogo}
              alt={`${companies?.display_name || companies?.legal_name || companies?.name || "Company"} logo`}
            />
          )}
          <h1 className="receipt-reference__shop-name">
            {companies?.display_name ||
              companies?.legal_name ||
              companies?.name ||
              "COMPANY NAME"}
          </h1>
          {companyAddress && (
            <p className="receipt-reference__header-line">{companyAddress}</p>
          )}
          {companyPhone && (
            <p className="receipt-reference__header-line">
              Phone: {companyPhone}
            </p>
          )}
          {gstNumber && (
            <p className="receipt-reference__header-line">GSTIN: {gstNumber}</p>
          )}
          {finalSettings.receiptHeader && (
            <p className="receipt-reference__header-line">
              {finalSettings.receiptHeader}
            </p>
          )}
          <p className="receipt-reference__bill-type">{billTypeLabel}</p>
        </header>

        <section className="receipt-reference__details">
          <div className="receipt-reference__detail--left">
            <span>Bill No:</span>
            <strong className="receipt-reference__bill-number">
              {invoiceNumber || "--"}
            </strong>
          </div>
          <div className="receipt-reference__detail--right">
            <span>Time:</span>
            <strong>{timeLabel}</strong>
          </div>
          <div className="receipt-reference__detail--left">
            <span>Date:</span>
            <strong>{dateLabel}</strong>
          </div>
          <div className="receipt-reference__detail--right">
            <span>Cashier:</span>
            <strong>{bill?.User?.name || "Store Manager"}</strong>
          </div>
          {/* <div className="receipt-reference__customer">
            <span>{partyLabel || "Customer"}:</span>
            <strong>
              {customerName !== "Walk-in Customer"
                ? customerName
                : party?.name || customerName}
            </strong>
          </div>
          {(customerPhone || party?.phone) && (
            <div className="receipt-reference__customer">
              <span>Phone:</span>
              <strong>{customerPhone || party.phone}</strong>
            </div>
          )} */}
        </section>

         <section className="receipt-reference__details">
          <div className="receipt-reference__customer">
            <span>{partyLabel || "Customer"}:</span>
            <strong>
              {customerName !== "Walk-in Customer"
                ? customerName
                : party?.name || customerName}
            </strong>
          </div>
          {(customerPhone || party?.phone) && (
            <div className="receipt-reference__customer">
              <span>Phone:</span>
              <strong>{customerPhone || party.phone}</strong>
            </div>
          )}
          {customerAddress && (
            <div className="receipt-reference__customer">
              <span>Address:</span>
              <strong>{customerAddress}</strong>
            </div>
          )}
        </section>

        <table className="receipt-reference__items">
          <colgroup>
            <col className="receipt-reference__col-sl" />
            <col className="receipt-reference__col-description" />
            <col className="receipt-reference__col-mrp" />
            <col className="receipt-reference__col-rate" />
            <col className="receipt-reference__col-qty" />
            <col className="receipt-reference__col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th>SL</th>
              <th>Description</th>
              <th>MRP</th>
              <th>Rate</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((item, index) => {
              const itemName =
                item?.productName ||
                item?.product?.name ||
                item?.name ||
                "Item";
              const quantity = Number(item?.quantity) || 0;
              const freeQuantity = Number(item?.freeQuantity) || 0;
              const paidQuantity = Number(
                item?.paidQuantity ?? Math.max(0, quantity - freeQuantity),
              );
              const isGift = item?.itemRole === "GIFT";
              const billedQuantity = isB2C ? paidQuantity : quantity;
              const savedAmount = item?.netRate ?? item?.total;
              const hasSavedLineValue = [
                item?.baseRate,
                item?.base_rate,
                item?.baserate,
              ].some(
                (value) =>
                  value !== undefined && value !== null && value !== "",
              );
              const amount = isGift
                ? 0
                : savedAmount !== undefined &&
                    savedAmount !== null &&
                    savedAmount !== ""
                  ? Number(savedAmount) || 0
                  : hasSavedLineValue
                    ? savedLineAmount(item)
                    : Math.max(
                        0,
                        billedQuantity * (Number(item?.price) || 0) -
                          (Number(item?.discountAmount) || 0),
                      ) + (Number(item?.taxAmount ?? item?.tax_amount) || 0);
              const rate = Number(item?.price) || 0;
              const quantityUnit =
                item?.enteredQuantityUnit || item?.quantityUnit || "";
              const unitSuffix =
                quantityUnit === "KG"
                  ? " kg"
                  : quantityUnit === "GRAM"
                    ? " g"
                    : quantityUnit && quantityUnit !== "PCS"
                      ? ` ${quantityUnit}`
                      : "";
              const quantityLabel =
                isB2C && freeQuantity > 0 && !isGift
                  ? `${formatQuantity(paidQuantity)}+${formatQuantity(freeQuantity)}${unitSuffix}`
                  : getReadableQuantity(item);
              const mrp = item?.mrp ?? item?.MRP;
              const discountPercentage =
                Number(item?.discountPercentage) || 0;

              return (
                <tr key={`${item?.id ?? item?.productId ?? itemName}-${index}`}>
                  <td className="receipt-reference__number">{index + 1}</td>
                  <td className="receipt-reference__description">
                    <strong>{itemName}</strong>
                    {item?.description && <span>{item.description}</span>}
                    {discountPercentage > 0 && (
                      <span>Discount: {discountPercentage}%</span>
                    )}
                    {showBatch && (item?.batchNumber || item?.batchNo) && (
                      <span>Batch: {item.batchNumber || item.batchNo}</span>
                    )}
                    {isGift && (
                      <span>
                        FREE GIFT
                        {(item?.promotionName || item?.offerName) &&
                          ` · ${item.promotionName || item.offerName}`}
                      </span>
                    )}
                  </td>
                  <td className="receipt-reference__numeric">
                    {mrp == null ? "-" : (Number(mrp) || 0).toFixed(2)}
                  </td>
                  <td className="receipt-reference__numeric">
                    {isGift ? "FREE" : rate.toFixed(2)}
                  </td>
                  <td className="receipt-reference__numeric">
                    {quantityLabel}
                  </td>
                  <td className="receipt-reference__numeric">
                    {/* {isGift ? "FREE" : Math.round(amount)} */}
                    {isGift ? "FREE" : amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="receipt-reference__summary">
          <div className="receipt-reference__summary-line">
            <span>Items: {itemCount}</span>
            <span>Total Qty: {formatQuantity(totalQuantity)}</span>
          </div>
          <div className="receipt-reference__summary-line">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="receipt-reference__summary-line">
              <span>Discount:</span>
              <span>-₹{totals.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="receipt-reference__summary-line">
              <span>Tax Amount:</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
          )}
          {couponAmount > 0 && (
            <div className="receipt-reference__summary-line">
              <span>Coupon Amount:</span>
              <span>₹{couponAmount.toFixed(2)}</span>
            </div>
          )}
          {totals.roundOff !== 0 && (
            <div className="receipt-reference__summary-line">
              <span>Total before round-off:</span>
              <span>₹{(totals.total - totals.roundOff).toFixed(2)}</span>
            </div>
          )}
          <div className="receipt-reference__summary-line">
            <span>Round-off:</span>
            <span>
              {totals.roundOff > 0 ? "+" : totals.roundOff < 0 ? "-" : ""}
              ₹{Math.abs(totals.roundOff).toFixed(2)}
            </span>
          </div>
          <div className="receipt-reference__grand-total">
            <span>GRAND TOTAL</span>
            <strong>₹{totals.total.toFixed(2)}</strong>
          </div>
          {(Number(bill?.returnCreditAmount) > 0 ||
            loyaltyRedemptionAmount > 0) && (
            <>
              {Number(bill?.returnCreditAmount) > 0 && (
                <div className="receipt-reference__summary-line">
                  <span>Return credit:</span>
                  <span>-₹{Number(bill.returnCreditAmount).toFixed(2)}</span>
                </div>
              )}
              {loyaltyRedemptionAmount > 0 && (
                <div className="receipt-reference__summary-line">
                  <span>
                    Loyalty points redeemed ({pointsRedeemed}):
                  </span>
                  <span>-₹{loyaltyRedemptionAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="receipt-reference__grand-total">
                <span>FINAL TOTAL</span>
                <strong>
                  ₹
                  {Math.max(
                    0,
                    totals.total -
                      Number(bill?.returnCreditAmount || 0) -
                      loyaltyRedemptionAmount,
                  ).toFixed(2)}
                </strong>
              </div>
            </>
          )}
          {bill?.amountReceived !== undefined &&
            bill?.amountReceived !== null && (
              <div className="receipt-reference__summary-line">
                <span>Amount Received:</span>
                <span>₹{(Number(bill.amountReceived) || 0).toFixed(2)}</span>
              </div>
            )}
          {Number(bill?.amountReturned) > 0 && (
            <div className="receipt-reference__summary-line">
              <span>Amount Returned:</span>
              <span>₹{Number(bill.amountReturned).toFixed(2)}</span>
            </div>
          )}
          {Number(bill?.todaySavings) > 0 && (
            <div className="receipt-reference__summary-line">
              <span>Today's Savings:</span>
              <span>₹{Number(bill.todaySavings).toFixed(2)}</span>
            </div>
          )}
        </section>

        <section className="receipt-reference__amount-words">
          <strong>Amount in words:</strong>
          <span>{numberToWords(Math.round(totals.total))}</span>
        </section>

        {openingPoints !== null && (
          <section className="receipt-reference__points">
            <p>Opening Points: {openingPoints}</p>
            {pointsRedeemed > 0 && (
              <p>Points Redeemed: {pointsRedeemed}</p>
            )}
            {pointsEarned > 0 && <p>Points Earned: {pointsEarned}</p>}
            <p>Current Points: {currentPoints}</p>
          </section>
        )}

        {taxSummaryRows.length > 0 && (
          <section className="receipt-reference__tax">
            <h2>GST SUMMARY</h2>
            {taxSummaryRows.map(([rate, values]) => (
              <div key={rate}>
                <span>CGST {Number(rate) / 2}% =</span>
                <strong>₹{values.cgst.toFixed(2)}</strong>
                <span>SGST {Number(rate) / 2}% =</span>
                <strong>₹{values.sgst.toFixed(2)}</strong>
              </div>
            ))}
          </section>
        )}

        {paymentMethod && (
          <p className="receipt-reference__payment">
            Payment Mode: {paymentMethod}
          </p>
        )}

        {finalSettings.showUpiQr && (
          <div className="thermal-qr">
            <QRCodeSVG
              value={upiLink}
              size={finalSettings.printerWidth === "58" ? 90 : 110}
            />
          </div>
        )}

        <section className="receipt-reference__terms">
          <strong>Terms &amp; Conditions</strong>
          <div>
            {finalSettings.termsAndConditions || (
              <>
                <p>Goods once sold will not be taken back.</p>
                <p>Subject to local jurisdiction.</p>
              </>
            )}
          </div>
        </section>

        {finalSettings.showSignature && (
          <div className="receipt-reference__signature">
            <span>Authorized Signatory</span>
          </div>
        )}

        <footer className="receipt-reference__footer">
          {finalSettings.receiptFooter && <p>{finalSettings.receiptFooter}</p>}
          <p className="receipt-reference__stars">* * * * * * * * * *</p>
          <strong>THANK YOU! VISIT AGAIN!</strong>
          {companyPhone && <p>{companyPhone}</p>}
        </footer>
      </div>
    </div>
  );
};

export default ThermalInvoice;
