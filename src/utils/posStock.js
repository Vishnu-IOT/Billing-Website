import {
  formatQuantity,
  getProductBaseUnit,
  isWeightProduct,
  normalizeWeightQuantity,
} from "./quantityUnits";

export function getProductStockInBaseUnit(product) {
  const rawStock = product?.stockQuantity;
  if (rawStock === undefined || rawStock === null || rawStock === "") {
    return null;
  }

  const stock = Number(rawStock);
  if (!Number.isFinite(stock)) return null;

  return isWeightProduct(product)
    ? normalizeWeightQuantity(stock, product.stockUnit || product.baseUnit || "KG")
    : stock;
}

export function getProductStockLabel(product) {
  const stock = product?.stockQuantity;
  if (stock === undefined || stock === null || stock === "") return null;

  const unit = product.stockUnit || getProductBaseUnit(product);
  return `${formatQuantity(stock)} ${unit}`;
}

export function getQuantityInProductBaseUnit(quantity, unit, product) {
  const amount = Number(quantity);
  if (!Number.isFinite(amount)) return 0;
  return isWeightProduct(product)
    ? normalizeWeightQuantity(amount, unit || "KG")
    : amount;
}

export function getRemainingProductStock(
  cart,
  productId,
  product,
  excludedCartLineId,
) {
  const stock = getProductStockInBaseUnit(product);
  if (stock === null) return null;

  const inCart = (cart || []).reduce((total, item) => {
    if (String(item.productId) !== String(productId)) return total;
    if (
      excludedCartLineId &&
      String(item.cartLineId || item.productId) === String(excludedCartLineId)
    ) {
      return total;
    }

    return (
      total +
      getQuantityInProductBaseUnit(
        item.quantity,
        item.quantityUnit || "KG",
        product,
      )
    );
  }, 0);

  return stock - inCart;
}
