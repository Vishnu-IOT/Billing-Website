export function normalizeProductSearchTokens(search) {
  return String(search ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchesProductSearch(product, search, additionalFields = []) {
  const tokens = normalizeProductSearchTokens(search);
  if (tokens.length === 0) return true;

  const searchableFields = [
    product?.name,
    product?.sku,
    product?.SKU,
    product?.barcode,
    product?.HSNCode,
    product?.hsnCode,
    product?.brandName,
    typeof product?.brand === 'string' ? product.brand : product?.brand?.name,
    product?.categoryName,
    typeof product?.category === 'string'
      ? product.category
      : product?.category?.category || product?.category?.name,
    product?.packSize,
    product?.packageSize,
    product?.size,
    product?.variantName,
    product?.unit,
    product?.baseUnit,
    product?.unitType,
    ...additionalFields,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).toLowerCase());

  return tokens.every((token) =>
    searchableFields.some((field) => field.includes(token)),
  );
}
