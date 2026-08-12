/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: ThermalBill.js
   DESCRIPTION: 58mm / 80mm thermal print layout for POS receipts.
   Visually matched to the "Apna Billbook" style receipt reference supplied
   by the user: bold centered store header, Bill No/Date/Time meta rows,
   Billing-To block, Item/Qty/Amount table with HSN + batch subtext,
   full charge & tax breakdown, Grand Total, Paid Amount, amount in words,
   "SCAN TO PAY" UPI QR block and T&C footer.

   Screen-hidden, print-visible via @media print (unchanged behaviour —
   this component is only ever shown through window.print()).

   SETTINGS RESPECTED (from useSettingsStore / settingsStore-DB.js):
   - receiptHeader          -> small subtext line under the store name
   - receiptFooter          -> footer message above "Thank you"
   - showGstOnReceipt       -> gates the CGST/SGST/GST rows + GST summary block
   - showUpiQr              -> gates the "Scan to Pay" QR section
   - termsAndConditions     -> gates + fills the T&C line above the footer
   - printerWidth (58 / 80) -> receipt width (also passed as a prop)
   ═══════════════════════════════════════════════════════════════════════════════ */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '../../utils/currency';
import { numberToWords } from '../../utils/numbers';
import useSettingsStore from '../../store/settingsStore-DB';

/**
 * ThermalBill
 * @param {object}  bill          - the completed sale bill (see POSScreen billForPrint)
 * @param {object}  company       - the real company/business record (name, address, GST, UPI…)
 * @param {string}  printerWidth  - '58' | '80'
 */
export default function ThermalBill({ bill, company, printerWidth = '80' }) {
  // NOTE: never call store.getSettings() (or any function that builds a new
  // object) *inside* a Zustand selector — it returns a fresh reference every
  // render, which Zustand reads as "the store changed", triggering another
  // render, calling the selector again, forever ("Maximum update depth
  // exceeded"). Select only the primitive fields we actually need instead,
  // wrapped in useShallow so the returned object is only "new" when one of
  // those primitives actually changes.
  const settings = useSettingsStore(
    useShallow((s) => ({
      receiptHeader: s.receiptHeader,
      receiptFooter: s.receiptFooter,
      showGstOnReceipt: s.showGstOnReceipt,
      showUpiQr: s.showUpiQr,
      termsAndConditions: s.termsAndConditions,
    }))
  );

  if (!bill) return null;

  const {
    invoiceNo,
    saleDate,
    items = [],
    totals = {},
    customerName,
    customerPhone,
    customerGSTIN,
    paymentMethod,
    paymentStatus,
    cashier,
    staffName,
    createdBy,
    orderType,
    orderStatus,
    amountPaid,
  } = bill;

  const isB2B = (bill.bill_type || bill.billType) === 'B2B';
  const showGst = settings.showGstOnReceipt !== false; // default true, respects toggle when off

  const biz = company || {};
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = saleDate
    ? new Date(saleDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  /* UPI QR for payment — only rendered when the "Show UPI QR Code" setting is ON */
  // const upiId = biz.financials?.upi_id || biz.upi_id || biz.upiId || '';
  const upiId = 'vishnubharani153@oksbi';
  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(biz.legal_name || biz.companyName || 'Store')}&am=${totals.grandTotal || 0}&cu=INR&tn=${invoiceNo || 'Bill'}`
    : null;
  const showQrBlock = !!settings.showUpiQr && !!upiLink;

  /* GST slab summary (B2B only, and only while showGstOnReceipt is ON) */
  const gstSlabs = {};
  if (showGst) {
    items.forEach((item) => {
      const rate = item.taxRate;
      if (!rate) return;
      if (!gstSlabs[rate]) gstSlabs[rate] = { taxable: 0, cgst: 0, sgst: 0 };
      gstSlabs[rate].taxable += item.afterDiscount || 0;
      gstSlabs[rate].cgst += (item.taxAmount || 0) / 2;
      gstSlabs[rate].sgst += (item.taxAmount || 0) / 2;
    });
  }

  const discountTotal =
    (totals.rawTotal || 0) - (totals.grandTotal || 0) - (totals.roundOff || 0);

  const paidAmount = amountPaid ?? (paymentStatus !== 'Unpaid' ? totals.grandTotal : 0);
  const billStatus = bill.billStatus || paymentStatus || 'Paid';

  const Divider = ({ char = '-' }) => (
    <div className="thermal-divider">
      {char.repeat(printerWidth === '58' ? 31 : 46)}
    </div>
  );

  const Row = ({ left, right, bold, large }) => (
    <div
      className={`thermal-row ${bold ? 'thermal-bold' : ''} ${large ? 'thermal-large' : ''}`}
    >
      <span className="thermal-row-left">{left}</span>
      <span className="thermal-row-right">{right}</span>
    </div>
  );

  return (
    <div
      className={`thermal-bill-wrapper thermal-${printerWidth}`}
      id="thermal-bill-print"
    >
      {/* ── HEADER ── */}
      <div className="thermal-header">
        <div className="thermal-store-name">
          {biz.legal_name || biz.companyName || 'Store Name'}
        </div>
        {(biz.address_line1 || biz.companyAddress) && (
          <div className="thermal-store-addr">
            {biz.address_line1 || biz.companyAddress}
          </div>
        )}
        {biz.address_line2 && (
          <div className="thermal-store-addr">{biz.address_line2}</div>
        )}
        {(biz.city || biz.state_code || biz.pincode) && (
          <div className="thermal-store-addr">
            {[biz.city, biz.state_code, biz.pincode].filter(Boolean).join(', ')}
          </div>
        )}
        {settings.receiptHeader && (
          <div className="thermal-header-note">{settings.receiptHeader}</div>
        )}
        {(biz.contactName || biz.contact_name) && (
          <div className="thermal-store-addr">
            Contact: {biz.contactName || biz.contact_name}
          </div>
        )}
        {(biz.email || biz.companyEmail) && (
          <div className="thermal-store-addr">
            Email: {biz.email || biz.companyEmail}
          </div>
        )}
        {(biz.financials?.gstin || biz.companyGstin || biz.gstin) && (
          <div className="thermal-gstin">
            GSTIN: {biz.financials?.gstin || biz.companyGstin || biz.gstin}
          </div>
        )}
        {(biz.companyPhone || biz.phone) && (
          <div className="thermal-phone">
            Ph: {biz.companyPhone || biz.phone}
          </div>
        )}
      </div>

      <Divider char="=" />

      {/* ── INVOICE META ── */}
      <div className="thermal-invoice-type">
        *** {isB2B ? 'TAX INVOICE (B2B)' : 'RETAIL INVOICE'} ***
      </div>
      <Divider />
      <Row left="Bill No" right={invoiceNo || '—'} />
      <Row left="Date" right={dateStr} />
      <Row left="Time" right={timeStr} />
      {orderType && <Row left="Customer Type" right={orderType} />}
      {orderStatus && <Row left="Order Status" right={orderStatus} />}
      <Row left="Payment Method" right={paymentMethod || '—'} />
      <Row left="Payment Status" right={billStatus} />
      {(staffName || cashier) && <Row left="Staff Name" right={staffName || cashier} />}
      {createdBy && <Row left="Created By" right={createdBy} />}

      {(customerName || customerPhone) && (
        <>
          <Divider char="=" />
          <div className="thermal-section-title thermal-section-title--left">Billing To</div>
          {customerName && <Row left="Name" right={customerName} />}
          {customerPhone && <Row left="Contact No." right={customerPhone} />}
          {isB2B && <Row left="GSTIN" right={customerGSTIN || 'Not provided'} />}
        </>
      )}

      <Divider char="=" />

      {/* ── ITEM HEADER ── */}
      <div className="thermal-item-header">
        <span className="thermal-item-name-col">Items</span>
        <span className="thermal-item-qty-col">Qty</span>
        <span className="thermal-item-amt-col">Amount</span>
      </div>
      <Divider />

      {/* ── ITEMS ── */}
      {items.map((item, i) => {
        const rate = item.price || 0;
        const qty = item.quantity || 1;
        const disc = item.discountAmount || 0;
        const total = item.total || 0;
        return (
          <div key={i} className="thermal-item-row">
            <div className="thermal-item-detail">
              <span className="thermal-item-name">{item.productName}</span>
              <span className="thermal-item-qty-col">{qty}</span>
              <span className="thermal-item-amt-col">
                {formatCurrency(total)}
              </span>
            </div>
            {(item.variantName || item.notes) && (
              <div className="thermal-item-sub">({item.variantName || item.notes})</div>
            )}
            <div className="thermal-item-sub">
              {qty} x {formatCurrency(rate)}
              {showGst && item.taxRate > 0 ? ` (GST ${item.taxRate}%)` : ''}
            </div>
            {item.hsnCode && (
              <div className="thermal-item-sub">HSN: {item.hsnCode}</div>
            )}
            {item.batchNumber && (
              <div className="thermal-item-sub">Batch: {item.batchNumber}</div>
            )}
            {disc > 0 && (
              <div className="thermal-item-sub">
                Discount: -{formatCurrency(disc)}
              </div>
            )}
          </div>
        );
      })}

      <Divider char="=" />

      {/* ── TOTALS ── */}
      <Row left="Item Total" right={formatCurrency(totals.rawTotal || 0)} />
      <Row left="Subtotal" right={formatCurrency(totals.subtotal || 0)} />
      {discountTotal > 0 && (
        <Row left="Discount" right={`-${formatCurrency(discountTotal)}`} />
      )}
      {showGst && (
        isB2B ? (
          <>
            <Row left="CGST" right={formatCurrency((totals.totalTax || 0) / 2)} />
            <Row left="SGST" right={formatCurrency((totals.totalTax || 0) / 2)} />
          </>
        ) : (
          <Row left="GST" right={formatCurrency(totals.totalTax || 0)} />
        )
      )}
      {totals.roundOff !== 0 && totals.roundOff !== undefined && (
        <Row left="Round Off" right={totals.roundOff?.toFixed(2)} />
      )}

      <Divider char="=" />
      <Row left="Grand Total" right={formatCurrency(totals.grandTotal || 0)} bold large />
      <Row left="Paid Amount" right={formatCurrency(paidAmount || 0)} />
      <Divider char="=" />

      {/* ── PAYMENT ── */}
      <Row left="Payment Method" right={paymentMethod || '—'} bold />
      <Row left="Bill Status" right={billStatus} bold />

      <Divider />

      {/* ── AMOUNT IN WORDS ── */}
      <div className="thermal-words">
        <span className="thermal-words-label">Amount in Words:</span>
        <span className="thermal-words-value">
          {numberToWords(Math.round(totals.grandTotal || 0))}
        </span>
      </div>

      {/* ── GST SUMMARY (B2B only, gated by showGstOnReceipt) ── */}
      {isB2B && showGst && Object.keys(gstSlabs).length > 0 && (
        <>
          <Divider />
          <div className="thermal-section-title">GST SUMMARY</div>
          <div className="thermal-gst-header">
            <span>Rate</span>
            <span>Taxable</span>
            <span>CGST</span>
            <span>SGST</span>
          </div>
          <Divider />
          {Object.entries(gstSlabs).map(([rate, vals]) => (
            <div key={rate} className="thermal-gst-row">
              <span>{rate}%</span>
              <span>{formatCurrency(vals.taxable).replace('₹', '')}</span>
              <span>{formatCurrency(vals.cgst).replace('₹', '')}</span>
              <span>{formatCurrency(vals.sgst).replace('₹', '')}</span>
            </div>
          ))}
        </>
      )}

      {/* ── QR CODE — only rendered when "Show UPI QR Code" is ON in settings ── */}
      {showQrBlock && (
        <div className="thermal-qr-section">
          <div className="thermal-qr-code">
            <QRCodeSVG value={upiLink} size={printerWidth === '58' ? 90 : 110} />
          </div>
          <div className="thermal-qr-upi-badge">UPI</div>
          <button type="button" className="thermal-scan-btn">SCAN TO PAY</button>
          <div className="thermal-qr-upi">{upiId}</div>
        </div>
      )}

      {/* ── TERMS & CONDITIONS — only rendered when set in settings ── */}
      {settings.termsAndConditions && (
        <>
          <Divider />
          <div className="thermal-tnc">
            <div className="thermal-section-title thermal-section-title--left">T&amp;C</div>
            <div className="thermal-tnc-text">{settings.termsAndConditions}</div>
          </div>
        </>
      )}

      {/* ── FOOTER ── */}
      <Divider char="=" />
      <div className="thermal-footer">
        <div className="thermal-thanks">Thank You! Visit Again 🙏</div>
        {settings.receiptFooter && (
          <div className="thermal-footer-sub">{settings.receiptFooter}</div>
        )}
      </div>
    </div>
  );
}
