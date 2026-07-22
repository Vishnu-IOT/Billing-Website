/* ===== INVOICE & BILLING SETTINGS TAB ===== */
import React, { useState } from 'react';
import useSettingsStore from '../../../store/settingsStore';
import { Button } from '../../../components/ui';
import { formatInvoicePrefix } from '../../../utils/invoice';

function Toggle({ value, onChange, label, description }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: value ? 'var(--primary)' : '#cbd5e1',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0,
          marginLeft: 16,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}

export default function InvoiceBillingTab({ onSaveToast }) {
  const store = useSettingsStore();

  const [form, setForm] = useState({
    invoicePrefix: store.invoicePrefix,
    invoiceYearFormat: store.invoiceYearFormat,
    invoiceSeparator: store.invoiceSeparator,
    invoiceStartingNumber: store.invoiceStartingNumber,
    billTheme: store.billTheme,
    termsAndConditions: store.termsAndConditions,
    defaultDueDays: store.defaultDueDays,
    dateFormat: store.dateFormat,
    showBankDetails: store.showBankDetails,
    showUpiQr: store.showUpiQr,
    showSignature: store.showSignature,
  });

  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleToggle(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      store.updateSettings(form);
      onSaveToast?.('Invoice & Billing settings saved');
    } catch {
      onSaveToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {/* ── Invoice Theme ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Invoice Theme</span>
        </div>
        <div className="card__body">
          <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            {['classic', 'modern', 'minimal'].map((theme) => (
              <div
                key={theme}
                onClick={() => setForm((f) => ({ ...f, billTheme: theme }))}
                style={{
                  padding: 'var(--sp-4)',
                  border: `2px solid ${form.billTheme === theme ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  flex: 1,
                  textAlign: 'center',
                  transition: 'all 0.15s',
                  background:
                    form.billTheme === theme
                      ? 'var(--primary-light)'
                      : 'var(--bg)',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    color:
                      form.billTheme === theme
                        ? 'var(--primary)'
                        : 'var(--text-primary)',
                  }}
                >
                  {theme}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Invoice Numbering ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Invoice Numbering Prefix</span>
        </div>
        <div className="card__body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Prefix String</label>
                <input
                  name="invoicePrefix"
                  className="form-input"
                  value={form.invoicePrefix || ''}
                  onChange={handleChange}
                  placeholder="e.g. INV, SALES"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Financial Year Format</label>
                <select
                  name="invoiceYearFormat"
                  className="form-select"
                  value={form.invoiceYearFormat || 'YYYY'}
                  onChange={handleChange}
                >
                  <option value="none">None</option>
                  <option value="YYYY">YYYY (e.g. 2026)</option>
                  <option value="YY-YY">YY-YY (e.g. 25-26)</option>
                  <option value="YYYY-YYYY">YYYY-YYYY (e.g. 2025-2026)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Separator</label>
                <input
                  name="invoiceSeparator"
                  className="form-input"
                  value={form.invoiceSeparator ?? '-'}
                  onChange={handleChange}
                  placeholder="e.g. -, /, _"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Starting Number</label>
                <input
                  name="invoiceStartingNumber"
                  type="number"
                  min="1"
                  className="form-input"
                  value={form.invoiceStartingNumber || '1'}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Live Preview */}
            <div
              style={{
                background: 'var(--bg)',
                padding: 'var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--sp-1)',
                }}
              >
                Live Preview
              </div>
              <div
                style={{
                  fontSize: 'var(--fs-xl)',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  fontFamily: 'monospace',
                }}
              >
                {formatInvoicePrefix(form)}
                {String(form.invoiceStartingNumber || '1').padStart(
                  String(form.invoiceStartingNumber || '0001').length || 4,
                  '0'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Invoice Defaults & Visibility ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Invoice Defaults &amp; Visibility</span>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Default Payment Due Days</label>
              <input
                name="defaultDueDays"
                type="number"
                min="0"
                className="form-input"
                value={form.defaultDueDays}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select
                name="dateFormat"
                className="form-select"
                value={form.dateFormat}
                onChange={handleChange}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Terms &amp; Conditions</label>
            <textarea
              name="termsAndConditions"
              className="form-input"
              rows={3}
              value={form.termsAndConditions}
              onChange={handleChange}
              placeholder="Terms printed at invoice bottom"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <Toggle
            label="Show Bank Details on Invoice"
            description="Display bank account details at bottom of printed invoices"
            value={form.showBankDetails}
            onChange={(v) => handleToggle('showBankDetails', v)}
          />
          <Toggle
            label="Show UPI QR Code"
            description="Display payment QR code on invoice header/footer"
            value={form.showUpiQr}
            onChange={(v) => handleToggle('showUpiQr', v)}
          />
          <Toggle
            label="Show Authorized Signature Block"
            description="Include signature line at footer of bill"
            value={form.showSignature}
            onChange={(v) => handleToggle('showSignature', v)}
          />
        </div>
      </div>

      <div>
        <Button variant="primary" size="lg" loading={saving} type="submit">
          Save Invoice Settings
        </Button>
      </div>
    </form>
  );
}
