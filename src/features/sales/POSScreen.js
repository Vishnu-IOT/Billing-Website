/* ===== POS SCREEN — Main B2C POS Layout ===== */
import React, { useState, useCallback, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import useSalesStore from '../../store/salesStore';
import usePOSStore from '../../hooks/usePOSStore';
import { formatCurrency } from '../../utils/currency';
import { todayISO } from '../../utils/date';
import { getNextInvoiceNo, buildSaleBillPayload } from '../../utils/invoice';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui';
import BarcodeInput from '../../components/pos/BarcodeInput';
import CameraScanner from '../../components/pos/CameraScanner';
import POSProductGrid from '../../components/pos/POSProductGrid';
import POSCartItem from '../../components/pos/POSCartItem';
import POSPaymentModal from '../../components/pos/POSPaymentModal';
import ThermalBill from '../../components/pos/ThermalBill';
import '../../styles/pos-b2c.css';
import '../../styles/thermal.css';
import { fetchCompanyUsersAPI } from '../../api';

export default function POSScreen({
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const saleBills = useSalesStore((s) => s.saleBills);
  const addBill = useSalesStore((s) => s.addBill);
  const updateBill = useSalesStore((s) => s.updateBill);
  const toast = useToast();

  /* ── POS Store ── */
  const cart = usePOSStore((s) => s.cart);
  const customerInfo = usePOSStore((s) => s.customerInfo);
  const customers = useAppStore((s) => s.customers);
  const paymentMethod = usePOSStore((s) => s.paymentMethod);
  const globalDiscount = usePOSStore((s) => s.globalDiscount);
  const invoiceNo = usePOSStore((s) => s.invoiceNo);
  const saleDate = usePOSStore((s) => s.saleDate);
  const printerWidth = usePOSStore((s) => s.printerWidth);
  const autoPrint = usePOSStore((s) => s.autoPrint);
  const scannerEnabled = usePOSStore((s) => s.scannerEnabled);
  const cameraEnabled = usePOSStore((s) => s.cameraEnabled);
  const getComputedTotals = usePOSStore((s) => s.getComputedTotals);
  const addToCart = usePOSStore((s) => s.addToCart);
  const updateCartItem = usePOSStore((s) => s.updateCartItem);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);
  const clearCart = usePOSStore((s) => s.clearCart);
  const setCustomerInfo = usePOSStore((s) => s.setCustomerInfo);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const setGlobalDiscount = usePOSStore((s) => s.setGlobalDiscount);
  const setInvoiceNo = usePOSStore((s) => s.setInvoiceNo);
  const setSaleDate = usePOSStore((s) => s.setSaleDate);

  /* ── Local State ── */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastPrintedBill, setLastPrintedBill] = useState(null);
  const [recentProductIds, setRecentProductIds] = useState([]);
  const [mobileView, setMobileView] = useState('products'); // 'products' | 'cart'
  const [users, setUsers] = useState([]);

  /* ── Init & Edit Mode ── */
  useEffect(() => {
    if (editMode && billId) {
      const existingBill = saleBills.find(
        (b) => String(b.id || b._id) === String(billId)
      );
      if (existingBill) {
        setInvoiceNo(
          existingBill.invoiceNumber || existingBill.invoiceNo || ''
        );
        setSaleDate(
          existingBill.saleDate
            ? existingBill.saleDate.split('T')[0]
            : todayISO()
        );
        setCustomerInfo({
          name: existingBill.name || existingBill.Party?.name || '',
          phone: existingBill.phone || existingBill.Party?.phone || '',
        });
        setGlobalDiscount(existingBill.global_discount_amount || 0);

        clearCart();
        if (existingBill.items && existingBill.items.length > 0) {
          existingBill.items.forEach((item) => {
            addToCart({
              id: item.productId,
              _id: item.productId,
              name: item.productName,
              barcode: item.barcode || '',
              hsnCode: item.hsnCode || '',
              sku: item.sku || '',
              sellingPrice: item.price || 0,
              taxRate: item.taxPercentage || 0,
              taxType: 'Inclusive', // POS is mostly inclusive, or adapt to what backend sends
              discountPercent: item.discountPercentage || 0,
              stockQuantity: 100, // Unknown from bill, assume OK
            });
            // Need to update the cart item precisely with the bill quantities
            // Wait, addToCart automatically does quantity: 1, so we should update it afterwards.
          });

          // Since addToCart sets quantity to 1, we need a small timeout to let the store update,
          // or we can use updateCartItem immediately.
          setTimeout(() => {
            existingBill.items.forEach((item) => {
              updateCartItem(item.productId, {
                quantity: item.quantity,
                price: item.price,
                discountPercent: item.discountPercentage || 0,
              });
            });
          }, 0);
        }
      }
    } else {
      if (!invoiceNo) {
        setInvoiceNo(getNextInvoiceNo(saleBills, settings));
      }
      if (!saleDate) {
        setSaleDate(todayISO());
      }
    }
  }, [editMode, billId, saleBills]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch Users ──
  async function loadUsers() {
    try {
      const data = await fetchCompanyUsersAPI(1); // Default company ID = 1
      setUsers(data.data || []);
    } catch (err) {
      toast.error('Failed to load user listing.');
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const totals = getComputedTotals();

  /* ── Add to cart handler ── */
  const handleAddProduct = useCallback(
    (product) => {
      addToCart(product);
      setRecentProductIds((prev) => {
        const id = String(product.id || product._id);
        const filtered = prev.filter((x) => x !== id);
        return [...filtered, id].slice(-10);
      });
      // Switch to cart on mobile
      setMobileView('cart');
    },
    [addToCart]
  );

  /* ── Barcode not found ── */
  const handleBarcodeNotFound = useCallback(
    (val) => {
      toast.error(`No product found for: "${val}"`);
    },
    [toast]
  );

  /* ── Camera scan result ── */
  const handleCameraScan = useCallback(
    (decodedText) => {
      const v = decodedText.trim().toLowerCase();
      const product =
        products.find((p) => p.barcode && p.barcode === decodedText) ||
        products.find((p) => p.sku && p.sku.toLowerCase() === v) ||
        products.find((p) => p.HSNCode && p.HSNCode.toLowerCase() === v) ||
        products.find((p) => p.name && p.name.toLowerCase() === v) ||
        null;

      if (product) {
        handleAddProduct(product);
        toast.success(`Added: ${product.name}`);
      } else {
        toast.error(`No product found for: "${decodedText}"`);
      }
      return product;
    },
    [products, handleAddProduct, toast]
  );

  /* Phone lookup for B2C */
  function handlePhoneChange(e) {
    const phone = e.target.value;
    let existing = null;
    if (phone.length >= 10) {
      existing = customers.find(
        (p) => String(p.phone).trim() === String(phone).trim()
      );
    }
    console.log(existing);
    setCustomerInfo({
      ...customerInfo,
      phone,
      name:
        phone.length >= 10
          ? existing
            ? existing.name
            : ''
          : customerInfo.name,
    });
  }

  /* ── Save bill ── */
  async function handleSave() {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setSaving(true);

    try {
      // if (customerInfo.name || customerInfo.phone) {
      //   const existing = parties.find(
      //     (p) => p.phone === customerInfo.phone && customerInfo.phone
      //   );
      //   if (existing) {
      //     customerId = String(existing.id || existing._id);
      //   } else {
      //     const newParty = await addParty({
      //       id: generateId(),
      //       name: customerInfo.name || 'Walk-in Customer',
      //       phone: customerInfo.phone || '',
      //     });
      //     customerId = String(newParty?.id || newParty?._id || generateId());
      //   }
      // }
      if (!customerInfo.name || !customerInfo.phone) {
        return toast.error('Customer Details is Required!!');
      }
      const payload = buildSaleBillPayload({
        billForm: {
          invoiceNo,
          date: saleDate,
          items: cart,
          globalDiscount,
        },
        customerForm: customerInfo,
        validItems: cart,
      });

      if (editMode) {
        await updateBill(billId, {
          ...payload,
          bill_type: 'B2C',
          paymentStatus: 'Paid',
          paymentMethod,
        });
        toast.success('Invoice updated ✓');
      } else {
        await addBill({
          ...payload,
          bill_type: 'B2C',
          paymentStatus: 'Paid', // B2C POS → always Paid
          paymentMethod,
        });
        toast.success('Invoice saved ✓');
      }

      // Store for thermal print
      const billForPrint = {
        invoiceNo,
        saleDate,
        items: cart,
        totals,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        paymentMethod,
        cashier: settings?.legal_name || '',
      };
      setLastPrintedBill(billForPrint);

      setPaymentOpen(false);

      // Print
      if (autoPrint) {
        setTimeout(() => window.print(), 400);
      } else {
        setTimeout(() => window.print(), 400);
      }

      // Reset
      clearCart();
      setInvoiceNo(getNextInvoiceNo(saleBills, settings));
      setSaleDate(todayISO());
      setRecentProductIds([]);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  /* ── New bill ── */
  function handleNewBill() {
    clearCart();
    setInvoiceNo(getNextInvoiceNo(saleBills, settings));
    setSaleDate(todayISO());
    setRecentProductIds([]);
  }

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      // F8 → checkout
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) setPaymentOpen(true);
      }
      // F9 → new bill
      if (e.key === 'F9') {
        e.preventDefault();
        handleNewBill();
      }
      // Escape → back
      if (e.key === 'Escape' && !paymentOpen && !cameraOpen) {
        onBack?.();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart, paymentOpen, cameraOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pos-b2c-root">
      <ToastContainer toasts={toast.toasts} />

      {/* ── Thermal Bill (print-only) ── */}
      <ThermalBill
        bill={lastPrintedBill}
        settings={settings}
        printerWidth={printerWidth}
      />

      {/* ── Camera Scanner Modal ── */}
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={handleCameraScan}
      />

      {/* ── Payment Modal ── */}
      <POSPaymentModal
        open={paymentOpen}
        totals={totals}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        customerInfo={customerInfo}
        onCustomerChange={setCustomerInfo}
        invoiceNo={invoiceNo}
        saleDate={saleDate}
        onConfirm={handleSave}
        onClose={() => setPaymentOpen(false)}
        saving={saving}
      />

      {/* ── Top Bar ── */}
      <div className="pos-topbar">
        <div className="pos-topbar-left">
          <button className="pos-back-btn" onClick={onBack} title="Back (Esc)">
            ← Back
          </button>
          <div className="pos-topbar-title">
            <span className="pos-topbar-badge">POS</span>
            <span>
              {editMode ? `Edit B2C Billing - #${invoiceNo}` : 'B2C Billing'}
            </span>
          </div>
        </div>

        <div className="pos-topbar-center">
          {/* Barcode Input */}
          {scannerEnabled && (
            <BarcodeInput
              products={products}
              onProductFound={handleAddProduct}
              onNotFound={handleBarcodeNotFound}
            />
          )}
        </div>

        <div className="pos-topbar-right">
          {cameraEnabled && (
            <button
              className="pos-topbar-btn"
              onClick={() => setCameraOpen(true)}
              title="Camera Scanner"
            >
              📷 Scan
            </button>
          )}
          <div className="pos-invoice-meta">
            <span className="pos-inv-no">{invoiceNo}</span>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="pos-date-input"
              readOnly={editMode}
              style={editMode ? { opacity: 0.7, pointerEvents: 'none' } : {}}
            />
          </div>
          {!editMode && (
            <button
              className="pos-topbar-btn pos-new-btn"
              onClick={handleNewBill}
              title="New Bill (F9)"
            >
              🆕 New
            </button>
          )}
        </div>
      </div>

      <div className="bill-form-card__body">
        <div className="form-grid-2" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label">User ID</label>
            <select
              className="form-input"
              placeholder="User ID"
              value={customerInfo.userId}
              onChange={(e) =>
                setCustomerInfo({
                  ...customerInfo,
                  userId: e.target.value || '',
                })
              }
            >
              <option value="">Select User</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input
              className="form-input"
              placeholder="Walk-in customer"
              value={customerInfo.name || ''}
              onChange={(e) =>
                setCustomerInfo({
                  ...customerInfo,
                  name: e.target.value || '',
                })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              type="tel"
              placeholder="Customer phone"
              value={customerInfo.phone || ''}
              onChange={handlePhoneChange}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile Tab Switch ── */}
      <div className="pos-mobile-tabs">
        <button
          className={`pos-mobile-tab-btn ${mobileView === 'products' ? 'active' : ''}`}
          onClick={() => setMobileView('products')}
        >
          🛍 Products
        </button>
        <button
          className={`pos-mobile-tab-btn ${mobileView === 'cart' ? 'active' : ''}`}
          onClick={() => setMobileView('cart')}
        >
          🛒 Cart
          {cart.length > 0 && (
            <span className="pos-cart-badge">{cart.length}</span>
          )}
        </button>
      </div>

      {/* ── Main POS Body ── */}
      <div className="pos-body">
        {/* ── LEFT: Product Grid ── */}
        <div
          className={`pos-left ${mobileView === 'cart' ? 'pos-mobile-hidden' : ''}`}
        >
          <POSProductGrid
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            recentProductIds={recentProductIds}
          />
        </div>

        {/* ── RIGHT: Cart + Totals ── */}
        <div
          className={`pos-right ${mobileView === 'products' ? 'pos-mobile-hidden' : ''}`}
        >
          {/* Customer quick-fill */}
          {/* <div className="pos-customer-strip">
            <input
              className="pos-customer-input"
              placeholder="👤 Customer name (optional)"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <input
              className="pos-customer-input"
              placeholder="📞 Phone"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              type="tel"
            />
          </div> */}

          {/* Cart Table Container */}
          <div className="pos-table-container">
            <table className="pos-billing-table">
              <thead>
                <tr>
                  <th className="pos-th-sno">S.No</th>
                  <th className="pos-th-product">Product</th>
                  <th className="pos-th-barcode">Barcode</th>
                  <th className="pos-th-qty">Qty</th>
                  <th className="pos-th-price">Price</th>
                  <th className="pos-th-disc">Disc</th>
                  <th className="pos-th-gst">GST</th>
                  <th className="pos-th-total">Total</th>
                  <th className="pos-th-action"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="pos-cart-empty">
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#475569',
                            marginBottom: 6,
                          }}
                        >
                          Cart is empty
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                          Scan a barcode or click a product to add items
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => (
                    <POSCartItem
                      key={item.productId}
                      item={item}
                      index={index}
                      onUpdate={updateCartItem}
                      onRemove={removeFromCart}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Panel */}
          <div className="pos-totals-panel">
            {/* Global Discount */}
            <div className="pos-totals-row">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="pos-totals-row">
              <span>GST</span>
              <span>{formatCurrency(totals.totalTax)}</span>
            </div>
            <div className="pos-totals-row pos-discount-row">
              <span>Global Discount (₹)</span>
              <input
                className="pos-global-disc-input"
                type="number"
                value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            {totals.roundOff !== 0 && (
              <div className="pos-totals-row pos-roundoff-row">
                <span>Round Off</span>
                <span>{totals.roundOff?.toFixed(2)}</span>
              </div>
            )}

            {/* GST breakdown */}
            {totals.totalTax > 0 && (
              <div className="pos-gst-summary">
                <div className="pos-gst-summary-title">GST Breakdown</div>
                {cart
                  .filter((i) => i.taxRate > 0)
                  .reduce((acc, item) => {
                    const existing = acc.find((x) => x.rate === item.taxRate);
                    if (existing) {
                      existing.cgst += (item.taxAmount || 0) / 2;
                      existing.sgst += (item.taxAmount || 0) / 2;
                    } else {
                      acc.push({
                        rate: item.taxRate,
                        cgst: (item.taxAmount || 0) / 2,
                        sgst: (item.taxAmount || 0) / 2,
                      });
                    }
                    return acc;
                  }, [])
                  .map((slab) => (
                    <div key={slab.rate} className="pos-gst-slab-row">
                      <span>GST @{slab.rate}%</span>
                      <span>
                        CGST: {formatCurrency(slab.cgst)} | SGST:{' '}
                        {formatCurrency(slab.sgst)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="pos-grand-total-row">
              <span>TOTAL</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pos-cart-actions">
            <button
              className="pos-btn-discard"
              onClick={handleNewBill}
              title="Clear cart (F9)"
            >
              🗑 Clear
            </button>
            <button
              className="pos-btn-checkout"
              onClick={() => setPaymentOpen(true)}
              disabled={cart.length === 0}
              title="Checkout (F8)"
            >
              🖨 Checkout{' '}
              {cart.length > 0 && `· ${formatCurrency(totals.grandTotal)}`}
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="pos-shortcuts-hint">
            <span>F2 Barcode</span>
            <span>·</span>
            <span>F8 Checkout</span>
            <span>·</span>
            <span>F9 New Bill</span>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons (Mobile) */}
      {/* <div className="pos-fab-container pos-mobile-only">
        {cameraEnabled && (
          <button className="pos-fab pos-fab-scan" onClick={() => setCameraOpen(true)} title="Scan Barcode">
            📷
          </button>
        )}
        <button className="pos-fab pos-fab-add" onClick={() => setMobileView('products')} title="Add Product">
          +
        </button>
        <button
          className="pos-fab pos-fab-checkout"
          onClick={() => setPaymentOpen(true)}
          disabled={cart.length === 0}
          title="Save & Checkout"
        >
          🖨
        </button>
      </div> */}
    </div>
  );
}
