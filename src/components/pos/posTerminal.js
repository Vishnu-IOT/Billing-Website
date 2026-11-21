/* ===== POS TERMINAL — shared primitives for the BillFlow POS design system =====
 * Used by the B2C billing screen, checkout, start-shift and close-shift modals
 * so every POS surface shares one visual language and one money format.
 */
import React from "react";
import { FiX, FiMinus, FiPlus } from "react-icons/fi";
import {
  CASH_DENOMINATIONS,
  createEmptyDenominationCounts,
  getDenominationTotal,
  normalizeDenominationCounts,
} from "../../utils/posShift";
import "../../styles/pos-terminal.css";

/** Amount without currency symbol, Indian grouping: 1,23,456.00 */
export function money(value) {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** ₹ + money(), with a leading minus for negatives: -₹50.00 */
export function rupees(value) {
  const n = Number(value) || 0;
  return `${n < 0 ? "-" : ""}₹${money(Math.abs(n))}`;
}

/** Currency-safe comparison to the paisa */
export const sameAmount = (a, b) =>
  Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.005;

/** Currency denominations supported by the persisted shift-count schema */
export const NOTE_DENOMINATIONS = CASH_DENOMINATIONS;

export const emptyCounts = createEmptyDenominationCounts;

export const sumDenominations = (counts) => getDenominationTotal(counts);
export { normalizeDenominationCounts };

/**
 * Modal frame shared by every POS dialog: overlay, fixed header height,
 * scrolling body, pinned footer. `tone` colours the header
 * (navy | blue | green | red).
 */
export function TerminalModal({
  tone = "navy",
  label,
  ariaLabel,
  children,
  onOverlayClick,
  onKeyDown,
  width = 760,
}) {
  return (
    <div
      className="bf-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOverlayClick?.();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className={`bf-modal bf-modal--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || label}
        style={{ "--bf-modal-w": `${width}px` }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalClose({ onClick, disabled }) {
  return (
    <button
      type="button"
      className="bf-modal__close"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
    >
      <FiX />
    </button>
  );
}

/** [KEY] hint chip used on buttons */
export function Kbd({ children }) {
  return <span className="bf-kbd">{children}</span>;
}

/**
 * Denomination counter grid. Counts are held by the parent so the sheet can be
 * compared against whatever amount the existing workflow collects.
 */
export function DenominationGrid({
  counts,
  onCountChange,
  idPrefix = "den",
}) {
  const step = (d, delta) => {
    const next = Math.max(0, (parseInt(counts[d], 10) || 0) + delta);
    onCountChange(d, String(next));
  };

  return (
    <div className="bf-den-grid">
      {NOTE_DENOMINATIONS.map((d) => {
        const key = String(d);
        const qty = Math.max(0, parseInt(counts[key], 10)) || 0;
        const kind = d >= 10 ? "notes" : "coins";
        return (
          <div className="bf-den" key={d}>
            <div className="bf-den__head">
              <span className="bf-den__value">₹{d}</span>
              <span className="bf-den__unit">{kind.toUpperCase()}</span>
            </div>
            <div className="bf-den__stepper">
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Decrease ₹${d} ${kind}`}
                onClick={() => step(d, -1)}
              >
                <FiMinus />
              </button>
              <input
                id={`${idPrefix}-${d}`}
                inputMode="numeric"
                aria-label={`Number of ₹${d} ${kind}`}
                value={counts[key]}
                placeholder="0"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d{1,8}$/.test(v)) onCountChange(d, v);
                }}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Increase ₹${d} notes`}
                onClick={() => step(d, 1)}
              >
                <FiPlus />
              </button>
            </div>
            <div className="bf-den__sub">= ₹{money(qty * d)}</div>
          </div>
        );
      })}
    </div>
  );
}
