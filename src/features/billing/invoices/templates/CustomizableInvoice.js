/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: CustomizableInvoice.js
   LOCATION: frontend/src/features/billing/CustomizableInvoice.js
   DESCRIPTION: Fully customizable invoice template - Standard/A4 size
   ═══════════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import useSettingsStore from '../../../../store/settingsStore-DB';
import './CustomizableInvoice.css';

const CustomizableInvoice = ({ invoice, company, settings: overrideSettings }) => {
  const settings = useSettingsStore((s) => s.getSettings?.()) || {};
  const finalSettings = { ...settings, ...overrideSettings };

  const [templateTheme, setTemplateTheme] = useState(finalSettings.billTheme || 'classic');
  const [showQR, setShowQR] = useState(finalSettings.showUpiQr || false);

  // ═══ Calculate Totals ═══
  const calculateTotals = () => {
    const itemsTotal = invoice.items?.reduce((sum, item) => {
      return sum + (item.quantity * item.rate);
    }, 0) || 0;

    const discountAmount = (itemsTotal * (invoice.discount || 0)) / 100;
    const subtotal = itemsTotal - discountAmount;

    const taxRate = finalSettings.defaultTaxRate || 18;
    const taxAmount = (subtotal * taxRate) / 100;

    const total = subtotal + taxAmount;

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

  // ═══ GST Split (IGST, SGST, CGST) ═══
  const getGSTSplit = () => {
    const isSameState = invoice.billingState === invoice.shippingState;
    
    if (isSameState) {
      // Same state: SGST + CGST (split equally)
      return {
        sgst: totals.taxAmount / 2,
        cgst: totals.taxAmount / 2,
        igst: 0,
      };
    } else {
      // Different state: IGST
      return {
        sgst: 0,
        cgst: 0,
        igst: totals.taxAmount,
      };
    }
  };

  const gstSplit = getGSTSplit();

  // ═══ Amount in Words ═══
  const amountInWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertGroup = (num) => {
      if (num === 0) return '';
      if (num < 10) return ones[num];
      if (num < 20) return teens[num - 10];
      const tenDigit = Math.floor(num / 10);
      const oneDigit = num % 10;
      return tens[tenDigit] + (oneDigit ? ' ' + ones[oneDigit] : '');
    };

    const num = Math.floor(amount);
    const decimal = Math.round((amount - num) * 100);

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const remainder = num % 100;

    let words = '';
    if (crores) words += convertGroup(crores) + ' Crore ';
    if (lakhs) words += convertGroup(lakhs) + ' Lakh ';
    if (thousands) words += convertGroup(thousands) + ' Thousand ';
    if (hundreds) words += convertGroup(hundreds) + ' Hundred ';
    if (remainder) words += convertGroup(remainder) + ' ';

    words += 'Rupees';
    if (decimal) words += ' and ' + decimal + ' Paise';

    return words.trim();
  };

  return (
    <div className={`customizable-invoice invoice-theme-${templateTheme}`}>
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="invoice-header">
        <div className="company-info">
          <div className="company-logo-section">
            {company?.logo && <img src={company.logo} alt="Company Logo" className="company-logo" />}
            <div className="company-name">{company?.name || 'Your Company'}</div>
          </div>

          <div className="invoice-title-section">
            <h1 className="invoice-title">INVOICE</h1>
            <div className="invoice-details">
              <div className="detail-row">
                <span className="label">Invoice No.</span>
                <span className="value">{invoice.invoiceNumber || 'INV-001'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Invoice Date</span>
                <span className="value">{new Date(invoice.date).toLocaleDateString(finalSettings.dateFormat || 'en-IN')}</span>
              </div>
              <div className="detail-row">
                <span className="label">Due Date</span>
                <span className="value">{new Date(invoice.dueDate).toLocaleDateString(finalSettings.dateFormat || 'en-IN')}</span>
              </div>
            </div>
          </div>

          {showQR && invoice.qrCode && (
            <div className="qr-code-section">
              <img src={invoice.qrCode} alt="Payment QR" className="qr-code" />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════ ADDRESSES ═══════════════════════ */}
      <div className="addresses-section">
        <div className="address-block">
          <h3 className="block-title">FROM</h3>
          <div className="company-address">
            <p className="address-line"><strong>{company?.name}</strong></p>
            <p className="address-line">{company?.address}</p>
            <p className="address-line">{company?.city}, {company?.state} {company?.zipCode}</p>
            <p className="address-line">Phone: {company?.phone}</p>
            <p className="address-line">Email: {company?.email}</p>
            <p className="address-line">GST: {company?.gstNumber}</p>
          </div>
        </div>

        <div className="address-block">
          <h3 className="block-title">BILL TO</h3>
          <div className="customer-address">
            <p className="address-line"><strong>{invoice.customerName}</strong></p>
            <p className="address-line">{invoice.billingAddress}</p>
            <p className="address-line">{invoice.billingCity}, {invoice.billingState} {invoice.billingZip}</p>
            <p className="address-line">Phone: {invoice.customerPhone}</p>
            <p className="address-line">Email: {invoice.customerEmail}</p>
            {invoice.customerGST && <p className="address-line">GST: {invoice.customerGST}</p>}
          </div>
        </div>

        {invoice.shippingAddress && (
          <div className="address-block">
            <h3 className="block-title">SHIP TO</h3>
            <div className="shipping-address">
              <p className="address-line"><strong>{invoice.shippingName || invoice.customerName}</strong></p>
              <p className="address-line">{invoice.shippingAddress}</p>
              <p className="address-line">{invoice.shippingCity}, {invoice.shippingState} {invoice.shippingZip}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ ITEMS TABLE ═══════════════════════ */}
      <div className="items-section">
        <table className="items-table">
          <thead>
            <tr className="table-header">
              <th className="col-sn">S.No</th>
              <th className="col-description">Description</th>
              <th className="col-hsn">HSN/SAC</th>
              <th className="col-quantity">Qty</th>
              <th className="col-unit">Unit</th>
              <th className="col-rate">Rate</th>
              <th className="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index} className="table-row">
                <td className="col-sn">{index + 1}</td>
                <td className="col-description">
                  <div className="item-name">{item.name}</div>
                  <div className="item-description">{item.description}</div>
                </td>
                <td className="col-hsn">{item.hsn || '-'}</td>
                <td className="col-quantity">{item.quantity}</td>
                <td className="col-unit">{item.unit || 'Unit'}</td>
                <td className="col-rate">₹ {item.rate?.toFixed(2)}</td>
                <td className="col-amount">₹ {(item.quantity * item.rate)?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════ SUMMARY SECTION ═══════════════════════ */}
      <div className="invoice-summary">
        <div className="summary-left">
          <div className="notes-section">
            <h4>Notes & Terms</h4>
            <p className="notes-text">{invoice.notes || 'N/A'}</p>
          </div>

          <div className="terms-section">
            <h4>Terms & Conditions</h4>
            <p className="terms-text">{finalSettings.termsAndConditions || 'Goods once sold will not be returned.'}</p>
          </div>

          {finalSettings.showBankDetails && company?.bankDetails && (
            <div className="bank-section">
              <h4>Bank Details</h4>
              <p><strong>Account Name:</strong> {company.bankDetails.accountName}</p>
              <p><strong>Account No:</strong> {company.bankDetails.accountNumber}</p>
              <p><strong>Bank Name:</strong> {company.bankDetails.bankName}</p>
              <p><strong>IFSC Code:</strong> {company.bankDetails.ifscCode}</p>
            </div>
          )}
        </div>

        <div className="summary-right">
          <table className="totals-table">
            <tbody>
              <tr className="total-row">
                <td className="label">Subtotal</td>
                <td className="value">₹ {totals.itemsTotal?.toFixed(2)}</td>
              </tr>

              {invoice.discount > 0 && (
                <tr className="discount-row">
                  <td className="label">Discount ({invoice.discount}%)</td>
                  <td className="value">- ₹ {totals.discountAmount?.toFixed(2)}</td>
                </tr>
              )}

              <tr className="subtotal-row">
                <td className="label">Subtotal After Discount</td>
                <td className="value">₹ {totals.subtotal?.toFixed(2)}</td>
              </tr>

              {/* GST Breakdown */}
              {gstSplit.sgst > 0 && (
                <tr className="tax-row">
                  <td className="label">SGST ({totals.taxRate / 2}%)</td>
                  <td className="value">₹ {gstSplit.sgst?.toFixed(2)}</td>
                </tr>
              )}

              {gstSplit.cgst > 0 && (
                <tr className="tax-row">
                  <td className="label">CGST ({totals.taxRate / 2}%)</td>
                  <td className="value">₹ {gstSplit.cgst?.toFixed(2)}</td>
                </tr>
              )}

              {gstSplit.igst > 0 && (
                <tr className="tax-row">
                  <td className="label">IGST ({totals.taxRate}%)</td>
                  <td className="value">₹ {gstSplit.igst?.toFixed(2)}</td>
                </tr>
              )}

              <tr className="grand-total-row">
                <td className="label">GRAND TOTAL</td>
                <td className="value">₹ {totals.total?.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="amount-words">
            <p><strong>Amount in Words:</strong></p>
            <p>{amountInWords(totals.total)}</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <div className="invoice-footer">
        <div className="footer-left">
          {finalSettings.showSignature && (
            <div className="signature-section">
              <div className="signature-line"></div>
              <p className="signature-label">Authorized Signature</p>
            </div>
          )}
        </div>

        <div className="footer-center">
          <p className="footer-text">{company?.name}</p>
        </div>

        <div className="footer-right">
          <p className="footer-text">Page 1 of 1</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .customizable-invoice { box-shadow: none; }
        }
      `}</style>
    </div>
  );
};

export default CustomizableInvoice;
