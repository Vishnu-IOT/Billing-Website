/* ===== SETTINGS ===== */
import React, { useState } from 'react';
import useAppStore from '../../store/appStore';
import { Button, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatInvoicePrefix } from '../../utils/invoice';
import usePOSStore from '../../hooks/usePOSStore';

export default function Settings() {
  const { settings, updateSettings } = useAppStore();
  const toast = useToast();
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  /* POS Settings from Zustand POS store */
  const printerWidth = usePOSStore((s) => s.printerWidth);
  const autoPrint = usePOSStore((s) => s.autoPrint);
  const scannerEnabled = usePOSStore((s) => s.scannerEnabled);
  const cameraEnabled = usePOSStore((s) => s.cameraEnabled);
  const setPOSSetting = usePOSStore((s) => s.setPOSSetting);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      updateSettings(form);
      toast.success('Settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  /* ── Reusable iOS-style toggle ── */
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-5)',
        maxWidth: 640,
      }}
    >
      <ToastContainer toasts={toast.toasts} />
      <div className="page-header">
        <div className="page-header__left">
          <h1>Settings</h1>
          <p className="page-header__sub">Business and invoice configuration</p>
        </div>
      </div>

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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-4)',
            }}
          >
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
                  <option value="YYYY">YYYY (e.g. 2024)</option>
                  <option value="YY-YY">YY-YY (e.g. 24-25)</option>
                  <option value="YYYY-YYYY">YYYY-YYYY (e.g. 2024-2025)</option>
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

      {/* ── POS & Printing ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">🖨 POS &amp; Thermal Printing</span>
          <span
            style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}
          >
            B2C counter billing settings
          </span>
        </div>
        <div className="card__body">
          {/* Printer Width */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label
              className="form-label"
              style={{ marginBottom: 10, display: 'block' }}
            >
              Thermal Printer Width
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { val: '58', label: '58mm', desc: 'Small receipt printer' },
                { val: '80', label: '80mm', desc: 'Standard retail printer' },
              ].map(({ val, label, desc }) => (
                <button
                  key={val}
                  onClick={() => setPOSSetting('printerWidth', val)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 12,
                    border: `2px solid ${printerWidth === val ? 'var(--primary)' : 'var(--border)'}`,
                    background:
                      printerWidth === val
                        ? 'var(--primary-light)'
                        : 'var(--bg)',
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
                      color:
                        printerWidth === val
                          ? 'var(--primary)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--fs-xs)',
                      color: 'var(--text-muted)',
                      marginTop: 4,
                    }}
                  >
                    {desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle switches */}
          <Toggle
            label="Auto Print on Checkout"
            description="Automatically open print dialog when a B2C bill is saved"
            value={autoPrint}
            onChange={(v) => setPOSSetting('autoPrint', v)}
          />
          <Toggle
            label="USB Barcode Scanner"
            description="Show the barcode input bar at the top of the POS screen"
            value={scannerEnabled}
            onChange={(v) => setPOSSetting('scannerEnabled', v)}
          />
          <Toggle
            label="Camera Barcode Scanner"
            description="Enable the 📷 camera scan button for mobile barcode scanning"
            value={cameraEnabled}
            onChange={(v) => setPOSSetting('cameraEnabled', v)}
          />
        </div>
      </div>

      <Button variant="primary" size="lg" loading={saving} onClick={handleSave}>
        Save Settings
      </Button>
    </div>
  );
}
