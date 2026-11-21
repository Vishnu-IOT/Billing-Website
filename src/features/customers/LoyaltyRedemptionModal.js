import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchLoyaltyGiftsAPI,
  fetchLoyaltyTransactionsAPI,
  redeemLoyaltyGiftAPI,
  redeemManualLoyaltyRewardAPI,
} from '../../api';
import { Button, Modal } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import ThermalLoyaltyReceipt from './ThermalLoyaltyReceipt';

const HISTORY_PAGE_SIZE = 50;

function createIdempotencyKey() {
  const cryptoApi = window.crypto;
  return (cryptoApi &&
    typeof cryptoApi.randomUUID === 'function' &&
    cryptoApi.randomUUID()) ||
    `loyalty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function LoyaltyRedemptionModal({
  open,
  customer,
  onClose,
  onBalanceChange,
}) {
  const customerId = customer?.id || customer?._id;
  const [currentBalance, setCurrentBalance] = useState(
    Number(customer?.loyalty_points) || 0
  );
  const availablePoints = currentBalance;
  const [activeTab, setActiveTab] = useState('redeem');
  const [redemptionMethod, setRedemptionMethod] = useState('GIFT');
  const [gifts, setGifts] = useState([]);
  const [giftsError, setGiftsError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [form, setForm] = useState({
    giftId: '',
    pointsToRedeem: '',
    rewardType: 'OTHER',
    rewardDescription: '',
    rewardValue: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [submittedPayload, setSubmittedPayload] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [printRequest, setPrintRequest] = useState(0);

  const eligibleGifts = useMemo(
    () => gifts.filter((gift) => gift.rewardType !== 'PRODUCT'),
    [gifts]
  );
  const selectedGift = eligibleGifts.find(
    (gift) => String(gift.id) === String(form.giftId)
  );
  const pointsToRedeem =
    redemptionMethod === 'GIFT'
      ? Number(selectedGift?.pointsRequired) || 0
      : Number(form.pointsToRedeem) || 0;
  const rewardDescription =
    redemptionMethod === 'GIFT'
      ? selectedGift?.name || ''
      : form.rewardDescription.trim();
  const rewardValue =
    redemptionMethod === 'GIFT'
      ? selectedGift?.rewardValue
      : form.rewardValue;
  const canLoadOlder = history.length < historyCount;

  useEffect(() => {
    if (!open || !customerId) return undefined;
    let active = true;

    setActiveTab('redeem');
    setRedemptionMethod('GIFT');
    setForm({
      giftId: '',
      pointsToRedeem: '',
      rewardType: 'OTHER',
      rewardDescription: '',
      rewardValue: '',
      reason: '',
    });
    setResult(null);
    setError('');
    setGiftsError('');
    setHistoryError('');
    setHistory([]);
    setHistoryCount(0);
    setHistoryOffset(0);
    setGifts([]);
    setCurrentBalance(Number(customer?.loyalty_points) || 0);
    setIdempotencyKey('');
    setSubmittedPayload('');
    setReceipt(null);
    setPrintRequest(0);

    fetchLoyaltyGiftsAPI()
      .then((data) => {
        if (active) setGifts(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        if (active) setGiftsError(loadError.message);
      });

    setHistoryLoading(true);
    fetchLoyaltyTransactionsAPI(customerId, {
      limit: HISTORY_PAGE_SIZE,
      offset: 0,
    })
      .then((data) => {
        if (!active) return;
        const transactions = data?.transactions || [];
        setHistory(transactions);
        setHistoryCount(Number(data?.count) || transactions.length);
        setHistoryOffset(transactions.length);
        const balance = data?.customer?.loyalty_points;
        if (balance !== undefined) {
          setCurrentBalance(Number(balance) || 0);
          onBalanceChange(customerId, balance);
        }
      })
      .catch((loadError) => {
        if (active) setHistoryError(loadError.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  // Balance updates from this modal must not reset the completed redemption.
  // The selected customer's initial balance is read when the modal opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId, onBalanceChange]);

  const loadOlderHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await fetchLoyaltyTransactionsAPI(customerId, {
        limit: HISTORY_PAGE_SIZE,
        offset: historyOffset,
      });
      const transactions = data?.transactions || [];
      setHistory((previous) => [...previous, ...transactions]);
      setHistoryOffset((offset) => offset + transactions.length);
      setHistoryCount(Number(data?.count) || historyCount);
      const balance = data?.customer?.loyalty_points;
      if (balance !== undefined) {
        setCurrentBalance(Number(balance) || 0);
        onBalanceChange(customerId, balance);
      }
    } catch (loadError) {
      setHistoryError(loadError.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (saving || result) return;
    setError('');

    if (redemptionMethod === 'GIFT' && !selectedGift) {
      setError('Select an available gift.');
      return;
    }
    if (
      redemptionMethod === 'MANUAL' &&
      (!form.rewardDescription.trim() ||
        !Number.isInteger(Number(form.pointsToRedeem)) ||
        Number(form.pointsToRedeem) <= 0)
    ) {
      setError('Enter a reward description and a positive whole number of points.');
      return;
    }
    if (pointsToRedeem > availablePoints) {
      setError('The customer does not have enough loyalty points.');
      return;
    }
    if (
      form.rewardValue !== '' &&
      (!Number.isFinite(Number(form.rewardValue)) || Number(form.rewardValue) < 0)
    ) {
      setError('Reward value must be a non-negative amount.');
      return;
    }

    const payload =
      redemptionMethod === 'GIFT'
        ? {
            customerId,
            giftId: Number(form.giftId),
            reason: form.reason.trim() || undefined,
          }
        : {
            customerId,
            pointsToRedeem: Number(form.pointsToRedeem),
            rewardType: form.rewardType,
            rewardDescription: form.rewardDescription.trim(),
            rewardValue:
              form.rewardValue === '' ? undefined : Number(form.rewardValue),
            reason: form.reason.trim() || undefined,
          };
    const serializedPayload = JSON.stringify(payload);
    const requestKey =
      idempotencyKey && submittedPayload === serializedPayload
        ? idempotencyKey
        : createIdempotencyKey();

    setIdempotencyKey(requestKey);
    setSubmittedPayload(serializedPayload);
    setSaving(true);
    try {
      const redemption =
        redemptionMethod === 'GIFT'
          ? await redeemLoyaltyGiftAPI(payload, requestKey)
          : await redeemManualLoyaltyRewardAPI(payload, requestKey);
      setResult(redemption);
      if (redemption.rewardType === 'CASH_DISCOUNT') {
        setReceipt({
          redemptionId: redemption.redemptionId,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          rewardDescription: redemption.rewardDescription,
          rewardValue: redemption.rewardValue,
          pointsRedeemed: redemption.pointsRedeemed,
          remainingPoints: redemption.remainingPoints,
          createdAt: redemption.createdAt || new Date().toISOString(),
        });
      }
      if (redemption.remainingPoints !== undefined) {
        setCurrentBalance(Number(redemption.remainingPoints) || 0);
        onBalanceChange(customerId, redemption.remainingPoints);
      }

      try {
        const data = await fetchLoyaltyTransactionsAPI(customerId, {
          limit: HISTORY_PAGE_SIZE,
          offset: 0,
        });
        const transactions = data?.transactions || [];
        setHistory(transactions);
        setHistoryCount(Number(data?.count) || transactions.length);
        setHistoryOffset(transactions.length);
        const redemptionTransaction = transactions.find(
          (transaction) =>
            String(transaction.redemption?.id) ===
            String(redemption.redemptionId)
        );
        if (
          redemption.rewardType === 'CASH_DISCOUNT' &&
          redemptionTransaction?.redemption
        ) {
          setReceipt({
            redemptionId: redemptionTransaction.redemption.id,
            customerName: data?.customer?.name || customer?.name,
            customerPhone: data?.customer?.phone || customer?.phone,
            rewardDescription:
              redemptionTransaction.redemption.rewardDescription,
            rewardValue: redemptionTransaction.redemption.rewardValue,
            pointsRedeemed: Math.abs(
              Number(redemptionTransaction.pointsDelta) ||
                Number(redemption.pointsRedeemed) ||
                0
            ),
            remainingPoints: redemptionTransaction.balanceAfter,
            createdAt: redemptionTransaction.createdAt,
          });
        }
        const balance = data?.customer?.loyalty_points;
        if (balance !== undefined) {
          setCurrentBalance(Number(balance) || 0);
          onBalanceChange(customerId, balance);
        }
      } catch (historyLoadError) {
        setHistoryError(historyLoadError.message);
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReceipt = (receiptData) => {
    setReceipt(receiptData);
    setPrintRequest((request) => request + 1);
  };

  const receiptForTransaction = (transaction) => ({
    redemptionId: transaction.redemption.id,
    customerName: customer?.name,
    customerPhone: customer?.phone,
    rewardDescription: transaction.redemption.rewardDescription,
    rewardValue: transaction.redemption.rewardValue,
    pointsRedeemed: Math.abs(Number(transaction.pointsDelta) || 0),
    remainingPoints: transaction.balanceAfter,
    createdAt: transaction.createdAt,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Loyalty rewards — ${customer?.name || 'Customer'}`}
      size="lg"
      footer={
        activeTab === 'redeem' && !result ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRedeem} loading={saving}>
              Confirm redemption
            </Button>
          </>
        ) : null
      }
    >
      <ThermalLoyaltyReceipt
        receipt={receipt}
        printRequest={printRequest}
      />
      <div style={{ marginBottom: 16, fontWeight: 700 }}>
        Available points: {availablePoints}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <Button
          variant={activeTab === 'redeem' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('redeem')}
        >
          Redeem points
        </Button>
        <Button
          variant={activeTab === 'history' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('history')}
        >
          Redemption history
        </Button>
      </div>

      {activeTab === 'redeem' && !result && (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor="loyalty-redemption-method">
              Reward source
            </label>
            <select
              id="loyalty-redemption-method"
              className="form-input"
              value={redemptionMethod}
              onChange={(event) => {
                setRedemptionMethod(event.target.value);
                setError('');
              }}
            >
              <option value="GIFT">Predefined gift</option>
              <option value="MANUAL">Manual reward</option>
            </select>
          </div>

          {redemptionMethod === 'GIFT' ? (
            <div className="form-group">
              <label className="form-label" htmlFor="loyalty-gift">
                Gift
              </label>
              <select
                id="loyalty-gift"
                className="form-input"
                value={form.giftId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, giftId: event.target.value }))
                }
              >
                <option value="">Select a gift</option>
                {eligibleGifts.map((gift) => (
                  <option key={gift.id} value={gift.id}>
                    {gift.name} — {gift.pointsRequired} points
                  </option>
                ))}
              </select>
              {giftsError && (
                <div role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
                  {giftsError}
                </div>
              )}
              {gifts.some((gift) => gift.rewardType === 'PRODUCT') && (
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                  Product rewards are unavailable until inventory issue support is
                  provided by the backend.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="loyalty-reward-description">
                  Reward description
                </label>
                <input
                  id="loyalty-reward-description"
                  className="form-input"
                  value={form.rewardDescription}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      rewardDescription: event.target.value,
                    }))
                  }
                  maxLength={255}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="loyalty-reward-type">
                  Reward type
                </label>
                <select
                  id="loyalty-reward-type"
                  className="form-input"
                  value={form.rewardType}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      rewardType: event.target.value,
                    }))
                  }
                >
                  <option value="CASH_DISCOUNT">Cash discount</option>
                  <option value="SERVICE">Service</option>
                  <option value="OTHER">Other</option>
                  <option value="PRODUCT" disabled>
                    Product (inventory issue not supported)
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="loyalty-points-to-redeem">
                  Points to redeem
                </label>
                <input
                  id="loyalty-points-to-redeem"
                  className="form-input"
                  type="number"
                  min="1"
                  step="1"
                  value={form.pointsToRedeem}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      pointsToRedeem: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="loyalty-reward-value">
                  Reference value (optional)
                </label>
                <input
                  id="loyalty-reward-value"
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rewardValue}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      rewardValue: event.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="loyalty-redemption-reason">
              Reason (optional)
            </label>
            <input
              id="loyalty-redemption-reason"
              className="form-input"
              value={form.reason}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, reason: event.target.value }))
              }
              maxLength={255}
            />
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--bg-subtle, #f8fafc)',
              marginBottom: 12,
            }}
          >
            <strong>Redemption summary</strong>
            <div>Reward: {rewardDescription || '—'}</div>
            <div>Points to deduct: {pointsToRedeem || '—'}</div>
            {rewardValue !== '' && rewardValue !== null && rewardValue !== undefined && (
              <div>
                Reference value: {formatCurrency(Number(rewardValue) || 0)}
              </div>
            )}
            <div>Customer payment: ₹0</div>
          </div>
          {error && (
            <div role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
              {error}
            </div>
          )}
        </>
      )}

      {activeTab === 'redeem' && result && (
        <div role="status">
          <h4>Redemption completed</h4>
          <p>{result.rewardDescription || rewardDescription}</p>
          <p>Points redeemed: {result.pointsRedeemed}</p>
          <p>Remaining points: {result.remainingPoints}</p>
          <p>Redemption reference: {result.redemptionId}</p>
          {result.rewardType === 'CASH_DISCOUNT' && receipt && (
            <>
              <p>
                Receipt reference value: {formatCurrency(Number(receipt.rewardValue) || 0)}
              </p>
              <p>
                This is a loyalty redemption receipt, not a sales invoice. The
                reference value is not applied to a separate sale.
              </p>
              <Button
                variant="primary"
                onClick={() => handlePrintReceipt(receipt)}
                style={{ marginBottom: 12 }}
              >
                Print loyalty receipt
              </Button>
            </>
          )}
          {result.replayed && (
            <p>This request matched a redemption that had already completed.</p>
          )}
          <Button variant="secondary" onClick={() => setActiveTab('history')}>
            View history
          </Button>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          {historyError && (
            <div role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
              {historyError}
            </div>
          )}
          {historyLoading && <p>Loading loyalty history…</p>}
          {!historyLoading && history.length === 0 && !historyError && (
            <p>No loyalty transactions found.</p>
          )}
          {history.length > 0 && (
            <div className="table-wrapper" style={{ maxHeight: '50vh', overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Points</th>
                    <th>Balance</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{displayDate(transaction.createdAt)}</td>
                      <td>{transaction.transactionType}</td>
                      <td>{transaction.description || transaction.redemption?.rewardDescription || '—'}</td>
                      <td>{Number(transaction.pointsDelta) > 0 ? '+' : ''}{transaction.pointsDelta}</td>
                      <td>{transaction.balanceAfter}</td>
                      <td>{transaction.redemption?.id || '—'}</td>
                      <td>{transaction.redemption?.status || '—'}</td>
                      <td>
                        {transaction.transactionType === 'REDEEM' &&
                          transaction.redemption?.status === 'COMPLETED' &&
                          transaction.redemption?.rewardType === 'CASH_DISCOUNT' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handlePrintReceipt(
                                  receiptForTransaction(transaction)
                                )
                              }
                            >
                              Reprint
                            </Button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canLoadOlder && (
            <Button
              variant="secondary"
              onClick={loadOlderHistory}
              loading={historyLoading}
              style={{ marginTop: 12 }}
            >
              Load older transactions
            </Button>
          )}
        </>
      )}
    </Modal>
  );
}
