/* ===== TOP BAR ===== */
import React from 'react';
import { IoReceiptOutline } from 'react-icons/io5';
import { FiSettings, FiLogOut } from 'react-icons/fi';
import useUIStore from '../store/uiStore';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';

export function TopBar() {
  const { toggleSidebar } = useUIStore();
  const settings = useAppStore((s) => s.settings);
  const { user, logout } = useAuthStore();

  function navigate(page) {
    window.location.hash = page;
  }

  const getRoleBadgeStyles = (role) => {
    switch (String(role).toUpperCase()) {
      case 'OWNER':
        return {
          background: 'rgba(37, 99, 235, 0.15)',
          color: 'var(--primary)',
        };
      case 'STAFF':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          color: 'rgb(16, 185, 129)',
        };
      case 'BILLER':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: 'rgb(245, 158, 11)',
        };
      default:
        return {
          background: 'var(--bg-hover)',
          color: 'var(--text-secondary)',
        };
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <button
          className="topbar__hamburger"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        {/* <div className="topbar__logo"><IoReceiptOutline /></div> */}
        <div className="topbar__logo">
          <img
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            src="/logo01.png"
            alt="logo"
          />
        </div>
        <span className="topbar__app-name">NithiX</span>
      </div>

      <div className="topbar__actions">
        {user && (
          <div
            className="topbar__user-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginRight: '8px',
            }}
          >
            <span
              className="topbar__user-name"
              style={{
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {user.name}
            </span>
            <span
              className="role-badge"
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 700,
                ...getRoleBadgeStyles(user.role),
              }}
            >
              {user.role}
            </span>
          </div>
        )}

        {user?.role === 'OWNER' && (
          <button
            className="topbar__icon-btn"
            onClick={() => navigate('settings')}
            title="Settings"
          >
            <FiSettings />
          </button>
        )}

        <button
          className="topbar__logout-btn"
          onClick={logout}
          title="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 'var(--fs-xs)',
            cursor: 'pointer',
            transition: 'all var(--tr-fast)',
            marginLeft: '8px',
          }}
        >
          <FiLogOut />
          <span style={{ display: 'inline' }}>Logout</span>
        </button>
      </div>
    </header>
  );
}
