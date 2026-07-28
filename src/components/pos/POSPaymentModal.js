/* ===== POS PAYMENT MODAL — Checkout flow ===== */
import React, { useState } from 'react';
import { formatCurrency } from '../../utils/currency';

const PAYMENT_METHODS = [
  { key: 'Cash', icon: '💵', label: 'Cash' },
  { key: 'UPI', icon: '📱', label: 'UPI' },
  { key: 'Card', icon: '💳', label: 'Card' },
  { key: 'Split', icon: '⚡', label: 'Split' },
];

/**
 * POSPaymentModal
 * Shown when user clicks "Checkout".
 * Collects payment method, shows grand total, confirms save.
 */
export default function POSPaymentModal({
  open,
  totals,
  paymentMethod,
  onPaymentMethodChange,
  customerInfo,
  onCustomerChange,
  invoiceNo,
  saleDate,
  onConfirm,
  onClose,
  saving,
}) {
  const [cashGiven, setCashGiven] = useState('');
  const change = Math.max(0, (parseFloat(cashGiven) || 0) - totals.grandTotal);

  if (!open) return null;

  const quickAmounts = [
    Math.ceil(totals.grandTotal / 50) * 50,
    Math.ceil(totals.grandTotal / 100) * 100,
    Math.ceil(totals.grandTotal / 500) * 500,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totals.grandTotal);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.7)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
              Checkout
            </div>
            <div style={{ color: '#fff', fontSize: 28, fontWeight: 800 }}>
              {formatCurrency(totals.grandTotal)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              Invoice {invoiceNo}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              width: 36,
              height: 36,
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Customer */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
              Customer Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <input
                  value={customerInfo.name}
                  onChange={(e) => onCustomerChange({ name: e.target.value })}
                  placeholder="Name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  readOnly
                />
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  value={customerInfo.phone}
                  onChange={(e) => onCustomerChange({ phone: e.target.value })}
                  placeholder="Phone"
                  type="tel"
                  style={{
                    // width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
              Payment Method
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.key}
                  onClick={() => onPaymentMethodChange(pm.key)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 12,
                    border: paymentMethod === pm.key ? '2px solid #2563eb' : '2px solid #e2e8f0',
                    background: paymentMethod === pm.key ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease',
                    transform: paymentMethod === pm.key ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{pm.icon}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: paymentMethod === pm.key ? '#2563eb' : '#64748b',
                  }}>
                    {pm.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash quick amounts */}
          {paymentMethod === 'Cash' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                Cash Received
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {quickAmounts.slice(0, 3).map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashGiven(String(amt))}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 8,
                      border: cashGiven === String(amt) ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                      background: cashGiven === String(amt) ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      color: cashGiven === String(amt) ? '#2563eb' : '#374151',
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder={`Enter amount (≥ ₹${totals.grandTotal})`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              {parseFloat(cashGiven) > 0 && (
                <div style={{
                  marginTop: 8,
                  padding: '10px 14px',
                  background: change >= 0 ? '#f0fdf4' : '#fef2f2',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: change >= 0 ? '#15803d' : '#dc2626' }}>
                    {change >= 0 ? '✓ Change to Return' : '⚠ Insufficient'}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: change >= 0 ? '#15803d' : '#dc2626' }}>
                    {change >= 0 ? formatCurrency(change) : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bill Summary */}
          <div style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
              <span>GST</span>
              <span>{formatCurrency(totals.totalTax)}</span>
            </div>
            {totals.rawTotal !== totals.grandTotal && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#dc2626' }}>
                <span>Discount</span>
                <span>−{formatCurrency(totals.rawTotal - totals.grandTotal - totals.roundOff)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              <span>TOTAL</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 12,
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              color: '#374151',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || (paymentMethod === 'Cash' && cashGiven && parseFloat(cashGiven) < totals.grandTotal)}
            style={{
              flex: 2,
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: saving ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {saving ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                Saving…
              </>
            ) : (
              <>🖨 Confirm & Print</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
