/* ===== POS SCREEN — Main B2C POS Layout ===== */
import React, { useState, useCallback, useEffect } from 'react';
import useAppStore from '../../store/appStore';
import useSalesStore from '../../store/salesStore';
import usePOSStore from '../../hooks/usePOSStore';
import useSettingsStore from '../../store/settingsStore';
import usePosStore from '../../store/posStore';
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
  const settings = useSettingsStore();
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
  const printerWidth = useSettingsStore((s) => s.printerWidth);
  const autoPrint = useSettingsStore((s) => s.autoPrint);
  const scannerEnabled = useSettingsStore((s) => s.scannerEnabled);
  const cameraEnabled = useSettingsStore((s) => s.cameraEnabled);
  const getComputedTotals = usePOSStore((s) => s.getComputedTotals);
  const addToCart = usePOSStore((s) => s.addToCart);
  const addCartItemDirect = usePOSStore((s) => s.addCartItemDirect);
  const addMultipleCartItemsDirect = usePOSStore((s) => s.addMultipleCartItemsDirect);
  const updateCartItem = usePOSStore((s) => s.updateCartItem);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);
  const clearCart = usePOSStore((s) => s.clearCart);
  const setCustomerInfo = usePOSStore((s) => s.setCustomerInfo);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const setGlobalDiscount = usePOSStore((s) => s.setGlobalDiscount);
  const setInvoiceNo = usePOSStore((s) => s.setInvoiceNo);
  const setSaleDate = usePOSStore((s) => s.setSaleDate);

  /* ── Shift & Hold Store ── */
  const activeShift = usePosStore((s) => s.activeShift);
  const holdCarts = usePosStore((s) => s.holdCarts);
  const checkCurrentShift = usePosStore((s) => s.checkCurrentShift);
  const startShift = usePosStore((s) => s.startShift);
  const endShift = usePosStore((s) => s.endShift);
  const holdCartAction = usePosStore((s) => s.holdCart);
  const loadHoldCarts = usePosStore((s) => s.loadHoldCarts);
  const resumeHoldCart = usePosStore((s) => s.resumeHoldCart);
  const cancelHoldCart = usePosStore((s) => s.cancelHoldCart);

  /* ── Local State ── */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastPrintedBill, setLastPrintedBill] = useState(null);
  const [recentProductIds, setRecentProductIds] = useState([]);
  const [mobileView, setMobileView] = useState('products'); // 'products' | 'cart'
  const [users, setUsers] = useState([]);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftFloat, setShiftFloat] = useState('');
  const [shiftCloseModal, setShiftCloseModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [holdNote, setHoldNote] = useState('');

  const [printReady, setPrintReady] = useState(false);

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  /* ── Init & Edit Mode ── */
  useEffect(() => {
    if (editMode && billId) {
      const existingBill = saleBills.find(
        (b) => String(b.id) === String(billId)
      );
      console.log('Editing existing bill:', existingBill.Customer.name);

      if (existingBill) {
        // ✅ CRITICAL: Clear cart BEFORE loading items
        clearCart();
        // Set invoice details
        setInvoiceNo(
          existingBill.invoiceNumber || existingBill.invoiceNo || ''
        );
        setSaleDate(
          existingBill.saleDate
            ? existingBill.saleDate.split('T')[0]
            : todayISO()
        );
        console.log('Editing existing bill:', existingBill.Customer?.name, existingBill);

        // Set customer info with proper field mapping
        setCustomerInfo({
          name: existingBill.Customer?.name || existingBill.customerName || '',
          phone: existingBill.Customer?.phone || existingBill.customerPhone || '',
          userId: existingBill.User?.id || existingBill.userId || customerInfo.userId || null,
        });

        setLoyaltyPoints(existingBill.Customer?.loyalty_points || existingBill.customerLoyaltyPoints || 0);

        // Set global discount
        setGlobalDiscount(existingBill.global_discount_amount || existingBill.globalDiscount || 0);

        // Get items array - handle multiple naming conventions
        let items = existingBill.SalesItems || existingBill.saleItems || existingBill.items || [];

        // ✅ Map item fields properly before adding to cart
        if (items.length > 0) {
          const mappedItems = items.map(item => ({
            productId: String(item.productId || item.product_id || item.id || ''),
            productName: item.productName || item.product_name || item.name || '',
            price: parseFloat(item.price || item.rate || item.unitPrice || 0),
            quantity: parseFloat(item.quantity || 1),
            taxRate: parseFloat(item.taxRate || item.tax_rate || item.gstPercentage || 0),
            discountPercent: parseFloat(item.discountPercent || item.discount_percent || item.discount || 0),
            unit: item.unit || 'pcs',
            hsnCode: item.hsnCode || item.hsn_code || '',
            barcode: item.barcode || '',
            sku: item.sku || '',
            mrp: parseFloat(item.mrp || 0),
            batchNumber: item.batchNumber || item.batch_number || '',
            expiryDate: item.expiryDate || item.expiry_date || '',
            serialNumber: item.serialNumber || item.serial_number || '',
            notes: item.notes || '',
          }));

          console.log('Mapped items for edit:', mappedItems);
          addMultipleCartItemsDirect(mappedItems);
        }
      }
    } else {
      // New bill mode
      if (!invoiceNo) {
        setInvoiceNo(getNextInvoiceNo(saleBills, settings));
      }
      if (!saleDate) {
        setSaleDate(todayISO());
      }
    }
  }, [editMode, billId, saleBills]); // eslint-disable-line react-hooks/exhaustive-deps


  console.log(customerInfo, 'customerInfo');
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
    const storedAuth = localStorage.getItem('thrive-auth-storage');

    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        const userId = authData?.state?.user?.id;
        console.log('Loaded userId from localStorage:', userId);

        if (userId) {
          setCustomerInfo((prev) => ({
            ...prev,
            userId: String(userId),
          }));
        }
      } catch (error) {
        console.error('Failed to read user from localStorage:', error);
      }
    }

    loadUsers();
    checkCurrentShift();
    loadHoldCarts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = getComputedTotals();

  /* ── Shift handlers ── */
  async function handleStartShift() {
    try {
      await startShift({
        userId: customerInfo.userId || 1,
        openingFloat: parseFloat(shiftFloat) || 0,
        terminalId: 'POS-TERMINAL-1',
      });
      toast.success('Shift started ✓');
      setShiftModalOpen(false);
      setShiftFloat('');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to start shift');
    }
  }

  async function handleEndShift() {
    if (!activeShift) return;
    try {
      const res = await endShift({
        shiftId: activeShift.id,
        closingCashActual: parseFloat(closingCash) || 0,
      });
      toast.success(`Shift closed. Difference: ${formatCurrency(res?.data?.difference || 0)}`);
      setShiftCloseModal(false);
      setClosingCash('');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to close shift');
    }
  }

  /* ── Hold cart handler ── */
  async function handleHoldCart() {
    if (cart.length === 0) {
      toast.error('Cart is empty – nothing to hold');
      return;
    }
    try {
      await holdCartAction({
        userId: customerInfo.userId || null,
        customerName: customerInfo.name || 'Walk-in Customer',
        customerPhone: customerInfo.phone || '',
        cartData: cart,
        totalAmount: totals.grandTotal,
        note: holdNote || '',
      });
      toast.success('Cart held successfully ✓');
      clearCart();
      setHoldNote('');
      setInvoiceNo(getNextInvoiceNo(saleBills, settings));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to hold cart');
    }
  }

  /* ── Resume held cart ── */
  async function handleResumeCart(id) {
    try {
      const res = await resumeHoldCart(id);
      const data = res;
      clearCart();
      const items = Array.isArray(data.cartData) ? data.cartData : JSON.parse(data.cartData || '[]');

      // ✅ NEW: Use addMultipleCartItemsDirect
      if (items.length > 0) {
        addMultipleCartItemsDirect(items);
      }

      if (data.customerName) {
        setCustomerInfo((prev) => ({
          ...prev,
          name: data.customerName,
          phone: data.customerPhone || '',
        }));
      }
      toast.success('Held cart restored ✓');
      setHoldDrawerOpen(false);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to resume cart');
    }
  }

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
    setCustomerInfo({
      ...customerInfo,
      phone,
      name: existing ? existing.name : customerInfo.name
    });

    setLoyaltyPoints(existing?.loyalty_points || existing?.loyalty_points || 0);
  }

  /* ── Save bill ── */
  async function handleSave(paymentDetails) {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Get logged-in user
    let loggedInUserId = customerInfo.userId;

    try {
      const storedAuth = localStorage.getItem('thrive-auth-storage');

      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        loggedInUserId =
          authData?.state?.user?.id || loggedInUserId;
      }
    } catch (error) {
      console.error('Failed to read user from localStorage:', error);
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Customer Details is Required!!');
      return;
    }

    if (!loggedInUserId) {
      toast.error('User Details is Required!!');
      return;
    }

    const finalCustomerInfo = {
      ...customerInfo,
      userId: loggedInUserId,
    };

    setSaving(true);

    try {
      const payload = buildSaleBillPayload({
        billForm: {
          invoiceNo,
          date: saleDate,
          items: cart,
          globalDiscount,
        },
        customerForm: finalCustomerInfo,
        validItems: cart,
      });

      const extraFields = {
        bill_type: 'B2C',
        paymentStatus: 'Paid',
        paymentMethod,
        shiftId: activeShift?.id || null,
        paymentDetails: paymentDetails || null,
      };

      // ✅ FIXED: Check editMode properly
      if (editMode && billId) {
        // Update existing bill
        console.log('Updating bill:', billId);
        await updateBill(billId, {
          ...payload,
          ...extraFields,
        });

        toast.success('Invoice updated ✓');

        // After successful update, go back
        if (onSaved) {
          onSaved();
        } else if (onBack) {
          onBack();
        }
      } else {
        // Create new bill
        console.log('Creating new bill');
        await addBill({
          ...payload,
          ...extraFields,
        });

        toast.success('Invoice saved ✓');

        // Prepare bill for printing
        const billForPrint = {
          ...payload,
          ...extraFields,
          invoiceNo,
          saleDate,
        };

        setLastPrintedBill(billForPrint);
        setPaymentOpen(false);
        setPrintReady(true);

        // Reset for new bill
        clearCart();

        // Get logged-in user again
        let newBillUserId = '';
        const storedAuthAfterSave = localStorage.getItem('thrive-auth-storage');

        if (storedAuthAfterSave) {
          try {
            const authData = JSON.parse(storedAuthAfterSave);
            newBillUserId = String(authData?.state?.user?.id || '');
          } catch (error) {
            console.error('Failed to read user:', error);
          }
        }

        // Keep logged-in user
        setCustomerInfo({
          name: '',
          phone: '',
          userId: newBillUserId,
        });

        // Reset customer-related data
        setLoyaltyPoints(0);
        setGlobalDiscount(0);

        // Generate next bill
        setInvoiceNo(getNextInvoiceNo(saleBills, settings));
        setSaleDate(todayISO());
        setRecentProductIds([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save invoice: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  /* ── New bill ── */
  function handleNewBill() {
    const storedAuth = localStorage.getItem('thrive-auth-storage');

    let loggedInUserId = '';

    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        loggedInUserId = String(authData?.state?.user?.id || '');
      } catch (error) {
        console.error('Failed to read user:', error);
      }
    }

    clearCart();

    setCustomerInfo({
      name: '',
      phone: '',
      userId: loggedInUserId,
    });

    setLoyaltyPoints(0);
    setGlobalDiscount(0);

    setInvoiceNo(getNextInvoiceNo(saleBills, settings));
    setSaleDate(todayISO());
    setRecentProductIds([]);
  }

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      // F2 → focus barcode
      if (e.key === 'F2') {
        e.preventDefault();
        const barcodeInput = document.querySelector('.pos-barcode-input input');
        if (barcodeInput) barcodeInput.focus();
      }
      // F4 → focus customer name
      if (e.key === 'F4') {
        e.preventDefault();
        const custInput = document.querySelector('.pos-customer-name-input');
        if (custInput) custInput.focus();
      }
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
      // F10 → hold cart
      if (e.key === 'F10') {
        e.preventDefault();
        handleHoldCart();
      }
      // Escape → close modals or go back
      if (e.key === 'Escape') {
        if (holdDrawerOpen) { setHoldDrawerOpen(false); return; }
        if (shiftModalOpen) { setShiftModalOpen(false); return; }
        if (shiftCloseModal) { setShiftCloseModal(false); return; }
        if (!paymentOpen && !cameraOpen) { onBack?.(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart, paymentOpen, cameraOpen, holdDrawerOpen, shiftModalOpen, shiftCloseModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add useEffect hook (paste before return statement)
  useEffect(() => {
    if (!printReady || !lastPrintedBill) return;

    const timer = setTimeout(() => {
      const thermalBillElement =
        document.getElementById('thermal-bill-print');

      if (thermalBillElement && thermalBillElement.innerHTML.trim()) {
        window.print();
      }

      setPrintReady(false);
      setLastPrintedBill(null);
    }, 200);

    return () => clearTimeout(timer);
  }, [printReady, lastPrintedBill]);

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
          <button className="pos-back-btn"
            onClick={() => {
              onBack();
              setCustomerInfo({
                name: '',
                phone: '',
                userId: '',
              });
              setLoyaltyPoints(0);
              clearCart();
            }}
            title="Back (Esc)"
          >
            ‹ Back
          </button>
          <div className="pos-topbar-title">
            <span className="pos-topbar-badge">POS</span>
            <span>
              {editMode ? `Edit Invoice · #${invoiceNo}` : 'B2C Counter Billing'}
            </span>
          </div>
        </div>

        <div className="pos-topbar-center">
          {scannerEnabled && (
            <BarcodeInput
              products={products}
              onProductFound={handleAddProduct}
              onNotFound={handleBarcodeNotFound}
            />
          )}
        </div>

        <div className="pos-topbar-right">
          {/* Shift indicator */}
          {activeShift ? (
            <button
              className="pos-topbar-btn"
              onClick={() => setShiftCloseModal(true)}
              style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 700, fontSize: 11 }}
              title="Active shift – click to close"
            >
              🟢 Shift #{activeShift.id}
            </button>
          ) : (
            <button
              className="pos-topbar-btn"
              onClick={() => setShiftModalOpen(true)}
              style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fde047', fontWeight: 700, fontSize: 11 }}
              title="No active shift – click to open"
            >
              ⏸ Start Shift
            </button>
          )}
          {/* Hold carts badge */}
          <button
            className="pos-topbar-btn"
            onClick={() => { loadHoldCarts(); setHoldDrawerOpen(true); }}
            title="Held Carts"
            style={{ position: 'relative' }}
          >
            📋 Held
            {holdCarts.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff',
                borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{holdCarts.length}</span>
            )}
          </button>
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
            <span className="pos-inv-no"># {invoiceNo}</span>
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
              ＋ New Bill
            </button>
          )}
        </div>
      </div>

      <div className="bill-form-card__body">
        <div className="form-grid-2" style={{ marginBottom: 0 }}>
          {/* <div className="form-group">
            <label className="form-label">Biller / User</label>
            <select
              className="form-input"
              value={customerInfo.userId}
              onChange={(e) =>
                setCustomerInfo({
                  ...customerInfo,
                  userId: e.target.value || '',
                })
              }
            >
              <option value="">— Select User —</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div> */}
          <div className="form-group">
            <label className="form-label">Customer Name *</label>
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
            <label className="form-label">Phone *</label>
            <input
              className="form-input"
              type="tel"
              placeholder="10-digit mobile number"
              value={customerInfo.phone || ''}
              onChange={handlePhoneChange}
              maxLength={10}
            />
          </div>

          {/* Loyalty Points */}
          <div className="pos-loyalty-display">
            <div className="pos-loyalty-icon">
              ⭐
            </div>

            <div className="pos-loyalty-info">
              <span className="pos-loyalty-label">
                Loyalty Points
              </span>

              <strong className="pos-loyalty-points">
                {loyaltyPoints || 0}
              </strong>
            </div>
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
                        <div style={{ fontSize: 46, marginBottom: 10, opacity: 0.4 }}>🛒</div>
                        <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4, fontSize: 14 }}>
                          Cart is Empty
                        </div>
                        <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
                          Scan a barcode or select a product from the left panel
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
              <span>{formatCurrency(saleBills.baseRate)}</span>
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
              <span>GRAND TOTAL</span>
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
              className="pos-btn-discard"
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              title="Hold Cart (F10)"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
            >
              ⏸ Hold
            </button>
            <button
              className="pos-btn-checkout"
              onClick={() => setPaymentOpen(true)}
              disabled={cart.length === 0}
              title="Checkout (F8)"
            >
              🖨 &nbsp;Checkout &amp; Print
              {cart.length > 0 && (
                <span style={{ opacity: 0.85, fontWeight: 600, fontSize: 13 }}>
                  &nbsp;· {formatCurrency(totals.grandTotal)}
                </span>
              )}
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="pos-shortcuts-hint">
            <span>F2 · Barcode</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span>F4 · Customer</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span>F8 · Checkout</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span>F9 · New Bill</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span>F10 · Hold</span>
            <span style={{ color: '#1e293b' }}>|</span>
            <span>Esc · Back</span>
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
      {/* </div> */}

      {/* ═══ SHIFT START MODAL ═══ */}
      {shiftModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShiftModalOpen(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', padding: '20px 24px', color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8 }}>POS Shift Management</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Open New Shift</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Opening Cash Float (₹)</label>
                <input type="number" value={shiftFloat} onChange={(e) => setShiftFloat(e.target.value)} placeholder="Enter opening cash amount" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShiftModalOpen(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleStartShift} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' }}>🟢 Start Shift</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SHIFT CLOSE MODAL ═══ */}
      {shiftCloseModal && activeShift && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShiftCloseModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', padding: '20px 24px', color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8 }}>Cash Drawer Reconciliation</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Close Shift #{activeShift.id}</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Opening Float</div><div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 2 }}>{formatCurrency(activeShift.openingFloat || 0)}</div></div>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 14px' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Total Sales</div><div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>{activeShift.totalSalesCount || 0} bills</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>CASH</div><div style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(activeShift.cashSalesTotal || 0)}</div></div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>CARD</div><div style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(activeShift.cardSalesTotal || 0)}</div></div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>UPI</div><div style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(activeShift.upiSalesTotal || 0)}</div></div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Actual Cash in Drawer (₹)</label>
                <input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="Count and enter actual cash" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShiftCloseModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleEndShift} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' }}>🔴 Close Shift</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HELD CARTS DRAWER ═══ */}
      {holdDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9998, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(3px)' }} onClick={(e) => { if (e.target === e.currentTarget) setHoldDrawerOpen(false); }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#fff', height: '100%', boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>📋 Held Carts ({holdCarts.length})</div>
              <button onClick={() => setHoldDrawerOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {holdCarts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                  <div style={{ fontWeight: 600 }}>No held carts</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Press F10 or click Hold to save a cart for later</div>
                </div>
              ) : holdCarts.map((h) => {
                const items = Array.isArray(h.cartData) ? h.cartData : [];
                return (
                  <div key={h.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{h.customerName || 'Walk-in'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.holdNumber} · {items.length} items · {h.note || ''}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb' }}>{formatCurrency(h.totalAmount || 0)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleResumeCart(h.id)} style={{ flex: 2, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>▶ Resume</button>
                      <button onClick={() => { cancelHoldCart(h.id); toast.success('Held cart cancelled'); }} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕ Cancel</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
