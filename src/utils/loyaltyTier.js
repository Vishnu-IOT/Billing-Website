/* Loyalty tier thresholds — single source shared by Customers and POS */
export function loyaltyTier(points) {
  const p = Number(points) || 0;
  if (p >= 1000) return { label: 'Gold', variant: 'success' };
  if (p >= 300) return { label: 'Silver', variant: 'info' };
  return { label: 'Bronze', variant: 'neutral' };
}
