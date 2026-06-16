/* ===== BOTTOM NAV — Mobile only ===== */
import React from 'react';
import { IoHome, IoReceiptOutline } from 'react-icons/io5';
import { FiBox, FiFileText, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { FiMoreHorizontal } from 'react-icons/fi';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';

const OWNER_STAFF_NAV = [
  { key: 'dashboard', icon: <IoHome />,          label: 'Home' },
  { key: 'products',  icon: <FiBox />,            label: 'Products' },
  { key: 'sales',     icon: <FiFileText />,       label: 'Sales' },
  { key: 'purchases', icon: <FiShoppingCart />,   label: 'Purchase' },
  { key: 'more',      icon: <FiMoreHorizontal />, label: 'More' },
];

const BILLER_NAV = [
  { key: 'dashboard',     icon: <IoHome />,           label: 'Home' },
  { key: 'sales?type=B2C', icon: <IoReceiptOutline />, label: 'POS Billing' },
  { key: 'customers',     icon: <FiUsers />,          label: 'Customers' },
  { key: 'sales',         icon: <FiFileText />,       label: 'Sales' },
];

export function BottomNav({ onMoreClick }) {
  const page = useUIStore((s) => s.page);
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'STAFF';

  function navigate(key) { 
    window.location.hash = key; 
  }

  const items = role === 'BILLER' ? BILLER_NAV : OWNER_STAFF_NAV;

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
