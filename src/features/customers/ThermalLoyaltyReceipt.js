import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import useAppStore from '../../store/appStore';
import useSettingsStore from '../../store/settingsStore-DB';
import { formatCurrency } from '../../utils/currency';
import '../billing/invoices/ThermalInvoice.css';

function formatReceiptDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ThermalLoyaltyReceipt({ receipt, printRequest }) {
  const companies = useAppStore((state) => state.companies);
  const printerWidth = useSettingsStore((state) => state.printerWidth);
  const company = Array.isArray(companies) ? companies[0] : companies;
  const width = printerWidth === '58' ? '58' : '80';

  useEffect(() => {
    if (!receipt || !printRequest) return undefined;
    let active = true;
    const cleanup = () => {
      document.body.classList.remove('printing-loyalty-redemption');
    };
    const afterPrint = () => {
      cleanup();
      window.removeEventListener('afterprint', afterPrint);
    };

    document.body.classList.add('printing-loyalty-redemption');
    window.addEventListener('afterprint', afterPrint);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (active) window.print();
      });
    });

    return () => {
      active = false;
      window.removeEventListener('afterprint', afterPrint);
      cleanup();
    };
  }, [receipt, printRequest]);

  if (!receipt) return null;

  const referenceValue = Number(receipt.rewardValue) || 0;
  const date = formatReceiptDate(receipt.createdAt);
  const [dateText, timeText] = date === '—' ? ['—', '—'] : date.split(', ');

  return createPortal(
    <div
      id="loyalty-redemption-print"
      className={`thermal-invoice thermal-${width}mm loyalty-thermal-print`}
    >
      <div className="thermal-receipt">
        <div className="thermal-header">
          <div className="header-company">
            <p className="company-name">
              {company?.legal_name || company?.companyName || company?.name || 'Store'}
            </p>
            {(company?.address_line1 || company?.companyAddress) && (
              <p className="receipt-header">
                {company.address_line1 || company.companyAddress}
              </p>
            )}
            {(company?.city || company?.state_code || company?.pincode) && (
              <p className="receipt-header">
                {[company.city, company.state_code, company.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {(company?.companyPhone || company?.phone) && (
              <p className="receipt-header">
                Phone: {company.companyPhone || company.phone}
              </p>
            )}
          </div>
          <p className="receipt-header">LOYALTY REDEMPTION RECEIPT</p>
        </div>

        <div className="thermal-invoice-info">
          <div className="info-line">
            <span>Receipt Ref:</span>
            <span>{receipt.redemptionId}</span>
          </div>
          <div className="info-line">
            <span>Date:</span>
            <span>{dateText}</span>
          </div>
          <div className="info-line">
            <span>Time:</span>
            <span>{timeText || '—'}</span>
          </div>
        </div>

        <div className="thermal-customer">
          <p className="label">Customer</p>
          <div className="info-line">
            <span>Name:</span>
            <span>{receipt.customerName || 'Customer'}</span>
          </div>
          {receipt.customerPhone && (
            <div className="info-line">
              <span>Phone:</span>
              <span>{receipt.customerPhone}</span>
            </div>
          )}
        </div>

        <div className="separator-line">LOYALTY REWARD DETAILS</div>
        <div className="thermal-customer">
          <div className="info-line">
            <span>Reward:</span>
            <span>{receipt.rewardDescription || 'Cash discount reward'}</span>
          </div>
          <div className="info-line">
            <span>Points redeemed:</span>
            <span>{receipt.pointsRedeemed}</span>
          </div>
          <div className="info-line">
            <span>Points remaining:</span>
            <span>{receipt.remainingPoints}</span>
          </div>
        </div>

        <div className="separator-line">PAYMENT SUMMARY</div>
        <div className="thermal-totals">
          <div className="total-line">
            <span>Reward reference value</span>
            <span>{formatCurrency(referenceValue)}</span>
          </div>
          <div className="total-line discount">
            <span>Loyalty reward value</span>
            <span>-{formatCurrency(referenceValue)}</span>
          </div>
          <div className="total-line grand-total">
            <span>Amount payable</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="total-line">
            <span>Amount received</span>
            <span>{formatCurrency(0)}</span>
          </div>
          <div className="total-line">
            <span>Amount returned</span>
            <span>{formatCurrency(0)}</span>
          </div>
        </div>

        <div className="thermal-footer">
          <p className="footer-text">LOYALTY REWARD — NO PAYMENT REQUIRED</p>
          <p className="footer-text">
            This acknowledges a points redemption only. It is not a sales invoice,
            and the reference value is not a discount applied to a sale.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
