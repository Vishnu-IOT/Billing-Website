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
import useAuthStore from '../store/authStore';

/* ── Lazy-loaded page components ── */
const Auth = lazy(() => import('../features/auth/Auth'));
const Dashboard = lazy(() => import('../features/dashboard/Dashboard'));
const SaleBills = lazy(() => import('../features/sales/SaleBills'));
const PurchaseBills = lazy(() => import('../features/purchase/PurchaseBills'));
const Products = lazy(() => import('../features/products/Products'));
const Categories = lazy(() => import('../features/categories/Categories'));
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
const Company = lazy(() => import('../features/company/Company'));
const Financials = lazy(() => import('../features/financials/Financials'));
const UserManagement = lazy(
  () => import('../features/user-management/UserManagement')
);
const UsersReport = lazy(() => import('../features/reports/UsersReport'));
const Expenses = lazy(() => import('../features/reports/Expenses'));
const Analytics = lazy(() => import('../features/reports/Analytics'));

function renderPage(page, searchParams, isAuthenticated) {
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
    case 'products':
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['OWNER', 'STAFF']}>
            <Products />
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
    case 'parties':
      return (
        <ProtectedRoute>
          <Parties />
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
    default:
      return (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
  }
}

/* More menu items for mobile with role restrictions */
const ALL_MORE_ITEMS = [
  { key: 'categories', label: 'Categories', allowed: ['OWNER', 'STAFF'] },
  { key: 'parties', label: 'Parties', allowed: ['OWNER', 'STAFF', 'BILLER'] },
  { key: 'sale-report', label: 'Sales Report', allowed: ['OWNER', 'STAFF'] },
  {
    key: 'purchase-report',
    label: 'Purchase Report',
    allowed: ['OWNER', 'STAFF'],
  },
  { key: 'stock-report', label: 'Stock Report', allowed: ['OWNER', 'STAFF'] },
  { key: 'payment-in', label: 'Payment In', allowed: ['OWNER', 'STAFF'] },
  {
    key: 'payment-out',
    label: 'Payment Out',
    allowed: ['OWNER', 'STAFF'],
  },
  { key: 'settings', label: 'Settings', allowed: ['OWNER'] },
  { key: 'expenses', label: 'Expenses', allowed: ['OWNER'] },
  { key: 'analytics', label: 'Analytics', allowed: ['OWNER'] },
];

export function AppShell() {
  const { page, searchParams, setPage, setSearchParams } = useUIStore();
  const { loadAll, loading } = useAppStore();
  const loadSales = useSalesStore((s) => s.loadBills);
  const loadPurchase = usePurchaseStore((s) => s.loadBills);
  const toast = useToast();
  const [showMore, setShowMore] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const role = user?.role || 'STAFF';

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
      setPage(path);
      setSearchParams(new URLSearchParams(query || ''));
    }
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setPage, setSearchParams]);

  /* Bootstrap data only when authenticated */
  useEffect(() => {
    if (isAuthenticated) {
      loadAll();
      loadSales('thisMonth', { startDate: '', endDate: '' });
      loadPurchase('thisMonth', { startDate: '', endDate: '' });
    }
  }, [loadAll, loadSales, loadPurchase, isAuthenticated]);

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
            NithiX
          </p>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Loading your workspace…
          </p>
        </div>
      </div>
    );
  }

  const filteredMoreItems = ALL_MORE_ITEMS.filter((item) =>
    item.allowed.includes(role)
  );

  return (
    <div className="app-shell">
      <ToastContainer toasts={toast.toasts} />
      <TopBar />

      <div className="app-body">
        <Sidebar />

        <main className="page-content">
          <div className="page-inner">
            <Suspense fallback={<LoadingSpinner message="Loading page…" />}>
              {renderPage(page, searchParams, isAuthenticated)}
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
