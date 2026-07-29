/* ===== AUDIT LOGS TAB ===== */
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAuditLogsAPI } from '../../../api/audit';
import { formatDate } from '../../../utils/date';
import { Badge } from '../../../components/ui';

const MODULE_COLORS = {
  SALES: { bg: 'var(--success-light)', color: 'var(--success)' },
  POS: { bg: '#e0f2fe', color: '#0369a1' },
  INVENTORY: { bg: '#fef3c7', color: '#92400e' },
  ACCOUNTING: { bg: '#ede9fe', color: '#6d28d9' },
  PURCHASE: { bg: '#fce7f3', color: '#9d174d' },
  DOCUMENTS: { bg: '#d1fae5', color: '#065f46' },
  PRODUCTS: { bg: '#dbeafe', color: '#1d4ed8' },
  DEFAULT: { bg: 'var(--bg-page)', color: 'var(--text-secondary)' },
};

const ACTION_ICONS = {
  CREATE: '✅',
  UPDATE: '✏️',
  DELETE: '🗑',
  LOGIN: '🔐',
  LOGOUT: '🚪',
  CLOSE_SHIFT: '🔒',
  OPEN_SHIFT: '🔓',
  CONVERT: '🔄',
  DEFAULT: '📋',
};

function getActionIcon(action = '') {
  const key = Object.keys(ACTION_ICONS).find((k) => action.includes(k));
  return ACTION_ICONS[key] || ACTION_ICONS.DEFAULT;
}

function getModuleStyle(module = '') {
  return MODULE_COLORS[module.toUpperCase()] || MODULE_COLORS.DEFAULT;
}

const MODULES = ['ALL', 'SALES', 'POS', 'INVENTORY', 'ACCOUNTING', 'PURCHASE', 'DOCUMENTS', 'PRODUCTS'];

export default function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterModule, setFilterModule] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const data = await fetchAuditLogsAPI({ limit: 200 });
    setLogs(data);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const modMatch = filterModule === 'ALL' || l.module === filterModule;
      const q = search.toLowerCase();
      const searchMatch =
        !q ||
        l.action?.toLowerCase().includes(q) ||
        l.module?.toLowerCase().includes(q) ||
        l.User?.name?.toLowerCase().includes(q) ||
        l.User?.email?.toLowerCase().includes(q) ||
        l.ipAddress?.includes(q);
      return modMatch && searchMatch;
    });
  }, [logs, filterModule, search]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 4 }}>
          🛡️ System Audit Logs
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          Track all user actions, data changes, and system events for compliance and security.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Module Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MODULES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterModule(m)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 99,
                border: '1px solid',
                borderColor: filterModule === m ? 'var(--primary)' : 'var(--border)',
                background: filterModule === m ? 'var(--primary)' : 'transparent',
                color: filterModule === m ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          className="form-input"
          style={{ maxWidth: 220, marginLeft: 'auto' }}
          placeholder="Search action, user, IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Refresh */}
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          {loading ? '⏳ Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {/* Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Total Events', value: logs.length, icon: '📋' },
          {
            label: 'Today',
            value: logs.filter((l) => {
              const d = new Date(l.createdAt);
              const now = new Date();
              return (
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            }).length,
            icon: '📅',
          },
          {
            label: 'Delete Actions',
            value: logs.filter((l) => l.action?.includes('DELETE')).length,
            icon: '🗑',
          },
          {
            label: 'Unique Users',
            value: new Set(logs.map((l) => l.userId).filter(Boolean)).size,
            icon: '👥',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-xl)' }}>{stat.value}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Audit Log Table */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading audit logs…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
            <p>No audit logs found for this filter.</p>
          </div>
        ) : (
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Module</th>
                <th>Action</th>
                <th>Target ID</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const modStyle = getModuleStyle(log.module);
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td>
                      {log.User ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                            {log.User.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {log.User.email}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>System</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 10px',
                          borderRadius: 99,
                          background: modStyle.bg,
                          color: modStyle.color,
                          fontWeight: 700,
                          letterSpacing: '0.3px',
                        }}
                      >
                        {log.module}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{getActionIcon(log.action)}</span>
                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', fontFamily: 'monospace' }}>
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                      {log.targetId || '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
        Showing {filtered.length} of {logs.length} total audit events
      </p>
    </div>
  );
}
