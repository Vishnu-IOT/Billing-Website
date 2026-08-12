/* ===== POS & PRINTING SETTINGS TAB ===== */
import React, { useState } from 'react';
import useSettingsStore from '../../../store/settingsStore-DB';
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

export default function POSPrintingTab({ onSaveToast }) {
  const store = useSettingsStore();

  const [form, setForm] = useState({
    printerWidth: store.printerWidth,
    autoPrint: store.autoPrint,
    scannerEnabled: store.scannerEnabled,
    cameraEnabled: store.cameraEnabled,
    receiptHeader: store.receiptHeader,
    receiptFooter: store.receiptFooter,
    showGstOnReceipt: store.showGstOnReceipt,
    posGridItemDisplay: store.posGridItemDisplay,
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
      onSaveToast?.('POS & Printing settings saved');
    } catch {
      onSaveToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {/* ── Printer Width ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">🖨 Thermal Printer Configuration</span>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div>
            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
              Thermal Receipt Paper Width
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { val: '58', label: '58mm', desc: '2 inch receipt printer' },
                { val: '80', label: '80mm', desc: '3 inch standard retail printer' },
              ].map(({ val, label, desc }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, printerWidth: val }))}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 12,
                    border: `2px solid ${form.printerWidth === val ? 'var(--primary)' : 'var(--border)'}`,
                    background: form.printerWidth === val ? 'var(--primary-light)' : 'var(--bg)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 'var(--fs-lg)',
                      color: form.printerWidth === val ? 'var(--primary)' : 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    {desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Receipt Header Subtext</label>
              <input
                name="receiptHeader"
                className="form-input"
                placeholder="e.g. Welcome to Our Store"
                value={form.receiptHeader}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Footer Message</label>
              <input
                name="receiptFooter"
                className="form-input"
                placeholder="e.g. Thank you for shopping with us!"
                value={form.receiptFooter}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── POS Features & Hardware ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">POS Billing Features</span>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">POS Product Grid Info</label>
              <select
                name="posGridItemDisplay"
                className="form-select"
                value={form.posGridItemDisplay}
                onChange={handleChange}
              >
                <option value="Name + Price">Name + Selling Price</option>
                <option value="Name + SKU">Name + SKU / Barcode</option>
                <option value="Name + Stock">Name + Stock Quantity</option>
              </select>
            </div>
          </div>

          <Toggle
            label="Auto Print on Checkout"
            description="Automatically trigger thermal print dialog when B2C bill checkout completes"
            value={form.autoPrint}
            onChange={(v) => handleToggle('autoPrint', v)}
          />
          <Toggle
            label="USB Barcode Scanner Support"
            description="Show the dedicated barcode input bar at the top of the POS billing screen"
            value={form.scannerEnabled}
            onChange={(v) => handleToggle('scannerEnabled', v)}
          />
          <Toggle
            label="Camera Barcode Scanner"
            description="Enable mobile camera barcode scanner button on POS"
            value={form.cameraEnabled}
            onChange={(v) => handleToggle('cameraEnabled', v)}
          />
          <Toggle
            label="Show GST Breakdown on Receipt"
            description="Print itemized CGST / SGST breakdown table on thermal receipts"
            value={form.showGstOnReceipt}
            onChange={(v) => handleToggle('showGstOnReceipt', v)}
          />
        </div>
      </div>

      <div>
        <Button variant="primary" size="lg" loading={saving} type="submit">
          Save POS Settings
        </Button>
      </div>
    </form>
  );
}
