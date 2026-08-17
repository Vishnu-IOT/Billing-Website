/* ===== POS SCREEN — Main B2C POS Layout ===== */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FiUser,
  FiShoppingCart,
  FiFileText,
  FiPauseCircle,
  FiXCircle,
  FiPlus,
  FiTrash2,
  FiSearch,
  FiCreditCard,
  FiUserCheck,
  FiPrinter,
  FiClock,
  FiLayers,
  FiStar
} from 'react-icons/fi';
import useAppStore from '../../store/appStore';
import useSalesStore from '../../store/salesStore';
import usePOSStore from '../../hooks/usePOSStore';
import useSettingsStore from '../../store/settingsStore-DB';
import usePosStore from '../../store/posStore';
import { formatCurrency } from '../../utils/currency';
import { todayISO } from '../../utils/date';
import { getNextInvoiceNo, buildSaleBillPayload } from '../../utils/invoice';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui';
import BarcodeInput from '../../components/pos/BarcodeInput';
import CameraScanner from '../../components/pos/CameraScanner';
import POSCartItem from '../../components/pos/POSCartItem';
import POSPaymentModal from '../../components/pos/POSPaymentModal';
import ThermalBill from '../../components/pos/ThermalBill';
import '../../styles/pos-b2c.css';
import '../../styles/thermal.css';
import { fetchCompanyUsersAPI, fetchFinancialDetailsAPI } from '../../api';

export default function POSScreen({
  editMode = false,
  billId = null,
  onBack,
  onSaved,
}) {
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const companyRecord = useAppStore((s) => s.companies);
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
  const [users, setUsers] = useState([]);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftFloat, setShiftFloat] = useState('');
  const [shiftCloseModal, setShiftCloseModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [printReady, setPrintReady] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  /* ── Add Item Form State ── */
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemProduct, setAddItemProduct] = useState(null);
  const [addItemQty, setAddItemQty] = useState(1);
  const [addItemRate, setAddItemRate] = useState('');
  const [addItemDisc, setAddItemDisc] = useState('');
  const [addItemSuggestions, setAddItemSuggestions] = useState([]);
  const [addItemDropdownOpen, setAddItemDropdownOpen] = useState(false);
  const formDropdownRef = useRef(null);

  const [companyFinancials, setCompanyFinancials] = useState({});

  useEffect(() => {
    const companyId = companyRecord?.id;
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchFinancialDetailsAPI(companyId);
        const financials = res?.data?.data || res?.data || {};
        if (!cancelled) setCompanyFinancials(financials);
      } catch (err) {
        console.error('Could not load company financial details for receipt:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [companyRecord?.id]);

  const companyForReceipt = { ...companyRecord, financials: companyFinancials };

  /* ── Init & Edit Mode ── */
  useEffect(() => {
    if (editMode && billId) {
      const existingBill = saleBills.find(
        (b) => String(b.id) === String(billId)
      );

      if (!existingBill) return;

      console.log('Initializing POS with existing bill:', existingBill);

      clearCart();

      // Invoice details
      setInvoiceNo(
        existingBill.invoiceNumber ||
        existingBill.invoiceNo ||
        ''
      );

      setSaleDate(
        existingBill.saleDate
          ? existingBill.saleDate.split('T')[0]
          : todayISO()
      );

      // Customer details
      const customerName =
        existingBill.Customer?.name ||
        existingBill.customerName ||
        existingBill.name ||
        '';

      const customerPhone =
        existingBill.Customer?.phone ||
        existingBill.customerPhone ||
        existingBill.phone ||
        '';

      const customerUserId =
        existingBill.User?.id ||
        existingBill.userId ||
        customerInfo?.userId ||
        null;

      setCustomerInfo({
        name: existingBill.Customer?.name || customerName,
        phone: existingBill.Customer?.phone || customerPhone,
        userId: existingBill.userId || customerUserId,
      });

      // Loyalty points
      setLoyaltyPoints(
        existingBill.Customer?.loyalty_points ||
        existingBill.customerLoyaltyPoints ||
        0
      );

      // Discount
      setGlobalDiscount(
        existingBill.global_discount_amount ||
        existingBill.globalDiscount ||
        0
      );

      // Items
      const items =
        existingBill.SalesItems ||
        existingBill.saleItems ||
        existingBill.items ||
        [];

      if (Array.isArray(items) && items.length > 0) {
        const mappedItems = items.map((item) => ({
          productId: String(
            item.productId ||
            item.product_id ||
            item.id ||
            ''
          ),

          productName:
            item.productName ||
            item.product_name ||
            item.name ||
            '',

          price: parseFloat(
            item.price ||
            item.rate ||
            item.unitPrice ||
            0
          ),

          quantity: parseFloat(item.quantity || 1),

          taxRate: parseFloat(
            item.taxRate ||
            item.tax_rate ||
            item.gstPercentage ||
            item.taxPercentage ||
            0
          ),

          discountPercent: parseFloat(
            item.discountPercent ||
            item.discount_percent ||
            item.discount ||
            item.discountPercentage ||
            0
          ),

          unit: item.unit || 'pcs',

          hsnCode:
            item.hsnCode ||
            item.hsn_code ||
            '',

          barcode: item.barcode || '',

          sku: item.sku || '',

          mrp: parseFloat(item.mrp || 0),

          batchNumber:
            item.batchNumber ||
            item.batch_number ||
            '',

          expiryDate:
            item.expiryDate ||
            item.expiry_date ||
            '',

          serialNumber:
            item.serialNumber ||
            item.serial_number ||
            '',

          notes: item.notes || '',
        }));

        addMultipleCartItemsDirect(mappedItems);
      }
    } else if (!editMode) {
      // Only initialize a completely new bill here
      if (!invoiceNo) {
        setInvoiceNo(getNextInvoiceNo(saleBills, settings));
      }

      if (!saleDate) {
        setSaleDate(todayISO());
      }
    }

    // IMPORTANT:
    // Do NOT put saleBills in this dependency list.
  }, [editMode, billId]);

  // ── Fetch Users ──
  async function loadUsers() {
    try {
      const data = await fetchCompanyUsersAPI(1);
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (formDropdownRef.current && !formDropdownRef.current.contains(e.target)) {
        setAddItemDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totals = getComputedTotals();

  /* ── Add Item Form Handlers ── */
  const handleAddItemSearchChange = (e) => {
    const val = e.target.value;
    setAddItemSearch(val);
    setAddItemProduct(null);

    if (!val.trim()) {
      setAddItemSuggestions([]);
      setAddItemDropdownOpen(false);
      return;
    }

    const query = val.toLowerCase().trim();
    const matches = (products || []).filter((p) => {
      return (
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.HSNCode && p.HSNCode.toLowerCase().includes(query))
      );
    }).slice(0, 15);

    setAddItemSuggestions(matches);
    setAddItemDropdownOpen(matches.length > 0);
  };

  const handleSelectFormProduct = (prod) => {
    setAddItemProduct(prod);
    setAddItemSearch(prod.name);
    setAddItemRate(prod.salesPrice || prod.price || prod.MRP || 0);
    setAddItemDisc(prod.discount || 0);
    setAddItemDropdownOpen(false);
  };

  const handleAddItemSubmit = (e) => {
    if (e) e.preventDefault();
    if (!addItemProduct && !addItemSearch.trim()) {
      toast.error('Please select or enter a product name/barcode');
      return;
    }

    const prodToUse = addItemProduct || products.find(p => p.name.toLowerCase() === addItemSearch.toLowerCase()) || {
      id: 'custom-' + Date.now(),
      name: addItemSearch.trim(),
      salesPrice: parseFloat(addItemRate) || 0,
      price: parseFloat(addItemRate) || 0,
      discount: parseFloat(addItemDisc) || 0,
      taxRate: 0,
      unit: 'pcs',
    };

    const rate = addItemRate !== '' ? parseFloat(addItemRate) : (prodToUse.salesPrice || prodToUse.price || 0);
    const disc = parseFloat(addItemDisc) || 0;
    const qty = Math.max(1, parseFloat(addItemQty) || 1);

    const productPayload = {
      ...prodToUse,
      salesPrice: rate,
      price: rate,
      discount: disc,
    };

    for (let i = 0; i < qty; i++) {
      addToCart(productPayload);
    }

    toast.success(`Added ${productPayload.name}`);

    // Reset Form
    setAddItemSearch('');
    setAddItemProduct(null);
    setAddItemQty(1);
    setAddItemRate('');
    setAddItemDisc('');
    setAddItemSuggestions([]);
    setAddItemDropdownOpen(false);
  };

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

  /* ── Add to cart handler (from scanner) ── */
  const handleAddProduct = useCallback(
    (product) => {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    },
    [addToCart, toast]
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

    setLoyaltyPoints(existing?.loyalty_points || 0);
  }

  /* ── Save bill ── */
  async function handleSave(paymentDetails) {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    let loggedInUserId = customerInfo.userId;
    let loggedInCompanyId = null;

    try {
      const storedAuth = localStorage.getItem('thrive-auth-storage');
      const companyDetails = localStorage.getItem('erp-settings');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        loggedInUserId = authData?.state?.user?.id || loggedInUserId;
      }
      console.log('Logged in user ID:', companyDetails);
      if (companyDetails) {
        const companyData = JSON.parse(companyDetails);
        loggedInCompanyId = companyData?.state?.companyId || null;
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
    if (!loggedInCompanyId) {
      toast.error('Company Details is Required!!');
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
        companyId: loggedInCompanyId || null,

      };

      if (editMode && billId) {
        await updateBill(billId, {
          ...payload,
          ...extraFields,
        });

        toast.success('Invoice updated ✓');

        // Clear edited bill data from POS store
        clearCart();

        setCustomerInfo({
          name: '',
          phone: '',
          userId: loggedInUserId,
        });

        setLoyaltyPoints(0);
        setGlobalDiscount(0);
        setPaymentOpen(false);

        if (onSaved) {
          onSaved();
        } else if (onBack) {
          onBack();
        }

        return;
      } else {
        await addBill({
          ...payload,
          ...extraFields,
        });

        toast.success('Invoice saved ✓');

        const billForPrint = {
          invoiceNo,
          saleDate,
          items: cart,          // cart items already have .total/.taxRate/.discountAmount computed correctly
          totals,                // the totals object you already computed via getComputedTotals()
          customerName: finalCustomerInfo.name,
          customerPhone: finalCustomerInfo.phone,
          paymentMethod,
          ...extraFields,
        };

        setLastPrintedBill(billForPrint);
        setPaymentOpen(false);
        setPrintReady(true);

        clearCart();

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

        setCustomerInfo({
          name: '',
          phone: '',
          userId: newBillUserId,
        });

        setLoyaltyPoints(0);
        setGlobalDiscount(0);

        setInvoiceNo(getNextInvoiceNo(saleBills, settings));
        setSaleDate(todayISO());
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save invoice: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  /* ── New bill / Void bill ── */
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
  }

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'F2') {
        e.preventDefault();
        const barcodeInput = document.querySelector('.barcode-input-wrap input');
        if (barcodeInput) barcodeInput.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        const custInput = document.querySelector('.pos-cust-phone-input');
        if (custInput) custInput.focus();
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) setPaymentOpen(true);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleNewBill();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        handleHoldCart();
      }
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

  useEffect(() => {
    if (!printReady || !lastPrintedBill) return;

    const timer = setTimeout(() => {
      const thermalBillElement = document.getElementById('thermal-bill-print');

      if (thermalBillElement && thermalBillElement.innerHTML.trim()) {
        // Hide the rest of the POS screen for the duration of the print job.
        // (Done here with a plain body class, rather than a CSS :has()
        // selector, so it works in every browser — not just the newest ones.)
        document.body.classList.add('printing-thermal-receipt');

        const cleanup = () => {
          document.body.classList.remove('printing-thermal-receipt');
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);

        window.print();

        // Safety net: some browsers (older Safari) don't fire 'afterprint'
        // reliably, so also clear the class shortly after as a fallback.
        setTimeout(cleanup, 2000);
      }

      setPrintReady(false);
      setLastPrintedBill(null);
    }, 200);

    return () => clearTimeout(timer);
  }, [printReady, lastPrintedBill]);

  const formattedDateTimeStr = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="pos-b2c-root pos-exact-layout">
      <ToastContainer toasts={toast.toasts} />

      {/* ── Thermal Bill (print-only) ── */}
      <ThermalBill
        bill={lastPrintedBill}
        company={companyForReceipt}
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

      {/* ═══ TOP NAVBAR ═══ */}
      <div className="pos-exact-topbar">
        <div className="pos-exact-topbar__search">
          {onBack && (
            <button className="pos-exact-back-btn" onClick={() => {
              onBack();
              setCustomerInfo({
                name: '',
                phone: '',
                userId: '',
              });
              setLoyaltyPoints(0);
              clearCart();
            }}
              title="Back (Esc)">
              ‹ Back
            </button>
          )}
          <div className="pos-exact-search-wrap">
            <FiSearch className="pos-exact-search-icon" />
            <input
              type="text"
              placeholder="Search product..."
              className="pos-exact-search-input"
              value={addItemSearch}
              onChange={handleAddItemSearchChange}
              onFocus={() => {
                if (addItemSuggestions.length > 0) setAddItemDropdownOpen(true);
              }}
            />
            {addItemDropdownOpen && addItemSuggestions.length > 0 && (
              <div className="pos-exact-dropdown" ref={formDropdownRef}>
                {addItemSuggestions.map((item) => (
                  <div
                    key={item.id || item._id}
                    className="pos-exact-dropdown-item"
                    onClick={() => handleSelectFormProduct(item)}
                  >
                    <span className="pos-exact-dropdown-name">{item.name}</span>
                    <span className="pos-exact-dropdown-price">{formatCurrency(item.salesPrice || item.price || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="pos-exact-scan-btn"
            onClick={() => setCameraOpen(true)}
            title="Scan Barcode with Camera"
          >
            <span className="scan-icon-box">📷</span>
            <span>Scan</span>
          </button>
        </div>

        <div className="pos-exact-topbar__meta">
          <span className="pos-exact-inv-badge">
            {invoiceNo || 'INV-2024-001'}
          </span>
          <div className="pos-exact-date-pill">
            📅 {saleDate || formattedDateTimeStr}
          </div>

          {/* ── Shift Button ── */}
          <button
            className={`pos-exact-topbar-btn pos-exact-topbar-btn--shift ${activeShift ? 'active' : ''}`}
            onClick={() => activeShift ? setShiftCloseModal(true) : setShiftModalOpen(true)}
            title={activeShift ? `Shift #${activeShift.id} Active — Click to Close` : 'Start New Shift'}
          >
            <FiClock />
            <span>{activeShift ? `Shift #${activeShift.id}` : 'Start Shift'}</span>
            {activeShift && <span className="pos-exact-topbar-dot pos-exact-topbar-dot--green" />}
          </button>

          {/* ── Hold Bill Button ── */}
          <button
            className="pos-exact-topbar-btn pos-exact-topbar-btn--hold"
            onClick={() => {
              if (cart.length > 0) {
                handleHoldCart();
              } else {
                setHoldDrawerOpen(true);
              }
            }}
            title={cart.length > 0 ? 'Hold Current Bill (F10)' : 'View Held Bills'}
          >
            <FiLayers />
            <span>{cart.length > 0 ? 'Hold Bill' : 'Held Bills'}</span>
            {holdCarts.length > 0 && (
              <span className="pos-exact-topbar-badge">{holdCarts.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ MAIN LAYOUT GRID ═══ */}
      <div className="pos-exact-container">
        {/* LEFT COLUMN: Customer + Add Item + Cart Table */}
        <div className="pos-exact-left-col">
          {/* Top Row: Two Cards */}
          <div className="pos-exact-cards-row">
            {/* Card 1: Customer Details */}
            <div className="pos-exact-card pos-exact-card--customer">
              <div className="pos-exact-card__title">
                <FiUser className="pos-exact-card__icon" />
                <span>Customer Details</span>
              </div>
              <div className="pos-exact-card__body">
                <div className="pos-exact-form-group">
                  <label>Phone Number *</label>
                  <div className="pos-exact-input-icon-wrap">
                    <span className="pos-exact-input-icon">📞</span>
                    <input
                      type="tel"
                      className="pos-exact-input pos-cust-phone-input"
                      placeholder="Enter phone..."
                      value={customerInfo.phone || ''}
                      onChange={handlePhoneChange}
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="pos-exact-form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    className="pos-exact-input"
                    placeholder="Walk-in Customer"
                    value={customerInfo.name || ''}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        name: e.target.value || '',
                      })
                    }
                  />
                </div>
                {/* ── Loyalty Points ── */}
                <div className="pos-exact-loyalty-row">
                  <FiStar className="pos-exact-loyalty-icon" />
                  <span className="pos-exact-loyalty-label">Loyalty Points</span>
                  <span className="pos-exact-loyalty-value">{loyaltyPoints || 0}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Add Item to Cart */}
            <div className="pos-exact-card pos-exact-card--add-item">
              <div className="pos-exact-card__title">
                <FiShoppingCart className="pos-exact-card__icon" />
                <span>Add Item to Cart</span>
              </div>
              <form className="pos-exact-card__body" onSubmit={handleAddItemSubmit}>
                <div className="pos-exact-add-grid">
                  <div className="pos-exact-form-group pos-exact-form-group--product">
                    <label>Product Name / Barcode</label>
                    <div className="pos-exact-input-icon-wrap" style={{ position: 'relative' }}>
                      <span className="pos-exact-input-icon">📊</span>
                      <input
                        type="text"
                        className="pos-exact-input"
                        placeholder="Scan or type..."
                        value={addItemSearch}
                        onChange={handleAddItemSearchChange}
                      />
                    </div>
                  </div>

                  <div className="pos-exact-form-group pos-exact-form-group--sm">
                    <label>Quantity</label>
                    <input
                      type="number"
                      className="pos-exact-input pos-exact-input--center"
                      value={addItemQty}
                      onChange={(e) => setAddItemQty(e.target.value)}
                      min="1"
                    />
                  </div>

                  <div className="pos-exact-form-group pos-exact-form-group--sm">
                    <label>Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="pos-exact-input pos-exact-input--center"
                      placeholder="0.0"
                      value={addItemRate}
                      onChange={(e) => setAddItemRate(e.target.value)}
                    />
                  </div>

                  <div className="pos-exact-form-group pos-exact-form-group--sm">
                    <label>Disc (%)</label>
                    <input
                      type="number"
                      className="pos-exact-input pos-exact-input--center"
                      placeholder="0"
                      value={addItemDisc}
                      onChange={(e) => setAddItemDisc(e.target.value)}
                    />
                  </div>

                  <div className="pos-exact-form-group pos-exact-form-group--btn">
                    <button
                      type="submit"
                      className="pos-exact-add-btn"
                      title="Add to cart"
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Bottom Row: Current Order Table */}
          <div className="pos-exact-card pos-exact-card--order">
            <div className="pos-exact-card__header">
              <div className="pos-exact-card__title">
                <FiFileText className="pos-exact-card__icon" />
                <span>Current Order</span>
              </div>
              <span className="pos-exact-item-count-badge">
                {cart.length} Items
              </span>
            </div>

            <div className="pos-exact-table-wrap">
              <table className="pos-exact-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th>Item Name</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Rate</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Discount</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Total</th>
                    <th style={{ width: 60, textAlign: 'center' }}>Act</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="pos-exact-empty-cart">
                          <div className="pos-exact-empty-icon">🛒</div>
                          <div className="pos-exact-empty-title">No Items in Order</div>
                          <div className="pos-exact-empty-sub">
                            Use the top search bar or form above to add products to this sale
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => {
                      const rate = item.price || 0;
                      const discAmount = item.discountAmount || 0;
                      const discDisplay = item.discountPercent > 0 ? `-${formatCurrency(discAmount)}` : '-';
                      const itemTotal = item.total || 0;

                      return (
                        <tr key={item.productId || idx}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div className="pos-exact-item-name">{item.productName}</div>
                            {item.hsnCode && <div className="pos-exact-item-sub">HSN: {item.hsnCode}</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="pos-exact-qty-controls">
                              <button
                                className="pos-exact-qty-btn"
                                onClick={() => updateCartItem(item.productId, 'quantity', Math.max(1, item.quantity - 1))}
                              >
                                −
                              </button>
                              <span className="pos-exact-qty-val">{item.quantity}</span>
                              <button
                                className="pos-exact-qty-btn"
                                onClick={() => updateCartItem(item.productId, 'quantity', item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {formatCurrency(rate)}
                          </td>
                          <td style={{ textAlign: 'right', color: item.discountPercent > 0 ? '#ef4444' : '#94a3b8', fontWeight: item.discountPercent > 0 ? 600 : 400 }}>
                            {discDisplay}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {formatCurrency(itemTotal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="pos-exact-remove-btn"
                              onClick={() => removeFromCart(item.productId)}
                              title="Remove item"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (User + Shift + Hold/Void + Totals) */}
        <div className="pos-exact-right-col">
          {/* Store User & Shift Card */}
          <div className="pos-exact-user-card">
            <div className="pos-exact-user-avatar">
              <FiUser />
            </div>
            <div className="pos-exact-user-info">
              <div className="pos-exact-user-name">
                {activeShift?.user?.name || 'Store Manager'}
              </div>
              <div
                className="pos-exact-user-shift"
                onClick={() => activeShift ? setShiftCloseModal(true) : setShiftModalOpen(true)}
                title="Click to manage shift"
              >
                <span className="pos-exact-shift-dot"></span>
                <span>{activeShift ? `Active Shift (#${activeShift.id})` : 'Start Shift'}</span>
              </div>
            </div>
          </div>

          {/* Actions: Hold Sale & Void Sale */}
          <div className="pos-exact-sidebar-actions">
            <button
              className="pos-exact-sidebar-btn pos-exact-sidebar-btn--hold"
              onClick={handleHoldCart}
              disabled={cart.length === 0}
            >
              <FiPauseCircle />
              <span>Hold Sale</span>
            </button>

            <button
              className="pos-exact-sidebar-btn pos-exact-sidebar-btn--void"
              onClick={handleNewBill}
            >
              <FiXCircle />
              <span>Void Sale</span>
            </button>
          </div>

          {/* Totals & Payment Section */}
          <div className="pos-exact-totals-box">
            <div className="pos-exact-summary-row">
              <span>Subtotal</span>
              <span className="pos-exact-summary-val">{formatCurrency(totals.subtotal)}</span>
            </div>

            <div className="pos-exact-summary-row">
              <span>Tax (8%)</span>
              <span className="pos-exact-summary-val">{formatCurrency(totals.totalTax)}</span>
            </div>

            {globalDiscount > 0 && (
              <div className="pos-exact-summary-row" style={{ color: '#ef4444' }}>
                <span>Global Discount</span>
                <span className="pos-exact-summary-val">−{formatCurrency(globalDiscount)}</span>
              </div>
            )}

            <div className="pos-exact-grand-total">
              <span className="pos-exact-gt-label">GRAND TOTAL</span>
              <span className="pos-exact-gt-val">{formatCurrency(totals.grandTotal)}</span>
            </div>

            <button
              className="pos-exact-pay-btn"
              onClick={() => setPaymentOpen(true)}
              disabled={cart.length === 0}
            >
              <FiCreditCard />
              <span>Pay Now</span>
            </button>
          </div>
        </div>
      </div>

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
        <div className="pos-exact-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setHoldDrawerOpen(false); }}>
          <div className="pos-exact-drawer">
            <div className="pos-exact-drawer-header">
              <h3>📋 Held Carts ({holdCarts.length})</h3>
              <button onClick={() => setHoldDrawerOpen(false)}>✕</button>
            </div>
            <div className="pos-exact-drawer-body">
              {holdCarts.length === 0 ? (
                <div className="pos-exact-empty-drawer">No held sales found</div>
              ) : (
                holdCarts.map((h) => {
                  const items = Array.isArray(h.cartData) ? h.cartData : [];
                  return (
                    <div key={h.id} className="pos-exact-held-item">
                      <div className="pos-exact-held-top">
                        <div>
                          <strong>{h.customerName || 'Walk-in Customer'}</strong>
                          <div>{h.holdNumber} · {items.length} items</div>
                        </div>
                        <div className="pos-exact-held-total">{formatCurrency(h.totalAmount || 0)}</div>
                      </div>
                      <div className="pos-exact-held-actions">
                        <button className="pos-exact-btn-primary" onClick={() => handleResumeCart(h.id)}>Resume</button>
                        <button className="pos-exact-btn-subtle" onClick={() => { cancelHoldCart(h.id); toast.success('Held cart cancelled'); }}>Cancel</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
