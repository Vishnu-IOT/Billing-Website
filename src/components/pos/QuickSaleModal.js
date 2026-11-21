import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiPlus, FiX } from 'react-icons/fi';
import { ModalClose, TerminalModal } from './posTerminal';
import { formatCurrency } from '../../utils/currency';

export default function QuickSaleModal({
  initialName = '',
  initialBarcode = '',
  alias = null,
  saving = false,
  onClose,
  onAdd,
}) {
  const [name, setName] = useState(initialName);
  const [barcode, setBarcode] = useState(initialBarcode);
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialName);
    setBarcode(initialBarcode);
    setMrp('');
    setSellingPrice('');
    setQuantity('1');
    setError('');
  }, [initialName, initialBarcode, alias]);

  async function handleSubmit(event) {
    event.preventDefault();
    const item = {
      name: name.trim().replace(/\s+/g, ' '),
      barcode: barcode.trim(),
      mrp: Number(mrp),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity),
    };
    if (!item.name || item.name.length > 255) {
      setError('Enter a product name up to 255 characters.');
      return;
    }
    if (!Number.isFinite(item.mrp) || item.mrp <= 0) {
      setError('Enter a valid MRP.');
      return;
    }
    if (
      !Number.isFinite(item.sellingPrice) ||
      item.sellingPrice <= 0 ||
      item.sellingPrice > item.mrp
    ) {
      setError('Selling price must be greater than zero and cannot exceed MRP.');
      return;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      setError('Enter a valid quantity.');
      return;
    }
    setError('');
    try {
      await onAdd(item);
    } catch (submitError) {
      setError(submitError.message || 'Could not add this Quick Sale item.');
    }
  }

  return (
    <TerminalModal
      tone="blue"
      label="Quick Sale item"
      width={640}
      onOverlayClick={saving ? undefined : onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !saving) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <header className="bf-modal__header">
        <div className="bf-modal__logo"><FiPlus /></div>
        <div className="bf-modal__headtext">
          <h2 className="bf-modal__title">ADD QUICK SALE ITEM</h2>
          <div className="bf-modal__meta">This item will be recorded without creating stock or a product.</div>
        </div>
        <ModalClose onClick={onClose} disabled={saving} />
      </header>
      <form onSubmit={handleSubmit}>
        <div className="bf-modal__body bf-quick-sale__body">
          {alias?.gstVerificationStatus === 'GST_VERIFIED' ? (
            <div role="status" className="bf-alert bf-alert--success">
              GST verified at {alias.verifiedTaxRate}% for future Quick Sale entries.
            </div>
          ) : (
            <div role="status" className="bf-alert bf-alert--warning">
              <FiAlertCircle /> GST classification is pending. The entered selling price remains payable; no GST rate will be assumed.
            </div>
          )}
          <label className="bf-quick-sale__field">
            <span>Product name *</span>
            <input
              className="bf-quick-sale__input"
              autoFocus
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="bf-quick-sale__field">
            <span>Barcode (optional)</span>
            <input
              className="bf-quick-sale__input"
              maxLength={255}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
            />
          </label>
          <div className="bf-quick-sale__price-fields">
            <label className="bf-quick-sale__field">
              <span>MRP *</span>
              <input
                className="bf-quick-sale__input"
                type="number"
                min="0.01"
                step="0.01"
                value={mrp}
                onChange={(event) => setMrp(event.target.value)}
                required
              />
            </label>
            <label className="bf-quick-sale__field">
              <span>Selling price (GST inclusive) *</span>
              <input
                className="bf-quick-sale__input"
                type="number"
                min="0.01"
                step="0.01"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                required
              />
            </label>
            <label className="bf-quick-sale__field">
              <span>Quantity *</span>
              <input
                className="bf-quick-sale__input"
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>
          </div>
          {sellingPrice && quantity && Number(sellingPrice) > 0 && Number(quantity) > 0 && (
            <div className="bf-readfield" aria-live="polite">
              Line amount: {formatCurrency(Number(sellingPrice) * Number(quantity))}
            </div>
          )}
          {error && <div role="alert" className="bf-alert bf-alert--danger">{error}</div>}
        </div>
        <footer className="bf-modal__footer">
          <button type="button" className="bf-btn bf-btn--ghost" onClick={onClose} disabled={saving}>
            <FiX /> Cancel
          </button>
          <button type="submit" className="bf-btn bf-btn--primary" disabled={saving}>
            {saving ? 'Checking…' : 'Add to bill'}
          </button>
        </footer>
      </form>
    </TerminalModal>
  );
}
