/* ===== TAX & GST SETTINGS TAB ===== */
import React, { useState } from 'react';
import useSettingsStore from '../../../store/settingsStore';
import { Button } from '../../../components/ui';

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

export default function TaxGSTTab({ onSaveToast }) {
  const store = useSettingsStore();

  const [form, setForm] = useState({
    gstRegistrationType: store.gstRegistrationType,
    defaultTaxRate: store.defaultTaxRate,
    taxCalculationMode: store.taxCalculationMode,
    hsnDigits: store.hsnDigits,
    roundOffInvoices: store.roundOffInvoices,
    reverseCharge: store.reverseCharge,
  });

  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleToggle(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      store.updateSettings(form);
      onSaveToast?.('Tax & GST settings saved');
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
          <span className="card__title">GST &amp; Tax Configuration</span>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">GST Registration Scheme</label>
              <select
                name="gstRegistrationType"
                className="form-select"
                value={form.gstRegistrationType}
                onChange={handleChange}
              >
                <option value="Regular">Regular Taxpayer</option>
                <option value="Composition">Composition Scheme</option>
                <option value="Unregistered">Unregistered Business</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Default Tax Rate (%)</label>
              <select
                name="defaultTaxRate"
                className="form-select"
                value={form.defaultTaxRate}
                onChange={handleChange}
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tax Calculation Mode</label>
              <select
                name="taxCalculationMode"
                className="form-select"
                value={form.taxCalculationMode}
                onChange={handleChange}
              >
                <option value="Inclusive">Inclusive of Tax</option>
                <option value="Exclusive">Exclusive of Tax</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">HSN Code Minimum Digits</label>
              <select
                name="hsnDigits"
                className="form-select"
                value={form.hsnDigits}
                onChange={handleChange}
              >
                <option value="4">4 Digits (Turnover &lt; 5Cr)</option>
                <option value="8">8 Digits (Turnover &gt; 5Cr / Export)</option>
              </select>
            </div>
          </div>

          <Toggle
            label="Automatic Invoice Round-off"
            description="Round off invoice final amounts to the nearest whole rupee"
            value={form.roundOffInvoices}
            onChange={(v) => handleToggle('roundOffInvoices', v)}
          />
          <Toggle
            label="Reverse Charge Mechanism (RCM)"
            description="Enable RCM tax options on purchases and inward bills"
            value={form.reverseCharge}
            onChange={(v) => handleToggle('reverseCharge', v)}
          />
        </div>
      </div>

      <div>
        <Button variant="primary" size="lg" loading={saving} type="submit">
          Save Tax Settings
        </Button>
      </div>
    </form>
  );
}
