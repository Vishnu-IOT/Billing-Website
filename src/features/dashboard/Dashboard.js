/* ===== DASHBOARD ===== */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import useAppStore from '../../store/appStore';
import {
  StatCard,
  EmptyState,
  PaymentBadge,
  ToastContainer,
} from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import '../../styles/dashboard.css';
import { useToast } from '../../hooks/useToast';
import { getDashboardAPI } from '../../api';
import { formatQuantity, getProductBaseUnit } from '../../utils/quantityUnits';

export default function Dashboard() {
  const products = useAppStore((s) => s.products);
  const canvasRef = useRef(null);
  const toast = useToast();
  const [dashData, setDashData] = useState();
  const [chartTooltip, setChartTooltip] = useState(null);

  /* ── Low stock is independent of the Sales/Purchase filter state, safe to
     derive from the products store directly ── */
  const lowStock = useMemo(
    () => products.filter((p) => (Number(p.stockQuantity) || 0) < 5),
    [products]
  );

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await getDashboardAPI();
        const data = response;
        if (data) {
          setDashData(data);
        }
      } catch (err) {
        toast.error('Failed to load financial details.');
      }
    }
    loadDashboard();
  }, []);

  /* ── Canvas Chart — driven entirely by dashData.chartData from the dashboard
     API, NOT from useSalesStore/usePurchaseStore. Those two stores are shared
     with the Sales/Purchase list pages, and get overwritten with a narrow,
     filtered slice whenever someone applies a date filter there (e.g. "This
     Year"). Reading from them here meant the dashboard chart would silently
     break/shrink to whatever filter was last applied on an unrelated page.
     The dashboard endpoint always returns its own independent last-12-months
     dataset regardless of what any other page's filters are doing. ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dashData?.chartData?.length) return;

    const chartData = dashData.chartData; // [{ month, sales, purchase }, ...]
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = canvas.parentElement.clientWidth);
    const H = (canvas.height = 200);
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const n = chartData.length;
    const allVals = chartData.flatMap((d) => [d.sales, d.purchase]);
    const maxVal = Math.max(...allVals, 1);
    const barW = chartW / n / 2 - 4;
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
    chartData.forEach((d, i) => {
      const x = pad.left + (i * chartW) / n;
      const saleH = (d.sales / maxVal) * chartH;
      const purchH = (d.purchase / maxVal) * chartH;
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
      // month labels come back from the API already short-formatted (e.g. "Sep 2026")
      ctx.fillText(d.month.split(' ')[0], x + barW, H - 8);
    });
  }, [dashData]);

  const handleChartMouseMove = (event) => {
    const canvas = canvasRef.current;
    const chartData = dashData?.chartData;
    if (!canvas || !chartData?.length) return;

    const canvasRect = canvas.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const pointerX = (event.clientX - canvasRect.left) * scaleX;
    const pointerY = (event.clientY - canvasRect.top) * scaleY;
    const width = canvas.width;
    const height = canvas.height;
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const maxValue = Math.max(
      ...chartData.flatMap((item) => [item.sales, item.purchase]),
      1
    );
    const barWidth = chartWidth / chartData.length / 2 - 4;
    let hoveredBar = null;

    chartData.forEach((item, index) => {
      const x = pad.left + (index * chartWidth) / chartData.length;
      const bars = [
        { type: 'sales', value: item.sales, x: x + 2 },
        { type: 'purchase', value: item.purchase, x: x + barWidth + 4 },
      ];

      bars.forEach((bar) => {
        const barHeight = (bar.value / maxValue) * chartHeight;
        const barTop = pad.top + chartHeight - barHeight;
        if (
          pointerX >= bar.x &&
          pointerX <= bar.x + barWidth &&
          pointerY >= barTop &&
          pointerY <= pad.top + chartHeight
        ) {
          hoveredBar = { ...bar, barTop, month: item.month };
        }
      });
    });

    if (!hoveredBar) {
      setChartTooltip(null);
      return;
    }

    const wrapperRect = canvas.parentElement.getBoundingClientRect();
    const tooltipWidth = 180;
    const tooltipHeight = 58;
    const maxTooltipX = Math.max(
      tooltipWidth / 2 + 8,
      wrapperRect.width - tooltipWidth / 2 - 8
    );
    const anchorX =
      canvasRect.left -
      wrapperRect.left +
      (hoveredBar.x + barWidth / 2) / scaleX;
    const anchorY =
      canvasRect.top -
      wrapperRect.top +
      hoveredBar.barTop / scaleY;
    setChartTooltip((current) => {
      if (
        current?.month === hoveredBar.month &&
        current?.type === hoveredBar.type &&
        current?.amount === hoveredBar.value
      ) {
        return current;
      }

      return {
        month: hoveredBar.month,
        type: hoveredBar.type,
        amount: hoveredBar.value,
        x: Math.min(
          Math.max(anchorX, tooltipWidth / 2 + 8),
          maxTooltipX
        ),
        y: Math.max(tooltipHeight + 8, anchorY - 8),
      };
    });
  };

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
          label="Inventory Value"
          value={formatCurrency(dashData?.currentMonth?.stockValue)}
          sub="Current stock at acquisition cost"
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
          <canvas
            ref={canvasRef}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={() => setChartTooltip(null)}
          />
          {chartTooltip && (
            <div
              className={`chart-tooltip chart-tooltip--${chartTooltip.type}`}
              style={{ left: chartTooltip.x, top: chartTooltip.y }}
              role="status"
            >
              <span className="chart-tooltip__month">{chartTooltip.month}</span>
              <span className="chart-tooltip__value">
                <span className="chart-tooltip__dot" />
                <span>{chartTooltip.type === 'sales' ? 'Sales' : 'Purchases'}</span>
                <strong>{formatCurrency(chartTooltip.amount)}</strong>
              </span>
            </div>
          )}
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

        {/* Expired and expiring batches */}
        <div className="party-list-section">
          <div className="card__header">
            <span className="card__title">Expiry Alerts</span>
            {((dashData?.expiryAlerts?.expired?.length || 0) +
              (dashData?.expiryAlerts?.expiring?.length || 0)) > 0 && (
              <span className="badge badge--danger">
                {(dashData?.expiryAlerts?.expired?.length || 0) +
                  (dashData?.expiryAlerts?.expiring?.length || 0)}
              </span>
            )}
          </div>
          <div className="party-list-scroll">
            {!dashData ? (
              <p className="dashboard-expiry-empty">Loading expiry alerts…</p>
            ) : !dashData.expiryAlerts?.expired?.length &&
              !dashData.expiryAlerts?.expiring?.length ? (
              <EmptyState
                icon="✅"
                title="No expiry alerts"
                description="No stocked batches are expired or expiring within 30 days"
              />
            ) : (
              <>
                {dashData.expiryAlerts?.expired?.map((batch) => (
                  <div className="dashboard-expiry-item" key={`expired-${batch.id}`}>
                    <div className="dashboard-expiry-info">
                      <span className="low-stock-name">{batch.Product?.name || 'Product'}</span>
                      <span className="party-sub">
                        Batch {batch.batchNumber || batch.id} · Expired {formatDate(batch.expiryDate)}
                      </span>
                    </div>
                    <span className="dashboard-expiry-quantity dashboard-expiry-quantity--expired">
                      {formatQuantity(batch.availableQuantity)} {getProductBaseUnit(batch.Product || {})}
                    </span>
                  </div>
                ))}
                {dashData.expiryAlerts?.expiring?.map((batch) => (
                  <div className="dashboard-expiry-item" key={`expiring-${batch.id}`}>
                    <div className="dashboard-expiry-info">
                      <span className="low-stock-name">{batch.Product?.name || 'Product'}</span>
                      <span className="party-sub">
                        Batch {batch.batchNumber || batch.id} · Expires {formatDate(batch.expiryDate)}
                      </span>
                    </div>
                    <span className="dashboard-expiry-quantity">
                      {formatQuantity(batch.availableQuantity)} {getProductBaseUnit(batch.Product || {})}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
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
                    {formatQuantity(p.stockQuantity ?? 0)} {getProductBaseUnit(p)}
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
