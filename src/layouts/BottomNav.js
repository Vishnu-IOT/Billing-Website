/* ===== BOTTOM NAV — Mobile only ===== */
import React from 'react';
import { IoHome, IoReceiptOutline } from 'react-icons/io5';
import { FiBox, FiFileText, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { FiMoreHorizontal } from 'react-icons/fi';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import { hasPermission } from '../utils/permissions';

const NAV_ITEMS = [
  { key: 'dashboard', icon: <IoHome />, label: 'Home', permission: 'dashboard.overview.view' },
  { key: 'sales?type=B2C', icon: <IoReceiptOutline />, label: 'POS Billing', permission: 'pos.billing.access' },
  { key: 'products', icon: <FiBox />, label: 'Products', permission: 'products.catalog.view' },
  { key: 'sales', icon: <FiFileText />, label: 'Sales', permission: 'sales.invoices.view' },
  { key: 'purchases', icon: <FiShoppingCart />, label: 'Purchase', permission: 'purchases.invoices.view' },
  { key: 'customers', icon: <FiUsers />, label: 'Customers', permission: 'customers.directory.view' },
];

export function BottomNav({ onMoreClick }) {
  const page = useUIStore((s) => s.page);
  const user = useAuthStore((s) => s.user);

  function navigate(key) { 
    window.location.hash = key; 
  }

  const items = NAV_ITEMS.filter((item) => hasPermission(user, item.permission));
  if ((user?.permissions?.length || 0) > 1) {
    items.push({ key: 'more', icon: <FiMoreHorizontal />, label: 'More' });
  }

  return (
    <nav className="bottom-nav">
      {items.map((item) =>
        item.key === 'more' ? (
          <button key="more" className="bottom-nav__item" onClick={onMoreClick}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ) : (
          <button
            key={item.key}
            className={`bottom-nav__item ${page === item.key.split('?')[0] ? 'active' : ''}`}
            onClick={() => navigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </nav>
  );
}
