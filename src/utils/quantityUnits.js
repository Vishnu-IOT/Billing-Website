export function isWeightProduct(product) {
  return String(
    product?.unitType || product?.Product?.unitType || product?.product?.unitType || ''
  ).toUpperCase() === 'WEIGHT';
}

export function getProductBaseUnit(product) {
  return isWeightProduct(product) ? 'KG' : 'PCS';
}

export function normalizeWeightQuantity(quantity, quantityUnit = 'KG') {
  const amount = Number(quantity);
  if (!Number.isFinite(amount)) return 0;
  return String(quantityUnit).toUpperCase() === 'GRAM'
    ? amount / 1000
    : amount;
}

export function formatQuantity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  return number.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function getReadableQuantity(item) {
  const quantity = formatQuantity(
    item?.enteredQuantity ?? item?.quantity
  );
  const unit = String(
    item?.enteredQuantityUnit ||
      item?.quantityUnit ||
      (isWeightProduct(item) ? 'KG' : item?.baseUnit || item?.Product?.baseUnit || '')
  ).toUpperCase();
  if (unit === 'GRAM') return `${quantity}g`;
  if (unit === 'KG') return `${quantity}kg`;
  if (unit === 'PCS' || item?.unitType === 'PIECE') return `${quantity}`;
  return quantity;
}
