/* ===== THERMAL BILL — 58mm / 80mm thermal print layout ===== */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../../utils/currency';

/**
 * ThermalBill
 * Screen-hidden, print-visible via @media print.
 * Renders a compact 58mm or 80mm thermal receipt.
 */
export default function ThermalBill({ bill, settings, printerWidth = '80' }) {
  console.log(bill);
  if (!bill) return null;

  const {
    invoiceNo,
    saleDate,
    items = [],
    totals = {},
    customerName,
    customerPhone,
    paymentMethod,
    cashier,
  } = bill;

  const company = settings || {};
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

  /* UPI QR for payment */
  const upiId = company.financials?.upi_id || company.upiId || '';
  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.legal_name || 'Store')}&am=${totals.grandTotal || 0}&cu=INR&tn=${invoiceNo || 'Bill'}`
    : null;

  /* GST slab summary */
  const gstSlabs = {};
  items.forEach((item) => {
    if (!item.taxRate) return;
    const rate = item.taxRate;
    if (!gstSlabs[rate]) gstSlabs[rate] = { taxable: 0, cgst: 0, sgst: 0 };
    gstSlabs[rate].taxable += item.afterDiscount || 0;
    gstSlabs[rate].cgst += (item.taxAmount || 0) / 2;
    gstSlabs[rate].sgst += (item.taxAmount || 0) / 2;
  });

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
          {company.legal_name || company.companyName || 'Store Name'}
        </div>
        {(company.address_line1 || company.companyAddress) && (
          <div className="thermal-store-addr">
            {company.address_line1 || company.companyAddress}
          </div>
        )}
        {company.address_line2 && (
          <div className="thermal-store-addr">{company.address_line2}</div>
        )}
        {(company.city || company.state_code || company.pincode) && (
          <div className="thermal-store-addr">
            {[company.city, company.state_code, company.pincode]
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
        {(company.financials?.gstin || company.companyGstin) && (
          <div className="thermal-gstin">
            GSTIN: {company.financials?.gstin || company.companyGstin}
          </div>
        )}
        {(company.companyPhone || company.phone) && (
          <div className="thermal-phone">
            Ph: {company.companyPhone || company.phone}
          </div>
        )}
      </div>

      <Divider char="=" />

      {/* ── INVOICE INFO ── */}
      <div className="thermal-invoice-type">*** RETAIL INVOICE ***</div>
      <Divider />
      <Row left="Invoice No" right={invoiceNo || '—'} />
      <Row left="Date" right={dateStr} />
      <Row left="Time" right={timeStr} />
      {cashier && <Row left="Cashier" right={cashier} />}
      {customerName && <Row left="Customer" right={customerName} />}
      {customerPhone && <Row left="Phone" right={customerPhone} />}

      <Divider char="=" />

      {/* ── ITEM HEADER ── */}
      <div className="thermal-item-header">
        <span className="thermal-item-name-col">Item</span>
        <span className="thermal-item-qty-col">Qty</span>
        <span className="thermal-item-rate-col">Rate</span>
        <span className="thermal-item-amt-col">Amt</span>
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
            <div className="thermal-item-name">{item.productName}</div>
            {item.hsnCode && (
              <div className="thermal-item-hsn">HSN: {item.hsnCode}</div>
            )}
            <div className="thermal-item-detail">
              <span className="thermal-item-qty-col">{qty}</span>
              <span className="thermal-item-rate-col">
                {formatCurrency(rate).replace('₹', '')}
              </span>
              {disc > 0 && (
                <span className="thermal-item-disc">
                  -{formatCurrency(disc).replace('₹', '')}
                </span>
              )}
              <span className="thermal-item-amt-col">
                {formatCurrency(total).replace('₹', '')}
              </span>
            </div>
            {item.taxRate > 0 && (
              <div className="thermal-item-gst">
                GST({item.taxRate}%):{' '}
                {formatCurrency(item.taxAmount || 0).replace('₹', '')}
              </div>
            )}
          </div>
        );
      })}

      <Divider char="=" />

      {/* ── TOTALS ── */}
      <Row left="Items" right={items.length} />
      <Row left="Sub Total" right={formatCurrency(totals.subtotal || 0)} />
      {totals.rawTotal - totals.grandTotal - (totals.roundOff || 0) > 0 && (
        <Row
          left="Discount"
          right={`-${formatCurrency(totals.rawTotal - totals.grandTotal - (totals.roundOff || 0))}`}
        />
      )}
      <Row left="GST" right={formatCurrency(totals.totalTax || 0)} />
      {totals.roundOff !== 0 && totals.roundOff !== undefined && (
        <Row left="Round Off" right={totals.roundOff?.toFixed(2)} />
      )}

      <Divider char="=" />
      <Row
        left="TOTAL"
        right={formatCurrency(totals.grandTotal || 0)}
        bold
        large
      />
      <Divider char="=" />

      {/* ── PAYMENT ── */}
      {paymentMethod && <Row left="Payment" right={paymentMethod} bold />}

      <Divider />

      {/* ── GST SUMMARY ── */}
      {Object.keys(gstSlabs).length > 0 && (
        <>
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
          <Divider />
        </>
      )}

      {/* ── QR CODE ── */}
      {upiLink && (
        <div className="thermal-qr-section">
          <div className="thermal-qr-label">Scan to Pay</div>
          <QRCodeSVG value={upiLink} size={printerWidth === '58' ? 90 : 110} />
          <div className="thermal-qr-upi">{upiId}</div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <Divider char="=" />
      <div className="thermal-footer">
        <div className="thermal-thanks">Thank You! Visit Again 🙏</div>
        <div className="thermal-footer-sub">
          Goods once sold will not be returned
        </div>
        <div className="thermal-footer-sub" style={{ marginTop: 4 }}>
          Powered by NithiX
        </div>
      </div>
    </div>
  );
}
