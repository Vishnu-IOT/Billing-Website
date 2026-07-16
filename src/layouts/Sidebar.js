/* ===== SIDEBAR — Desktop nav + Mobile drawer ===== */
import React, { useState } from 'react';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import { IoHome, IoReceiptOutline } from 'react-icons/io5';
import {
  FiBox,
  FiFileText,
  FiShoppingCart,
  FiTag,
  FiUsers,
  FiSettings,
  FiBriefcase,
  FiCreditCard,
  FiUserCheck,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';
import { TbReport, TbMoneybagMoveBack, TbMoneybagMove, TbMoneybag } from 'react-icons/tb';
import { RiAlignItemBottomLine } from 'react-icons/ri';
import { HiOutlineAdjustmentsVertical } from 'react-icons/hi2';

/* ── Centralized Role-Based Sidebar Menus ── */

const ownerSidebar = [
  { key: 'dashboard', icon: <IoHome />, label: 'Dashboard' },
  {
    key: 'sales',
    icon: <FiFileText />,
    label: 'Sales',
    // children: [
    //   {
    //     key: 'sales?type=B2B',
    //     icon: <IoReceiptOutline />,
    //     label: 'B2B Billing',
    //   },
    //   {
    //     key: 'sales?type=B2C',
    //     icon: <IoReceiptOutline />,
    //     label: 'POS Billing',
    //   },
    // ],
  },
  { key: 'purchases', icon: <FiShoppingCart />, label: 'Purchase' },
  // { key: 'sales?type=B2C', icon: <IoReceiptOutline />, label: 'POS Billing' },
  { key: 'products', icon: <FiBox />, label: 'Products' },
  { key: 'categories', icon: <FiTag />, label: 'Categories' },
  {
    key: 'reports',
    icon: <TbReport />,
    label: 'Reports',
    children: [
      { key: 'sale-report', label: 'Sales Report' },
      { key: 'purchase-report', label: 'Purchase Report' },
      { key: 'stock-report', label: 'Stock Report' },
      { key: 'user-report', label: 'User/Rep Report' },
    ],
  },
  { key: 'parties', icon: <FiUsers />, label: 'Parties' },
  {
    key: 'adjust-items',
    icon: <HiOutlineAdjustmentsVertical />,
    label: 'Adjust Items',
  },
  { key: 'payment-in', icon: <TbMoneybagMoveBack />, label: 'Payment Inn' },
  { key: 'payment-out', icon: <TbMoneybagMove />, label: 'Payment Out' },
  { key: 'company', icon: <FiBriefcase />, label: 'Company' },
  { key: 'financials', icon: <FiCreditCard />, label: 'Financial Details' },
  { key: 'user-management', icon: <FiCreditCard />, label: 'User Management' },
  {
    key: 'settings',
    icon: <FiSettings />,
    label: 'Settings',
  },
  // { key: 'expenses', icon: <TbMoneybag />, label: 'Expenses' },
  // { key: 'analytics', icon: <RiAlignItemBottomLine />, label: 'Analytics' },
];

const staffSidebar = [
  { key: 'dashboard', icon: <IoHome />, label: 'Dashboard' },
  { key: 'products', icon: <FiBox />, label: 'Products' },
  { key: 'categories', icon: <FiTag />, label: 'Categories' },
  { key: 'parties', icon: <FiUsers />, label: 'Parties' },
  { key: 'sales', icon: <FiFileText />, label: 'Sales' },
  {
    key: 'reports',
    icon: <TbReport />,
    label: 'Reports',
    children: [
      { key: 'sale-report', label: 'Sales Report' },
      { key: 'purchase-report', label: 'Purchase Report' },
      { key: 'stock-report', label: 'Stock Report' },
    ],
  },
];

const billerSidebar = [
  { key: 'dashboard', icon: <IoHome />, label: 'Dashboard' },
  { key: 'sales?type=B2C', icon: <IoReceiptOutline />, label: 'POS Billing' },
  { key: 'parties', icon: <FiUsers />, label: 'Parties' },
  { key: 'sales', icon: <FiFileText />, label: 'Sales' },
];

/* Helper to check if a sidebar item is active */
function checkActive(itemKey, currentPage, currentSearchParams) {
  if (!itemKey) return false;
  const [path, query] = itemKey.split('?');
  if (path !== currentPage) return false;
  if (!query) {
    return !currentSearchParams.get('type');
  }
  const itemParams = new URLSearchParams(query);
  for (const [k, v] of itemParams.entries()) {
    if (currentSearchParams.get(k) !== v) return false;
  }
  return true;
}

function NavItem({ item, activePage, searchParams, onNavigate }) {
  const [expanded, setExpanded] = useState(false);

  const isActive =
    checkActive(item.key, activePage, searchParams) ||
    (item.children &&
      item.children.some((c) => checkActive(c.key, activePage, searchParams)));

  if (item.children) {
    return (
      <>
        <button
          className={`sidebar__item ${isActive ? 'active' : ''}`}
          onClick={() => {
            setExpanded((e) => !e);
          }}
        >
          <span className="sidebar__icon">{item.icon}</span>
          <span className="sidebar__label">{item.label}</span>
          <span className={`sidebar__chevron ${expanded ? 'open' : ''}`}>
            ▼
          </span>
        </button>
        {expanded && (
          <div className="sidebar__submenu">
            {item.children.map((child) => (
              <button
                key={child.key}
                className={`sidebar__item ${checkActive(child.key, activePage, searchParams) ? 'active' : ''}`}
                onClick={() => onNavigate(child.key)}
              >
                <span className="sidebar__label">{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <button
      className={`sidebar__item ${isActive ? 'active' : ''}`}
      onClick={() => onNavigate(item.key)}
    >
      <span className="sidebar__icon">{item.icon}</span>
      <span className="sidebar__label">{item.label}</span>
    </button>
  );
}

export function Sidebar() {
  const { page, searchParams, closeSidebar, sidebarOpen } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'STAFF'; // default fallback

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const hideSidebar = useUIStore((s) => s.hideSidebar);

  if (hideSidebar) {
    return null;
  }

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  function navigate(key) {
    window.location.hash = key;
    closeSidebar();
  }

  // Select sidebar config dynamically based on user role
  let navItems = [];
  if (role === 'OWNER') navItems = ownerSidebar;
  else if (role === 'STAFF') navItems = staffSidebar;
  else if (role === 'BILLER') navItems = billerSidebar;
  else navItems = staffSidebar;

  return (
    <>
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
      >
        {/* Collapse toggle button on Desktop (hidden on mobile) */}
        <div className="sidebar__desktop-toggle-container">
          <button
            className="sidebar__collapse-btn"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
          </button>
        </div>

        <div className="sidebar__section-label">
          {collapsed ? 'Menu' : 'Main Menu'}
        </div>
        {navItems.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            activePage={page}
            searchParams={searchParams}
            onNavigate={navigate}
          />
        ))}
      </aside>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />
    </>
  );
}
