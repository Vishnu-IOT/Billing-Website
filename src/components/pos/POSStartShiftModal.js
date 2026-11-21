/* ===== START SHIFT — cash register activation terminal ===== */
import React, { useEffect, useMemo, useState } from "react";
import { FiUnlock, FiInfo } from "react-icons/fi";
import {
  TerminalModal,
  ModalClose,
  Kbd,
  DenominationGrid,
  emptyCounts,
  sumDenominations,
  normalizeDenominationCounts,
  rupees,
} from "./posTerminal";

export default function POSStartShiftModal({
  open,
  onClose,
  onStart,
  submitting = false,
  operatorName,
  operatorId,
  counters = [],
  countersLoading = false,
  countersError = "",
  selectedCounterId = "",
  onCounterChange,
}) {
  const [counts, setCounts] = useState(emptyCounts);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return undefined;
    setCounts(emptyCounts());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const counted = useMemo(() => sumDenominations(counts), [counts]);
  const normalizedCounts = normalizeDenominationCounts(counts);
  const selectedCounter = counters.find(
    (counter) => String(counter.id) === String(selectedCounterId),
  );

  if (!open) return null;

  const submit = () => {
    if (!selectedCounter || !normalizedCounts || submitting || countersLoading) return;
    onStart({
      counterId: Number(selectedCounter.id),
      openingFloat: counted,
      openingDenominations: normalizedCounts,
    });
  };

  const stamp = now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <TerminalModal
      tone="green"
      label="Open new shift"
      width={720}
      onOverlayClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "BUTTON") {
          e.preventDefault();
          submit();
        }
      }}
    >
      <header className="bf-modal__header">
        <div className="bf-modal__headtext">
          <div className="bf-modal__eyebrow">
            <span className="bf-tag">POS SHIFT MANAGEMENT</span>
            <span>Terminal arming</span>
          </div>
          <h2 className="bf-modal__title">OPEN NEW SHIFT</h2>
          <div className="bf-modal__meta">SYS-TIME: {stamp}</div>
        </div>
        <ModalClose onClick={onClose} disabled={submitting} />
      </header>

      <div className="bf-modal__body">
        <div className="bf-infobar">
          <div>
            <span className="bf-infobar__k">OPERATOR</span>
            <strong>
              {operatorName || "—"}
              {operatorId ? <em> (#{operatorId})</em> : null}
            </strong>
          </div>
          <div>
            <span className="bf-infobar__k">ASSIGNED COUNTER</span>
            <strong>{selectedCounter?.counterName || "—"}</strong>
          </div>
        </div>

        <section className="bf-section">
          <label className="bf-label" htmlFor="bf-counter-select">
            POS COUNTER <span className="bf-req">*</span>
          </label>
          {countersLoading ? (
            <div className="bf-hint" role="status">Loading your assigned counter…</div>
          ) : counters.length > 0 ? (
            <select
              id="bf-counter-select"
              className="bf-counter-select"
              value={selectedCounterId}
              onChange={(event) => onCounterChange?.(event.target.value)}
              disabled={submitting}
            >
              {counters.map((counter) => (
                <option key={counter.id} value={counter.id}>{counter.counterName}</option>
              ))}
            </select>
          ) : (
            <div className="bf-error" role="alert">
              No active POS counter is assigned to your account. Contact an administrator.
            </div>
          )}
          {countersError && <div className="bf-error" role="alert">{countersError}</div>}
        </section>

        <section className="bf-section bf-section--panel">
          <div className="bf-panelhead">
            <span className="bf-label">
              OPENING CASH DENOMINATION COUNT <span className="bf-tag bf-tag--dark">AUDIT</span>
            </span>
            <span className={`bf-status ${normalizedCounts ? "is-ok" : "is-bad"}`}>
              OPENING FLOAT: {normalizedCounts ? rupees(counted) : "Check denomination counts"}
            </span>
          </div>
          <DenominationGrid
            idPrefix="open-den"
            counts={counts}
            onCountChange={(d, v) => setCounts((c) => ({ ...c, [String(d)]: v }))}
          />
        </section>

        <div className="bf-policy">
          <FiInfo />
          <p>
            <strong>PHYSICAL FLOAT POLICY:</strong> The opening float is calculated
            from the denomination count and stored with this counter’s shift.
          </p>
        </div>
      </div>

      <footer className="bf-modal__footer">
        <button type="button" className="bf-btn bf-btn--ghost" onClick={onClose} disabled={submitting}>
          CANCEL <Kbd>ESC</Kbd>
        </button>
        <span className="bf-spacer" />
        <button
          type="button"
          className="bf-btn bf-btn--green bf-btn--lg"
          onClick={submit}
          disabled={submitting || countersLoading || !selectedCounter || !normalizedCounts}
        >
          <FiUnlock /> {submitting ? "STARTING…" : "START SHIFT"} <Kbd>ENTER</Kbd>
        </button>
      </footer>
    </TerminalModal>
  );
}
