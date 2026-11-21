import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui';
import { formatCurrency } from '../../utils/currency';

const RETURN_CONDITION_LABELS = {
  GOOD: 'Good / Resalable',
  DAMAGED: 'Damaged',
  EXPIRED: 'Expired',
};

export default function ThermalSalesReturnBill({
  receipt,
  company,
  printerWidth = '80',
  onPrintError,
}) {
  const receiptRef = useRef(null);
  if (!receipt) return null;

  function handlePrint() {
    if (!receiptRef.current) {
      onPrintError?.('Return receipt is not ready to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      onPrintError?.('Allow pop-ups to print the return receipt');
      return;
    }

    const style = printWindow.document.createElement('style');
    style.textContent = `
      @page { size: ${printerWidth === '58' ? '58mm' : '80mm'} auto; margin: 3mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font: 12px/1.35 Arial, sans-serif; }
      .sales-return-thermal { width: 100%; padding: 2mm; text-align: center; }
      .sales-return-thermal h2 { margin: 0 0 4px; font-size: 17px; }
      .sales-return-thermal p { margin: 3px 0; }
      .return-thermal-divider { border-top: 1px dashed #111; margin: 8px 0; }
      .return-thermal-row { display: flex; justify-content: space-between; gap: 8px; text-align: left; }
      .return-thermal-item { padding: 4px 0; text-align: left; }
      .return-thermal-item-name { font-weight: 700; }
      .return-thermal-code { overflow-wrap: anywhere; font: 10px monospace; }
      .return-thermal-qr { margin: 10px auto 4px; }
    `;
    printWindow.document.head.appendChild(style);
    printWindow.document.title = `Return ${receipt.code}`;
    printWindow.document.body.appendChild(receiptRef.current.cloneNode(true));
    printWindow.focus();
    window.setTimeout(() => {
      try {
        printWindow.print();
        printWindow.close();
      } catch (error) {
        printWindow.close();
        onPrintError?.(error.message || 'Failed to print return receipt');
      }
    }, 250);
  }

  const storeName = company?.legal_name || company?.companyName || 'Store';
  const issuedDate = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleString('en-IN')
    : new Date().toLocaleString('en-IN');

  return (
    <section className="card" style={{ padding: 'var(--sp-4)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--sp-3)',
          marginBottom: 'var(--sp-4)',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Return credit created</h2>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>
            Scan this QR code at B2C checkout. Any unused credit remains available.
          </p>
        </div>
        <Button variant="primary" onClick={handlePrint}>
          Print Thermal Return Bill
        </Button>
      </div>

      <div
        ref={receiptRef}
        className="sales-return-thermal"
        style={{
          width: 'min(100%, 340px)',
          margin: '0 auto',
          padding: 'var(--sp-4)',
          background: '#fff',
          color: '#111',
          border: '1px dashed var(--border-strong)',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      >
        <h2>{storeName}</h2>
        <p>SALES RETURN CREDIT</p>
        <div className="return-thermal-divider" />
        <div className="return-thermal-row">
          <span>Return No.</span>
          <span>{receipt.code}</span>
        </div>
        <div className="return-thermal-row">
          <span>Original Bill</span>
          <span>{receipt.sourceInvoiceNumber}</span>
        </div>
        <div className="return-thermal-row">
          <span>Issued</span>
          <span>{issuedDate}</span>
        </div>
        <div className="return-thermal-divider" />
        {(receipt.items || []).map((item, index) => (
          <div
            className="return-thermal-item"
            key={`${item.quickSaleItemId || item.saleItemId || index}-${index}`}
          >
            <div className="return-thermal-row">
              <span className="return-thermal-item-name">{item.productName}</span>
              <span>{formatCurrency(item.returnedAmount)}</span>
            </div>
            {item.itemType === 'QUICK_SALE' && (
              <div>
                QUICK SALE · {item.gstVerificationStatus === 'GST_PENDING'
                  ? 'GST PENDING VERIFICATION'
                  : item.gstVerificationStatus === 'GST_VERIFIED'
                    ? 'GST VERIFIED'
                    : 'GST STATUS UNAVAILABLE'}
              </div>
            )}
            {item.itemType === 'PRODUCT' && (
              <div>Condition: {RETURN_CONDITION_LABELS[item.returnCondition] || 'Good / Resalable'}</div>
            )}
            <div>
              Returned {item.quantity} {item.quantityUnit}
              {item.batchNumber ? ` · Batch ${item.batchNumber}` : ''}
            </div>
          </div>
        ))}
        <div className="return-thermal-divider" />
        <div className="return-thermal-row">
          <strong>Credit issued</strong>
          <strong>{formatCurrency(receipt.totalAmount)}</strong>
        </div>
        <div className="return-thermal-row">
          <span>Balance at issue</span>
          <span>{formatCurrency(receipt.remainingAmount)}</span>
        </div>
        {receipt.reason && <p>Reason: {receipt.reason}</p>}
        <div className="return-thermal-qr">
          <QRCodeSVG value={`RETURN-CREDIT:${receipt.code}`} size={112} level="M" />
        </div>
        <div className="return-thermal-code">RETURN-CREDIT:{receipt.code}</div>
        <div className="return-thermal-divider" />
        <p>Present this return credit at B2C checkout</p>
      </div>
    </section>
  );
}
