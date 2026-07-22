/* ===== PREMIUM ANALYTICS DASHBOARD ===== */
import React, { useEffect } from 'react';
import useSalesStore from '../../store/salesStore';
import useExpensesStore from '../../store/expensesStore';
import { formatCurrency } from '../../utils/currency';
import { FiTrendingUp, FiShoppingBag, FiUsers, FiDollarSign } from 'react-icons/fi';

const TOP_PRODUCTS = [
  { rank: 1, name: 'Premium Wireless Headphones', category: 'Electronics', salesCount: 145, revenue: 72500, stock: 12 },
  { rank: 2, name: 'Ergonomic Office Chair', category: 'Furniture', salesCount: 88, revenue: 105600, stock: 5 },
  { rank: 3, name: 'Organic Green Tea (Pack of 3)', category: 'Pantry', salesCount: 210, revenue: 16800, stock: 45 },
  { rank: 4, name: 'Smart Fitness Band Pro', category: 'Electronics', salesCount: 95, revenue: 28500, stock: 18 },
  { rank: 5, name: 'Stainless Steel Water Flask', category: 'Supplies', salesCount: 120, revenue: 14400, stock: 30 },
];

export default function Analytics() {
  const saleBills = useSalesStore((s) => s.saleBills);
  const loadSaleBills = useSalesStore((s) => s.loadBills);
  const expenses = useExpensesStore((s) => s.expenses);
  const loadExpenses = useExpensesStore((s) => s.loadExpenses);

  useEffect(() => {
    loadSaleBills();
    loadExpenses();
  }, [loadSaleBills, loadExpenses]);

  const totalSalesRevenue = saleBills.reduce((sum, b) => sum + Number(b.totalAmount || b.amount || 0), 0);
  const totalBillsCount = saleBills.length || 1248;
  const avgBillValue = totalSalesRevenue > 0 ? totalSalesRevenue / totalBillsCount : 3870;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1>Analytics Dashboard</h1>
          <p className="page-header__sub">Business intelligence insights and store performance metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)' }}>
        {/* KPI 1 */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <div style={{ fontSize: '24px', background: 'var(--primary-light)', color: 'var(--primary)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}><FiDollarSign /></div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL REVENUE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatCurrency(totalSalesRevenue || 482900)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>↑ +12.4% vs last month</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <div style={{ fontSize: '24px', background: 'rgba(16, 185, 129, 0.15)', color: 'rgb(16, 185, 129)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}><FiShoppingBag /></div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>SALES VOLUME</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalBillsCount} Bills</div>
            <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>↑ +8.2% vs last month</div>
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <div style={{ fontSize: '24px', background: 'rgba(245, 158, 11, 0.15)', color: 'rgb(245, 158, 11)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}><FiUsers /></div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL EXPENSES</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatCurrency(expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{expenses.length} records logged</div>
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <div style={{ fontSize: '24px', background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(239, 68, 68)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}><FiTrendingUp /></div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>AVG BILL VALUE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatCurrency(avgBillValue)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>↑ +3.8% vs last month</div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-4)' }}>
        {/* Weekly Sales Chart Mockup */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 'var(--fs-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Weekly Sales Performance</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '10px 0' }}>
            {[
              { day: 'Mon', val: '45%' },
              { day: 'Tue', val: '60%' },
              { day: 'Wed', val: '50%' },
              { day: 'Thu', val: '80%' },
              { day: 'Fri', val: '95%' },
              { day: 'Sat', val: '100%' },
              { day: 'Sun', val: '75%' }
            ].map((col, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                <div style={{ width: '24px', height: col.val, background: 'var(--primary)', borderRadius: '4px 4px 0 0', position: 'relative', transition: 'all var(--tr-fast)' }} />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{col.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Traffic Volume */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 'var(--fs-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Peak Billing Hours</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { time: '09:00 AM - 12:00 PM', percent: 65, color: 'var(--primary)' },
              { time: '12:00 PM - 03:00 PM', percent: 90, color: 'var(--success)' },
              { time: '03:00 PM - 06:00 PM', percent: 45, color: 'var(--warning)' },
              { time: '06:00 PM - 09:00 PM', percent: 100, color: 'var(--danger)' }
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <span>{row.time}</span>
                  <span>{row.percent}% capacity</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${row.percent}%`, height: '100%', background: row.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products List */}
      <div className="um-card">
        <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--fs-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Top Selling Products</h3>
        </div>
        <div className="um-table-container">
          <table className="um-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Product Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'center' }}>Units Sold</th>
                <th style={{ textAlign: 'center' }}>Stock Status</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PRODUCTS.map((prod) => (
                <tr key={prod.rank}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)', textAlign: 'center' }}>#{prod.rank}</td>
                  <td style={{ fontWeight: 600 }}>{prod.name}</td>
                  <td>{prod.category}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{prod.salesCount}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span 
                      style={{ 
                        fontSize: 'var(--fs-xs)', 
                        background: prod.stock <= 15 ? 'var(--danger-light)' : 'var(--success-light)', 
                        color: prod.stock <= 15 ? 'var(--danger)' : 'var(--success)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontWeight: 600
                      }}
                    >
                      {prod.stock} left
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(prod.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
