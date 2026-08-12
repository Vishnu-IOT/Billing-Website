/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: B2BInvoiceTemplate.js
   LOCATION: frontend/src/features/billing/B2BInvoiceTemplate.js
   DESCRIPTION: Enterprise B2B Invoice with GST compliance, E-invoicing support
   ═══════════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import useSettingsStore from '../../../../store/settingsStore-DB';
import './B2BInvoiceTemplate.css';

const B2BInvoiceTemplate = ({ invoice, company, settings: overrideSettings }) => {
  const settings = useSettingsStore((s) => s.getSettings?.()) || {};
  const finalSettings = { ...settings, ...overrideSettings };

  const [showEinvoiceDetails, setShowEinvoiceDetails] = useState(true);
  const [showEwayBillDetails, setShowEwayBillDetails] = useState(true);

  // ═══ Calculate Totals with HSN-wise breakdown ═══
  const calculateTotalsWithHSN = () => {
    const hsnMap = new Map();

    invoice.items?.forEach((item) => {
      const hsn = item.hsn || '0000';
      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn,
          quantity: 0,
          totalAmount: 0,
          taxableAmount: 0,
          taxAmount: 0,
          items: [],
        });
      }

      const hsnData = hsnMap.get(hsn);
      hsnData.quantity += item.quantity;
      hsnData.totalAmount += item.quantity * item.rate;
      hsnData.items.push(item);
    });

    const itemsTotal = Array.from(hsnMap.values()).reduce((sum, h) => sum + h.totalAmount, 0);
    const discountAmount = (itemsTotal * (invoice.discount || 0)) / 100;
    const subtotal = itemsTotal - discountAmount;

    const taxRate = finalSettings.defaultTaxRate || 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // Calculate HSN-wise tax
    Array.from(hsnMap.values()).forEach((hsnData) => {
      hsnData.taxableAmount = hsnData.totalAmount;
      hsnData.taxAmount = (hsnData.taxableAmount * taxRate) / 100;
    });

    return {
      itemsTotal,
      discountAmount,
      subtotal,
      taxRate,
      taxAmount,
      total,
      hsnMap: Array.from(hsnMap.values()),
    };
  };

  const totals = calculateTotalsWithHSN();

  // ═══ GST Split ═══
  const getGSTSplit = () => {
    const isSameState = invoice.billingState === invoice.shippingState;

    if (isSameState) {
      return {
        sgst: totals.taxAmount / 2,
        cgst: totals.taxAmount / 2,
        igst: 0,
        isSameState: true,
      };
    } else {
      return {
        sgst: 0,
        cgst: 0,
        igst: totals.taxAmount,
        isSameState: false,
      };
    }
  };

  const gstSplit = getGSTSplit();

  // ═══ Check if E-Invoice eligible ═══
  const isEInvoiceEligible = invoice.amount > 50000 && invoice.customerGST;

  return (
    <div className="b2b-invoice-template">
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="b2b-header">
        <div className="header-main">
          <div className="company-section">
            {company?.logo && <img src={company.logo} alt="Logo" className="company-logo" />}
            <div className="company-details">
              <h1 className="company-name">{company?.name}</h1>
              <p className="company-gstin">GST IN: {company?.gstNumber}</p>
            </div>
          </div>

          <div className="invoice-title-section">
            <h2 className="invoice-title">TAX INVOICE</h2>
            <div className="invoice-type-badge">{invoice.billType === 'B2B' ? 'B2B' : 'B2C'}</div>
          </div>

          <div className="einvoice-badge">
            {isEInvoiceEligible && <span className="badge-e-invoice">E-INVOICE</span>}
          </div>
        </div>

        <div className="invoice-meta">
          <div className="meta-row">
            <span className="meta-label">Invoice Number</span>
            <span className="meta-value">{invoice.invoiceNumber}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Invoice Date</span>
            <span className="meta-value">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Document Type</span>
            <span className="meta-value">TAX INVOICE</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ PARTY DETAILS ═══════════════════════ */}
      <div className="party-details-section">
        <div className="party-block bill-from">
          <h3 className="block-title">Sold by</h3>
          <div className="party-info">
            <p className="party-name"><strong>{company?.name}</strong></p>
            <p className="party-address">{company?.address}</p>
            <p className="party-city">{company?.city}, {company?.state} {company?.zipCode}</p>
            <p className="party-gstin"><strong>GST IN:</strong> {company?.gstNumber}</p>
            <p className="party-phone"><strong>Phone:</strong> {company?.phone}</p>
          </div>
        </div>

        <div className="party-block bill-to">
          <h3 className="block-title">Billed to</h3>
          <div className="party-info">
            <p className="party-name"><strong>{invoice.customerName}</strong></p>
            <p className="party-address">{invoice.billingAddress}</p>
            <p className="party-city">{invoice.billingCity}, {invoice.billingState} {invoice.billingZip}</p>
            {invoice.customerGST && <p className="party-gstin"><strong>GST IN:</strong> {invoice.customerGST}</p>}
            {invoice.customerEmail && <p className="party-email"><strong>Email:</strong> {invoice.customerEmail}</p>}
          </div>
        </div>

        {invoice.shippingAddress && invoice.shippingAddress !== invoice.billingAddress && (
          <div className="party-block ship-to">
            <h3 className="block-title">Shipped to</h3>
            <div className="party-info">
              <p className="party-name"><strong>{invoice.shippingName || invoice.customerName}</strong></p>
              <p className="party-address">{invoice.shippingAddress}</p>
              <p className="party-city">{invoice.shippingCity}, {invoice.shippingState} {invoice.shippingZip}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ LINE ITEMS WITH HSN ═══════════════════════ */}
      <div className="items-section">
        <table className="items-table">
          <thead>
            <tr className="header-row">
              <th className="col-sn">S.N.</th>
              <th className="col-description">Description</th>
              <th className="col-hsn">HSN/SAC</th>
              <th className="col-quantity">Qty</th>
              <th className="col-unit">Unit</th>
              <th className="col-rate">Unit Price</th>
              <th className="col-amount">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index} className="item-row">
                <td className="col-sn">{index + 1}</td>
                <td className="col-description">
                  <div className="item-name">{item.name}</div>
                  {item.description && <div className="item-desc">{item.description}</div>}
                  {item.batchNumber && <div className="item-batch">Batch: {item.batchNumber}</div>}
                </td>
                <td className="col-hsn">{item.hsn || '-'}</td>
                <td className="col-quantity text-right">{item.quantity}</td>
                <td className="col-unit">{item.unit || 'Unit'}</td>
                <td className="col-rate text-right">₹ {item.rate.toFixed(2)}</td>
                <td className="col-amount text-right">₹ {(item.quantity * item.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════ HSN-WISE TAX SUMMARY ═══════════════════════ */}
      <div className="hsn-summary-section">
        <h4 className="section-title">Tax Summary by HSN</h4>
        <table className="hsn-summary-table">
          <thead>
            <tr>
              <th>HSN</th>
              <th>Qty</th>
              <th>Taxable Amount</th>
              <th className={`tax-col ${gstSplit.isSameState ? 'sgst' : 'igst'}`}>
                {gstSplit.isSameState ? 'SGST' : 'IGST'}
              </th>
              {gstSplit.isSameState && <th className="tax-col cgst">CGST</th>}
              <th>Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {totals.hsnMap.map((hsn, index) => (
              <tr key={index}>
                <td>{hsn.hsn}</td>
                <td className="text-right">{hsn.quantity}</td>
                <td className="text-right">₹ {hsn.taxableAmount.toFixed(2)}</td>
                <td className="text-right">
                  ₹ {(gstSplit.isSameState ? hsn.taxAmount / 2 : hsn.taxAmount).toFixed(2)}
                </td>
                {gstSplit.isSameState && (
                  <td className="text-right">₹ {(hsn.taxAmount / 2).toFixed(2)}</td>
                )}
                <td className="text-right">₹ {hsn.taxAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════ TOTALS ═══════════════════════ */}
      <div className="totals-section">
        <div className="totals-left">
          {/* Notes */}
          {invoice.notes && (
            <div className="notes-box">
              <h4>Notes:</h4>
              <p>{invoice.notes}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="terms-box">
            <h4>Terms & Conditions:</h4>
            <p>{finalSettings.termsAndConditions || 'Goods once sold will not be returned.'}</p>
          </div>

          {/* Bank Details */}
          {finalSettings.showBankDetails && company?.bankDetails && (
            <div className="bank-box">
              <h4>Bank Account Details:</h4>
              <p><strong>Account Name:</strong> {company.bankDetails.accountName}</p>
              <p><strong>Account No:</strong> {company.bankDetails.accountNumber}</p>
              <p><strong>Bank Name:</strong> {company.bankDetails.bankName}</p>
              <p><strong>IFSC:</strong> {company.bankDetails.ifscCode}</p>
            </div>
          )}
        </div>

        <div className="totals-right">
          <table className="totals-table">
            <tbody>
              <tr className="subtotal-row">
                <td className="label">Subtotal</td>
                <td className="amount">₹ {totals.itemsTotal.toFixed(2)}</td>
              </tr>

              {invoice.discount > 0 && (
                <tr className="discount-row">
                  <td className="label">Discount ({invoice.discount}%)</td>
                  <td className="amount">- ₹ {totals.discountAmount.toFixed(2)}</td>
                </tr>
              )}

              <tr className="taxable-row">
                <td className="label">Taxable Amount</td>
                <td className="amount">₹ {totals.subtotal.toFixed(2)}</td>
              </tr>

              {gstSplit.sgst > 0 && (
                <tr className="tax-row sgst">
                  <td className="label">SGST ({totals.taxRate / 2}%)</td>
                  <td className="amount">₹ {gstSplit.sgst.toFixed(2)}</td>
                </tr>
              )}

              {gstSplit.cgst > 0 && (
                <tr className="tax-row cgst">
                  <td className="label">CGST ({totals.taxRate / 2}%)</td>
                  <td className="amount">₹ {gstSplit.cgst.toFixed(2)}</td>
                </tr>
              )}

              {gstSplit.igst > 0 && (
                <tr className="tax-row igst">
                  <td className="label">IGST ({totals.taxRate}%)</td>
                  <td className="amount">₹ {gstSplit.igst.toFixed(2)}</td>
                </tr>
              )}

              <tr className="grand-total-row">
                <td className="label">GRAND TOTAL</td>
                <td className="amount">₹ {totals.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════ E-INVOICE SECTION ═══════════════════════ */}
      {isEInvoiceEligible && showEinvoiceDetails && (
        <div className="einvoice-section">
          <h4 className="section-title">E-Invoice Details</h4>
          <div className="einvoice-details">
            <p><strong>IRN:</strong> {invoice.irn || 'To be generated'}</p>
            <p><strong>Status:</strong> {invoice.einvoiceStatus || 'Pending'}</p>
            {invoice.einvoiceQR && (
              <div className="einvoice-qr">
                <img src={invoice.einvoiceQR} alt="E-Invoice QR" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ E-WAY BILL SECTION ═══════════════════════ */}
      {invoice.ewayBillNumber && showEwayBillDetails && (
        <div className="eway-section">
          <h4 className="section-title">E-Way Bill Details</h4>
          <div className="eway-details">
            <p><strong>E-Way Bill No:</strong> {invoice.ewayBillNumber}</p>
            <p><strong>Validity:</strong> {new Date(invoice.ewayBillValidity).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <div className="b2b-footer">
        <div className="footer-signature">
          <div className="signature-line"></div>
          <p className="signature-label">Authorized Signatory</p>
        </div>

        <div className="footer-company">
          <p>{company?.name}</p>
          <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>
    </div>
  );
};

export default B2BInvoiceTemplate;
