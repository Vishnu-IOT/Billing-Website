import React, { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiPackage, FiX } from 'react-icons/fi';
import { formatCurrency } from '../../utils/currency';
import { formatQuantity, isWeightProduct } from '../../utils/quantityUnits';
import { allocatePriceGroupQuantity } from '../../utils/priceCheck';
import { TerminalModal, Kbd } from './posTerminal';

export default function PriceCheckModal({
  open,
  product,
  groups = [],
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const [selectedKey, setSelectedKey] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [quantityError, setQuantityError] = useState('');
  const quantityRef = React.useRef(null);
  const weightProduct = isWeightProduct(product);
  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedKey) || null,
    [groups, selectedKey],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedKey(groups[0]?.key || '');
    setQuantity('1');
    setQuantityError('');
  }, [open, groups]);

  useEffect(() => {
    if (open && selectedGroup && !loading) quantityRef.current?.focus();
  }, [open, selectedGroup, loading]);

  if (!open) return null;

  const requestedQuantity = Number(quantity);
  const quantityValid =
    Number.isFinite(requestedQuantity) &&
    requestedQuantity > 0 &&
    (weightProduct || Number.isInteger(requestedQuantity)) &&
    requestedQuantity <= Number(selectedGroup?.availableQuantity || 0) + 0.001;
  const allocations = quantityValid
    ? allocatePriceGroupQuantity(selectedGroup, requestedQuantity)
    : null;

  const confirm = () => {
    if (loading || !selectedGroup) return;
    if (!quantityValid || !allocations) {
      setQuantityError(
        requestedQuantity > Number(selectedGroup.availableQuantity)
          ? 'Requested quantity exceeds stock for this MRP and price.'
          : 'Enter a valid quantity.',
      );
      return;
    }
    onConfirm({ group: selectedGroup, quantity: requestedQuantity, batchAllocations: allocations });
  };

  return (
    <TerminalModal
      tone="blue"
      label={`Price check for ${product?.name || 'product'}`}
      width={760}
      onOverlayClick={onCancel}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        } else if (
          event.key === 'Enter' &&
          event.target.tagName !== 'BUTTON' &&
          event.target.type !== 'radio'
        ) {
          event.preventDefault();
          confirm();
        }
      }}
    >
      <header className="bf-modal__header">
        <div className="bf-modal__logo"><FiPackage /></div>
        <div className="bf-modal__headtext">
          <h2 className="bf-modal__title">PRICE CHECK</h2>
          <div className="bf-modal__meta">{product?.name || 'Product'}{product?.barcode ? ` · ${product.barcode}` : ''}</div>
        </div>
        <button type="button" className="bf-modal__close" onClick={onCancel} aria-label="Close price check">
          <FiX />
        </button>
      </header>

      <div className="bf-modal__body">
        {loading ? (
          <div role="status" className="bf-hint">Checking current batch prices and stock…</div>
        ) : error ? (
          <div role="alert" className="bf-error">{error}</div>
        ) : groups.length === 0 ? (
          <div role="status" className="bf-hint">No eligible batch stock is available.</div>
        ) : (
          <>
            <section className="bf-section">
              <span className="bf-label">SELECT MRP / SELLING PRICE</span>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {groups.map((group) => (
                  <label
                    key={group.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      alignItems: 'center',
                      gap: 12,
                      border: `1px solid ${group.key === selectedKey ? '#2563eb' : '#cbd5e1'}`,
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                      background: group.key === selectedKey ? '#eff6ff' : '#fff',
                    }}
                  >
                    <input
                      type="radio"
                      name="price-check-group"
                      value={group.key}
                      checked={group.key === selectedKey}
                      onChange={() => {
                        setSelectedKey(group.key);
                        setQuantityError('');
                      }}
                    />
                    <span>
                      <strong>MRP {formatCurrency(group.mrp)}</strong>
                      <span style={{ display: 'block', fontSize: 12, color: '#475569' }}>
                        Selling {formatCurrency(group.salePrice)} · GST {group.taxRate}% · {group.priceType.replace('_', ' ')}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <strong>{formatQuantity(group.availableQuantity)}</strong>
                      <span style={{ display: 'block', fontSize: 12, color: '#475569' }}>
                        {weightProduct ? 'KG' : 'PCS'} · {group.batches.length} batch{group.batches.length === 1 ? '' : 'es'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {selectedGroup && (
              <section className="bf-section bf-section--panel">
                <div className="bf-split2">
                  <div>
                    <span className="bf-label">SELECTED PRICE</span>
                    <div className="bf-card__big">{formatCurrency(selectedGroup.salePrice)}</div>
                  </div>
                  <div>
                    <span className="bf-label">AVAILABLE IN THIS PRICE GROUP</span>
                    <div className="bf-card__big">
                      {formatQuantity(selectedGroup.availableQuantity)} {weightProduct ? 'KG' : 'PCS'}
                    </div>
                  </div>
                </div>
                <label className="bf-label" htmlFor="price-check-quantity">QUANTITY</label>
                <input
                  ref={quantityRef}
                  id="price-check-quantity"
                  className="form-input"
                  type="number"
                  min={weightProduct ? '0.001' : '1'}
                  max={selectedGroup.availableQuantity}
                  step={weightProduct ? '0.001' : '1'}
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value);
                    setQuantityError('');
                  }}
                  aria-invalid={Boolean(quantityError)}
                />
                {quantityError && <div className="bf-error" role="alert">{quantityError}</div>}
                {!quantityError && requestedQuantity > selectedGroup.availableQuantity && (
                  <div className="bf-error" role="alert">Requested quantity exceeds stock for this price group.</div>
                )}
                {!quantityError && quantity.trim() && !Number.isFinite(requestedQuantity) && (
                  <div className="bf-error" role="alert">Enter a valid quantity.</div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <footer className="bf-modal__footer">
        <button type="button" className="bf-btn bf-btn--ghost" onClick={onCancel}>
          CANCEL <Kbd>ESC</Kbd>
        </button>
        <span className="bf-spacer" />
        <button
          type="button"
          className="bf-btn bf-btn--blue bf-btn--lg"
          onClick={confirm}
          disabled={loading || !selectedGroup || !quantityValid || !allocations}
        >
          <FiCheckCircle /> ADD TO BILL <Kbd>ENTER</Kbd>
        </button>
      </footer>
    </TerminalModal>
  );
}
