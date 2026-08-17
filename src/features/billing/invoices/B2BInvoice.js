/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: B2BInvoice.js
   DESCRIPTION: B2B GST invoice — visually matched to the "Bill of Supply"
   reference layout supplied by the user (Page No / Original Copy header,
   Add-Logo box, Billing Details + Invoice meta boxes, Sr/Item/HSN/Qty/Unit/
   List Price/Disc./Tax%/Amount table, Discount + Total band, amount in
   words, "Settled by" line, Terms & Conditions box, Bank/QR box, signature).

   SETTINGS RESPECTED (from useSettingsStore / settingsStore-DB.js):
   - gstRegistrationType  -> 'Composition' dealers legally cannot charge GST,
                             so the doc title switches to "BILL OF SUPPLY" and
                             the HSN tax-summary + CGST/SGST rows are hidden.
                             Everyone else gets "TAX INVOICE" with the GST split.
   - termsAndConditions   -> fills (and gates) the Terms & Conditions box
   - showBankDetails      -> gates the Bank Account Details box
   - showUpiQr            -> gates the payment QR code next to bank details
   - showSignature        -> gates the "Authorized Signatory" block
   ═══════════════════════════════════════════════════════════════════════════════ */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { numberToWords } from '../../../utils/numbers';
import useSettingsStore from '../../../store/settingsStore-DB';

const box = { border: '1px solid #999', padding: '10px 12px' };
const th = { padding: '8px 6px', textAlign: 'left', fontSize: 12, fontWeight: 700, border: '1px solid #999' };
const td = { padding: '8px 6px', fontSize: 12.5, border: '1px solid #999', verticalAlign: 'top' };

export default function B2BInvoice({ bill, companies, party, items, invoiceLabel, partyLabel, printRef }) {
  // See ThermalBill.js for why we select primitives with useShallow instead
  // of calling store.getSettings() inside the selector (infinite-loop bug).
  const settings = useSettingsStore(
    useShallow((s) => ({
      gstRegistrationType: s.gstRegistrationType,
      termsAndConditions: s.termsAndConditions,
      showBankDetails: s.showBankDetails,
      showUpiQr: s.showUpiQr,
      showSignature: s.showSignature,
    }))
  );
  /* Composition-scheme dealers can't charge GST → must issue a "Bill of Supply",
     not a "Tax Invoice". Everyone else gets the regular GST tax invoice. */
  const isComposition = settings.gstRegistrationType === 'Composition';
  const docTitle = isComposition ? 'BILL OF SUPPLY' : (invoiceLabel || 'TAX INVOICE');

  /* Group items by HSN + tax rate for the mandatory HSN-wise tax summary
     (only relevant when GST is actually being charged) */
  // ── GST-wise Tax Summary ──
  // Group ONLY by GST rate.
  // HSN is intentionally ignored here.
  //
  // Example:
  // Product A -> HSN 1001 -> 5%
  // Product B -> HSN 2002 -> 5%
  // Product C -> HSN 3003 -> 5%
  //
  // All three will appear as ONE 5% row.

  const gstSummary = {};

  if (!isComposition) {
    items.forEach((item) => {
      const rate = parseFloat(item.taxPercentage || 0);

      const taxable =
        parseFloat(
          item.baseRate ??
          item.afterDiscount ??
          0
        ) || 0;

      const taxAmt =
        parseFloat(item.taxAmount || 0) || 0;

      // Use GST rate as the ONLY grouping key
      if (!gstSummary[rate]) {
        gstSummary[rate] = {
          rate,
          taxable: 0,
          cgst: 0,
          sgst: 0,
        };
      }

      gstSummary[rate].taxable += taxable;

      // Split total GST equally between CGST and SGST
      gstSummary[rate].cgst += taxAmt / 2;
      gstSummary[rate].sgst += taxAmt / 2;
    });
  }

  const gstRows = Object.values(gstSummary)
    .sort((a, b) => a.rate - b.rate);

  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.baseRate ?? item.afterDiscount ?? 0) || 0),
    0
  );
  const extraDiscount = parseFloat(bill.discountAmount || bill.globalDiscount || bill.global_discount_amount || 0) || 0;
  console.log("bill settled", bill);
  // const isPaid = (bill.paymentStatus || '').toLowerCase() === 'paid';
  // const settledAmount = isPaid ? (bill.totalAmount || 0) : (bill.amountPaid || 0);
  // const balanceAmount = (bill.totalAmount || 0) - settledAmount;

  const financials = companies.financials || {};
  const companyGstin = financials.gstin || companies.companyGstin || companies.gstin || '';
  const bankAccount = financials.bank_account_enc || '';
  const bankIfsc = financials.ifsc_code || '';
  const bankName = financials.bank_name || '';
  // const upiId = financials.upi_id || '';
  const upiId = 'vishnubharani153@oksbi';
  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companies.legal_name || 'Business')}&am=${bill.totalAmount || 0}&cu=INR&tn=${bill.invoiceNumber || 'Invoice'}`
    : null;

  return (
    <div
      ref={printRef}
      className="print-area invoice-b2b"
      style={{
        background: 'white',
        color: 'black',
        fontFamily: 'sans-serif',
        fontSize: 13,
        lineHeight: 1.5,
        border: '2px solid #333',
      }}
    >
      {/* ── Page strip: Page No | Doc Title | Original Copy ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #333',
          padding: '8px 16px',
          fontSize: 12,
        }}
      >
        <span>
          {/* Page No. 1 of 1 */}
        </span>
        <span style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>{docTitle}</span>
        <span>Original Copy</span>
      </div>

      {/* ── Company Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid #999' }}>
        <div
          style={{
            width: 70, height: 70, flexShrink: 0,
            border: '1px dashed #aaa', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#999', textAlign: 'center', overflow: 'hidden',
          }}
        >
          {companies.logo ? (
            <img src={companies.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : 'Logo'}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' }}>
            {companies.legal_name || 'Add Company Name'}
          </h2>
          {!isComposition && companyGstin && (
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>GSTIN: {companyGstin}</div>
          )}
          <div style={{ fontSize: 12.5, color: '#333' }}>
            {companies.address_line1 || 'Add Address'}
          </div>
          <div style={{ fontSize: 12.5, color: '#333' }}>
            {(companies.companyPhone || companies.phone) && `Mobile: +91 ${companies.companyPhone || companies.phone}`}
            {(companies.companyPhone || companies.phone) && (companies.email || companies.companyEmail) && '  |  '}
            {(companies.email || companies.companyEmail) && `Email: ${companies.email || companies.companyEmail}`}
          </div>
        </div>
      </div>

      {/* ── Billing Details + Invoice Meta ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #999' }}>
        <div style={{ flex: 1.4, padding: '12px 16px', borderRight: '1px solid #999' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Billing Details</div>
          <div style={{ fontWeight: 700 }}>{party.name || 'Business Customer'}</div>
          <div style={{ fontSize: 12.5 }}>
            GSTIN: {party.GST || '—'}
            {/* {party.phone && `| Mobile: +91 ${party.phone}`} {party.email && `| Email: ${party.email}`} */}
          </div>
          <div style={{ fontSize: 12.5 }}>
            {party.phone && `Mobile: +91 ${party.phone}`}
          </div>
          <div style={{ fontSize: 12.5 }}>
            {party.email && `Email: ${party.email}`}
          </div>
          {party.address && <div style={{ fontSize: 12.5, marginTop: 4 }}>{party.address}</div>}
        </div>
        <div style={{ flex: 1, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 4, columnGap: 10, fontSize: 12.5 }}>
          <span style={{ fontWeight: 700 }}>Invoice Number</span>
          <span>: {bill.invoiceNumber}</span>
          <span style={{ fontWeight: 700 }}>Invoice Date</span>
          <span>: {formatDate(bill.saleDate || bill.purchaseDate)}</span>
          {bill.dueDate && (
            <>
              <span style={{ fontWeight: 700 }}>Due Date</span>
              <span>: {formatDate(bill.dueDate)}</span>
            </>
          )}
          {bill.ewayBillNo && (
            <>
              <span style={{ fontWeight: 700 }}>E-Way Bill</span>
              <span>: {bill.ewayBillNo}</span>
            </>
          )}
          <span style={{ fontWeight: 700 }}>Place of Supply</span>
          <span>: {party.state || companies.state || 'TN'}</span>
        </div>
      </div>

      {/* ── Items Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 36 }}>Sr.</th>
            <th style={th}>Item Description</th>
            <th style={{ ...th, textAlign: 'right', width: 70 }}>HSN/SAC</th>
            <th style={{ ...th, textAlign: 'right', width: 50 }}>Qty</th>
            <th style={{ ...th, textAlign: 'center', width: 50 }}>Unit</th>
            <th style={{ ...th, textAlign: 'right', width: 90 }}>Base Rate</th>
            <th style={{ ...th, textAlign: 'right', width: 60 }}>Disc. %</th>
            <th style={{ ...th, textAlign: 'right', width: 60 }}>Disc. Amt.</th>
            <th style={{ ...th, textAlign: 'right', width: 55 }}>Tax %</th>
            <th style={{ ...th, textAlign: 'right', width: 55 }}>Tax Amt.</th>
            <th style={{ ...th, textAlign: 'right', width: 100 }}>Net Rate (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            console.log(item);
            console.log(item.discountPercentage);
            const qty = item.quantity || 1;
            const price = parseFloat(item.price) || 0;
            const disc = parseFloat(item.discountPercentage) || 0;
            const discAmt = parseFloat(item.discountAmount) || 0;
            const taxRate = item.taxPercentage || 0;
            const taxAmt = item.taxAmount || 0;
            const amount = parseFloat(item.netRate ?? item.afterDiscount ?? (price * qty - (price * qty * disc) / 100)) || 0;
            return (
              <tr key={idx}>
                <td style={td}>{idx + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>
                  {item.productName || item.Product?.name}
                  {item.notes && <div style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>{item.notes}</div>}
                  {item.batchNumber && <div style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>Batch: {item.batchNumber}</div>}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{item.Product?.HSNCode || '-'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{qty.toFixed(2)}</td>
                <td style={{ ...td, textAlign: 'center' }}>{item.unit || 'Pcs'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{price.toFixed(2)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{disc > 0 ? `${disc.toFixed(2)} %` : '0.00'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{discAmt > 0 ? `${discAmt.toFixed(2)}` : '0.00'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{isComposition ? '0.00' : `${taxRate}%`}</td>
                <td style={{ ...td, textAlign: 'right' }}>{isComposition ? '0.00' : taxAmt}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{amount.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── HSN-wise Tax Summary — only when GST is actually charged ── */}
      <div style={{ display: "flex" }}>
        {!isComposition && gstRows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={th}>GST Rate</th>
                <th style={{ ...th, textAlign: 'right' }}>
                  Taxable Value
                </th>
                <th style={{ ...th, textAlign: 'right' }}>
                  CGST
                </th>
                <th style={{ ...th, textAlign: 'right' }}>
                  SGST
                </th>
              </tr>
            </thead>
            <tbody>
              {gstRows.map((row, i) => (
                <tr key={i}>
                  <td style={td}>
                    {row.rate}%
                  </td>

                  <td style={{ ...td, textAlign: 'right' }}>
                    {formatCurrency(row.taxable)}
                  </td>

                  <td style={{ ...td, textAlign: 'right' }}>
                    {formatCurrency(row.cgst)}
                  </td>

                  <td style={{ ...td, textAlign: 'right' }}>
                    {formatCurrency(row.sgst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Discount + Total band (right aligned, like the reference) ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {extraDiscount > 0 && (
              <tr>
                <td style={{ ...td, border: 'none', borderTop: '1px solid #999', textAlign: 'right' }} colSpan={8}>Discount</td>
                <td style={{ ...td, border: 'none', borderTop: '1px solid #999', textAlign: 'right' }}>
                  - {extraDiscount.toFixed(2)}
                </td>
              </tr>
            )}
            {!isComposition && bill.tax > 0 && (
              <>
                <tr>
                  <td style={{ ...td, border: 'none', textAlign: 'right' }} colSpan={8}>CGST</td>
                  <td style={{ ...td, border: 'none', textAlign: 'right' }}>{formatCurrency((bill.tax || 0) / 2)}</td>
                </tr>
                <tr>
                  <td style={{ ...td, border: 'none', textAlign: 'right' }} colSpan={8}>SGST</td>
                  <td style={{ ...td, border: 'none', textAlign: 'right' }}>{formatCurrency((bill.tax || 0) / 2)}</td>
                </tr>
              </>
            )}
            {bill.roundOff ? (
              <tr>
                <td style={{ ...td, border: 'none', textAlign: 'right' }} colSpan={8}>Round Off</td>
                <td style={{ ...td, border: 'none', textAlign: 'right' }}>{(bill.roundOff || 0).toFixed(2)}</td>
              </tr>
            ) : null}
            <tr style={{ background: '#f1f5f9' }}>
              <td style={{ ...td, borderTop: '2px solid #333', borderBottom: '2px solid #333', fontWeight: 800, fontSize: 15, textAlign: 'right' }} colSpan={8}>
                Total
              </td>
              <td style={{ ...td, borderTop: '2px solid #333', borderBottom: '2px solid #333', fontWeight: 800, fontSize: 15, textAlign: 'right' }}>
                {formatCurrency(bill.totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Amount in words + Settled by ── */}
      {/* <div style={{ padding: '10px 16px', borderBottom: '1px solid #999', fontSize: 12.5, display: 'flex' }}>
        <div style={{ fontWeight: 700 }}>
          <p>Amount In Words:</p>
          {numberToWords(Math.round(bill.totalAmount || 0))}
        </div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>
          Settled by - {bill.paymentMethod || 'Bank'} : {settledAmount.toFixed(2)} &nbsp;|&nbsp; Invoice Balance : {balanceAmount.toFixed(2)}
        </div>
        <div style={{ flex: 1.2, padding: '12px 16px', borderRight: '1px solid #999' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Terms and Conditions</div>
          <div style={{ fontSize: 11.5, color: '#444', whiteSpace: 'pre-wrap' }}>
            {settings.termsAndConditions || 'Goods once sold will not be taken back.'}
          </div>
        </div>
      </div> */}

      {/* ── Amount in words + Settled by ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #999', }}>
        <div style={{ flex: 1.2, padding: '12px 16px', borderRight: '1px solid #999' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Terms and Conditions</div>
          <div style={{ fontSize: 11.5, color: '#444', whiteSpace: 'pre-wrap' }}>
            {settings.termsAndConditions || 'Goods once sold will not be taken back.'}
          </div>
        </div>

        <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid #999', fontSize: 12 }}>
          <div style={{ fontWeight: 700 }}>
            <p>Amount In Words:</p>
            {numberToWords(Math.round(bill.totalAmount || 0))}
          </div>
          {/* <div style={{ fontWeight: 700, marginTop: 4 }}>
          Settled by - {bill.paymentMethod || 'Bank'} : {settledAmount.toFixed(2)} &nbsp;|&nbsp; Invoice Balance : {balanceAmount.toFixed(2)}
        </div> */}
        </div>
      </div>

      {/* ── Terms & Conditions | Bank/QR | Signature ── */}
      <div style={{ display: 'flex' }}>
        {/* <div style={{ flex: 1.2, padding: '12px 16px', borderRight: '1px solid #999' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Terms and Conditions</div>
          <div style={{ fontSize: 11.5, color: '#444', whiteSpace: 'pre-wrap' }}>
            {settings.termsAndConditions || 'Goods once sold will not be taken back.'}
          </div>
        </div> */}

        {(settings.showBankDetails || settings.showUpiQr) && (
          <div style={{ display: 'flex', gap: 10, flex: 1, padding: '12px 16px', borderRight: '1px solid #999', fontSize: 12 }}>
            {settings.showUpiQr && upiLink && (
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <QRCodeSVG value={upiLink} size={80} />
              </div>
            )}
            {settings.showBankDetails && (
              <div>
                <div><strong>Name:</strong> {companies.legal_name || '—'}</div>
                <div><strong>Account Number:</strong> {bankAccount || '—'}</div>
                <div><strong>Bank:</strong> {bankName || '—'}</div>
                <div><strong>IFSC:</strong> {bankIfsc || '—'}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, padding: '12px 16px', textAlign: 'right' }}>
          <div style={{ marginBottom: 40, fontWeight: 600 }}>For {companies.legal_name || 'Company Name'}</div>
          {settings.showSignature && (
            <div style={{ fontSize: 12, fontWeight: 600 }}>Signature</div>
          )}
        </div>
      </div>
    </div>
  );
}
