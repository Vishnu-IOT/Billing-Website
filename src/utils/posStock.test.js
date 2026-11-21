import {
  getProductStockInBaseUnit,
  getProductStockLabel,
  getRemainingProductStock,
} from "./posStock";

describe("POS product-level stock checks", () => {
  test("uses the combined product stock rather than a single cart allocation", () => {
    const product = { id: "p1", stockQuantity: 10, unitType: "PIECE" };
    const cart = [
      {
        productId: "p1",
        cartLineId: "line-1",
        quantity: 3,
        batchAvailableQuantity: 1,
      },
      { productId: "p1", cartLineId: "line-2", quantity: 2 },
      { productId: "p2", cartLineId: "line-3", quantity: 4 },
    ];

    expect(getRemainingProductStock(cart, "p1", product)).toBe(5);
    expect(getRemainingProductStock(cart, "p1", product, "line-1")).toBe(8);
  });

  test("normalizes weight stock and cart quantities to kilograms", () => {
    const product = {
      id: "p2",
      stockQuantity: 2500,
      stockUnit: "GRAM",
      unitType: "WEIGHT",
    };
    const cart = [
      { productId: "p2", cartLineId: "line-1", quantity: 1, quantityUnit: "KG" },
      { productId: "p2", cartLineId: "line-2", quantity: 250, quantityUnit: "GRAM" },
    ];

    expect(getProductStockInBaseUnit(product)).toBe(2.5);
    expect(getRemainingProductStock(cart, "p2", product)).toBe(1.25);
  });

  test("does not enforce a limit when product stock is not provided", () => {
    expect(getProductStockInBaseUnit({ id: "p3" })).toBeNull();
    expect(getProductStockLabel({ id: "p3" })).toBeNull();
    expect(getRemainingProductStock([], "p3", { id: "p3" })).toBeNull();
  });

  test("labels the product's total stock without using batch quantities", () => {
    expect(
      getProductStockLabel({
        id: "p4",
        stockQuantity: 12,
        stockUnit: "PCS",
        batches: [{ availableQuantity: 1 }],
      }),
    ).toBe("12 PCS");
  });
});
