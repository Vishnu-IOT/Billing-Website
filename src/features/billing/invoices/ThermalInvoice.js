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

import React, { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import useSettingsStore from "../../../store/settingsStore-DB";
import "./ThermalInvoice.css";
import { QRCodeSVG } from "qrcode.react";
import { getCompanyLogo } from "../../../utils/logo";

const ThermalInvoice = ({
  bill,
  companies,
  party,
  items,
  invoiceLabel,
  partyLabel,
  printRef,
}) => {
  const finalSettings = useSettingsStore(
    useShallow((s) => ({
      printerWidth: s.printerWidth,
      defaultTaxRate: s.defaultTaxRate,
      receiptHeader: s.receiptHeader,
      receiptFooter: s.receiptFooter,
      showUpiQr: s.showUpiQr,
    })),
  );

  console.log(bill);
  console.log(finalSettings.showUpiQr);
  // const printerWidth = finalSettings.printerWidth || '80';

  const [isLoading, setIsLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // B2C BILL DATA
  // Same data structure used by B2CInvoice
  // ═══════════════════════════════════════════════════════════════════════════

  const invoiceNumber = bill?.invoiceNumber || "";

  const invoiceDate = bill?.saleDate || bill?.purchaseDate || new Date();

  const customerName =
    bill?.Customer?.name ||
    bill?.customerName ||
    bill?.name ||
    "Walk-in Customer";

  const customerPhone =
    bill?.Customer?.phone || bill?.customerPhone || bill?.phone || "";

  const paymentMethod = bill?.paymentMethod || "";

  // ═══════════════════════════════════════════════════════════════════════════
  // Calculate Totals
  // ═══════════════════════════════════════════════════════════════════════════

  const calculateTotals = () => {
    const itemsTotal =
      items?.reduce((sum, item) => {
        const quantity = Number(item?.quantity) || 1;

        const price = Number(item?.price) || 0;

        return sum + quantity * price;
      }, 0) || 0;

    const discountAmount =
      Number(bill?.discountAmount ?? bill?.globalDiscount ?? 0) || 0;

    const subtotal = Number(bill?.baseRate) || itemsTotal - discountAmount;

    const taxAmount = Number(bill?.tax) || 0;

    const total = Number(bill?.totalAmount) || subtotal + taxAmount;

    const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

    return {
      itemsTotal,
      discountAmount,
      subtotal,
      taxRate,
      taxAmount,
      total,
    };
  };

  const totals = calculateTotals();

  // Round off calculation
  const actualTotal = Number(totals.itemsTotal) || 0;
  const roundedTotal = Math.round(actualTotal);
  console.log("Actual Total:", actualTotal);
  console.log("Rounded Total:", roundedTotal);

  const roundOff = Number((roundedTotal - actualTotal).toFixed(2));
  console.log("Round Off:", roundOff);

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
      className={`thermal-invoice thermal-${finalSettings.printerWidth}mm`}
    >
      {/* ═════════════════════════════════════════════════════════════════════
          Button Section
      ═════════════════════════════════════════════════════════════════════ */}

      <div className="thermal-controls">
        <button type="button" onClick={handlePrint} disabled={isLoading}>
          {isLoading ? "Preparing..." : "Print Receipt"}
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          Thermal Receipt Content
      ═════════════════════════════════════════════════════════════════════ */}

      <div
        // ref={printRef}
        className="thermal-receipt"
      >
        {/* ═══════════════════════════════════════════════════════════════════
            Header
        ═══════════════════════════════════════════════════════════════════ */}

        <div className="thermal-header">
          <div className="header-company">
            {getCompanyLogo(companies) && (
              <img
                src={getCompanyLogo(companies)}
                alt="Logo"
                className="thermal-logo"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <p className="company-name">
              {companies?.legal_name || companies?.name || "COMPANY NAME"}
            </p>
          </div>

          {finalSettings.receiptHeader && (
            <p className="receipt-header">{finalSettings.receiptHeader}</p>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Invoice Info
        ═══════════════════════════════════════════════════════════════════ */}

        <div className="thermal-invoice-info">
          <div className="info-line">
            <span>Invoice #:</span>
            <span>{invoiceNumber}</span>
          </div>

          <div className="info-line">
            <span>Date:</span>
            <span>{new Date(invoiceDate).toLocaleDateString()}</span>
          </div>

          <div className="info-line">
            <span>Time:</span>
            <span>
              {bill?.createdAt
                ? new Date(bill.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    // second: '2-digit',
                    hour12: true,
                  })
                : "--"}
            </span>
          </div>

          <div className="info-line">
            <span>Staff Name:</span>
            <span>{bill?.User?.name || "Store Manager"}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Customer Info
        ═══════════════════════════════════════════════════════════════════ */}

        <div className="thermal-customer">
          <p className="label">{partyLabel || "Customer"}:</p>

          {/* <p className="value">
            {customerName}
          </p> */}

          <div className="info-line">
            <span>Name:</span>
            <span>{customerName}</span>
          </div>

          {customerPhone && (
            // <p className="value">
            //   {customerPhone}
            // </p>
            <div className="info-line">
              <span>Phone:</span>
              <span>+91 {customerPhone}</span>
            </div>
          )}
        </div>

        <div className="separator-line">- - - - - - - - - - - - - - - - -</div>

        {/* ═══════════════════════════════════════════════════════════════════
    Items Table
═══════════════════════════════════════════════════════════════════ */}

        <div className="thermal-items">
          <table className="thermal-items-table">
            <thead>
              <tr>
                <th className="item-col-name">Item</th>
                {/* <th className="item-col-rate">Rate</th> */}
                <th className="item-col-qty">Qty</th>
                <th className="item-col-rate">Rate</th>
                <th className="item-col-rate">Dis</th>
                <th className="item-col-amount">Amount</th>
              </tr>
            </thead>

            <tbody>
              {items?.map((item, index) => {
                const itemName =
                  item?.productName ||
                  item?.product?.name ||
                  item?.name ||
                  "Item";

                const quantity = Number(item?.quantity) || 1;

                // const rate = Number(item?.price) || 0;

                const baserate = Number(item?.price) || 0;

                const discount = Number(item?.discountAmount) || 0;

                const amount =
                  (Number(item?.baseRate) || quantity * baserate) - discount;

                return (
                  <tr key={index}>
                    {/* ITEM NAME */}
                    <td className="item-col-name">
                      <div className="item-name">{itemName}</div>

                      {item?.description && (
                        <div className="item-desc">{item.description}</div>
                      )}
                    </td>

                    {/* RATE */}
                    {/* <td className="item-col-rate">₹{rate.toFixed(2)}</td> */}

                    {/* QUANTITY */}
                    <td className="item-col-qty">{quantity}</td>

                    {/* BASE RATE */}
                    <td className="item-col-rate">₹{baserate.toFixed(2)}</td>

                    {/* DISCOUNT */}
                    <td className="item-col-rate">
                      {discount > 0 ? `-₹${discount.toFixed(2)}` : "-"}
                    </td>

                    {/* AMOUNT */}
                    <td className="item-col-amount">₹{amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="separator-line">- - - - - - - - - - - - - - - - -</div>

        {/* ═══════════════════════════════════════════════════════════════════
            Totals
        ═══════════════════════════════════════════════════════════════════ */}

        <div className="thermal-totals">
          <div className="total-line">
            <span>Subtotal:</span>

            <span className="amount">₹{totals.subtotal.toFixed(2)}</span>
          </div>

          {totals.discountAmount > 0 && (
            <div className="total-line discount">
              <span>Discount:</span>

              <span className="amount">
                -₹{totals.discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {totals.taxAmount > 0 && (
            <div className="total-line tax">
              <span>Tax %:</span>

              <span className="amount">₹{totals.taxAmount.toFixed(2)}</span>
            </div>
          )}

          {/* ROUND OFF */}
          {/* <div className="total-line">
            <span>Round Off:</span>
            <span className="amount">
              {roundOff > 0 ? "+" : ""}
              {roundOff < 0 ? "-" : ""}₹{Math.abs(roundOff).toFixed(2)}
            </span>
          </div> */}

          <div className="total-line grand-total">
            <span className="label">TOTAL:</span>

            <span className="amount">₹{totals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Payment Method
        ═══════════════════════════════════════════════════════════════════ */}

        {paymentMethod && (
          <div className="thermal-payment">
            <p className="label">Payment Mode: {paymentMethod}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            QR Code
        ═══════════════════════════════════════════════════════════════════ */}

        {finalSettings.showUpiQr && (
          <div className="thermal-qr">
            {/* <img
              src={bill.qrCode}
              alt="QR"
              className="qr-image"
            /> */}
            <QRCodeSVG
              value={upiLink}
              size={finalSettings.printerWidth === "58" ? 90 : 110}
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
            Footer
        ═══════════════════════════════════════════════════════════════════ */}

      <div className="thermal-footer">
        {finalSettings.receiptFooter && (
          <p className="footer-text">{finalSettings.receiptFooter}</p>
        )}

        <p className="footer-text thank-you">Thank You!</p>

        <p className="footer-text">Visit Again</p>

        {companies?.companyPhone && (
          <p className="footer-text">{companies.companyPhone}</p>
        )}

        {companies?.phone && !companies?.companyPhone && (
          <p className="footer-text">{companies.phone}</p>
        )}

        <p className="footer-text">Date: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default ThermalInvoice;
