import React, { useState, useMemo } from 'react';

export function ProductSelector({ products, value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selected = products.find(
    (p) => String(p.id || p._id) === String(value)
  );

  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 20);

    const q = search.toLowerCase();

    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [products, search]);

  function select(product) {
    onChange(String(product.id || product._id), product);
    setOpen(false);
    setSearch('');
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="invoice-select"
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected ? selected.name : 'Select Product...'}</span>

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
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(0,0,0,.12)',
          }}
        >
          <div style={{ padding: 8 }}>
            <input
              autoFocus
              className="invoice-input"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div
            style={{
              maxHeight: 250,
              overflowY: 'auto',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: 12 }}>No products found</div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id || p._id}
                  onClick={() => select(p)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <div>{p.name}</div>

                  {p.salePrice && <small>₹{p.salePrice}</small>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
          }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
