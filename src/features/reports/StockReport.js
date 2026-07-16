/* ===== STOCK REPORT ===== */
import React, { useMemo, useState } from 'react';
import useAppStore   from '../../store/appStore';
import { Button, StatCard, Pagination, ToastContainer } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce }   from '../../hooks/useDebounce';
import { useToast }      from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import { exportToExcel, buildStockExportRows } from '../../utils/export';
import { PiMicrosoftExcelLogoFill } from 'react-icons/pi';
import '../../styles/reports.css';

export default function StockReport() {
  const products    = useAppStore((s) => s.products);
  const categories  = useAppStore((s) => s.categories);
  const toast       = useToast();
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const mSearch = !debouncedSearch || p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.HSNCode?.includes(debouncedSearch);
      const mCat = !catFilter || String(p.categoryId || p.category) === catFilter;
      return mSearch && mCat;
    });
  }, [products, debouncedSearch, catFilter]);

  const { page, totalPages, paginated, from, to, total, goToPage } = usePagination(filtered, 10);

  const totalValue    = filtered.reduce((s, p) => s + (parseFloat(p.salesPrice || 0) * (parseFloat(p.stockQuantity) || 0)), 0);
  const lowStockCount = filtered.filter((p) => (parseFloat(p.stockQuantity) || 0) < 5).length;
  const outOfStock    = filtered.filter((p) => (parseFloat(p.stockQuantity) || 0) <= 0).length;

  function stockStatus(qty) {
    const n = parseInt(qty) || 0;
    if (n === 0) return { label: 'Out', cls: 'out' };
    if (n < 5)   return { label: 'Low', cls: 'low' };
    return { label: 'In Stock', cls: 'in' };
  }

  function handleExport() {
    try { exportToExcel(buildStockExportRows(filtered), 'Stock Report', 'Stock_Report'); toast.success('Exported!'); }
    catch { toast.error('No data'); }
  }

  return (
    <div className="report-page">
      <ToastContainer toasts={toast.toasts} />
      <div className="page-header">
        <div className="page-header__left">
          <h1>Stock Report</h1>
          <p className="page-header__sub">Current inventory levels and valuations</p>
        </div>
        <Button variant="success" onClick={handleExport} icon={<PiMicrosoftExcelLogoFill />}>Export Excel</Button>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Products" value={products.length} icon="📦" color="blue" />
        <StatCard label="Inventory Value" value={formatCurrency(totalValue)} icon="💰" color="green" />
        <StatCard label="Low Stock Items" value={lowStockCount} icon="⚠️" color="amber" />
        <StatCard label="Out of Stock" value={outOfStock} icon="🚫" color="red" />
      </div>

      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label className="filter-label">Search Product</label>
          <div className="search-bar">
            <span className="search-bar__icon">🔍</span>
            <input placeholder="Name or HSN code…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select className="form-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id || c._id} value={String(c.id || c._id)}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr>
            <th>#</th><th>Product</th><th>HSN</th><th>MRP</th>
            <th className="text-right">Sales Price</th><th className="text-right">Stock Qty</th><th>Status</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0
              ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No products found</td></tr>
              : paginated.map((p, i) => {
                const s = stockStatus(p.stockQuantity);
                return (
                  <tr key={p.id || p._id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{from + i}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{p.HSNCode || '—'}</td>
                    <td>{formatCurrency(p.MRP || 0)}</td>
                    <td className="text-right">{formatCurrency(p.salesPrice || 0)}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>{p.stockQuantity ?? '—'} {p.unit}</td>
                    <td>
                      <div className="stock-indicator">
                        <span className={`stock-dot stock-dot--${s.cls}`} />
                        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>{s.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={goToPage} />
      </div>
    </div>
  );
}
