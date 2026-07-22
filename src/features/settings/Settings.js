/* ===== SETTINGS — TABBED ERP SETTINGS SHELL ===== */
import React, { useState } from 'react';
import { ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import InvoiceBillingTab from './tabs/InvoiceBillingTab';
import TaxGSTTab from './tabs/TaxGSTTab';
import PaymentsTab from './tabs/PaymentsTab';
import POSPrintingTab from './tabs/POSPrintingTab';
import {
  FiFileText,
  FiPercent,
  FiCreditCard,
  FiPrinter,
  FiBriefcase,
  FiUsers,
} from 'react-icons/fi';

const TABS = [
  { id: 'invoice', label: 'Invoice & Billing', icon: <FiFileText /> },
  { id: 'tax', label: 'Tax & GST', icon: <FiPercent /> },
  { id: 'payments', label: 'Payments', icon: <FiCreditCard /> },
  { id: 'pos', label: 'POS & Printing', icon: <FiPrinter /> },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('invoice');
  const toast = useToast();

  function handleSaveToast(msg, type = 'success') {
    if (type === 'error') {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <ToastContainer toasts={toast.toasts} />
      <div className="page-header">
        <div className="page-header__left">
          <h1>Settings</h1>
          <p className="page-header__sub">
            Configure system defaults, invoice formats, tax rules, and POS hardware
          </p>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 'var(--sp-5)',
          alignItems: 'start',
        }}
      >
        {/* Left Nav Sidebar */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--sp-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-1)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              padding: '6px 10px',
              marginBottom: 4,
            }}
          >
            System Preferences
          </div>
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: 'var(--fs-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}

          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              padding: '12px 10px 4px',
            }}
          >
            Database Settings
          </div>
          <button
            type="button"
            onClick={() => (window.location.hash = 'company')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: 'var(--fs-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16 }}><FiBriefcase /></span>
            Company Profile →
          </button>
          <button
            type="button"
            onClick={() => (window.location.hash = 'users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: 'var(--fs-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16 }}><FiUsers /></span>
            User Management →
          </button>
        </div>

        {/* Right Active Content Panel */}
        <div style={{ maxWidth: 720 }}>
          {activeTab === 'invoice' && <InvoiceBillingTab onSaveToast={handleSaveToast} />}
          {activeTab === 'tax' && <TaxGSTTab onSaveToast={handleSaveToast} />}
          {activeTab === 'payments' && <PaymentsTab onSaveToast={handleSaveToast} />}
          {activeTab === 'pos' && <POSPrintingTab onSaveToast={handleSaveToast} />}
        </div>
      </div>
    </div>
  );
}
