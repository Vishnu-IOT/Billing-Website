/* ===== PAYMENTS SETTINGS TAB ===== */
import React, { useState } from 'react';
import useSettingsStore from '../../../store/settingsStore';
import { Button } from '../../../components/ui';

const ALL_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit Card', 'Debit Card'];

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

export default function PaymentsTab({ onSaveToast }) {
  const store = useSettingsStore();

  const [form, setForm] = useState({
    defaultPaymentMethod: store.defaultPaymentMethod,
    acceptedPaymentMethods: store.acceptedPaymentMethods || ALL_METHODS,
    defaultPaymentTerms: store.defaultPaymentTerms,
    creditLimitWarning: store.creditLimitWarning,
    defaultCreditLimit: store.defaultCreditLimit,
    paymentRoundOff: store.paymentRoundOff,
  });

  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleMethodToggle(method) {
    setForm((f) => {
      const exists = f.acceptedPaymentMethods.includes(method);
      const updated = exists
        ? f.acceptedPaymentMethods.filter((m) => m !== method)
        : [...f.acceptedPaymentMethods, method];
      return { ...f, acceptedPaymentMethods: updated };
    });
  }

  function handleToggle(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      store.updateSettings(form);
      onSaveToast?.('Payment settings saved');
    } catch {
      onSaveToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="card">
        <div className="card__header">
          <span className="card__title">Payment Defaults &amp; Methods</span>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Default Payment Method</label>
              <select
                name="defaultPaymentMethod"
                className="form-select"
                value={form.defaultPaymentMethod}
                onChange={handleChange}
              >
                {ALL_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Default Payment Terms</label>
              <select
                name="defaultPaymentTerms"
                className="form-select"
                value={form.defaultPaymentTerms}
                onChange={handleChange}
              >
                <option value="Immediate">Immediate / Due on Receipt</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
              Accepted Payment Methods
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {ALL_METHODS.map((m) => {
                const active = form.acceptedPaymentMethods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMethodToggle(m)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary-light)' : 'var(--bg)',
                      color: active ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: 'var(--fs-xs)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {active ? '✓ ' : '+ '}{m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Default Party Credit Limit (₹)</label>
              <input
                name="defaultCreditLimit"
                type="number"
                min="0"
                className="form-input"
                value={form.defaultCreditLimit}
                onChange={handleChange}
              />
            </div>
          </div>

          <Toggle
            label="Credit Limit Overuse Warning"
            description="Warn billing staff when a customer invoice exceeds their credit limit"
            value={form.creditLimitWarning}
            onChange={(v) => handleToggle('creditLimitWarning', v)}
          />
          <Toggle
            label="Round Off Partial Payments"
            description="Automatically round off partial payment entries to nearest rupee"
            value={form.paymentRoundOff}
            onChange={(v) => handleToggle('paymentRoundOff', v)}
          />
        </div>
      </div>

      <div>
        <Button variant="primary" size="lg" loading={saving} type="submit">
          Save Payment Settings
        </Button>
      </div>
    </form>
  );
}
