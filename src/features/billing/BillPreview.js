/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: BillPreview.js  (UPDATED SECTION ONLY — see comments for what changed)
   LOCATION: frontend/src/features/billing/BillPreview.js

   WHAT CHANGED vs your original:
   1. New imports for the new templates + adapter + financial fetch
   2. company data is now loaded via fetchCompanyForInvoice() (async, hits the
      real Financial API) instead of being read straight off `companies[0]`
   3. Added a toggle so you can switch between your existing B2B/B2C templates
      and the new ones without breaking anything
   ═══════════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useState, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import { Button } from '../../components/ui';
import '../../styles/Billpreview.css';
import { useToast } from '../../hooks/useToast';
import B2CInvoice from './invoices/B2CInvoice';
import B2BInvoice from './invoices/B2BInvoice';
import { fetchFinancialDetailsAPI } from '../../api/company';

// ── NEW IMPORTS ──
import CustomizableInvoice from './invoices/templates/CustomizableInvoice';
import B2BInvoiceTemplate from './invoices/templates/B2BInvoiceTemplate';
import { adaptBillToInvoice, fetchCompanyForInvoice } from './invoices/templates/adaptBillData';
import './invoices/templates/CustomizableInvoice.css';
import './invoices/templates/B2BInvoiceTemplate.css';
import ThermalInvoice from './invoices/templates/ThermalInvoice';

export default function BillPreview({ bill, billType = 'SALE', onBack }) {
  const companies = useAppStore((s) => s.companies);
  const toast = useToast();
  const printRef = useRef(null);

  // ── NEW STATE ──
  const [useNewTemplate, setUseNewTemplate] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null); // { invoice, company }
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [companyFinancials, setCompanyFinancials] = useState({});


  const isSale = billType === 'SALE';
  const isB2B = bill.bill_type === 'B2B';
  const party = bill.Party || {};
  const items = bill.SalesItems || [];
  const companyBasic = companies?.[0] || companies || {};

  // ── NEW: fetch real GST/bank data from the Financial API when the
  //         new-template view is opened (not on every render) ──
  // useEffect(() => {
  //   if (!useNewTemplate || !companyBasic?.id) return;

  //   let cancelled = false;
  //   setLoadingFinancials(true);

  //   (async () => {
  //     const company = await fetchCompanyForInvoice(companyBasic.id, companyBasic);
  //     const adapted = adaptBillToInvoice(bill, party, items, company);
  //     if (!cancelled) {
  //       setInvoiceData(adapted);
  //       setLoadingFinancials(false);
  //     }
  //   })();

  //   return () => { cancelled = true; };
  // }, [useNewTemplate, bill.id]); // re-fetch if the user opens a different bill

  useEffect(() => {
    if (!companyBasic?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchFinancialDetailsAPI(companyBasic.id);
        const financials = res?.data?.data || res?.data || {};
        if (!cancelled) setCompanyFinancials(financials);
      } catch (err) {
        console.error('Could not load company financial details:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [companyBasic?.id]);

  const companiesForDisplay = { ...companyBasic, financials: companyFinancials };

  if (!bill) return null;

  function handlePrint() {
    const el = printRef.current;
    if (!el) {
      toast.error('Error: Unable to prepare invoice for printing');
      return;
    }
    try {
      window.print();
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print invoice');
    }
  }

  const invoiceLabel = isB2B ? 'TAX INVOICE' : isSale ? 'INVOICE' : 'PURCHASE BILL';
  const partyLabel = isSale ? 'Billed To' : 'Supplier';

  const LegacyTemplate = isB2B ? B2BInvoice : ThermalInvoice;
  const NewTemplate = isB2B ? B2BInvoiceTemplate : CustomizableInvoice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="page-header">
        <div
          className="page-header__left"
          style={{ display: 'flex', alignItems: 'center', flexDirection: 'row', gap: 'var(--sp-3)' }}
        >
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h1>Preview Invoice</h1>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {/* NEW: toggle button */}
          {/* <Button variant="ghost" size="sm" onClick={() => setUseNewTemplate((v) => !v)}>
            {useNewTemplate ? 'Classic Template' : 'New Template'}
          </Button> */}
          <Button variant="primary" onClick={handlePrint} icon="🖨️">
            Print Invoice
          </Button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          padding: 'var(--sp-8)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: 880,
          margin: '0 auto',
          // width: '100%',
        }}
      >
        {useNewTemplate ? (
          loadingFinancials || !invoiceData ? (
            <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
              Loading company financial details...
            </div>
          ) : (
            <NewTemplate invoice={invoiceData.invoice} company={invoiceData.company} />
          )
        ) : (
          <LegacyTemplate
            bill={bill}
            companies={companiesForDisplay}
            party={party}
            items={items}
            invoiceLabel={invoiceLabel}
            partyLabel={partyLabel}
            printRef={printRef}
          />
        )}
      </div>
    </div>
  );
}