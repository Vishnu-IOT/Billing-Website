/* ===== SHARED UI COMPONENTS ===== */
import React from 'react';

/* ── Button ── */
export function Button({
  variant = 'secondary',
  size = '',
  icon,
  loading,
  children,
  className = '',
  ...props
}) {
  const cls = [
    'btn',
    `btn--${variant}`,
    size ? `btn--${size}` : '',
    loading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}

/* ── Badge ── */
export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`badge badge--${variant} ${className}`}>{children}</span>
  );
}

export function PaymentBadge({ status }) {
  const map = {
    paid: 'paid',
    Paid: 'paid',
    unpaid: 'unpaid',
    Unpaid: 'unpaid',
    partial: 'partial',
    Partial: 'partial',
  };
  const v = map[status] || 'neutral';
  return <Badge variant={v}>{status}</Badge>;
}

/* ── Modal ── */
export function Modal({ open, onClose, title, size = '', children, footer }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`modal ${size ? `modal--${size}` : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  loading,
  icon = '🗑️',
}) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal modal--sm modal--confirm">
        <div className="modal__body">
          <div className="modal__icon" style={{ textAlign: 'center' }}>
            {icon || '🗑️'}
          </div>
          <h3>{title}</h3>
          <p>{message || 'This action cannot be undone.'}</p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Pagination ── */
export function Pagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
}) {
  if (totalPages <= 1 && total === 0) return null;
  const pages = [];
  const delta = 1;
  for (
    let i = Math.max(1, page - delta);
    i <= Math.min(totalPages, page + delta);
    i++
  )
    pages.push(i);
  return (
    <div className="pagination">
      <span className="pagination__info">
        Showing {from}–{to} of {total}
      </span>
      <div className="pagination__controls">
        <button
          className="page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          ‹
        </button>
        {pages[0] > 1 && (
          <>
            <button className="page-btn" onClick={() => onPageChange(1)}>
              1
            </button>
            {pages[0] > 2 && <span className="page-btn">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            className={`page-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            <span className="page-btn">…</span>
            <button
              className="page-btn"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          className="page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </button>
      </div>
    </div>
  );
}

/* ── SearchBar ── */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) {
  return (
    <div className={`search-bar ${className}`}>
      <span className="search-bar__icon">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ── StatCard ── */
export function StatCard({ label, value, sub, icon, color = 'blue' }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className={`stat-card__icon stat-card__icon--${color}`}>
          {icon}
        </div>
      )}
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {sub && <div className="stat-card__sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── EmptyState ── */
export function EmptyState({
  icon = '📋',
  title = 'No data yet',
  description,
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/* ── Toast Container ── */
export function ToastContainer({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type !== 'default' ? `toast--${t.type}` : ''}`}
        >
          {t.type === 'success' && '✓ '}
          {t.type === 'error' && '✕ '}
          {t.type === 'warning' && '⚠ '}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── LoadingSpinner ── */
export function LoadingSpinner({ size = 40, message }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {message && (
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          {message}
        </p>
      )}
    </div>
  );
}

/* ── ActionMenu ── */
export function ActionMenu({ items, trigger }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="action-menu-wrapper" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="action-menu">
          {items.map((item, i) => (
            <button
              key={i}
              className={`action-menu-item ${item.danger ? 'action-menu-item--danger' : ''}`}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
