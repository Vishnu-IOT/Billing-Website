/* ===== PRODUCTS MODULE ===== */
import React, { useState, useMemo, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import {
  Button,
  Modal,
  ConfirmModal,
  EmptyState,
  Badge,
  Pagination,
  ToastContainer,
} from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import '../../styles/products.css';
import useSalesStore from '../../store/salesStore';
import usePurchaseStore from '../../store/purchaseStore';

const EMPTY_FORM = {
  name: '',
  SKU: '',
  barcode: '',
  HSNCode: '',
  MRP: '',
  salesPrice: '',
  purchasePrice: '',
  taxRate: '',
  categoryId: '',
  stockQuantity: 0,
  minStockLevel: 5,
  unit: 'pcs',
  sku: '',
  batchNo: '',
  expiryDate: '',
  serialNo: '',
};

export default function Products() {
  const { products, categories, addProduct, updateProduct, deleteProduct } =
    useAppStore();
  const loadAllSalesBills = useSalesStore((s) => s.loadAllBills);
  const saleBills = useSalesStore((s) => s.saleBills);
  const loadAllPurchaseBills = usePurchaseStore((s) => s.loadAllBills);
  const purchaseBills = usePurchaseStore((s) => s.purchaseBills);
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [txnPage, setTxnPage] = useState(1);
  const TXN_ITEMS_PER_PAGE = 5;

  const debouncedSearch = useDebounce(search, 250);

  // Load lifetime sales and purchase records on mount
  useEffect(() => {
    loadAllSalesBills();
    loadAllPurchaseBills();
  }, [loadAllSalesBills, loadAllPurchaseBills]);

  // Filter products by Name, Barcode (SKU), or HSN Code
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const searchStr = debouncedSearch.toLowerCase().trim();
      if (!searchStr) return true;

      const nameMatch = p.name?.toLowerCase().includes(searchStr);
      const skuMatch =
        p.SKU?.toLowerCase().includes(searchStr) ||
        p.barcode?.toLowerCase().includes(searchStr);
      const hsnMatch =
        p.HSNCode?.toLowerCase().includes(searchStr) ||
        p.hsnCode?.toLowerCase().includes(searchStr);

      return nameMatch || skuMatch || hsnMatch;
    });
  }, [products, debouncedSearch]);

  // Auto-select first product if none active
  useEffect(() => {
    if (filteredProducts.length > 0 && !activeProduct) {
      setActiveProduct(filteredProducts[0]);
    }
  }, [filteredProducts, activeProduct]);

  function openAdd() {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(prod) {
    setEditProduct(prod);
    setForm({
      ...EMPTY_FORM,
      ...prod,
      categoryId: prod.categoryId || prod.category,
    });
    setModalOpen(true);
  }

  function validateForm() {
    const errors = {};
    // Product Name
    if (!form.name.trim()) {
      errors.name = 'Product name is required';
    }
    // HSN Code
    if (!form.HSNCode) {
      errors.HSNCode = 'HSN Code is required';
    }
     if (!form.barcode) {
      errors.barcode = 'Barcode is required';
    }
    // Category
    if (!form.categoryId) {
      errors.categoryId = 'Category is required';
    }
    // Purchase Price
    if (form.purchasePrice === '' || Number(form.purchasePrice) <= 0) {
      errors.purchasePrice = 'Purchase price must be greater than 0';
    }
    // Sales Price
    if (form.salesPrice === '' || Number(form.salesPrice) <= 0) {
      errors.salesPrice = 'Sales price must be greater than 0';
    }
    // MRP
    if (form.MRP === '' || Number(form.MRP) <= 0) {
      errors.MRP = 'MRP must be greater than 0';
    }
    // Tax Rate
    if (form.taxRate === '') {
      errors.taxRate = 'Tax rate is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editProduct) {
        const id = editProduct.id || editProduct._id;
        await updateProduct(id, form);
        toast.success('Product Updated Successfully!');
        // Update active product state to show fresh data
        setActiveProduct({ ...editProduct, ...form });
      } else {
        const data = await addProduct(form);
        console.log(data);
        toast.success('Product Added Successfully!');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
      setFormErrors({});
    }
  }

  async function handleDelete() {
    try {
      await deleteProduct(deleteId);
      toast.success('Product Deleted Successfully!');
      setActiveProduct(null);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  }

  // Aggregate stats (Total Purchase Qty, Total Sales Qty, Purchase Amt, Sales Amt, Margins/Profit)
  const productMetrics = useMemo(() => {
    if (!activeProduct) return null;
    const pId = activeProduct.id || activeProduct._id;

    let totalSalesQty = 0;
    let totalSalesAmt = 0;
    (saleBills || []).forEach((bill) => {
      const matchingItems = (bill.SalesItems || []).filter(
        (item) => String(item.productId) === String(pId)
      );
      matchingItems.forEach((item) => {
        totalSalesQty += Number(item.quantity || 0);
        totalSalesAmt += Number(
          item.netRate || item.total || item.price * item.quantity || 0
        );
      });
    });

    let totalPurchaseQty = 0;
    let totalPurchaseAmt = 0;
    (purchaseBills || []).forEach((bill) => {
      const matchingItems = (bill.PurchaseItems || []).filter(
        (item) => String(item.productId) === String(pId)
      );
      matchingItems.forEach((item) => {
        totalPurchaseQty += Number(item.quantity || 0);
        totalPurchaseAmt += Number(
          item.netRate || item.total || item.price * item.quantity || 0
        );
      });
    });

    const purchasePrice = Number(activeProduct.purchasePrice || 0);
    const profit = totalSalesAmt - totalSalesQty * purchasePrice;

    return {
      totalSalesQty,
      totalSalesAmt,
      totalPurchaseQty,
      totalPurchaseAmt,
      purchaseRate: purchasePrice,
      salesRate: Number(activeProduct.salesPrice || 0),
      profit,
    };
  }, [activeProduct, saleBills, purchaseBills]);

  // Combined Sales and Purchase Transaction History Table
  const combinedTransactions = useMemo(() => {
    if (!activeProduct) return [];
    const pId = activeProduct.id || activeProduct._id;
    const txns = [];

    // Gather Sales
    (saleBills || []).forEach((bill) => {
      const matchingItems = (bill.SalesItems || []).filter(
        (item) => String(item.productId) === String(pId)
      );
      if (matchingItems.length > 0) {
        const qtySold = matchingItems.reduce(
          (sum, i) => sum + Number(i.quantity || 0),
          0
        );
        const totalAmt = matchingItems.reduce(
          (sum, i) =>
            sum + Number(i.netRate || i.total || i.price * i.quantity || 0),
          0
        );
        const rate = matchingItems[0]?.price || activeProduct.salesPrice || 0;
        const partyName = bill.name || bill.Party?.name || 'Walk-in Customer';

        txns.push({
          id: `sale-${bill.id || bill._id}-${matchingItems[0]?.id || 0}`,
          invoiceNo: bill.invoiceNumber || bill.invoiceNo || '—',
          billType: 'Sales',
          partyName,
          quantity: qtySold,
          rate,
          totalAmount: totalAmt,
          date: bill.saleDate || bill.date || '—',
          timestamp: new Date(bill.saleDate || bill.date).getTime(),
        });
      }
    });

    // Gather Purchases
    (purchaseBills || []).forEach((bill) => {
      const matchingItems = (bill.PurchaseItems || []).filter(
        (item) => String(item.productId) === String(pId)
      );
      if (matchingItems.length > 0) {
        const qtyPur = matchingItems.reduce(
          (sum, i) => sum + Number(i.quantity || 0),
          0
        );
        const totalAmt = matchingItems.reduce(
          (sum, i) =>
            sum + Number(i.netRate || i.total || i.price * i.quantity || 0),
          0
        );
        const rate =
          matchingItems[0]?.price || activeProduct.purchasePrice || 0;
        const partyName = bill.Party?.name || 'Supplier';

        txns.push({
          id: `purchase-${bill.id || bill._id}-${matchingItems[0]?.id || 0}`,
          invoiceNo: bill.invoiceNumber || bill.invoiceNo || '—',
          billType: 'Purchase',
          partyName,
          quantity: qtyPur,
          rate,
          totalAmount: totalAmt,
          date: bill.purchaseDate || bill.date || '—',
          timestamp: new Date(bill.purchaseDate || bill.date).getTime(),
        });
      }
    });

    // Sort chronologically, descending
    return txns.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeProduct, saleBills, purchaseBills]);

  // Paginated transactions for active product
  const paginatedTransactions = useMemo(() => {
    const start = (txnPage - 1) * TXN_ITEMS_PER_PAGE;
    return combinedTransactions.slice(start, start + TXN_ITEMS_PER_PAGE);
  }, [combinedTransactions, txnPage]);

  const totalTxnPages = Math.ceil(
    combinedTransactions.length / TXN_ITEMS_PER_PAGE
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 'var(--sp-4)',
      }}
    >
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product?"
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormErrors({}) }}
        title={editProduct ? 'Edit Product' : 'Add Product'}
        size="xlg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setFormErrors({}) }}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save Product
            </Button>
          </>
        }
      >
        <div className="form-grid-4">
          <div className="form-col-full form-group">
            <label className="form-label">Name *</label>
            <input
              className="form-input"
              placeholder="Enter Product Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {formErrors.name && (
              <span className="um-error-text">{formErrors.name}</span>
            )}
          </div>
          <div className="form-group form-col-fulls" >
            <label className="form-label">Barcode *</label>
            <input
              className="form-input"
              placeholder="Enter Barcode"
              value={form.barcode}
              onChange={(e) =>
                setForm((f) => ({ ...f, barcode: e.target.value }))
              }
            />
            {formErrors.barcode && (
              <span className="um-error-text">{formErrors.barcode}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">HSN Code *</label>
            <input
              className="form-input"
              placeholder="Enter HSN Code"
              value={form.HSNCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, HSNCode: e.target.value }))
              }
            />
            {formErrors.HSNCode && (
              <span className="um-error-text">{formErrors.HSNCode}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">SKU Code</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter SKU Code"
              value={form.sku || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, sku: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={form.categoryId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoryId: e.target.value }))
              }
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.category}
                </option>
              ))}
            </select>
            {formErrors.categoryId && (
              <span className="um-error-text">{formErrors.categoryId}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">GST % *</label>
            <select
              className="form-select"
              value={form.taxRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, taxRate: e.target.value }))
              }
            >
              <option value="">Select GST %</option>
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
            {formErrors.taxRate && (
              <span className="um-error-text">{formErrors.taxRate}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">MRP (₹) *</label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              placeholder="Enter MRP"
              value={form.MRP}
              onChange={(e) => setForm((f) => ({ ...f, MRP: e.target.value }))}
            />
            {formErrors.MRP && (
              <span className="um-error-text">{formErrors.MRP}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Sales Price (₹) *</label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              placeholder="Enter Sales Price"
              value={form.salesPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, salesPrice: e.target.value }))
              }
            />
            {formErrors.salesPrice && (
              <span className="um-error-text">{formErrors.salesPrice}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Purchase Price (₹) *</label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              placeholder="Enter Purchase Price"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchasePrice: e.target.value }))
              }
            />
            {formErrors.purchasePrice && (
              <span className="um-error-text">{formErrors.purchasePrice}</span>
            )}
          </div>
        </div>
        <div className="form-para">
          <p>Inventory</p>
        </div>
        <div className="form-grid-4">
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select
              className="form-select"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="L">Liters (L)</option>
              <option value="mL">Milliliters (mL)</option>
              <option value="box">Box</option>
              <option value="m">Meters (m)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Initial Stock</label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              value={form.stockQuantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, stockQuantity: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Min Stock Level</label>
            <input
              type="number"
              className="form-input"
              onWheel={(e) => e.target.blur()}
              value={form.minStockLevel}
              onChange={(e) =>
                setForm((f) => ({ ...f, minStockLevel: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Batch Number</label>
            <input
              type="text"
              className="form-input"
              value={form.batchNo || ''}
              placeholder="Batch Number (optional)"
              onChange={(e) =>
                setForm((f) => ({ ...f, batchNo: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Serial Number</label>
            <input
              type="text"
              className="form-input"
              value={form.serialNo || ''}
              placeholder="Serial Number (optional)"
              onChange={(e) =>
                setForm((f) => ({ ...f, serialNo: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-input"
              value={form.expiryDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiryDate: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>Products</h1>
          <p className="page-header__sub">
            Manage inventory and pricing analytics in a premium split-pane
            layout
          </p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          + Add Product
        </Button>
      </div>

      {/* Upgraded Split Layout */}
      <div className="products-split-container">
        {/* Left Side: Product Selection Pane */}
        <div className="products-list-pane">
          <div className="products-pane-header">
            <div className="search-bar" style={{ width: '100%' }}>
              <span className="search-bar__icon">🔍</span>
              <input
                placeholder="Search Name, SKU, HSN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="products-pane-scroll">
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                No products found
              </div>
            ) : (
              filteredProducts.map((p) => {
                const qty = parseInt(p.stockQuantity) || 0;
                const min = parseInt(p.minStockLevel) || 5;
                const isOut = qty <= 0;
                const isLow = qty > 0 && qty < min;

                let stockLabel = 'In Stock';
                let stockStyle = { color: 'var(--success)' };
                if (isOut) {
                  stockLabel = 'Out of Stock';
                  stockStyle = { color: 'var(--danger)' };
                } else if (isLow) {
                  stockLabel = 'Low Stock';
                  stockStyle = { color: 'var(--warning)' };
                }

                const isActive =
                  activeProduct &&
                  (activeProduct.id || activeProduct._id) === (p.id || p._id);

                return (
                  <div
                    key={p.id || p._id}
                    className={`product-item-card ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveProduct(p);
                      setTxnPage(1);
                    }}
                  >
                    <div className="product-item-card__title-row">
                      <span className="product-item-card__name">{p.name}</span>
                    </div>
                    <div className="product-item-card__meta-row">
                      <span className="product-item-card__sku">
                        {p.barcode || p.SKU || p.sku || '—'}
                      </span>
                      <span
                        className="product-item-card__stock"
                        style={stockStyle}
                      >
                        {qty} {p.unit || 'pcs'} ({stockLabel})
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Metrics, Analytics, and History Pane */}
        <div className="product-analytics-pane">
          {!activeProduct ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 40 }}>📦</span>
              <h3>No Product Selected</h3>
              <p>Select a product from the list to view stats & history</p>
            </div>
          ) : (
            <>
              {/* Product Header */}
              <div className="product-analytics-header">
                <div>
                  <div className="product-analytics-title">
                    {activeProduct.name}
                  </div>
                  <div className="product-analytics-meta">
                    <span>
                      Barcode:{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {activeProduct.barcode ||
                          activeProduct.SKU ||
                          activeProduct.sku ||
                          '—'}
                      </strong>
                    </span>
                    <span>
                      HSN Code:{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {activeProduct.HSNCode || activeProduct.hsnCode || '—'}
                      </strong>
                    </span>
                    <span>
                      MRP:{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(activeProduct.MRP)}
                      </strong>
                    </span>
                    <span>
                      GST:{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {activeProduct.taxRate || 0}%
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="product-analytics-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(activeProduct)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() =>
                      setDeleteId(activeProduct.id || activeProduct._id)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Product Info & Scrollable Analytics */}
              <div className="product-analytics-scroll">
                {/* KPIs Grid */}
                {productMetrics && (
                  <div className="analytics-metrics-grid">
                    <div className="kpi-card kpi-card--sales">
                      <span className="kpi-card__label">Sales Stats</span>
                      <span className="kpi-card__value">
                        {formatCurrency(productMetrics.totalSalesAmt)}
                      </span>
                      <div className="kpi-card__sub">
                        <span>Qty Sold: {productMetrics.totalSalesQty}</span>
                        <span>
                          Rate: {formatCurrency(productMetrics.salesRate)}
                        </span>
                      </div>
                    </div>

                    <div className="kpi-card kpi-card--purchase">
                      <span className="kpi-card__label">Purchase Stats</span>
                      <span className="kpi-card__value">
                        {formatCurrency(productMetrics.totalPurchaseAmt)}
                      </span>
                      <div className="kpi-card__sub">
                        <span>
                          Qty Bought: {productMetrics.totalPurchaseQty}
                        </span>
                        <span>
                          Rate: {formatCurrency(productMetrics.purchaseRate)}
                        </span>
                      </div>
                    </div>

                    <div className="kpi-card kpi-card--profit">
                      <span className="kpi-card__label">Profit Summary</span>
                      <span
                        className="kpi-card__value"
                        style={{
                          color:
                            productMetrics.profit >= 0
                              ? 'var(--success)'
                              : 'var(--danger)',
                        }}
                      >
                        {formatCurrency(productMetrics.profit)}
                      </span>
                      <div className="kpi-card__sub">
                        <span>Margin Margin</span>
                        <span
                          className={`profit-badge ${productMetrics.profit >= 0
                            ? 'profit-badge--positive'
                            : 'profit-badge--negative'
                            }`}
                        >
                          {productMetrics.totalSalesAmt > 0
                            ? `${Math.round((productMetrics.profit / productMetrics.totalSalesAmt) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Combined Transaction Table */}
                <div style={{ marginTop: 'var(--sp-2)' }}>
                  <h3
                    style={{
                      fontSize: 'var(--fs-md)',
                      fontWeight: 700,
                      marginBottom: 'var(--sp-3)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Combined Transaction History
                  </h3>

                  {combinedTransactions.length === 0 ? (
                    <div
                      style={{
                        padding: 30,
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-hover)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      No transactions recorded for this product
                    </div>
                  ) : (
                    <>
                      <div
                        className="table-wrapper sticky-header-table"
                        style={{ maxHeight: 300 }}
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              {/* <th>Invoice No</th> */}
                              <th>Bill Type</th>
                              <th>Party Name</th>
                              <th>Quantity</th>
                              <th>Rate</th>
                              <th>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedTransactions.map((txn) => (
                              <tr key={txn.id}>
                                <td
                                  style={{
                                    fontSize: 'var(--fs-xs)',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {txn.date
                                    ? new Date(txn.date).toLocaleDateString(
                                      'en-IN',
                                      {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      }
                                    )
                                    : '—'}
                                </td>
                                {/* <td style={{ fontWeight: 600 }}>
                                  {txn.invoiceNo}
                                </td> */}
                                <td>
                                  <Badge
                                    variant={
                                      txn.billType === 'Sales'
                                        ? 'success'
                                        : 'warning'
                                    }
                                  >
                                    {txn.billType}
                                  </Badge>
                                </td>
                                <td>{txn.partyName}</td>
                                <td>{txn.quantity}</td>
                                <td>{formatCurrency(txn.rate)}</td>
                                <td style={{ fontWeight: 600 }}>
                                  {formatCurrency(txn.totalAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalTxnPages > 1 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 'var(--sp-4)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 'var(--fs-xs)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Showing page {txnPage} of {totalTxnPages}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={txnPage === 1}
                              onClick={() => setTxnPage((p) => p - 1)}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={txnPage === totalTxnPages}
                              onClick={() => setTxnPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
