import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArchive, FiEdit2, FiPlus, FiRefreshCw, FiTag } from 'react-icons/fi';
import useAppStore from '../../store/appStore';
import { Button, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import DateInput from '../../components/shared/DateInput';
import {
  archivePromotionOfferAPI,
  createPromotionOfferAPI,
  fetchPromotionOffersAPI,
  updatePromotionOfferAPI,
} from '../../api/promotions';
import './Offers.css';

const OFFER_TYPES = [
  ['BUY_X_GET_Y_FREE', 'Buy X Get Y Free'],
  ['BUY_X_GET_Y_FREE_FIXED', 'Buy X Get Y Free (Fixed)'],
  ['BUY_N_GET_M_FREE', 'Buy N Get M Free'],
  ['PERCENTAGE_DISCOUNT', 'Percentage discount'],
  ['FLAT_DISCOUNT', 'Flat discount'],
  ['SPECIAL_PRICE', 'Special price'],
  ['FREE_GIFT', 'Free gift'],
];

const EMPTY_FORM = {
  id: null,
  name: '',
  offerType: 'BUY_X_GET_Y_FREE',
  targetType: 'product',
  productId: '',
  categoryId: '',
  buyQuantity: '1',
  freeQuantity: '1',
  discountPercentage: '',
  discountAmount: '',
  specialPrice: '',
  giftProductId: '',
  eligibleBillType: 'BOTH',
  priority: '20',
  startDate: '',
  endDate: '',
  isActive: true,
};

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function offerTarget(offer, products, categories) {
  if (offer.Product?.name || offer.product?.name) {
    return offer.Product?.name || offer.product.name;
  }
  if (offer.Category?.name || offer.category?.name) {
    return `Category: ${offer.Category?.name || offer.category.name}`;
  }
  const product = products.find((entry) => String(entry.id || entry._id) === String(offer.productId));
  if (product) return product.name;
  const category = categories.find((entry) => String(entry.id || entry._id) === String(offer.categoryId));
  return category ? `Category: ${category.name}` : '—';
}

function offerSummary(offer) {
  switch (offer.offerType) {
    case 'BUY_X_GET_Y_FREE':
    case 'BUY_X_GET_Y_FREE_FIXED':
    case 'BUY_N_GET_M_FREE':
      return `Buy ${offer.buyQuantity}, get ${offer.freeQuantity} free`;
    case 'PERCENTAGE_DISCOUNT':
      return `${Number(offer.discountPercentage ?? offer.discountValue) || 0}% off`;
    case 'FLAT_DISCOUNT':
      return `${formatCurrency(offer.discountAmount ?? offer.discountValue ?? 0)} off`;
    case 'SPECIAL_PRICE':
      return `Special price ${formatCurrency(offer.specialPrice ?? 0)}`;
    case 'FREE_GIFT':
      return `Buy ${offer.buyQuantity ?? 1}, get ${offer.giftQuantity ?? offer.freeQuantity ?? 1} gift`;
    default:
      return offer.offerType;
  }
}

export default function Offers() {
  const products = useAppStore((state) => state.products || []);
  const categories = useAppStore((state) => state.categories || []);
  const toast = useToast();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetchPromotionOffersAPI();
      const data = response?.data?.data || response?.data || response;
      setOffers(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return offers;
    return offers.filter((offer) =>
      [offer.name, offer.offerType, offerTarget(offer, products, categories)]
        .some((value) => String(value || '').toLowerCase().includes(query)),
    );
  }, [offers, search, products, categories]);

  const isQuantityOffer = form.offerType.startsWith('BUY_');
  const isDiscountOffer = form.offerType === 'PERCENTAGE_DISCOUNT';
  const isFlatOffer = form.offerType === 'FLAT_DISCOUNT';
  const isSpecialPrice = form.offerType === 'SPECIAL_PRICE';
  const isGiftOffer = form.offerType === 'FREE_GIFT';
  const hasQuantityThreshold = isQuantityOffer || isGiftOffer;
  const supportsGiftProduct = isQuantityOffer || isGiftOffer;

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  }

  function openEdit(offer) {
    setForm({
      ...EMPTY_FORM,
      ...offer,
      id: offer.id,
      targetType: offer.productId ? 'product' : 'category',
      productId: offer.productId ? String(offer.productId) : '',
      categoryId: offer.categoryId ? String(offer.categoryId) : '',
      giftProductId: offer.giftProductId ? String(offer.giftProductId) : '',
      buyQuantity: String(offer.buyQuantity ?? 1),
      freeQuantity: String(
        offer.offerType === 'FREE_GIFT'
          ? offer.giftQuantity ?? offer.freeQuantity ?? 1
          : offer.freeQuantity ?? 1,
      ),
      discountPercentage: String(offer.discountPercentage ?? ''),
      discountAmount: String(offer.discountAmount ?? ''),
      specialPrice: String(offer.specialPrice ?? ''),
      priority: String(offer.priority ?? 0),
      startDate: dateValue(offer.startDate),
      endDate: dateValue(offer.endDate),
      isActive: Boolean(offer.isActive),
    });
    setFormOpen(true);
  }

  function buildPayload() {
    const isGiftOffer = form.offerType === 'FREE_GIFT';
    return {
      name: form.name.trim(),
      offerType: form.offerType,
      productId: form.targetType === 'product' ? Number(form.productId) : null,
      categoryId: form.targetType === 'category' ? Number(form.categoryId) : null,
      buyQuantity: Number(form.buyQuantity || 1),
      freeQuantity: isGiftOffer ? 0 : Number(form.freeQuantity || 0),
      discountPercentage: Number(form.discountPercentage || 0),
      discountAmount: Number(form.discountAmount || 0),
      specialPrice: form.specialPrice === '' ? null : Number(form.specialPrice),
      giftProductId: form.giftProductId ? Number(form.giftProductId) : null,
      giftQuantity: isGiftOffer ? Number(form.freeQuantity || 0) : Number(form.freeQuantity || 1),
      eligibleBillType: form.eligibleBillType,
      priority: Number(form.priority || 0),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: Boolean(form.isActive),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Offer name is required');
    if (form.targetType === 'product' && !form.productId) return toast.error('Select a product');
    if (form.targetType === 'category' && !form.categoryId) return toast.error('Select a category');
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      return toast.error('End date must be on or after the start date');
    }
    if (isQuantityOffer && (Number(form.buyQuantity) <= 0 || Number(form.freeQuantity) <= 0)) {
      return toast.error('Buy and free quantities must be greater than zero');
    }
    if (isGiftOffer && Number(form.buyQuantity) <= 0) {
      return toast.error('Gift qualifying quantity must be greater than zero');
    }
    if (isGiftOffer && Number(form.freeQuantity) <= 0) {
      return toast.error('Gift quantity must be greater than zero');
    }
    if (isGiftOffer && !form.giftProductId) return toast.error('Select a gift product');

    setSaving(true);
    try {
      const payload = buildPayload();
      if (form.id) {
        await updatePromotionOfferAPI(form.id, payload);
        toast.success('Offer updated');
      } else {
        await createPromotionOfferAPI(payload);
        toast.success('Offer created');
      }
      setFormOpen(false);
      await loadOffers();
    } catch (error) {
      toast.error(error.message || 'Could not save offer');
    } finally {
      setSaving(false);
    }
  }

  async function toggleOffer(offer) {
    try {
      await updatePromotionOfferAPI(offer.id, { isActive: !offer.isActive });
      toast.success(offer.isActive ? 'Offer deactivated' : 'Offer activated');
      await loadOffers();
    } catch (error) {
      toast.error(error.message || 'Could not change offer status');
    }
  }

  async function archiveOffer(offer) {
    if (!window.confirm(`Archive “${offer.name}”? Existing sale history will remain unchanged.`)) return;
    try {
      await archivePromotionOfferAPI(offer.id);
      toast.success('Offer archived');
      await loadOffers();
    } catch (error) {
      toast.error(error.message || 'Could not archive offer');
    }
  }

  return (
    <main className="offers-page">
      <ToastContainer toasts={toast.toasts} />
      <header className="offers-header">
        <div>
          <span className="offers-kicker">PRICING MANAGEMENT</span>
          <h1>Offers</h1>
          <p>Offers are validated by the backend at POS checkout.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <FiPlus aria-hidden="true" /> New offer
        </Button>
      </header>

      <section className="offers-toolbar" aria-label="Offer controls">
        <input
          type="search"
          className="form-input offers-search"
          placeholder="Search offers, products, or types"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="secondary" onClick={loadOffers} loading={loading}>
          <FiRefreshCw aria-hidden="true" /> Refresh
        </Button>
      </section>

      {loadError ? (
        <div className="offers-state offers-error" role="alert">
          <strong>Could not load offers.</strong> {loadError}
        </div>
      ) : loading ? (
        <div className="offers-state" role="status">Loading offers…</div>
      ) : filteredOffers.length === 0 ? (
        <div className="offers-state">
          <FiTag aria-hidden="true" />
          <strong>{offers.length ? 'No matching offers' : 'No offers configured'}</strong>
          {!offers.length && <span>Create an offer here, then let POS apply it using the backend promotion engine.</span>}
        </div>
      ) : (
        <div className="offers-table-wrap">
          <table className="offers-table">
            <thead>
              <tr>
                <th>Offer</th>
                <th>Applies To</th>
                <th>Rule</th>
                <th>Bill Type</th>
                <th>Validity</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <strong>{offer.name}</strong>
                    <span className="offers-subline">{offer.offerType}</span>
                  </td>
                  <td>{offerTarget(offer, products, categories)}</td>
                  <td>{offerSummary(offer)}</td>
                  <td>{offer.eligibleBillType || 'BOTH'}</td>
                  <td>{dateValue(offer.startDate) || 'Any'} – {dateValue(offer.endDate) || 'Any'}</td>
                  <td>
                    <span className={`offers-status ${offer.isActive ? 'is-active' : 'is-inactive'}`}>
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="offers-actions">
                      <button type="button" title="Edit offer" aria-label={`Edit ${offer.name}`} onClick={() => openEdit(offer)}>
                        <FiEdit2 />
                      </button>
                      <button type="button" title={offer.isActive ? 'Deactivate offer' : 'Activate offer'} onClick={() => toggleOffer(offer)}>
                        {offer.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button type="button" title="Archive offer" aria-label={`Archive ${offer.name}`} onClick={() => archiveOffer(offer)}>
                        <FiArchive />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="offers-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setFormOpen(false);
        }}>
          <section className="offers-modal" role="dialog" aria-modal="true" aria-labelledby="offer-form-title">
            <header className="offers-modal-header">
              <div>
                <span className="offers-kicker">REGULAR OFFER</span>
                <h2 id="offer-form-title">{form.id ? 'Edit offer' : 'New offer'}</h2>
              </div>
              <button type="button" aria-label="Close offer form" onClick={() => setFormOpen(false)} disabled={saving}>×</button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className="offers-form-grid">
                <label className="form-group offers-field-wide">
                  <span className="form-label">Offer name *</span>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label className="form-group">
                  <span className="form-label">Offer type *</span>
                  <select className="form-select" value={form.offerType} onChange={(e) => setForm({ ...form, offerType: e.target.value })}>
                    {OFFER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span className="form-label">Applies to *</span>
                  <select className="form-select" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, productId: '', categoryId: '' })}>
                    <option value="product">Product</option>
                    <option value="category">Category</option>
                  </select>
                </label>
                {form.targetType === 'product' ? (
                  <label className="form-group offers-field-wide">
                    <span className="form-label">Product *</span>
                    <select className="form-select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                      <option value="">Select product</option>
                      {products.map((product) => <option key={product.id || product._id} value={product.id || product._id}>{product.name} {product.barcode ? `· ${product.barcode}` : ''}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="form-group offers-field-wide">
                    <span className="form-label">Category *</span>
                    <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                      <option value="">Select category</option>
                      {categories.map((category) => <option key={category.id || category._id} value={category.id || category._id}>{category.name}</option>)}
                    </select>
                  </label>
                )}
                {hasQuantityThreshold && <label className="form-group"><span className="form-label">{isGiftOffer ? 'Paid quantity to qualify *' : 'Paid quantity threshold *'}</span><input className="form-input" type="number" min="0.001" step="0.001" value={form.buyQuantity} onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })} required /></label>}
                {isQuantityOffer && <>
                  <label className="form-group"><span className="form-label">Free quantity *</span><input className="form-input" type="number" min="0.001" step="0.001" value={form.freeQuantity} onChange={(e) => setForm({ ...form, freeQuantity: e.target.value })} required /></label>
                </>}
                {isGiftOffer && <label className="form-group"><span className="form-label">Gift quantity *</span><input className="form-input" type="number" min="0.001" step="0.001" value={form.freeQuantity} onChange={(e) => setForm({ ...form, freeQuantity: e.target.value })} required /></label>}
                {supportsGiftProduct && <label className="form-group offers-field-wide"><span className="form-label">{isGiftOffer ? 'Gift product *' : 'Gift product'} {!isGiftOffer && <small>(blank means the qualifying product)</small>}</span><select className="form-select" value={form.giftProductId} onChange={(e) => setForm({ ...form, giftProductId: e.target.value })} required={isGiftOffer}><option value="">{isGiftOffer ? 'Select gift product' : 'Same product'}</option>{products.map((product) => <option key={product.id || product._id} value={product.id || product._id}>{product.name}</option>)}</select></label>}
                {isDiscountOffer && <label className="form-group"><span className="form-label">Discount % *</span><input className="form-input" type="number" min="0.01" max="100" step="0.01" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} required /></label>}
                {isFlatOffer && <label className="form-group"><span className="form-label">Discount amount *</span><input className="form-input" type="number" min="0.01" step="0.01" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} required /></label>}
                {isSpecialPrice && <label className="form-group"><span className="form-label">Special price *</span><input className="form-input" type="number" min="0" step="0.01" value={form.specialPrice} onChange={(e) => setForm({ ...form, specialPrice: e.target.value })} required /></label>}
                <label className="form-group"><span className="form-label">Eligible bill type</span><select className="form-select" value={form.eligibleBillType} onChange={(e) => setForm({ ...form, eligibleBillType: e.target.value })}><option value="BOTH">Both</option><option value="B2C">B2C</option><option value="B2B">B2B</option></select></label>
                <label className="form-group"><span className="form-label">Priority</span><input className="form-input" type="number" min="0" step="1" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></label>
                <label className="form-group"><span className="form-label">Start date</span><DateInput className="form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
                <label className="form-group"><span className="form-label">End date</span><DateInput className="form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
                <label className="offers-active-toggle"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active immediately</label>
              </div>
              <footer className="offers-modal-footer">
                <Button variant="secondary" type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
                <Button variant="primary" type="submit" loading={saving}>{form.id ? 'Save changes' : 'Create offer'}</Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
