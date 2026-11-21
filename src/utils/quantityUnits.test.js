import { calcItemRow } from "./invoice";

describe("weight-based invoice quantities", () => {
  test.each([
    [250, "GRAM", 40, 10],
    [500, "GRAM", 30, 15],
    [1.25, "KG", 40, 50],
  ])(
    "calculates %s %s at the configured per-KG rate",
    (quantity, quantityUnit, price, expectedTotal) => {
      const item = calcItemRow({
        unitType: "WEIGHT",
        quantity,
        quantityUnit,
        price,
        priceType: "WITHOUT_GST",
        taxRate: 0,
      });

      expect(item.total).toBe(expectedTotal);
    },
  );

  test("keeps piece quantity calculations unchanged", () => {
    const item = calcItemRow({
      unitType: "PIECE",
      quantity: 5,
      price: 40,
      priceType: "WITHOUT_GST",
      taxRate: 0,
    });

    expect(item.total).toBe(200);
  });

  test("applies the product discount to a weight-based line", () => {
    const item = calcItemRow({
      unitType: "WEIGHT",
      quantity: 250,
      quantityUnit: "GRAM",
      price: 40,
      discountPercent: 10,
      priceType: "WITHOUT_GST",
      taxRate: 0,
    });

    expect(item.discountAmount).toBe(1);
    expect(item.total).toBe(9);
  });
});
