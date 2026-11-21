/* ===== CLOSE SHIFT — cash drawer audit terminal =====
 * All figures come from the shift record the existing workflow already loads.
 * Expected cash mirrors the documented close-shift formula
 *   opening float + cash sales + cash in - cash out - cash refunds
 * and actual cash is derived from and submitted with the denomination count.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  FiLock,
  FiCheckCircle,
  FiAlertTriangle,
  FiGrid,
  FiDollarSign,
  FiCreditCard,
  FiSmartphone,
  FiMoreHorizontal,
} from "react-icons/fi";
import {
  TerminalModal,
  ModalClose,
  Kbd,
  DenominationGrid,
  emptyCounts,
  sumDenominations,
  normalizeDenominationCounts,
  sameAmount,
  money,
  rupees,
} from "./posTerminal";

const n = (v) => Number(v) || 0;

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function getExpectedCash(shift) {
  return (
    n(shift?.openingFloat) +
    n(shift?.cashSalesTotal) +
    n(shift?.cashInTotal) -
    n(shift?.cashOutTotal) -
    n(shift?.cashRefundsTotal)
  );
}

export default function POSCloseShiftModal({
  open,
  shift,
  refreshing = false,
  onClose,
  onConfirm,
  submitting = false,
  operatorName,
  operatorId,
}) {
  const [assistant, setAssistant] = useState(false);
  const [counts, setCounts] = useState(emptyCounts);
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAssistant(true);
    setCounts(emptyCounts());
    setConfirmed(false);
    setTouched(false);
  }, [open]);

  const expected = useMemo(() => getExpectedCash(shift), [shift]);
  const cash = n(shift?.cashSalesTotal);
  const card = n(shift?.cardSalesTotal);
  const upi = n(shift?.upiSalesTotal);
  const other = n(shift?.otherSalesTotal);
  const gross = cash + card + upi + other;
  const bills = n(shift?.totalSalesCount);
  const avg = bills > 0 ? gross / bills : 0;

  const denomSum = useMemo(() => sumDenominations(counts), [counts]);
  const normalizedCounts = normalizeDenominationCounts(counts);
  const hasEntry = Boolean(normalizedCounts);
  const variance = hasEntry ? denomSum - expected : 0;
  const state = !hasEntry ? "pending" : sameAmount(denomSum, expected) ? "match" : variance < 0 ? "short" : "surplus";
  const counterName = shift?.counterNameSnapshot || shift?.counter?.counterName || shift?.terminalId;

  if (!open || !shift) return null;

  const canSubmit = hasEntry && confirmed && !submitting && !refreshing;
  const submit = () => {
    setTouched(true);
    if (canSubmit) {
      onConfirm({
        closingCashActual: denomSum,
        closingDenominations: normalizedCounts,
      });
    }
  };

  const statusLabel = {
    pending: "AWAITING COUNT",
    match: "PERFECT MATCH",
    short: "SHORTAGE DETECTED",
    surplus: "SURPLUS DETECTED",
  }[state];

  const channels = [
    { label: "CASH SALES", amount: cash, icon: <FiDollarSign /> },
    { label: "CARD / POS", amount: card, icon: <FiCreditCard /> },
    { label: "UPI / QR", amount: upi, icon: <FiSmartphone /> },
    { label: "OTHER TENDER", amount: other, icon: <FiMoreHorizontal /> },
  ];

  return (
    <TerminalModal
      tone="red"
      label="Close shift"
      width={860}
      onOverlayClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "F10") {
          e.preventDefault();
          e.stopPropagation();
          submit();
        }
      }}
    >
      <header className="bf-modal__header">
        <div className="bf-modal__headtext">
          <div className="bf-modal__eyebrow">
            <span className="bf-tag">DRAWER AUDIT</span>
            <span>CASH DRAWER RECONCILIATION • END OF SHIFT</span>
          </div>
          <h2 className="bf-modal__title">
            CLOSE SHIFT #{shift.id}{" "}
            <span className="bf-tag bf-tag--light">READY TO SETTLE</span>
          </h2>
        </div>
        <div className="bf-modal__headright">
          <div className="bf-chip">
            {counterName || "—"} · {operatorName || "—"}
            {operatorId ? ` (#${operatorId})` : ""} · {formatTime(shift.openedAt)} –{" "}
            {formatTime(new Date())}
          </div>
          <ModalClose onClick={onClose} disabled={submitting} />
        </div>
      </header>

      <div className="bf-modal__body">
        <div className="bf-split2">
          <div className="bf-card bf-card--green">
            <span className="bf-label">OPENING DRAWER FLOAT</span>
            <div className="bf-card__big">{rupees(shift.openingFloat)}</div>
            <div className="bf-card__sub">Opened {formatTime(shift.openedAt)}</div>
            <div className="bf-card__sub">
              Opening count: {Object.entries(shift.openingDenominations || {})
                .filter(([, count]) => Number(count) > 0)
                .map(([denomination, count]) => `₹${denomination} × ${count}`)
                .join(", ") || "Not recorded"}
            </div>
          </div>
          <div className="bf-card bf-card--blue">
            <span className="bf-label">TOTAL REGISTER SALES (TENDERED)</span>
            <div className="bf-card__big">
              {rupees(gross)} <small>/ {bills} Bills</small>
            </div>
            <div className="bf-card__sub">Avg Bill Value: {rupees(avg)}</div>
          </div>
        </div>

        <div className="bf-sectionhead">
          <span className="bf-label">PAYMENT CHANNEL BREAKDOWN</span>
          {refreshing && <span className="bf-label">REFRESHING LEDGER…</span>}
        </div>
        <div className="bf-channels">
          {channels.map((c) => (
            <div className="bf-channel" key={c.label}>
              <div className="bf-channel__head">
                <span className="bf-label">{c.label}</span>
                {c.icon}
              </div>
              <div className="bf-channel__amt">{rupees(c.amount)}</div>
            </div>
          ))}
        </div>

        <section className="bf-section bf-section--panel">
          <div className="bf-panelhead">
            <div>
              <span className="bf-label bf-label--lg">
                ACTUAL PHYSICAL CASH IN DRAWER{" "}
                <span className="bf-tag bf-tag--dark">MANDATORY</span>
              </span>
              <div className="bf-hint">Count the physical currency; actual closing cash is calculated from these denominations.</div>
            </div>
            <button
              type="button"
              className="bf-link"
              onClick={() => setAssistant((v) => !v)}
              aria-expanded={assistant}
            >
              <FiGrid /> {assistant ? "HIDE" : "SHOW"} DENOMINATION ASSISTANT
            </button>
          </div>

          <div className={`bf-bigamount bf-bigamount--wide ${touched && !hasEntry ? "is-error" : ""}`}>
            <span className="bf-bigamount__sym bf-bigamount__sym--dark">₹</span>
            <output className="bf-bigamount__display" aria-label="Actual physical cash in drawer">
              {hasEntry ? money(denomSum) : "Invalid count"}
            </output>
            <span className={`bf-statuspill is-${state}`}>
              {state === "match" ? <FiCheckCircle /> : state === "pending" ? null : <FiAlertTriangle />}
              {state === "match" ? "MATCHED" : state === "pending" ? "ENTER COUNT" : "MISMATCH"}
            </span>
          </div>
          {touched && !hasEntry && (
            <div className="bf-error" role="alert">Enter a non-negative whole number for each denomination.</div>
          )}

          {assistant && (
            <div className="bf-assistant">
              <div className="bf-panelhead">
                <span className="bf-label">DENOMINATION BREAKDOWN SHEET</span>
                <span className="bf-label">
                  SUM: {hasEntry ? rupees(denomSum) : "Check denomination counts"}
                </span>
              </div>
              <DenominationGrid
                idPrefix="close-den"
                counts={counts}
                onCountChange={(d, v) => setCounts((c) => ({ ...c, [String(d)]: v }))}
              />
              {touched && !normalizedCounts && (
                <div className="bf-error" role="alert">Enter a non-negative whole number for each denomination.</div>
              )}
            </div>
          )}
        </section>

        <section className="bf-section bf-section--panel">
          <div className="bf-panelhead">
            <span className="bf-label">DRAWER VARIANCE AUDIT CALCULATION</span>
            <span className="bf-label">
              FORMULA: COUNTED − (FLOAT + CASH SALES
              {n(shift.cashInTotal) ? " + CASH IN" : ""}
              {n(shift.cashOutTotal) ? " − CASH OUT" : ""}
              {n(shift.cashRefundsTotal) ? " − REFUNDS" : ""})
            </span>
          </div>
          <div className="bf-split3">
            <div className="bf-card">
              <span className="bf-label">EXPECTED CASH IN DRAWER</span>
              <div className="bf-card__big">{rupees(expected)}</div>
              <div className="bf-card__sub">
                Float {rupees(shift.openingFloat)} + Cash {rupees(cash)}
              </div>
            </div>
            <div className="bf-card">
              <span className="bf-label">ACTUAL CASH COUNTED</span>
              <div className="bf-card__big">{hasEntry ? rupees(denomSum) : "—"}</div>
              <div className="bf-card__sub">Declared by {operatorName || "operator"}</div>
            </div>
            <div className={`bf-card bf-variance is-${state}`}>
              <span className="bf-label">CASH VARIANCE</span>
              <div className="bf-card__big">
                {hasEntry ? `${variance > 0 ? "+" : ""}${rupees(variance)}` : "—"}
              </div>
              <div className="bf-card__sub">
                <strong>{statusLabel}</strong>
              </div>
            </div>
          </div>
        </section>

        <label className={`bf-confirm ${touched && !confirmed ? "is-error" : ""}`}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            <strong>I CONFIRM PHYSICAL CASH COUNT ACCURATELY MATCHES DECLARED FIGURES ABOVE.</strong>
            <em>This shift will be closed and its ledger locked on submission.</em>
          </span>
        </label>
        {touched && !confirmed && (
          <div className="bf-error" role="alert">Tick the confirmation to close the shift.</div>
        )}
      </div>

      <footer className="bf-modal__footer">
        <button type="button" className="bf-btn bf-btn--ghost" onClick={onClose} disabled={submitting}>
          CANCEL <Kbd>ESC</Kbd>
        </button>
        <span className="bf-spacer" />
        <button
          type="button"
          className="bf-btn bf-btn--red bf-btn--lg"
          onClick={submit}
          disabled={submitting || refreshing}
        >
          <FiLock /> {submitting ? "CLOSING…" : "CLOSE SHIFT"} <Kbd>F10</Kbd>
        </button>
      </footer>
    </TerminalModal>
  );
}
