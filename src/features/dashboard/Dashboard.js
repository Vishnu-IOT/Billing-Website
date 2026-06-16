/* ===== DASHBOARD ===== */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import useAppStore from '../../store/appStore';
import useSalesStore from '../../store/salesStore';
import usePurchaseStore from '../../store/purchaseStore';
import {
  StatCard,
  EmptyState,
  PaymentBadge,
  ToastContainer,
} from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getMonthlyData, getMonthName } from '../../utils/date';
import '../../styles/dashboard.css';
import { useToast } from '../../hooks/useToast';
import { getDashboardAPI } from '../../api';

const MONTHS = Array.from({ length: 12 }, (_, i) => getMonthName(i));

export default function Dashboard() {
  const products = useAppStore((s) => s.products);
  const saleBills = useSalesStore((s) => s.saleBills);
  const purchaseBills = usePurchaseStore((s) => s.purchaseBills);
  const canvasRef = useRef(null);
  const toast = useToast();
  const [dashData, setDashData] = useState();

  /* ── KPI Calculations ── */
  const totalSales = useMemo(
    () => saleBills.reduce((s, b) => s + (parseInt(b.totalAmount) || 0), 0),
    [saleBills]
  );
  const totalPurchases = useMemo(
    () => purchaseBills.reduce((s, b) => s + (parseInt(b.totalAmount) || 0), 0),
    [purchaseBills]
  );
  const pendingAmount = useMemo(
    () =>
      saleBills
        .filter((b) => b.paymentStatus?.toLowerCase() === 'unpaid')
        .reduce((s, b) => s + (parseInt(b.totalAmount) || 0), 0),
    [saleBills]
  );
  const profit = totalSales - totalPurchases;
  const lowStock = useMemo(
    () => products.filter((p) => (parseInt(p.stockQuantity) || 0) < 5),
    [products]
  );

  /* ── Monthly chart data ── */
  const salesData = useMemo(
    () => getMonthlyData(saleBills, 'saleDate'),
    [saleBills]
  );
  const purchaseData = useMemo(
    () => getMonthlyData(purchaseBills, 'purchaseDate'),
    [purchaseBills]
  );

  useEffect(() => {
    async function loadDashboard() {
      // setLoading(true);
      try {
        const response = await getDashboardAPI();
        const data = response;
        console.log(data);
        if (data) {
          setDashData(data);
        }
      } catch (err) {
        toast.error('Failed to load financial details.');
      }
    }
    loadDashboard();
  }, []);

  /* ── Canvas Chart ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = canvas.parentElement.clientWidth);
    const H = (canvas.height = 200);
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const allVals = [...salesData, ...purchaseData];
    const maxVal = Math.max(...allVals, 1);
    const barW = chartW / 12 / 2 - 4;
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency((maxVal / 4) * (4 - i)), pad.left - 6, y + 4);
    }

    // Bars
    MONTHS.forEach((_, i) => {
      const x = pad.left + (i * chartW) / 12;
      const saleH = (salesData[i] / maxVal) * chartH;
      const purchH = (purchaseData[i] / maxVal) * chartH;
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.roundRect(x + 2, pad.top + chartH - saleH, barW, saleH, [3, 3, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#0891B2';
      ctx.beginPath();
      ctx.roundRect(
        x + barW + 4,
        pad.top + chartH - purchH,
        barW,
        purchH,
        [3, 3, 0, 0]
      );
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.font = '10px Inter,sans-serif';
      ctx.fillText(MONTHS[i], x + barW, H - 8);
    });
  }, [salesData, purchaseData]);

  const recentBills = useMemo(
    () => [...saleBills].reverse().slice(0, 6),
    [saleBills]
  );

  return (
    <div className="dashboard">
      <ToastContainer toasts={toast.toasts} />
      {/* KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total Sales (MTD)"
          value={formatCurrency(dashData?.currentMonth?.sales)}
          sub="This month"
          icon="📈"
          color="blue"
        />
        <StatCard
          label="Total Purchases"
          value={formatCurrency(dashData?.currentMonth?.purchase)}
          sub="This month"
          icon="📦"
          color="cyan"
        />
        <StatCard
          label="Gross Profit"
          value={formatCurrency(dashData?.currentMonth?.profit)}
          sub="Sales − Purchases"
          icon="💰"
          color="green"
        />
        <StatCard
          label="Stock Value"
          value={formatCurrency(dashData?.currentMonth?.stockValue)}
          sub="Unsold Stocks"
          icon="⏳"
          color="amber"
        />
      </div>

      {/* Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <span className="chart-title">Monthly Overview</span>
          <div className="chart-legend">
            <span className="chart-legend-item">
              <span className="chart-legend-dot chart-legend-dot--sale" /> Sales
            </span>
            <span className="chart-legend-item">
              <span className="chart-legend-dot chart-legend-dot--purchase" />{' '}
              Purchases
            </span>
          </div>
        </div>
        <div className="chart-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="dashboard-grid">
        {/* Recent Bills */}
        <div className="recent-section">
          <div className="card__header">
            <span className="card__title">Recent Invoices</span>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                window.location.hash = 'sales';
              }}
            >
              View All →
            </button>
          </div>
          {dashData?.recentSales.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="No invoices yet"
              description="Create your first sale invoice"
            />
          ) : (
            <div
              className="table-wrapper"
              style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Party</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashData?.recentSales.map((bill) => (
                    <tr key={bill.id || bill._id}>
                      <td
                        style={{
                          fontWeight: 600,
                          color: 'var(--primary)',
                          fontSize: 'var(--fs-xs)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {bill.invoiceNumber}
                      </td>
                      <td>{bill.Party?.name || bill.Customer?.name || '—'}</td>
                      <td
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: 'var(--fs-xs)',
                        }}
                      >
                        {formatDate(bill.saleDate)}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        {formatCurrency(bill.totalAmount)}
                      </td>
                      <td>
                        <PaymentBadge status={bill.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="party-list-section">
          <div className="card__header">
            <span className="card__title">Low Stock Alerts</span>
            {lowStock.length > 0 && (
              <span className="badge badge--danger">{lowStock.length}</span>
            )}
          </div>
          {lowStock.length === 0 ? (
            <EmptyState
              icon="✅"
              title="All stocked"
              description="No low-stock items"
            />
          ) : (
            <div className="party-list-scroll">
              {lowStock.map((p) => (
                <div key={p.id || p._id} className="low-stock-item">
                  <div className="low-stock-dot" />
                  <span className="low-stock-name">{p.name}</span>
                  <span className="low-stock-qty">
                    {p.stockQuantity ?? 0} {p.unit || 'pcs'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
