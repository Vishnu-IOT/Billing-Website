/* ===== POS PAYMENT MODAL — fiscal checkout terminal =====
 * Presentation redesign. Payment collection, validation, the payload sent to
 * onConfirm and the Alt+1..4 / Ctrl+Enter shortcuts are unchanged.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  FiUser,
  FiPhone,
  FiDollarSign,
  FiSmartphone,
  FiCreditCard,
  FiShuffle,
  FiPrinter,
  FiPauseCircle,
  FiArrowLeft,
  FiFileText,
  FiTag,
  FiStar,
  FiCheckCircle,
} from "react-icons/fi";
import { TerminalModal, ModalClose, Kbd, money, rupees } from "./posTerminal";

const PAYMENT_METHODS = [
  { key: "Cash", icon: <FiDollarSign />, label: "CASH", sub: "Drawer Direct" },
  { key: "UPI", icon: <FiSmartphone />, label: "UPI QR", sub: "GPay / PhonePe" },
  { key: "Card", icon: <FiCreditCard />, label: "CARD", sub: "Debit / Credit" },
  { key: "Split", icon: <FiShuffle />, label: "SPLIT", sub: "Multi-Tender" },
];

const ADD_STEPS = [50, 100, 500];
const num = (v) => parseFloat(v) || 0;

export default function POSPaymentModal({
  open,
  totals,
  paymentMethod,
  onPaymentMethodChange,
  customerInfo,
  invoiceNo,
  onConfirm,
  onClose,
  onHold,
  saving,
  operatorName,
  operatorId,
  terminalId,
  tierLabel,
  printerLabel,
  loyaltyRedemptionEnabled = false,
  availableLoyaltyPoints = 0,
  loyaltyPointsToRedeem = 0,
  maximumRedeemablePoints = 0,
  minimumRedeemablePoints = 1,
  loyaltyRedemptionAmountPerPoint = 0,
  redeemLoyaltyOptIn = false,
  onRedeemLoyaltyOptInChange,
  onLoyaltyPointsToRedeemChange,
}) {
  const [cashGiven, setCashGiven] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [splitUPI, setSplitUPI] = useState("");
  const firstPaymentMethodRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    firstPaymentMethodRef.current?.focus();
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  const payable = totals?.grandTotal || 0;
  const given = num(cashGiven);
  const change = Math.max(0, given - payable);
  const balanceDue = cashGiven ? Math.max(0, payable - given) : 0;
  const splitTotal = num(splitCash) + num(splitCard) + num(splitUPI);
  const splitRemaining = payable - splitTotal;
  const splitExact = Math.abs(splitRemaining) < 0.01;
  const confirmDisabled =
    saving ||
    (paymentMethod === "Cash" && cashGiven && given < payable) ||
    (paymentMethod === "Split" && Math.abs(splitTotal - payable) > 0.01);

  const handleConfirmClick = () => {
    let paymentDetails = null;
    let amountReceived = payable;
    if (paymentMethod === "Split") {
      amountReceived = splitTotal;
      paymentDetails = { cash: num(splitCash), card: num(splitCard), upi: num(splitUPI) };
    } else if (paymentMethod === "Cash") {
      amountReceived = given || payable;
      paymentDetails = { cash: payable };
    } else if (paymentMethod === "Card") {
      paymentDetails = { card: payable };
    } else if (paymentMethod === "UPI") {
      paymentDetails = { upi: payable };
    }
    onConfirm(paymentDetails, {
      amountReceived,
      amountReturned: paymentMethod === "Cash" ? change : 0,
    });
  };

  if (!open) return null;

  const tax = Number(totals.totalTax) || 0;
  const cgst = Number((tax / 2).toFixed(2));
  const sgst = Number((tax - cgst).toFixed(2));
  const itemDiscount = Number(totals.itemDiscount) || 0;
  const globalDiscount = Number(totals.globalDiscountAmount) || 0;
  const roundOff = Number(totals.roundOff) || 0;
  const returnCredit = Number(totals.returnCreditAmount) || 0;
  const loyaltyRedemption = Number(totals.loyaltyRedemptionAmount) || 0;

  const setAmount = (v) => setCashGiven(v === "" ? "" : String(Number(v.toFixed(2))));

  return (
    <TerminalModal
      tone="blue"
      label="Checkout"
      width={1040}
      onOverlayClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        } else if ((e.key === "Enter" && e.ctrlKey) || e.key === "F8") {
          e.preventDefault();
          e.stopPropagation();
          if (!confirmDisabled) handleConfirmClick();
        } else if (e.key === "F10" && onHold) {
          e.preventDefault();
          e.stopPropagation();
          onHold();
        } else if (e.altKey && /^[1-4]$/.test(e.key)) {
          e.preventDefault();
          onPaymentMethodChange(PAYMENT_METHODS[Number(e.key) - 1].key);
        }
      }}
    >
      <header className="bf-modal__header bf-modal__header--checkout">
        <div className="bf-modal__logo"><FiFileText /></div>
        <div className="bf-modal__headtext">
          <h2 className="bf-modal__title bf-modal__title--sm">
            CHECKOUT • BILLFLOW POS <span className="bf-tag">{invoiceNo || "—"}</span>
          </h2>
          <div className="bf-modal__meta">
            {terminalId ? `TERMINAL ${terminalId}` : ""}
            {operatorName ? ` • OPERATOR ${operatorName}` : ""}
            {operatorId ? ` (#${operatorId})` : ""}
          </div>
        </div>
        <div className="bf-modal__amount">
          <span>NET AMOUNT PAYABLE</span>
          <strong>{rupees(payable)}</strong>
        </div>
        <ModalClose onClick={onClose} />
      </header>

      <div className="bf-modal__body bf-checkout">
        <div className="bf-checkout__left">
          <section className="bf-section bf-section--panel">
            <div className="bf-panelhead">
              <span className="bf-label"><FiUser /> CUSTOMER IDENTIFICATION</span>
              {tierLabel && <span className="bf-tag bf-tag--soft">{tierLabel.toUpperCase()} TIER</span>}
            </div>
            <div className="bf-split2 bf-split2--tight">
              <div>
                <span className="bf-label">CUSTOMER NAME</span>
                <div className="bf-readfield"><FiUser /> {customerInfo?.name || "—"}</div>
              </div>
              <div>
                <span className="bf-label">PHONE NUMBER</span>
                <div className="bf-readfield"><FiPhone /> {customerInfo?.phone ? `+91 ${customerInfo.phone}` : "—"}</div>
              </div>
            </div>
          </section>

          {loyaltyRedemptionEnabled && (
            <section className="bf-section bf-section--panel">
              <label className="bf-panelhead" style={{ cursor: "pointer" }}>
                <span className="bf-label"><FiStar /> REDEEM LOYALTY POINTS</span>
                <input
                  type="checkbox"
                  aria-label="Redeem loyalty points"
                  checked={redeemLoyaltyOptIn}
                  onChange={(event) =>
                    onRedeemLoyaltyOptInChange?.(event.target.checked)
                  }
                />
              </label>
              <div className="bf-label">
                Available: {Number(availableLoyaltyPoints) || 0} pts
                {" · "}₹{Number(loyaltyRedemptionAmountPerPoint).toFixed(2)} per point
              </div>
              {redeemLoyaltyOptIn && (
                <div className="bf-split2 bf-split2--tight" style={{ marginTop: 10 }}>
                  <div>
                    <label className="bf-label" htmlFor="loyalty-points-to-redeem">
                      POINTS TO REDEEM (MIN {minimumRedeemablePoints}, MAX {maximumRedeemablePoints})
                    </label>
                    <input
                      id="loyalty-points-to-redeem"
                      type="number"
                      min={minimumRedeemablePoints}
                      max={maximumRedeemablePoints}
                      step="1"
                      inputMode="numeric"
                      value={loyaltyPointsToRedeem}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (/^\d*$/.test(value)) {
                          onLoyaltyPointsToRedeemChange?.(
                            Math.min(Number(value) || 0, maximumRedeemablePoints)
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="bf-readfield" aria-live="polite">
                    Discount: {rupees(
                      Number(loyaltyPointsToRedeem) *
                        Number(loyaltyRedemptionAmountPerPoint)
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <span className="bf-label">PAYMENT METHOD [ALT+1 – ALT+4]</span>
            <div className="bf-methods" role="group" aria-label="Payment method">
              {PAYMENT_METHODS.map((pm, i) => (
                <button
                  key={pm.key}
                  type="button"
                  ref={pm.key === "Cash" ? firstPaymentMethodRef : undefined}
                  className={`bf-method ${paymentMethod === pm.key ? "is-selected" : ""}`}
                  aria-pressed={paymentMethod === pm.key}
                  onClick={() => onPaymentMethodChange(pm.key)}
                >
                  <span className="bf-method__top">{pm.icon}<Kbd>ALT+{i + 1}</Kbd></span>
                  <strong>{pm.label}</strong>
                  <small>{pm.sub}</small>
                </button>
              ))}
            </div>
          </section>

          {paymentMethod === "Cash" && (
            <section className="bf-section bf-section--panel">
              <div className="bf-panelhead">
                <span className="bf-label">CURRENCY RECEIVED MATRIX</span>
                <span className="bf-label bf-label--blue">DENOMINATION SHORTCUTS</span>
              </div>
              <div className="bf-quick">
                {ADD_STEPS.map((a) => (
                  <button key={a} type="button" onClick={() => setAmount(given + a)}>+₹{a}</button>
                ))}
                <button type="button" className="is-exact" onClick={() => setAmount(payable)}>
                  EXACT (₹{money(payable).replace(".00", "")})
                </button>
                <button type="button" onClick={() => setAmount(2000)}>₹2,000</button>
              </div>
              <div className="bf-tendered">
                <span className="bf-tag bf-tag--dark">TENDERED</span> <span className="bf-label">INR (₹)</span>
                <div className="bf-tendered__row">
                  <span>₹</span>
                  <input
                    inputMode="decimal"
                    aria-label="Tendered amount"
                    placeholder={money(payable)}
                    value={cashGiven}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d{0,8}(\.\d{0,2})?$/.test(v)) setCashGiven(v);
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
              <div className="bf-split2 bf-split2--tight">
                <div className="bf-result bf-result--ok">
                  <span className="bf-label">CHANGE TO RETURN</span>
                  <strong>{rupees(change)}</strong>
                </div>
                <div className={`bf-result ${balanceDue > 0 ? "bf-result--bad" : ""}`}>
                  <span className="bf-label">BALANCE DUE</span>
                  <strong>{rupees(balanceDue)}</strong>
                </div>
              </div>
            </section>
          )}

          {(paymentMethod === "UPI" || paymentMethod === "Card") && (
            <section className="bf-section bf-section--panel">
              <span className="bf-label">
                {paymentMethod === "UPI" ? "UPI COLLECTION" : "CARD COLLECTION"}
              </span>
              <div className="bf-collect">
                <strong>{rupees(payable)}</strong>
                <span>
                  Collect the full amount by {paymentMethod === "UPI" ? "UPI" : "card"}, then confirm.
                  The sale is recorded as a single {paymentMethod === "UPI" ? "UPI" : "card"} tender.
                </span>
              </div>
            </section>
          )}

          {paymentMethod === "Split" && (
            <section className="bf-section bf-section--panel">
              <span className="bf-label">SPLIT PAYMENT BREAKDOWN</span>
              {[
                ["CASH", splitCash, setSplitCash],
                ["CARD", splitCard, setSplitCard],
                ["UPI", splitUPI, setSplitUPI],
              ].map(([label, value, setter]) => (
                <div className="bf-splitrow" key={label}>
                  <span className="bf-label">{label}</span>
                  <div className="bf-input">
                    <span>₹</span>
                    <input
                      inputMode="decimal"
                      aria-label={`${label} amount`}
                      placeholder="0.00"
                      value={value}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d{0,8}(\.\d{0,2})?$/.test(v)) setter(v);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>
              ))}
              <div className={`bf-warnrow ${splitExact ? "is-ok" : ""}`}>
                {splitExact ? <><FiCheckCircle /> Exact split amount</> : <>Remaining: <strong>{rupees(splitRemaining)}</strong></>}
                <span className="bf-spacer" />
                SUM: {rupees(splitTotal)}
              </div>
            </section>
          )}
        </div>

        <div className="bf-checkout__right">
          <section className="bf-section bf-section--panel bf-ledger">
            <div className="bf-panelhead">
              <span className="bf-label"><FiFileText /> FISCAL LEDGER BREAKDOWN</span>
            </div>
            <div className="bf-ledger__row"><span>CLASSIFIED TAXABLE VALUE</span><strong>{rupees(totals.subtotal)}</strong></div>
            {itemDiscount > 0 && (
              <div className="bf-ledger__row is-green">
                <span><FiTag /> ITEM DISCOUNT (INCLUDED)</span><strong>{rupees(itemDiscount)}</strong>
              </div>
            )}
            {totals.hasPendingQuickSale ? (
              <>
                {tax > 0 && (
                  <div className="bf-ledger__row">
                    <span>GST ON CLASSIFIED ITEMS</span><strong>{rupees(tax)}</strong>
                  </div>
                )}
                <div className="bf-ledger__row is-warn">
                  <span>QUICK SALE · GST PENDING</span>
                  <strong>{rupees(totals.quickSalePendingAmount)}</strong>
                  <small>Payable now; excluded from the GST split until reviewed.</small>
                </div>
              </>
            ) : (
              <div className="bf-ledger__row bf-ledger__row--stack">
                <span>GST REVENUE SPLIT</span><strong>{rupees(tax)}</strong>
                <small>CGST {rupees(cgst)} + SGST {rupees(sgst)}</small>
              </div>
            )}
            {globalDiscount > 0 && (
              <div className="bf-ledger__row is-green"><span>BILL DISCOUNT (-)</span><strong>-{rupees(globalDiscount)}</strong></div>
            )}
            {returnCredit > 0 && (
              <div className="bf-ledger__row is-green"><span><FiStar /> RETURN CREDIT (-)</span><strong>-{rupees(returnCredit)}</strong></div>
            )}
            {loyaltyRedemption > 0 && (
              <div className="bf-ledger__row is-green"><span><FiStar /> LOYALTY REDEMPTION (-)</span><strong>-{rupees(loyaltyRedemption)}</strong></div>
            )}
            {roundOff !== 0 && (
              <div className="bf-ledger__row">
                <span>INVOICE TOTAL BEFORE ROUND-OFF</span>
                <strong>
                  {rupees(
                    Number(totals.preCreditGrandTotal ?? totals.grandTotal) -
                      roundOff,
                  )}
                </strong>
              </div>
            )}
            {roundOff !== 0 && (
              <div className="bf-ledger__row"><span>ROUND OFF ADJUSTMENT</span><strong>{roundOff > 0 ? "+" : "-"}{rupees(Math.abs(roundOff))}</strong></div>
            )}
          </section>

          <div className="bf-grand">
            <div className="bf-grand__top"><span>TOTAL PAYABLE NET DUE</span><span>CURRENCY: INR</span></div>
            <div className="bf-grand__row"><span>GRAND TOTAL:</span><strong>{rupees(payable)}</strong></div>
          </div>
        </div>
      </div>

      <footer className="bf-modal__footer">
        <button type="button" className="bf-btn bf-btn--ghost" onClick={onClose}>
          <FiArrowLeft /> BACK <Kbd>ESC</Kbd>
        </button>
        {onHold && (
          <button type="button" className="bf-btn bf-btn--ghost" onClick={onHold} disabled={saving}>
            <FiPauseCircle /> HOLD <Kbd>F10</Kbd>
          </button>
        )}
        <span className="bf-spacer" />
        {printerLabel && <span className="bf-footnote">PRINTER: {printerLabel}</span>}
        <button
          type="button"
          className="bf-btn bf-btn--blue bf-btn--lg"
          onClick={handleConfirmClick}
          disabled={confirmDisabled}
        >
          <FiPrinter /> {saving ? "SAVING…" : "CONFIRM & PRINT BILL"} <Kbd>F8</Kbd>
        </button>
      </footer>
    </TerminalModal>
  );
}
