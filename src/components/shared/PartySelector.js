/* ===== PartySelector — Shared searchable party selector ===== */
import React, { useState, useMemo } from 'react';
import useAppStore from '../../store/appStore';

export function PartySelector({ value, onChange }) {
  const parties = useAppStore((s) => s.parties);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selected = parties.find((p) => String(p.id || p._id) === String(value));

  const filtered = useMemo(() => {
    if (!search) return parties.slice(0, 12);
    const q = search.toLowerCase();
    return parties
      .filter((p) => p.name?.toLowerCase().includes(q) || p.phone?.includes(q))
      .slice(0, 12);
  }, [parties, search]);

  function select(party) {
    onChange(String(party.id || party._id), party);
    setOpen(false);
    setSearch('');
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="form-input"
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          style={{
            color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {selected ? selected.name : 'Select party…'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <input
              autoFocus
              className="form-input"
              style={{ height: 32 }}
              placeholder="Search party by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-muted)',
                }}
              >
                No parties found
              </div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id || p._id}
                  onClick={() => select(p)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--bg-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  {p.phone && (
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 'var(--fs-xs)',
                      }}
                    >
                      {p.phone}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
