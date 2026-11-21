import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CashDenominationCounter from "./CashDenominationCounter";
import {
  createEmptyDenominationCounts,
  getDenominationTotal,
} from "../../utils/posShift";
import { formatCurrency } from "../../utils/currency";

function CounterHarness() {
  const [counts, setCounts] = useState(createEmptyDenominationCounts);
  return (
    <>
      <CashDenominationCounter counts={counts} onChange={setCounts} />
      <output>{formatCurrency(getDenominationTotal(counts))}</output>
    </>
  );
}

test("updates the counted cash total as denomination counts change", () => {
  render(<CounterHarness />);

  fireEvent.change(screen.getByLabelText("Count of ₹500 notes"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("Count of ₹100 notes"), {
    target: { value: "3" },
  });

  expect(screen.getAllByText("₹1,300.00")).toHaveLength(2);
});
