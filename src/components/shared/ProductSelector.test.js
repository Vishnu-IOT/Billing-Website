import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductSelector } from "./ProductSelector";

const products = [{ id: 1, name: "Tea", code: "TEA-01" }];

describe("ProductSelector barcode search", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("looks up scanned text on Enter and reports the matched product", async () => {
    const onBarcodeScan = jest.fn().mockResolvedValue({
      product: { name: "Tea" },
    });

    render(
      <ProductSelector
        products={products}
        value=""
        onChange={jest.fn()}
        onBarcodeScan={onBarcodeScan}
      />,
    );

    const search = screen.getByRole("combobox", {
      name: "Search product or scan barcode",
    });
    fireEvent.change(search, { target: { value: "123456789" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(onBarcodeScan).toHaveBeenCalledTimes(1);
      expect(onBarcodeScan).toHaveBeenCalledWith("123456789");
      expect(screen.getByRole("status").textContent).toContain(
        "Tea added to purchase items",
      );
    });
  });

  test("keeps manual product selection available", () => {
    const onChange = jest.fn();
    render(
      <ProductSelector
        products={products}
        value=""
        onChange={onChange}
        onBarcodeScan={jest.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", {
        name: "Search product or scan barcode",
      }),
    );
    fireEvent.click(screen.getByText("Tea"));

    expect(onChange).toHaveBeenCalledWith("1", products[0]);
  });

  test("finds products by multiple partial name tokens in any order", () => {
    const detergent = {
      id: 2,
      name: "SurfXL Washing Powder 500g",
      sku: "SURF-500",
    };
    render(
      <ProductSelector
        products={[detergent]}
        value=""
        onChange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Select Product..."));
    fireEvent.change(screen.getByRole("combobox", { name: "Search product" }), {
      target: { value: "powder sur 500" },
    });

    expect(screen.getByText(detergent.name)).toBeTruthy();
  });

  test("matches brand and category names supplied by the invoice form", () => {
    const detergent = {
      id: 3,
      name: "SurfXL Washing Powder 500g",
      brandId: 7,
      categoryId: 2,
    };
    render(
      <ProductSelector
        products={[detergent]}
        brands={[{ id: 7, name: "Kamachi" }]}
        categories={[{ id: 2, category: "Laundry" }]}
        value=""
        onChange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Select Product..."));
    fireEvent.change(screen.getByRole("combobox", { name: "Search product" }), {
      target: { value: "kamachi laund" },
    });

    expect(screen.getByText(detergent.name)).toBeTruthy();
  });

  test("supports arrow-key navigation and selection in barcode suggestions", () => {
    const choices = [
      { id: 11, name: "SurfXL Washing Powder 500g" },
      { id: 12, name: "SurfXL Washing Powder 1kg" },
    ];
    const onChange = jest.fn();
    const onBarcodeScan = jest.fn();
    render(
      <ProductSelector
        products={choices}
        value=""
        onChange={onChange}
        onBarcodeScan={onBarcodeScan}
      />,
    );

    const search = screen.getByRole("combobox", {
      name: "Search product or scan barcode",
    });
    fireEvent.change(search, { target: { value: "surfxl" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("11", choices[0]);
    expect(onBarcodeScan).not.toHaveBeenCalled();
  });

  test("closes product suggestions with Escape", () => {
    render(
      <ProductSelector
        products={products}
        value=""
        onChange={jest.fn()}
        onBarcodeScan={jest.fn()}
      />,
    );
    const search = screen.getByRole("combobox", {
      name: "Search product or scan barcode",
    });

    fireEvent.change(search, { target: { value: "tea" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(search, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(search.getAttribute("aria-expanded")).toBe("false");
  });

  test("renders the suggestion list outside an overflow-clipped table cell and above near the viewport bottom", () => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.getAttribute("data-product-selector-anchor")) {
        return {
          top: 650,
          bottom: 690,
          left: 50,
          right: 350,
          width: 300,
          height: 40,
        };
      }
      return {
        top: 0,
        bottom: 0,
        left: 50,
        right: 350,
        width: 300,
        height: 0,
      };
    });
    const { container } = render(
      <div style={{ overflow: "hidden" }}>
        <ProductSelector
          products={products}
          value=""
          onChange={jest.fn()}
          onBarcodeScan={jest.fn()}
        />
      </div>,
    );

    fireEvent.change(screen.getByRole("combobox", {
      name: "Search product or scan barcode",
    }), { target: { value: "tea" } });

    const listbox = screen.getByRole("listbox");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.body.contains(listbox)).toBe(true);
    expect(Number.parseFloat(listbox.parentElement.style.top)).toBeLessThan(650);
  });

  test("offers product creation only after a barcode lookup returns not found", async () => {
    const error = new Error("No product was found for this barcode");
    error.status = 404;
    const onBarcodeScan = jest.fn().mockRejectedValue(error);
    const onCreateMissingBarcode = jest.fn();

    render(
      <ProductSelector
        products={products}
        value=""
        onChange={jest.fn()}
        onBarcodeScan={onBarcodeScan}
        onCreateMissingBarcode={onCreateMissingBarcode}
      />,
    );

    const search = screen.getByRole("combobox", {
      name: "Search product or scan barcode",
    });
    fireEvent.change(search, { target: { value: "00012345" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    const createButton = await screen.findByRole("button", {
      name: "Create Product",
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Product not found. Would you like to create this product?",
    );
    fireEvent.click(createButton);
    expect(onCreateMissingBarcode).toHaveBeenCalledWith("00012345");
  });

  test("does not offer product creation for non-not-found lookup errors", async () => {
    const error = new Error("Barcode lookup failed");
    error.status = 500;

    render(
      <ProductSelector
        products={products}
        value=""
        onChange={jest.fn()}
        onBarcodeScan={jest.fn().mockRejectedValue(error)}
        onCreateMissingBarcode={jest.fn()}
      />,
    );

    const search = screen.getByRole("combobox", {
      name: "Search product or scan barcode",
    });
    fireEvent.change(search, { target: { value: "00012345" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Barcode lookup failed",
    );
    expect(screen.queryByRole("button", { name: "Create Product" })).toBeNull();
  });
});
