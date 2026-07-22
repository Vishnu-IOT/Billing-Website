/* ===== PARTY AGEING UTILITIES ===== */

/**
 * Compute ageing buckets from unpaid sales invoices.
 * Returns { current, days31to60, days60plus, totalDue, buckets }
 */
export function computeAgeingFromInvoices(invoices = [], asOfDate = new Date()) {
  const asOf = new Date(asOfDate);
  asOf.setHours(0, 0, 0, 0);

  let current = 0;
  let days31to60 = 0;
  let days60plus = 0;

  const unpaid = invoices.filter((inv) => {
    const status = String(inv.paymentStatus || '').toLowerCase();
    return status === 'unpaid' || status === 'partial';
  });

  unpaid.forEach((inv) => {
    const amount = parseFloat(inv.totalAmount || inv.total || 0);
    const dateStr = inv.saleDate || inv.purchaseDate || inv.date;
    if (!dateStr) return;

    const invDate = new Date(dateStr);
    invDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((asOf - invDate) / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) current += amount;
    else if (diffDays <= 60) days31to60 += amount;
    else days60plus += amount;
  });

  return {
    current,
    days31to60,
    days60plus,
    totalDue: current + days31to60 + days60plus,
    buckets: [
      { label: '0–30 days', amount: current, variant: 'success' },
      { label: '31–60 days', amount: days31to60, variant: 'warning' },
      { label: '60+ days', amount: days60plus, variant: 'danger' },
    ],
  };
}

export function mergeAgeingData(apiAgeing, computed) {
  if (apiAgeing && (apiAgeing.current != null || apiAgeing.totalDue != null)) {
    return {
      current: parseFloat(apiAgeing.current || 0),
      days31to60: parseFloat(apiAgeing.days31to60 || apiAgeing.days31_60 || 0),
      days60plus: parseFloat(apiAgeing.days60plus || apiAgeing.days60_plus || 0),
      totalDue: parseFloat(apiAgeing.totalDue || 0),
      buckets: [
        { label: '0–30 days', amount: parseFloat(apiAgeing.current || 0), variant: 'success' },
        {
          label: '31–60 days',
          amount: parseFloat(apiAgeing.days31to60 || apiAgeing.days31_60 || 0),
          variant: 'warning',
        },
        {
          label: '60+ days',
          amount: parseFloat(apiAgeing.days60plus || apiAgeing.days60_plus || 0),
          variant: 'danger',
        },
      ],
    };
  }
  return computed;
}
