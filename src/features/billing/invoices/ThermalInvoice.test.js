import React from "react";
import { render, screen, within } from "@testing-library/react";
import ThermalInvoice from "./ThermalInvoice";

jest.mock("zustand/react/shallow", () => ({
  useShallow: (selector) => selector,
}));

jest.mock("../../../store/settingsStore-DB", () => ({
  __esModule: true,
  default: (selector) =>
    selector({
      printerWidth: "80",
      defaultTaxRate: 0,
      receiptHeader: "",
      receiptFooter: "",
      showUpiQr: false,
      termsAndConditions: "",
      showSignature: true,
    }),
}));

describe("ThermalInvoice receipt", () => {
  test("keeps the non-tax receipt label without printing GST verification details", () => {
    render(
      <ThermalInvoice
        bill={{
          bill_type: "B2C",
          invoiceNumber: "POS-QUICK-001",
          totalAmount: 12,
          gstClassificationPending: true,
        }}
        items={[
          {
            id: "quick-1",
            itemType: "QUICK_SALE",
            cartItemType: "QUICK_SALE",
            productName: "Unregistered item",
            quantity: 1,
            price: 12,
            netRate: 12,
            total: 12,
            gstVerificationStatus: "GST_PENDING",
            taxPercentage: null,
            taxAmount: null,
          },
        ]}
        showActionBar={false}
      />,
    );

    expect(screen.getByText("NON-TAX SALES RECEIPT")).toBeTruthy();
    expect(screen.queryByText("QUICK SALE · GST PENDING VERIFICATION")).toBeNull();
    expect(
      screen.queryByText(/GST classification is pending verification/i),
    ).toBeNull();
    expect(screen.queryByText("GST SUMMARY")).toBeNull();
  });

  test("adds the GST-pending Quick Sale amount to the subtotal", () => {
    render(
      <ThermalInvoice
        bill={{
          bill_type: "B2C",
          invoiceNumber: "POS-QUICK-PENDING-001",
          baseRate: 20,
          totalAmount: 32,
        }}
        items={[
          {
            itemType: "QUICK_SALE",
            productName: "Pending Quick Sale item",
            quantity: 1,
            price: 12,
            netRate: 12,
            total: 12,
            gstVerificationStatus: "GST_PENDING",
            taxPercentage: null,
            taxAmount: null,
          },
        ]}
        showActionBar={false}
      />,
    );

    expect(screen.getByText("Subtotal:").parentElement.textContent).toContain(
      "₹32.00",
    );
  });

  test("does not add verified Quick Sale amounts to the subtotal twice", () => {
    render(
      <ThermalInvoice
        bill={{
          bill_type: "B2C",
          invoiceNumber: "POS-QUICK-GST-001",
          baseRate: 10,
          tax: 2,
          totalAmount: 12,
        }}
        items={[
          {
            itemType: "QUICK_SALE",
            productName: "Verified Quick Sale item",
            quantity: 1,
            price: 12,
            baseRate: 10,
            netRate: 12,
            taxableAmount: 10,
            taxAmount: 2,
            gstVerificationStatus: "GST_VERIFIED",
          },
        ]}
        showActionBar={false}
      />,
    );

    expect(screen.getByText("Subtotal:").parentElement.textContent).toContain(
      "₹10.00",
    );
  });

  test("renders the reference columns and uses saved bill totals and tax values", () => {
    render(
      <ThermalInvoice
        bill={{
          bill_type: "B2C",
          invoiceNumber: "INV/26-27/001",
          saleDate: "2026-03-20",
          totalAmount: 26.28,
          baseRate: 25,
          tax: 1.25,
          roundOff: 0.03,
          amountReceived: 30,
          todaySavings: 3.75,
          couponAmount: 1,
          loyaltyPointsEarned: 2,
          loyaltyPointsBalance: 12,
          customerAddress: "12 Market Road",
        }}
        companies={{
          name: "AV SUPER MARKET",
          address: "Market Road",
          companyPhone: "9876543210",
          gstin: "GSTIN-123",
        }}
        items={[
          {
            id: "line-1",
            productId: "product-1",
            productName: "Tea",
            quantity: 1,
            paidQuantity: 1,
            price: 25,
            mrp: 30,
            baseRate: 25,
            netRate: 26.25,
            discountPercentage: 10,
            taxPercentage: 5,
            taxAmount: 1.25,
          },
        ]}
        showActionBar={false}
      />,
    );

    expect(screen.getByText("AV SUPER MARKET")).toBeTruthy();
    expect(screen.getByText("CASH BILL")).toBeTruthy();
    const billNumber = screen.getByText("INV/26-27/001");
    expect(billNumber.className).toContain("receipt-reference__bill-number");

    expect(
      screen
        .getAllByText(/^(Bill No:|Time:|Date:|Cashier:)$/)
        .map((label) => label.textContent),
    ).toEqual(["Bill No:", "Time:", "Date:", "Cashier:"]);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["SL", "Description", "MRP", "Rate", "Qty", "Amount"]);

    const itemRow = within(table).getAllByRole("row")[1];
    expect(within(itemRow).getByText("30.00")).toBeTruthy();
    expect(within(itemRow).getByText("25.00")).toBeTruthy();
    expect(within(itemRow).getByText("26.25")).toBeTruthy();
    expect(within(itemRow).getByText("Discount: 10%")).toBeTruthy();

    expect(screen.getByText("₹26.28")).toBeTruthy();
    expect(screen.getByText("Subtotal:")).toBeTruthy();
    expect(screen.getByText("Tax Amount:")).toBeTruthy();
    expect(screen.getByText("Amount in words:")).toBeTruthy();
    expect(screen.getByText("Twenty Six Rupees Only")).toBeTruthy();
    expect(screen.getByText("Authorized Signatory")).toBeTruthy();
    expect(
      screen.getByText("Goods once sold will not be taken back."),
    ).toBeTruthy();
    expect(screen.getByText("12 Market Road")).toBeTruthy();
    expect(screen.getByText("Total before round-off:")).toBeTruthy();
    expect(screen.getAllByText("₹26.25").length).toBeGreaterThan(0);
    expect(screen.getByText("Round-off:")).toBeTruthy();
    expect(screen.getByText("+₹0.03")).toBeTruthy();
    expect(screen.getByText("CGST 2.5% =")).toBeTruthy();
    expect(screen.getByText("₹0.63")).toBeTruthy();
    expect(screen.getByText("SGST 2.5% =")).toBeTruthy();
    expect(screen.getByText("₹0.62")).toBeTruthy();
    expect(screen.getByText("Coupon Amount:")).toBeTruthy();
    expect(screen.getByText("Opening Points: 10")).toBeTruthy();
    expect(screen.getByText("Current Points: 12")).toBeTruthy();
    expect(screen.getByText("Today's Savings:")).toBeTruthy();
  });

  test("sizes the print page to the receipt content", () => {
    const rectSpy = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function () {
        return {
          height: this.classList.contains("thermal-receipt") ? 378 : 0,
          width: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      });

    const { unmount } = render(
      <ThermalInvoice
        bill={{ bill_type: "B2C", invoiceNumber: "POS-PRINT-001" }}
        items={[]}
        showActionBar={false}
      />,
    );
    const pageStyle = Array.from(document.head.querySelectorAll("style")).find(
      (style) => style.textContent.includes("@page { size:"),
    );

    expect(pageStyle.textContent).toContain(
      "@page { size: 80mm 100.6mm; margin: 0; }",
    );

    unmount();
    expect(pageStyle.isConnected).toBe(false);
    rectSpy.mockRestore();
  });
});
