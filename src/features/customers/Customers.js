/* ===== CUSTOMERS ===== */
import React, { useState, useMemo } from 'react';
import useAppStore from '../../store/appStore';
import { Badge, Button, EmptyState } from '../../components/ui';
import { FiGift } from 'react-icons/fi';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import LoyaltyRedemptionModal from './LoyaltyRedemptionModal';
import { loyaltyTier } from '../../utils/loyaltyTier';


export default function Customers() {
  const customers = useAppStore((s) => s.customers);
  const updateCustomerLoyaltyPoints = useAppStore(
    (s) => s.updateCustomerLoyaltyPoints
  );
  const [search, setSearch] = useState('');
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Sort highest loyalty points first — most useful default for a rewards-facing list
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (Number(b.loyalty_points) || 0) - (Number(a.loyalty_points) || 0)),
    [filtered]
  );

  const { visible, hasMore, sentinelRef, containerRef, total, shown } = useInfiniteScroll(sorted, 30);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <LoyaltyRedemptionModal
        open={!!loyaltyCustomer}
        customer={loyaltyCustomer}
        onClose={() => setLoyaltyCustomer(null)}
        onBalanceChange={updateCustomerLoyaltyPoints}
      />
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header__left">
          <h1>Customers</h1>
          <p className="page-header__sub">
            All registered customers and their loyalty points balance
          </p>
        </div>
      </div>

      <div className="search-bar" style={{ maxWidth: 360 }}>
        <span className="search-bar__icon">🔍</span>
        <input
          className="form-input"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No customers yet"
          description="Customers added through POS or billing will show up here"
        />
      ) : (
        <div
          className="table-wrapper"
          ref={containerRef}
          style={{ maxHeight: '65vh', overflowY: 'auto' }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Loyalty Points</th>
                <th>Tier</th>
                <th>Rewards</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const tier = loyaltyTier(c.loyalty_points);
                return (
                  <tr key={c.id || c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td style={{ fontWeight: 700 }}>{Number(c.loyalty_points) || 0}</td>
                    <td>
                      <Badge variant={tier.variant}>{tier.label}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiGift />}
                        onClick={() => setLoyaltyCustomer(c)}
                      >
                        Rewards
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            ref={sentinelRef}
            style={{
              textAlign: 'center',
              padding: '20px',
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
            }}
          >
            {hasMore
              ? `Showing ${shown} of ${total} — scroll for more…`
              : total > 0
                ? `Showing all ${total} customers`
                : null}
          </div>
        </div>
      )}
    </div>
  );
}
