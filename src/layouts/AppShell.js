/* ===== APP SHELL — Root layout ===== */
import React, { useEffect, Suspense, lazy, useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../components/ui';
import { LoadingSpinner } from '../components/ui';
import useUIStore from '../store/uiStore';
import useAppStore from '../store/appStore';
import useSalesStore from '../store/salesStore';
import usePurchaseStore from '../store/purchaseStore';
import { useToast } from '../hooks/useToast';

import ProtectedRoute from '../components/shared/ProtectedRoute';
import RoleGuard from '../components/shared/RoleGuard';
import PermissionGuard from '../components/shared/PermissionGuard';
import useAuthStore from '../store/authStore';
import { useSettingsInit } from '../hooks/useSettingsInit';
import { hasPermission } from '../utils/permissions';

/* ── Lazy-loaded page components ── */
const Auth = lazy(() => import('../features/auth/Auth'));
const Dashboard = lazy(() => import('../features/dashboard/Dashboard'));
const SaleBills = lazy(() => import('../features/sales/SaleBills'));
const PurchaseBills = lazy(() => import('../features/purchase/PurchaseBills'));
const Products = lazy(() => import('../features/products/Products'));
const Offers = lazy(() => import('../features/promotions/Offers'));
const Categories = lazy(() => import('../features/categories/Categories'));
const Brands = lazy(() => import('../features/brands/Brands'));
const Customers = lazy(() => import('../features/customers/Customers'));
const Parties = lazy(() => import('../features/parties/Parties'));
const SalesReport = lazy(() => import('../features/reports/SalesReport'));
const PurchaseReport = lazy(() => import('../features/reports/PurchaseReport'));
const StockReport = lazy(() => import('../features/reports/StockReport'));
const PaymentIn = lazy(() => import('../features/payments/PaymentIn'));
const PaymentOut = lazy(() => import('../features/payments/PaymentOut'));
const ProductTable = lazy(() => import('../features/products/ProductTable'));
const Settings = lazy(() => import('../features/settings/Settings'));
const SaleBillForm = lazy(() => import('../features/sales/SaleBillForm'));
const PurchaseBillForm = lazy(
  () => import('../features/purchase/PurchaseBillForm')
);
const PurchaseReturns = lazy(() => import('../features/purchase/PurchaseReturns'));
const Company = lazy(() => import('../features/company/Company'));
const Financials = lazy(() => import('../features/financials/Financials'));
const UserManagement = lazy(
  () => import('../features/user-management/UserManagement')
);
const UsersReport = lazy(() => import('../features/reports/UsersReport'));
const Expenses = lazy(() => import('../features/reports/Expenses'));
const Analytics = lazy(() => import('../features/reports/Analytics'));
const Documents = lazy(() => import('../features/documents/Documents'));
const SalesB2CReturn = lazy(() => import('../features/documents/SalesB2CReturn'));
const ComplianceCenter = lazy(
  () => import('../features/compliance/ComplianceCenter')
);
const GSTR1Report = lazy(() => import('../features/reports/GSTR1Report'));
const GSTR2Report = lazy(() => import('../features/reports/GSTR2Report'));
const GSTR3BReport = lazy(() => import('../features/reports/GSTR3BReport'));
const MoreReports = lazy(() => import('../features/reports/MoreReports'));
const ReportsHub = lazy(() => import('../features/reports/ReportsHub'));
const InventoryHub = lazy(() => import('../features/inventory/InventoryHub'));
const AccountingHub = lazy(() => import('../features/financials/AccountingHub'));
const QuickSaleReview = lazy(() => import('../features/quick-sales/QuickSaleReview'));

const ShiftManagement = lazy(() => import('../features/pos/ShiftManagement'));
const RoleManagement = lazy(() => import('../features/roles/RoleManagement'));

function renderPage(page, searchParams, isAuthenticated) {
  if (page === 'sales' && searchParams.get('type') === 'B2C') {
    return (
      <ProtectedRoute>
        <SaleBillForm billingType="B2C" />
      </ProtectedRoute>
    );
  }

  if (page === 'documents' && searchParams.get('type') === 'SALES_RETURN') {
    return (
      <ProtectedRoute>
        <RoleGuard allowedRoles={['OWNER', 'STAFF', 'BILLER']}>
          <SalesB2CReturn searchParams={searchParams} />
        </RoleGuard>
      </ProtectedRoute>
    );
  }

  if (page.startsWith('sales/edit/')) {
    const id = page.split('/').pop();
    const isB2B = searchParams.get('type') === 'B2B';
    return (
      <ProtectedRoute>
        <SaleBillForm
          billingType={isB2B ? 'B2B' : 'B2C'}
          editMode={true}
          billId={id}
          onBack={() => {
            window.location.hash = 'sales';
          }}
          onSaved={() => {
            window.location.hash = 'sales';
          }}
        />
      </ProtectedRoute>
    );
  }
  if (page.startsWith('purchase/edit/')) {
    const id = page.split('/').pop();
    return (
      <ProtectedRoute>
        <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
          <PurchaseBillForm
            editMode={true}
            billId={id}
            onBack={() => {
              window.location.hash = 'purchases';
            }}
            onSaved={() => {
              window.location.hash = 'purchases';
            }}
          />
        </RoleGuard>
      </ProtectedRoute>
    );
  }

  switch (page) {
    case 'login':
      if (isAuthenticated) {
        window.location.hash = 'dashboard';
        return null;
      }
      return <Auth />;
    case 'dashboard':
      return (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
    case 'sales':
      return (
        <ProtectedRoute>
          <SaleBills searchParams={searchParams} />
        </ProtectedRoute>
      );
    case 'purchases':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <PurchaseBills />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'purchase-returns':
      return (
        <ProtectedRoute>
          <PermissionGuard page="purchase-returns">
            <PurchaseReturns />
          </PermissionGuard>
        </ProtectedRoute>
      );
    case 'quick-sales':
      return (
        <ProtectedRoute>
          <QuickSaleReview />
        </ProtectedRoute>
      );
    case 'products':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <Products />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'offers':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <Offers />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'inventory':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <InventoryHub />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'accounting':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <AccountingHub />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'categories':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <Categories />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'brands':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <Brands />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'customers':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <Customers />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'parties':
      return (
        <ProtectedRoute>
          <Parties />
        </ProtectedRoute>
      );
    case 'reports-hub':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <ReportsHub />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'user-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <UsersReport />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'sale-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <SalesReport />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'purchase-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <PurchaseReport />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'stock-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <StockReport />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'payment-in':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <PaymentIn />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'payment-out':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <PaymentOut />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'adjust-items':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <ProductTable />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'settings':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <Settings />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'company':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <Company />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'financials':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <Financials />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'user-management':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <UserManagement />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'roles':
      return (
        <ProtectedRoute>
          <RoleManagement />
        </ProtectedRoute>
      );
    case 'expenses':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <Expenses />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'analytics':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER']}>
            <Analytics />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'documents':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <Documents searchParams={searchParams} />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'compliance':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <ComplianceCenter />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'gstr1-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <GSTR1Report />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'gstr2-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <GSTR2Report />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'gstr3b-report':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <GSTR3BReport />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'more-reports':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <MoreReports />
          </RoleGuard>
        </ProtectedRoute>
      );
    case 'shift-management':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <ShiftManagement />
          </RoleGuard>
        </ProtectedRoute>
      );
    default:
      return (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
  }
}

/* More menu items for mobile */
const ALL_MORE_ITEMS = [
  { key: 'offers', label: 'Offers', permission: 'offers.promotions.view' },
  { key: 'categories', label: 'Categories', permission: 'categories.catalog.view' },
  { key: 'brands', label: 'Brands', permission: 'brands.catalog.view' },
  { key: 'customers', label: 'Customers', permission: 'customers.directory.view' },
  { key: 'parties', label: 'Parties', permission: 'parties.directory.view' },
  { key: 'documents', label: 'Documents', permission: 'documents.business.view' },
  { key: 'reports-hub', label: 'Reports', permission: 'reports.business.view' },
  { key: 'sale-report', label: 'Sales Report', permission: 'reports.business.view' },
  {
    key: 'purchase-report',
    label: 'Purchase Report',
    permission: 'reports.business.view',
  },
  { key: 'purchase-returns', label: 'Purchase Returns', permission: 'purchases.returns.view' },
  { key: 'stock-report', label: 'Stock Report', permission: 'reports.business.view' },
  { key: 'shift-management', label: 'Shift Management', permission: 'shifts.management.view' },
  { key: 'quick-sales', label: 'Quick Sale Review', permission: 'quick-sales.aliases.view' },
  { key: 'payment-in', label: 'Payment In', permission: 'payments.receipts.view' },
  {
    key: 'payment-out',
    label: 'Payment Out',
    permission: 'payments.receipts.view',
  },
  { key: 'settings', label: 'Settings', permission: 'settings.configuration.view' },
  { key: 'expenses', label: 'Expenses', permission: 'expenses.management.view' },
  { key: 'analytics', label: 'Analytics', permission: 'analytics.overview.view' },
  { key: 'roles', label: 'Roles', permission: 'roles.configuration.view' },
];

export function AppShell() {
  const { page, searchParams, setPage, setSearchParams } = useUIStore();
  const isPosBillingPage =
    (page === 'sales' && searchParams.get('type') === 'B2C') ||
    (page.startsWith('sales/edit/') && searchParams.get('type') !== 'B2B');
  const { loadAll, loading } = useAppStore();
  const loadSales = useSalesStore((s) => s.loadBills);
  const loadPurchase = usePurchaseStore((s) => s.loadBills);
  const toast = useToast();
  const [showMore, setShowMore] = useState(false);
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);
  const [permissionsRefreshed, setPermissionsRefreshed] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const refreshAccess = useAuthStore((state) => state.refreshAccess);
  const logout = useAuthStore((state) => state.logout);
  const permissionsLoaded = Array.isArray(user?.permissions);

  // ADD inside AppShell component
  const { isInitializing, initError } = useSettingsInit();

  useEffect(() => {
    if (!isAuthenticated) {
      setPermissionsRefreshed(false);
      return;
    }
    let active = true;
    setRefreshingPermissions(true);
    refreshAccess()
      .catch((error) => {
        console.error('Failed to refresh permissions:', error);
        logout();
      })
      .finally(() => {
        if (active) {
          setRefreshingPermissions(false);
          setPermissionsRefreshed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, refreshAccess, logout]);

  /* Global redirect to login if not authenticated */
  useEffect(() => {
    if (!isAuthenticated && page !== 'login') {
      window.location.hash = 'login';
    }
  }, [isAuthenticated, page]);

  /* Hash-based routing */
  useEffect(() => {
    function onHash() {
      const hash = window.location.hash.slice(1) || 'dashboard';
      const [path, query] = hash.split('?');
      const params = new URLSearchParams(query || '');

      if (isAuthenticated && permissionsLoaded && permissionsRefreshed && path === 'dashboard' && !hasPermission(user, 'dashboard.overview.view')) {
        const landingPage = [
          ['sales?type=B2C', 'pos.billing.access'],
          ['quick-sales', 'quick-sales.aliases.view'],
          ['sales', 'sales.invoices.view'],
          ['products', 'products.catalog.view'],
          ['purchases', 'purchases.invoices.view'],
          ['customers', 'customers.directory.view'],
        ].find(([, permission]) => hasPermission(user, permission))?.[0];
        if (landingPage) {
          window.location.hash = landingPage;
          return;
        }
      }

      setPage(path);
      setSearchParams(params);
    }
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [isAuthenticated, permissionsLoaded, permissionsRefreshed, user, setPage, setSearchParams]);

  /* Bootstrap data only when authenticated */
  useEffect(() => {
    if (isAuthenticated && permissionsLoaded && permissionsRefreshed) {
      loadAll();
      // Empty startDate/endDate here previously meant "no date filter" to
      // the backend, so this bootstrap fetch was silently loading ALL
      // sales/purchases instead of the current month — the polluted data
      // then sat in the shared store until something else overwrote it.
      const today = new Date();
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const currentMonthRange = {
        startDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
      if (user.permissions.includes('sales.invoices.view')) {
        loadSales('thisMonth', currentMonthRange);
      }
      if (user.permissions.includes('purchases.invoices.view')) {
        loadPurchase('thisMonth', currentMonthRange);
      }
    }
  }, [loadAll, loadSales, loadPurchase, isAuthenticated, permissionsLoaded, permissionsRefreshed, user]);


  if (refreshingPermissions || (isAuthenticated && (!permissionsLoaded || !permissionsRefreshed))) {
    return <LoadingSpinner message="Loading your permissions..." />;
  }

  if (isInitializing) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              height: '100dvh',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg)',
            }}
          >
            <LoadingSpinner message="Loading Thrive POS..." />
          </div>
        }
      >
        <Auth />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100dvh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'var(--primary)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 24,
              margin: '0 auto 16px',
            }}
          >
            {/* ⚡ */}
            <img
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              src="/logo01.png"
              alt="logo"
            />
          </div>
          <p
            style={{
              fontSize: 'var(--fs-lg)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Shree Kamachi Amman Store
          </p>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Loading your workspace…
          </p>
        </div>
      </div>
    );
  }

  const filteredMoreItems = ALL_MORE_ITEMS.filter((item) =>
    user?.permissions?.includes(item.permission)
  );

  return (
    <div className="app-shell">
      <ToastContainer toasts={toast.toasts} />
      <TopBar />

      <div className="app-body">
        {!isPosBillingPage && <Sidebar />}

        <main className="page-content">
          <div className="page-inner">
            <Suspense fallback={<LoadingSpinner message="Loading page…" />}>
              <PermissionGuard page={page} searchParams={searchParams}>
                {renderPage(page, searchParams, isAuthenticated)}
              </PermissionGuard>
            </Suspense>
          </div>
        </main>
      </div>

      <BottomNav onMoreClick={() => setShowMore((s) => !s)} />

      {/* Mobile More Menu */}
      {showMore && (
        <>
          <div
            style={{
              position: 'fixed',
              bottom: 'var(--bottomnav-height)',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              borderTop: '1px solid var(--border)',
              zIndex: 'var(--z-sidebar)',
              padding: 'var(--sp-3)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 'var(--sp-2)',
            }}
          >
            {filteredMoreItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  window.location.hash = item.key;
                  setShowMore(false);
                }}
                style={{
                  padding: 'var(--sp-3)',
                  borderRadius: 'var(--radius-md)',
                  background:
                    page === item.key
                      ? 'var(--primary-light)'
                      : 'var(--bg-hover)',
                  color:
                    page === item.key
                      ? 'var(--primary)'
                      : 'var(--text-primary)',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 'calc(var(--z-sidebar) - 1)',
            }}
            onClick={() => setShowMore(false)}
          />
        </>
      )}
    </div>
  );
}
