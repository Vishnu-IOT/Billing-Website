/* ===== B2B INVOICE (GST Tax Invoice) — buyer GSTIN, HSN summary, CGST/SGST breakup ===== */
import React from 'react';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { numberToWords } from '../../../utils/numbers';
import { calcBillTotals } from '../../../utils/invoice';

export default function B2BInvoice({ bill, companies, party, items, invoiceLabel, partyLabel, printRef }) {
  /* Group items by HSN + tax rate for the mandatory HSN-wise tax summary */
  const hsnSummary = {};
  items.forEach((item) => {
    const hsn = item.hsncode || item.product?.HSNCode || '-';
    const rate = item.taxPercentage || 0;
    const key = `${hsn}|${rate}`;
    const taxable = parseFloat(item.taxAmount ? item.baseRate || 0 : 0) || (parseFloat(item.netRate) || 0) - (parseFloat(item.taxAmount) || 0);
    const taxAmt = parseFloat(item.taxAmount) || 0;
    if (!hsnSummary[key]) {
      hsnSummary[key] = { hsn, rate, taxable: 0, cgst: 0, sgst: 0 };
    }
    hsnSummary[key].taxable += taxable;
    hsnSummary[key].cgst += taxAmt / 2;
    hsnSummary[key].sgst += taxAmt / 2;
  });
  const hsnRows = Object.values(hsnSummary);

  return (
    <div
      ref={printRef}
      className="print-area invoice-b2b"
      style={{
        background: 'white',
        color: 'black',
        padding: 40,
        fontFamily: 'sans-serif',
        fontSize: 13,
        lineHeight: 1.5,
        border: '1px solid #ddd',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderBottom: '2px solid #222',
          paddingBottom: 20,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: '0 0 4px 0',
              textTransform: 'uppercase',
            }}
          >
            {companies.legal_name || 'BUSINESS NAME'}
          </h2>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {companies.address_line1 || 'Address Line 1\nCity, State, ZIP'}
          </div>
          {companies.companyPhone && <div>Phone: {companies.phone}</div>}
          {companies.companyGstin && <div>GSTIN: {companies.gstin}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1
            style={{
              fontSize: 28,
              color: '#444',
              margin: '0 0 10px 0',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {invoiceLabel}
          </h1>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto auto',
              gap: '4px 16px',
              textAlign: 'left',
              background: '#f8f9fa',
              padding: 12,
              borderRadius: 4,
            }}
          >
            <span style={{ fontWeight: 600 }}>Invoice No:</span>
            <span>{bill.invoiceNumber}</span>
            <span style={{ fontWeight: 600 }}>Date:</span>
            <span>{formatDate(bill.saleDate || bill.purchaseDate)}</span>
            {bill.ewayBillNo && (
              <>
                <span style={{ fontWeight: 600 }}>E-Way Bill:</span>
                <span>{bill.ewayBillNo}</span>
              </>
            )}
            <span style={{ fontWeight: 600 }}>Place of Supply:</span>
            <span>{party.state || companies.state || '-'}</span>
          </div>
        </div>
      </div>

      {/* Buyer Details — GSTIN required for B2B */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <div style={{ width: '48%' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#666',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {partyLabel}
          </div>
          <div
            style={{
              border: '1px solid #ddd',
              padding: 12,
              borderRadius: 4,
              minHeight: 90,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {party.name || 'Business Customer'}
            </div>
            {party.phone && <div>Phone: {party.phone}</div>}
            {party.address && <div>Address: {party.address}</div>}
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              GSTIN: {party.GST || 'Not provided'}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table — includes HSN/SAC + Tax% columns required for GST invoices */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #222' }}>
            <th style={{ padding: '10px 8px', textAlign: 'left' }}>S.No</th>
            <th style={{ padding: '10px 8px', textAlign: 'left' }}>Item Description</th>
            <th style={{ padding: '10px 8px', textAlign: 'left' }}>HSN/SAC</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Qty</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Rate</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc%</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Tax%</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const qty = item.quantity || 1;
            const price = parseFloat(item.price) || 0;
            const disc = item.discountPercentage || 0;
            const taxRate = item.taxPercentage || 0;
            const total = parseFloat(item.netRate) || 0;
            return (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 8px' }}>{idx + 1}</td>
                <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                  {item.productName || item.product?.name}
                </td>
                <td style={{ padding: '12px 8px' }}>
                  {item.hsncode || item.product?.HSNCode || '-'}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  {qty} {item.unit || 'pcs'}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>{price.toFixed(2)}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  {disc > 0 ? `${disc}%` : '-'}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  {taxRate >= 0 ? `${taxRate}%` : '-'}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                  {total.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* HSN-wise Tax Summary — standard requirement on GST tax invoices */}
      {hsnRows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #222' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>HSN/SAC</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Taxable Value</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>CGST</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>SGST</th>
            </tr>
          </thead>
          <tbody>
            {hsnRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 8px' }}>
                  {row.hsn} ({row.rate}%)
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {formatCurrency(row.taxable)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {formatCurrency(row.cgst)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {formatCurrency(row.sgst)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Totals — CGST/SGST split shown explicitly (mandatory for GST tax invoices) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <div style={{ width: '55%' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>
              Amount in words:
            </div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              Rupees {numberToWords(Math.round(bill.totalAmount || 0))} Only
            </div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
              Bank Details
            </div>
            <div>A/c Name: {companies.legal_name || '-'}</div>
            <div>A/c No: {companies.bank_account_enc || '-'}</div>
            <div>IFSC: {companies.bankIFSC || '-'}</div>
          </div>
          <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
              Declaration
            </div>
            <div style={{ color: '#555' }}>
              We declare that this invoice shows the actual price of the goods/services
              described and that all particulars are true and correct.
            </div>
          </div>
        </div>
        <div style={{ width: '40%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 8px', color: '#555' }}>Subtotal</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(bill.baseRate)}
                </td>
              </tr>
              {(bill.discountAmount > 0 || bill.globalDiscount > 0) && (
                <tr>
                  <td style={{ padding: '6px 8px', color: '#d32f2f' }}>Discount</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#d32f2f' }}>
                    -{formatCurrency(bill.discountAmount || bill.globalDiscount)}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '6px 8px', color: '#555' }}>CGST</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {formatCurrency((bill.tax || 0) / 2)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', color: '#555' }}>SGST</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {formatCurrency((bill.tax || 0) / 2)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', color: '#555' }}>Round Off</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  {(bill.roundOff || 0).toFixed(2)}
                  {/* {(calcBillTotals(items, bill.globalDiscount).roundOff || 0).toFixed(2)} */}
                </td>
              </tr>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #222', borderBottom: '2px solid #222' }}>
                <td style={{ padding: '12px 8px', fontWeight: 700, fontSize: 16 }}>Grand Total</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, fontSize: 18 }}>
                  {formatCurrency(bill.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <div
              style={{
                borderTop: '1px solid #444',
                width: 140,
                margin: '0 auto',
                paddingTop: 8,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
