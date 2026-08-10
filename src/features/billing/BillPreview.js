/* ===== BILL PREVIEW (Printable Invoice) ===== */
import React, { useRef } from 'react';
import useAppStore from '../../store/appStore';
import { Button } from '../../components/ui';
import '../../styles/Billpreview.css';
import { useToast } from '../../hooks/useToast';
import B2CInvoice from './invoices/B2CInvoice';
import B2BInvoice from './invoices/B2BInvoice';

export default function BillPreview({ bill, billType = 'SALE', onBack }) {
  const companies = useAppStore((s) => s.companies);
  const toast = useToast();
  const printRef = useRef(null);
  if (!bill) return null;

  const isSale = billType === 'SALE';
  const isB2B = bill.bill_type === 'B2B';
  const party = bill.Party || {};
  const items = bill.SalesItems || [];

  function handlePrint() {
    const el = printRef.current;
    if (!el) {
      toast.error('Error: Unable to prepare invoice for printing');
      return;
    }

    try {
      window.print(); // That's it! CSS handles the rest
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print invoice');
    }
  }

  const invoiceLabel = isB2B ? 'TAX INVOICE' : isSale ? 'INVOICE' : 'PURCHASE BILL';
  const partyLabel = isSale ? 'Billed To' : 'Supplier';

  const InvoiceTemplate = isB2B ? B2BInvoice : B2CInvoice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="page-header">
        <div
          className="page-header__left"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}
        >
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h1>Preview Invoice</h1>
        </div>
        <Button variant="primary" onClick={handlePrint} icon="🖨️">
          Print Invoice
        </Button>
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          padding: 'var(--sp-8)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: 880,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <InvoiceTemplate
          bill={bill}
          companies={companies}
          party={party}
          items={items}
          invoiceLabel={invoiceLabel}
          partyLabel={partyLabel}
          printRef={printRef}
        />
      </div>
    </div>
  );
}
