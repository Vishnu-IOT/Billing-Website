/* ===== BILL TEMPLATES SETTINGS TAB ===== */
// Purely additive: nothing here changes what prints by default. The Classic
// template (B2BInvoice.js) stays exactly as-is and remains the default unless
// someone explicitly switches to Modern here.
import React, { useState } from 'react';
import useAppStore from '../../../store/appStore';
import useBillTemplateStore from '../../../store/billTemplateStore';
import { Button } from '../../../components/ui';
import B2BInvoice from '../../billing/invoices/B2BInvoice';
import B2BInvoiceTemplate from '../../billing/invoices/templates/B2BInvoiceTemplate';
import '../../billing/invoices/templates/B2BInvoiceTemplate.css';
import {
  getSampleInvoice,
  getSampleCompany,
  getSampleClassicBill,
  getSampleClassicParty,
  getSampleClassicItems,
} from '../../billing/invoices/templates/sampleInvoiceData';

const TEMPLATE_OPTIONS = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Your current, working B2B invoice layout. This is the default and stays exactly as-is.',
  },
  {
    id: 'modern',
    name: 'Modern GST',
    description: 'GST-detailed layout with HSN-wise tax breakdown, E-invoice/E-way bill sections, and a customizable item table.',
  },
];

export default function BillTemplatesTab({ onSaveToast }) {
  const companies = useAppStore((s) => s.companies);
  const realCompany = companies?.[0] || companies || {};

  const billTemplate = useBillTemplateStore((s) => s.billTemplate);
  const setBillTemplate = useBillTemplateStore((s) => s.setBillTemplate);
  const itemColumns = useBillTemplateStore((s) => s.itemColumns);
  const toggleColumn = useBillTemplateStore((s) => s.toggleColumn);
  const reorderColumn = useBillTemplateStore((s) => s.reorderColumn);
  const setColumnWidth = useBillTemplateStore((s) => s.setColumnWidth);
  const resetColumns = useBillTemplateStore((s) => s.resetColumns);

  const [draftTemplate, setDraftTemplate] = useState(billTemplate);
  const sortedColumns = [...itemColumns].sort((a, b) => a.order - b.order);

  function handleSaveTemplate() {
    setBillTemplate(draftTemplate);
    onSaveToast?.(`Bill template set to ${TEMPLATE_OPTIONS.find((t) => t.id === draftTemplate)?.name}`);
  }

  const sampleInvoice = getSampleInvoice();
  const sampleCompany = getSampleCompany(realCompany);
  const sampleClassicBill = getSampleClassicBill();
  const sampleClassicParty = getSampleClassicParty();
  const sampleClassicItems = getSampleClassicItems();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* ── Template picker ── */}
      <div>
        <h3 style={{ marginBottom: 'var(--sp-1)' }}>B2B Bill Template</h3>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
          Choose which layout prints for B2B invoices. The sample preview below updates as you pick.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          {TEMPLATE_OPTIONS.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setDraftTemplate(tpl.id)}
              style={{
                border: `2px solid ${draftTemplate === tpl.id ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-4)',
                cursor: 'pointer',
                background: draftTemplate === tpl.id ? 'var(--primary-bg, rgba(37,99,235,0.06))' : 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong>{tpl.name}</strong>
                {billTemplate === tpl.id && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--primary)', fontWeight: 600 }}>
                    ✓ Currently active
                  </span>
                )}
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                {tpl.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Button
            variant="primary"
            onClick={handleSaveTemplate}
            disabled={draftTemplate === billTemplate}
          >
            Use {TEMPLATE_OPTIONS.find((t) => t.id === draftTemplate)?.name} Template
          </Button>
        </div>
      </div>

      {/* ── Item table column customization (Modern template only) ── */}
      {draftTemplate === 'modern' && (
        <div>
          <h3 style={{ marginBottom: 'var(--sp-1)' }}>Item Table Columns</h3>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
            Show, hide, reorder, and resize the columns in the item table. Only applies to the Modern GST template.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {sortedColumns.map((col, idx) => (
              <div
                key={col.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-3)',
                  padding: 'var(--sp-2) var(--sp-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                }}
              >
                <input
                  type="checkbox"
                  checked={col.enabled}
                  onChange={() => toggleColumn(col.key)}
                />
                <span style={{ flex: 1, fontWeight: 600 }}>{col.label}</span>

                <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  Width %
                  <input
                    type="number"
                    min="4"
                    max="60"
                    value={col.width}
                    onChange={(e) => setColumnWidth(col.key, Number(e.target.value))}
                    className="form-input"
                    style={{ width: 60, marginLeft: 6, display: 'inline-block' }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={idx === 0}
                    onClick={() => reorderColumn(col.key, -1)}
                    title="Move left"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={idx === sortedColumns.length - 1}
                    onClick={() => reorderColumn(col.key, 1)}
                    title="Move right"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'var(--sp-3)' }}>
            <Button variant="secondary" size="sm" onClick={resetColumns}>
              Reset to Default Columns
            </Button>
          </div>
        </div>
      )}

      {/* ── Live sample preview ── */}
      <div>
        <h3 style={{ marginBottom: 'var(--sp-1)' }}>Sample Preview</h3>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
          Illustrative data only — nothing here is a real invoice.
        </p>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'auto',
            maxHeight: '70vh',
            background: '#fff',
            padding: 'var(--sp-4)',
          }}
        >
          {draftTemplate === 'modern' ? (
            <B2BInvoiceTemplate
              invoice={sampleInvoice}
              company={sampleCompany}
              columnsOverride={itemColumns}
            />
          ) : (
            <B2BInvoice
              bill={sampleClassicBill}
              companies={sampleCompany}
              party={sampleClassicParty}
              items={sampleClassicItems}
              invoiceLabel="TAX INVOICE"
              partyLabel="Billed To"
              printRef={{ current: null }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
