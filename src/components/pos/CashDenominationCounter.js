import React from "react";
import {
  areDenominationCountsValid,
  CASH_DENOMINATIONS,
  getDenominationTotal,
} from "../../utils/posShift";
import { formatCurrency } from "../../utils/currency";

export default function CashDenominationCounter({
  counts,
  onChange,
  onEnter,
  title = "Count notes and coins",
  autoFocus = false,
}) {
  const total = getDenominationTotal(counts);
  const valid = areDenominationCountsValid(counts);

  return (
    <fieldset className="pos-denomination-counter">
      <legend>{title}</legend>
      <div className="pos-denomination-grid">
        {CASH_DENOMINATIONS.map((denomination, index) => {
          const unit = denomination >= 10 ? "notes" : "coins";
          return (
            <label
              className="pos-denomination-field"
              key={denomination}
            >
              <span>₹{denomination} {unit}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                aria-label={`Count of ₹${denomination} ${unit}`}
                value={counts[String(denomination)] ?? ""}
                autoFocus={autoFocus && index === 0}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value !== "" && !/^\d+$/.test(value)) return;
                  onChange((previous) => ({
                    ...previous,
                    [String(denomination)]: value,
                  }));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && onEnter) {
                    event.preventDefault();
                    onEnter();
                  }
                }}
                onBlur={() => {
                  if (counts[String(denomination)] === "") {
                    onChange((previous) => ({
                      ...previous,
                      [String(denomination)]: "0",
                    }));
                  }
                }}
              />
            </label>
          );
        })}
      </div>
      <div className="pos-denomination-total" aria-live="polite">
        <span>Counted cash</span>
        <strong>{valid ? formatCurrency(total) : "Check denomination counts"}</strong>
      </div>
    </fieldset>
  );
}
