/* ===== Item table column config — B2B bill template ===== */
// Canonical list of columns the item table can show. `key` must never change
// once shipped (it's the persisted identifier) — only label/defaults can change.

export const DEFAULT_ITEM_COLUMNS = [
  { key: 'sn', label: 'S.N.', enabled: true, order: 0, width: 6 },
  { key: 'description', label: 'Description', enabled: true, order: 1, width: 32 },
  { key: 'hsn', label: 'HSN/SAC', enabled: true, order: 2, width: 10 },
  { key: 'quantity', label: 'Qty', enabled: true, order: 3, width: 8 },
  { key: 'unit', label: 'Unit', enabled: true, order: 4, width: 8 },
  { key: 'rate', label: 'Unit Price', enabled: true, order: 5, width: 12 },
  { key: 'discount', label: 'Discount', enabled: false, order: 6, width: 10 },
  { key: 'tax', label: 'Tax %', enabled: false, order: 7, width: 8 },
  { key: 'amount', label: 'Total Amount', enabled: true, order: 8, width: 14 },
];

// Merge a saved (possibly older/partial) column config with the current
// defaults — so a newly-added column (like a future "Batch No.") shows up
// with its default state instead of silently vanishing for existing users,
// and a column that was removed from the app doesn't linger in old configs.
export function mergeItemColumns(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_ITEM_COLUMNS;

  const savedByKey = Object.fromEntries(saved.map((c) => [c.key, c]));
  return DEFAULT_ITEM_COLUMNS.map((def) => {
    const s = savedByKey[def.key];
    return s ? { ...def, ...s, key: def.key, label: def.label } : def;
  }).sort((a, b) => a.order - b.order);
}

export function getEnabledColumns(columns) {
  return [...columns].filter((c) => c.enabled).sort((a, b) => a.order - b.order);
}

// Renders a single cell's value for a given column key from a normalized item
export function renderColumnValue(col, item, index) {
  switch (col.key) {
    case 'sn':
      return index + 1;
    case 'description':
      return item.name;
    case 'hsn':
      return item.hsn || '-';
    case 'quantity':
      return item.quantity;
    case 'unit':
      return item.unit || 'Unit';
    case 'rate':
      return `₹ ${Number(item.rate || 0).toFixed(2)}`;
    case 'discount':
      return item.discount ? `${item.discount}%` : '-';
    case 'tax':
      return item.taxRate ? `${item.taxRate}%` : '-';
    case 'amount':
      return `₹ ${(Number(item.quantity || 0) * Number(item.rate || 0)).toFixed(2)}`;
    default:
      return '';
  }
}
