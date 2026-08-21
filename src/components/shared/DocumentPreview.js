// src/components/shared/DocumentPreview.js
import React, { useRef, useState, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import { Button } from '../ui';
import '../../styles/Billpreview.css';
import { useToast } from '../../hooks/useToast';
import B2BInvoice from '../../features/billing/invoices/B2BInvoice';
import { fetchFinancialDetailsAPI } from '../../api/company';
import { getDocumentConfig } from '../../utils/documents';

export default function DocumentPreview({ doc, documentType, onBack }) {
    const companies = useAppStore((s) => s.companies);
    const toast = useToast();
    const printRef = useRef(null);

    const [companyFinancials, setCompanyFinancials] = useState({});

    const config = getDocumentConfig(documentType);
    const party = doc.Party || { name: doc.name, phone: doc.phone };
    const items = doc[config.itemsField] || [];
    const companyBasic = companies?.[0] || companies || {};

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

    if (!doc) return null;

    function handlePrint() {
        const el = printRef.current;
        if (!el) {
            toast.error('Error: Unable to prepare document for printing');
            return;
        }
        try {
            window.print();
        } catch (error) {
            console.error('Print error:', error);
            toast.error('Failed to print document');
        }
    }

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
                    <h1>Preview {config.label}</h1>
                </div>

                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <Button variant="primary" onClick={handlePrint} icon="🖨️">
                        Print {config.label}
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
                }}
            >
                <B2BInvoice
                    bill={doc}
                    companies={companiesForDisplay}
                    party={party}
                    items={items}
                    invoiceLabel={config.label.toUpperCase()}
                    partyLabel="Billed To"
                    printRef={printRef}
                />
            </div>
        </div>
    );
}