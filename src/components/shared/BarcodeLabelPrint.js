/* ===== BARCODE LABEL PRINT — uses qrcode.react + product barcode field ===== */
import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui';
import { formatCurrency } from '../../utils/currency';

export default function BarcodeLabelPrint({ product, quantity = 1, onClose }) {
  const printRef = useRef(null);

  if (!product) return null;

  const barcode = product.barcode || product.SKU || product.sku || String(product.id || product._id);
  const name = product.name || 'Product';
  const price = product.salesPrice || product.MRP || product.mrp || 0;

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Labels</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 8px; }
        .label { width: 50mm; padding: 4mm; border: 1px dashed #ccc; display: inline-block; margin: 2mm; text-align: center; page-break-inside: avoid; }
        .name { font-size: 10px; font-weight: 700; margin-bottom: 4px; }
        .price { font-size: 11px; margin-top: 4px; }
        .code { font-size: 9px; font-family: monospace; margin-top: 2px; }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  const labels = Array.from({ length: Math.min(Math.max(quantity, 1), 100) }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handlePrint}>
          Print Labels
        </Button>
      </div>
      <div ref={printRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {labels.map((i) => (
          <div key={i} className="label" style={{ width: 180, padding: 12, border: '1px dashed var(--border)', textAlign: 'center' }}>
            <div className="name" style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{name}</div>
            <QRCodeSVG value={barcode} size={80} level="M" />
            <div className="code" style={{ fontSize: 10, fontFamily: 'monospace', marginTop: 4 }}>{barcode}</div>
            <div className="price" style={{ fontSize: 12, marginTop: 4 }}>{formatCurrency(price)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
