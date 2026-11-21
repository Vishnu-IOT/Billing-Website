import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import POSStartShiftModal from "./POSStartShiftModal";
import POSCloseShiftModal, { getExpectedCash } from "./POSCloseShiftModal";
import POSPaymentModal from "./POSPaymentModal";

const shift = {
  id: 7,
  openingFloat: 1000,
  cashSalesTotal: 18450,
  cardSalesTotal: 19230.5,
  upiSalesTotal: 11240,
  otherSalesTotal: 0,
  cashInTotal: 0,
  cashOutTotal: 0,
  cashRefundsTotal: 0,
  totalSalesCount: 142,
  openedAt: "2026-11-16T08:30:00",
};

function StartHarness({ onStart }) {
  return (
    <POSStartShiftModal
      open
      onClose={() => {}}
      onStart={onStart}
      operatorName="Alex"
      operatorId={4089}
      counters={[{ id: 1, counterName: "Front Counter" }]}
      selectedCounterId="1"
      onCounterChange={() => {}}
    />
  );
}

describe("Start shift modal", () => {
  test("submits a zero opening float as an explicit denomination count", () => {
    const onStart = jest.fn();
    render(<StartHarness onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: /START SHIFT/ }));
    expect(onStart).toHaveBeenCalledWith({
      counterId: 1,
      openingFloat: 0,
      openingDenominations: expect.objectContaining({ "500": 0 }),
    });
  });

  test("submits the opening float derived from denomination counts", () => {
    const onStart = jest.fn();
    render(<StartHarness onStart={onStart} />);
    fireEvent.change(screen.getByLabelText("Number of ₹500 notes"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Number of ₹200 notes"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /START SHIFT/ }));
    expect(onStart).toHaveBeenCalledWith({
      counterId: 1,
      openingFloat: 700,
      openingDenominations: expect.objectContaining({ "500": 1, "200": 1 }),
    });
  });

  test("updates the opening float as denomination counts change", () => {
    const onStart = jest.fn();
    render(<StartHarness onStart={onStart} />);
    fireEvent.change(screen.getByLabelText("Number of ₹500 notes"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Number of ₹200 notes"), {
      target: { value: "1" },
    });
    expect(screen.getByText(/OPENING FLOAT: ₹700\.00/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Number of ₹200 notes"), {
      target: { value: "2" },
    });
    expect(screen.getByText(/OPENING FLOAT: ₹900\.00/)).toBeTruthy();
  });
});

describe("Close shift modal", () => {
  const setup = (props = {}) => {
    const onConfirm = jest.fn();
    render(
      <POSCloseShiftModal
        open
        shift={shift}
        onClose={() => {}}
        onConfirm={onConfirm}
        operatorName="Alex"
        operatorId={8}
        {...props}
      />,
    );
    return onConfirm;
  };

  test("expected cash follows the documented backend formula", () => {
    expect(getExpectedCash(shift)).toBe(19450);
    expect(getExpectedCash({ ...shift, cashInTotal: 100, cashOutTotal: 50, cashRefundsTotal: 25 })).toBe(19475);
  });

  test("shows perfect match / shortage / surplus", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Number of ₹500 notes"), { target: { value: "38" } });
    fireEvent.change(screen.getByLabelText("Number of ₹200 notes"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Number of ₹50 notes"), { target: { value: "1" } });
    expect(screen.getByText("PERFECT MATCH")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Number of ₹200 notes"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Number of ₹50 notes"), { target: { value: "0" } });
    expect(screen.getByText("SHORTAGE DETECTED")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Number of ₹500 notes"), { target: { value: "39" } });
    expect(screen.getByText("SURPLUS DETECTED")).toBeTruthy();
  });

  test("blocks closing until cash is entered and the checkbox is ticked", () => {
    const onConfirm = setup();
    fireEvent.click(screen.getByText(/CLOSE SHIFT$/, { selector: "button" }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Number of ₹500 notes"), { target: { value: "38" } });
    fireEvent.change(screen.getByLabelText("Number of ₹200 notes"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Number of ₹50 notes"), { target: { value: "1" } });
    fireEvent.click(screen.getByText(/CLOSE SHIFT$/, { selector: "button" }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText(/CLOSE SHIFT$/, { selector: "button" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("denomination assistant submits the counted cash with the close request", () => {
    const onConfirm = setup();
    fireEvent.change(screen.getByLabelText("Number of ₹500 notes"), { target: { value: "35" } });
    expect(screen.getByLabelText("Actual physical cash in drawer").textContent).toBe("17,500.00");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText(/CLOSE SHIFT$/, { selector: "button" }));
    expect(onConfirm).toHaveBeenCalledWith({
      closingCashActual: 17500,
      closingDenominations: expect.objectContaining({ "500": 35 }),
    });
  });
});

describe("Payment modal", () => {
  const totals = { subtotal: 1000, totalTax: 50, grandTotal: 1050, roundOff: 0, itemDiscount: 20 };
  const base = { open: true, totals, paymentMethod: "Cash", onPaymentMethodChange: () => {}, customerInfo: { name: "Rajesh", phone: "9820144812" }, invoiceNo: "INV-1", onClose: () => {} };

  test("quick tender buttons drive the tendered amount and change", () => {
    render(<POSPaymentModal {...base} onConfirm={() => {}} />);
    fireEvent.click(screen.getByText("₹2,000"));
    expect(screen.getByLabelText("Tendered amount").value).toBe("2000");
    expect(within(screen.getByText("CHANGE TO RETURN").parentElement).getByText("₹950.00")).toBeTruthy();
    fireEvent.click(screen.getByText(/EXACT/));
    expect(screen.getByLabelText("Tendered amount").value).toBe("1050");
  });

  test("cash confirm sends the same payload shape as before", () => {
    const onConfirm = jest.fn();
    render(<POSPaymentModal {...base} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("₹2,000"));
    fireEvent.click(screen.getByText(/CONFIRM & PRINT BILL/));
    expect(onConfirm).toHaveBeenCalledWith({ cash: 1050 }, { amountReceived: 2000, amountReturned: 950 });
  });

  test("underpaying cash disables confirm; split must sum to payable", () => {
    const { rerender } = render(<POSPaymentModal {...base} onConfirm={() => {}} />);
    fireEvent.change(screen.getByLabelText("Tendered amount"), { target: { value: "500" } });
    expect(screen.getByText(/CONFIRM & PRINT BILL/).closest("button").disabled).toBe(true);
    const onConfirm = jest.fn();
    rerender(<POSPaymentModal {...base} paymentMethod="Split" onConfirm={onConfirm} />);
    expect(screen.getByText(/CONFIRM & PRINT BILL/).closest("button").disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("CASH amount"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("UPI amount"), { target: { value: "550" } });
    fireEvent.click(screen.getByText(/CONFIRM & PRINT BILL/));
    expect(onConfirm).toHaveBeenCalledWith({ cash: 500, card: 0, upi: 550 }, { amountReceived: 1050, amountReturned: 0 });
  });

  test("keyboard: Alt+2 selects UPI, F8 confirms, Esc closes", () => {
    const onChange = jest.fn(), onConfirm = jest.fn(), onClose = jest.fn();
    render(<POSPaymentModal {...base} onPaymentMethodChange={onChange} onConfirm={onConfirm} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "2", altKey: true });
    expect(onChange).toHaveBeenCalledWith("UPI");
    fireEvent.keyDown(dialog, { key: "F8" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
