import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiFilter,
  FiPackage,
  FiPlus,
  FiPrinter,
  FiRotateCcw,
  FiSearch,
} from 'react-icons/fi';
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  LoadingSpinner,
  ToastContainer,
} from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/currency';
import useAuthStore from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';
import {
  cancelPurchaseReturnAPI,
  createPurchaseReturnAPI,
  applySupplierCreditAPI,
  fetchEligiblePurchaseInvoicesAPI,
  fetchPurchaseReturnAPI,
  fetchPurchaseReturnItemsAPI,
  fetchPurchaseReturnsAPI,
  fetchSupplierCreditInvoicesAPI,
  fetchSupplierCreditsAPI,
  fetchPurchaseReturnSuppliersAPI,
} from '../../api/purchaseReturns';
import '../../styles/purchaseReturns.css';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const amount = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN') : '—';

function linePreview(item, enteredQuantity, taxType) {
  const quantity = Number(enteredQuantity || 0);
  const paidPurchased = Number(item.paidQuantity ?? item.quantity ?? 0);
  const previouslyReturnedPaid = Number(item.previouslyReturnedPaidQuantity || 0);
  const paidQuantity = Math.min(quantity, Math.max(0, paidPurchased - previouslyReturnedPaid));
  const cumulativeRatio = paidPurchased > 0
    ? (previouslyReturnedPaid + paidQuantity) / paidPurchased
    : 0;
  const delta = (original, previous) =>
    amount(amount(Number(original || 0) * cumulativeRatio) - Number(previous || 0));
  const totalTax = delta(item.taxAmount, item.previouslyReturnedTaxAmount);
  const cgstAmount = taxType === 'IGST'
    ? 0
    : item.igstAmount === null || item.igstAmount === undefined
      ? amount(
        amount(amount(Number(item.taxAmount || 0) * cumulativeRatio) / 2) -
        Number(item.previouslyReturnedCgstAmount || 0)
      )
      : delta(item.cgstAmount, item.previouslyReturnedCgstAmount);
  return {
    quantity,
    paidQuantity,
    taxableAmount: delta(item.baseRate, item.previouslyReturnedTaxableAmount),
    discountAmount: delta(item.discountAmount, item.previouslyReturnedDiscountAmount),
    cgstAmount,
    sgstAmount: taxType === 'IGST' ? 0 : amount(totalTax - cgstAmount),
    igstAmount: taxType === 'IGST' ? totalTax : 0,
    totalTax,
    totalAmount: delta(item.netRate, item.previouslyReturnedNetAmount),
  };
}

export default function PurchaseReturns() {
  const user = useAuthStore((state) => state.user);
  const toast = useToast();
  const [view, setView] = useState('list');
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [purchaseId, setPurchaseId] = useState('');
  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [returnDate, setReturnDate] = useState(localDate());
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [creditSupplierId, setCreditSupplierId] = useState('');
  const [creditInvoices, setCreditInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [creditPurchaseId, setCreditPurchaseId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditSaving, setCreditSaving] = useState(false);

  const canCreate = hasPermission(user, 'purchases.returns.create');
  const canCancel = hasPermission(user, 'purchases.returns.cancel');
  const canPrint = hasPermission(user, 'purchases.returns.print');
  const loadList = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const [listResult, supplierResult] = await Promise.all([
        fetchPurchaseReturnsAPI({
          page: nextPage,
          pageSize: 50,
          search: search.trim() || undefined,
          supplierId: supplierFilter || undefined,
          startDate: dateFilter.startDate || undefined,
          endDate: dateFilter.endDate || undefined,
        }),
        fetchPurchaseReturnSuppliersAPI(),
      ]);
      setRows(listResult.data || []);
      setTotalRows(listResult.pagination?.total || 0);
      setTotalPages(listResult.pagination?.totalPages || 1);
      setSuppliers(supplierResult);
      setPage(nextPage);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter.endDate, dateFilter.startDate, page, search, supplierFilter]);

  useEffect(() => {
    loadList(1);
    // Load the first page when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLines = useMemo(() => items
    .map((item) => ({ item, preview: linePreview(item, quantities[item.id], purchase?.taxType) }))
    .filter(({ preview }) => preview.quantity > 0), [items, purchase?.taxType, quantities]);
  const totals = useMemo(() => selectedLines.reduce((sum, line) => ({
    taxableAmount: amount(sum.taxableAmount + line.preview.taxableAmount),
    discountAmount: amount(sum.discountAmount + line.preview.discountAmount),
    cgstAmount: amount(sum.cgstAmount + line.preview.cgstAmount),
    sgstAmount: amount(sum.sgstAmount + line.preview.sgstAmount),
    igstAmount: amount(sum.igstAmount + line.preview.igstAmount),
    totalTax: amount(sum.totalTax + line.preview.totalTax),
    grandTotal: amount(sum.grandTotal + line.preview.totalAmount),
  }), {
    taxableAmount: 0,
    discountAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTax: 0,
    grandTotal: 0,
  }), [selectedLines]);

  async function handleSupplierChange(value) {
    setSupplierId(value);
    setPurchaseId('');
    setPurchase(null);
    setItems([]);
    setQuantities({});
    setInvoices([]);
    if (!value) return;
    try {
      setError('');
      setInvoices(await fetchEligiblePurchaseInvoicesAPI(value));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function handleInvoiceChange(value) {
    setPurchaseId(value);
    setPurchase(null);
    setItems([]);
    setQuantities({});
    if (!value) return;
    try {
      setError('');
      const result = await fetchPurchaseReturnItemsAPI(value);
      setPurchase(result.purchase);
      setItems(result.items || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  function resetForm() {
    setSupplierId('');
    setInvoices([]);
    setPurchaseId('');
    setPurchase(null);
    setItems([]);
    setQuantities({});
    setReturnDate(localDate());
    setReason('');
    setNotes('');
    setError('');
  }

  async function saveReturn(event) {
    event.preventDefault();
    if (!purchase || !selectedLines.length) {
      setError('Select an original invoice and enter a return quantity for at least one valid batch.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createPurchaseReturnAPI({
        purchaseId: Number(purchase.id),
        returnDate,
        reason,
        notes,
        idempotencyKey: window.crypto?.randomUUID?.() ||
          `purchase-return-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        items: selectedLines.map(({ item, preview }) => ({
          purchaseItemId: item.id,
          productBatchId: item.productBatchId,
          quantity: preview.quantity,
          quantityUnit: item.quantityUnit,
        })),
      });
      setRecord(created);
      setView('detail');
      toast.success(`Debit note ${created.returnNumber} saved`);
      resetForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function openReturn(id, forPrint = false) {
    setLoading(true);
    try {
      setRecord(await fetchPurchaseReturnAPI(id, forPrint));
      setView('detail');
    } catch (loadError) {
      toast.error(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function printReturn(id = record?.id) {
    if (!id) return;
    await openReturn(id, true);
    window.setTimeout(() => window.print(), 100);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await cancelPurchaseReturnAPI(cancelTarget.id);
      toast.success('Debit note cancelled and exact batch stock restored');
      setCancelTarget(null);
      if (view === 'detail') {
        const refreshed = await fetchPurchaseReturnAPI(cancelTarget.id);
        setRecord(refreshed);
      }
      await loadList(page);
    } catch (cancelError) {
      toast.error(cancelError.message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleCreditSupplierChange(value) {
    setCreditSupplierId(value);
    setCreditPurchaseId('');
    setCreditAmount('');
    setCreditInvoices([]);
    setCreditNotes([]);
    if (!value) return;
    try {
      setError('');
      const [invoicesResult, notesResult] = await Promise.all([
        fetchSupplierCreditInvoicesAPI(value),
        fetchSupplierCreditsAPI(value),
      ]);
      setCreditInvoices(invoicesResult);
      setCreditNotes(notesResult);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function handleApplySupplierCredit(event) {
    event.preventDefault();
    if (!creditPurchaseId) {
      setError('Select a payable purchase invoice.');
      return;
    }
    setCreditSaving(true);
    setError('');
    try {
      const response = await applySupplierCreditAPI({
        purchaseId: Number(creditPurchaseId),
        amount: creditAmount || undefined,
        idempotencyKey: window.crypto?.randomUUID?.() ||
          `supplier-credit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      });
      toast.success(`${formatCurrency(response.appliedAmount)} supplier credit applied`);
      await handleCreditSupplierChange(creditSupplierId);
      await loadList(1);
    } catch (applyError) {
      setError(applyError.message);
    } finally {
      setCreditSaving(false);
    }
  }

  if (loading && view === 'detail') {
    return <LoadingSpinner />;
  }

  if (view === 'create') {
    return (
      <div className="purchase-return-page purchase-return-workflow">
        <ToastContainer toasts={toast.toasts} />
        <div className="page-header purchase-return-subpage-header">
          <Button onClick={() => { resetForm(); setView('list'); }} icon={<FiArrowLeft />}>Back to returns</Button>
          <div>
            <h1>Create Purchase Return</h1>
            <p className="page-header__sub">Create a debit note against an original purchase invoice.</p>
          </div>
          <span className="purchase-return-step-label"><FiRotateCcw /> New debit note</span>
        </div>
        <form className="purchase-return-form" onSubmit={saveReturn}>
          <section className="purchase-return-card">
            <div className="purchase-return-section-heading">
              <span className="purchase-return-section-heading__icon"><FiFileText /></span>
              <div><h2>Supplier and original invoice</h2><p>Choose the supplier bill this return belongs to.</p></div>
            </div>
            <div className="purchase-return-grid">
              <label>
                Supplier
                <select value={supplierId} onChange={(event) => handleSupplierChange(event.target.value)} required>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Original purchase invoice
                <select
                  value={purchaseId}
                  onChange={(event) => handleInvoiceChange(event.target.value)}
                  disabled={!supplierId || !invoices.length}
                  required
                >
                  <option value="">Select invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} · {dateLabel(invoice.purchaseDate)} · {formatCurrency(invoice.totalAmount)}
                    </option>
                  ))}
                </select>
                {supplierId && invoices.length === 0 && <small>No eligible purchase invoices for this supplier.</small>}
              </label>
              <label>
                Return date
                <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required />
              </label>
              <label>
                Reason
                <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} placeholder="Damaged, expired, excess stock..." />
              </label>
            </div>
            {purchase && (
              <div className="purchase-return-invoice-note">
                <strong>{purchase.Party?.name || suppliers.find((supplier) => String(supplier.id) === String(supplierId))?.name}</strong>
                <span>Invoice {purchase.invoiceNumber} · {dateLabel(purchase.purchaseDate)}</span>
                <span>Original total {formatCurrency(purchase.totalAmount)}</span>
              </div>
            )}
          </section>

          <section className="purchase-return-card">
            <div className="purchase-return-section-heading">
              <span className="purchase-return-section-heading__icon"><FiPackage /></span>
              <div><h2>Purchased products and exact batches</h2><p>Return quantities are checked against the original batch and available stock.</p></div>
            </div>
            {!purchase ? (
              <p className="purchase-return-muted">Select an invoice to load its original purchase items.</p>
            ) : items.length === 0 ? (
              <p className="purchase-return-muted">This purchase invoice has no items.</p>
            ) : (
              <div className="purchase-return-table-wrap">
                <table className="purchase-return-table">
                  <thead>
                    <tr>
                      <th>Product / batch</th>
                      <th>Purchased</th>
                      <th>Returned</th>
                      <th>Remaining</th>
                      <th>Available stock</th>
                      <th>Rate / GST</th>
                      <th>Return qty</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const preview = linePreview(item, quantities[item.id], purchase?.taxType);
                      const canReturn = item.batchReferenceValid &&
                        Number(item.remainingReturnableQuantity) > 0 &&
                        Number(item.currentBatchAvailableQuantity) > 0;
                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.productName || item.Product?.name}</strong>
                            <small>{item.sku || item.Product?.sku || item.barcode || item.Product?.barcode || 'No SKU'} · Batch {item.ProductBatch?.batchNumber || item.batchNo || 'unknown'}</small>
                            <small>MRP {formatCurrency(item.ProductBatch?.mrp)} · {item.priceType || 'WITHOUT_GST'} · GST {Number(item.taxPercentage || item.productGstRate || 0)}%</small>
                            {!item.batchReferenceValid && <small className="purchase-return-warning">Original batch is unavailable or not company-linked. This line cannot be returned.</small>}
                          </td>
                          <td>{Number(item.totalQuantity ?? item.quantity)} {item.quantityUnit}</td>
                          <td>{Number(item.previouslyReturnedQuantity || 0)} {item.quantityUnit}</td>
                          <td>{Number(item.remainingReturnableQuantity)} {item.quantityUnit}</td>
                          <td>{Number(item.currentBatchAvailableQuantity)} {item.quantityUnit}</td>
                          <td>
                            {formatCurrency(item.price)}
                            <small>{Number(item.taxPercentage || item.productGstRate || 0)}% GST</small>
                          </td>
                          <td>
                            <input
                              className="purchase-return-quantity"
                              type="number"
                              min="0"
                              max={Math.min(Number(item.remainingReturnableQuantity), Number(item.currentBatchAvailableQuantity))}
                              step={item.Product?.allowDecimalQuantity ? '0.001' : '1'}
                              value={quantities[item.id] ?? ''}
                              disabled={!canReturn}
                              onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))}
                              aria-label={`Return quantity for ${item.productName}`}
                            />
                          </td>
                          <td className="text-right">{formatCurrency(preview.totalAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="purchase-return-summary-layout">
            <div className="purchase-return-card">
              <div className="purchase-return-section-heading">
                <span className="purchase-return-section-heading__icon"><FiCheckCircle /></span>
                <div><h2>Debit note summary</h2><p>Values are calculated from the original purchase bill.</p></div>
              </div>
              <div className="purchase-return-summary">
                <span>Taxable amount <strong>{formatCurrency(totals.taxableAmount)}</strong></span>
                {totals.discountAmount > 0 && <span>Original allocated discount <strong>{formatCurrency(totals.discountAmount)}</strong></span>}
                {totals.cgstAmount > 0 && <span>CGST <strong>{formatCurrency(totals.cgstAmount)}</strong></span>}
                {totals.sgstAmount > 0 && <span>SGST <strong>{formatCurrency(totals.sgstAmount)}</strong></span>}
                {totals.igstAmount > 0 && <span>IGST <strong>{formatCurrency(totals.igstAmount)}</strong></span>}
                <span>Total GST <strong>{formatCurrency(totals.totalTax)}</strong></span>
                <span className="purchase-return-grand-total">Debit note total <strong>{formatCurrency(totals.grandTotal)}</strong></span>
              </div>
            </div>
            <div className="purchase-return-card purchase-return-notes-card">
              <div className="purchase-return-section-heading">
                <span className="purchase-return-section-heading__icon"><FiFileText /></span>
                <div><h2>Notes and settlement</h2><p>Keep a short reason or internal reference.</p></div>
              </div>
              <label className="purchase-return-notes">
                Notes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" maxLength={2000} placeholder="Add any relevant return details..." />
              </label>
              <p className="purchase-return-policy-note">
                <FiCreditCard />
                <span>The return first adjusts the original invoice payable. Any excess is retained as supplier credit; no cash refund is recorded.</span>
              </p>
            </div>
          </section>
          {error && <div className="purchase-return-error" role="alert">{error}</div>}
          <div className="purchase-return-actions purchase-return-submit-bar">
            <span>{selectedLines.length ? `${selectedLines.length} product ${selectedLines.length === 1 ? 'line' : 'lines'} selected` : 'Select return quantities to continue'}</span>
            <Button type="button" onClick={() => { resetForm(); setView('list'); }}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving || !selectedLines.length} icon={<FiCheckCircle />}>
              Save Debit Note
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'credits') {
    const availableCredit = amount(creditNotes.reduce(
      (sum, credit) => sum + Number(credit.remainingAmount || 0),
      0
    ));
    const selectedCreditInvoice = creditInvoices.find(
      (invoice) => String(invoice.id) === String(creditPurchaseId)
    );
    return (
      <div className="purchase-return-page purchase-return-workflow">
        <ToastContainer toasts={toast.toasts} />
        <div className="page-header purchase-return-subpage-header">
          <Button onClick={() => { setError(''); setView('list'); }} icon={<FiArrowLeft />}>Back to returns</Button>
          <div>
            <h1>Apply Supplier Credit</h1>
            <p className="page-header__sub">Apply unused debit-note credit against a future purchase payable. No cash payment is recorded.</p>
          </div>
          <span className="purchase-return-step-label"><FiCreditCard /> Supplier settlement</span>
        </div>
        <form className="purchase-return-form" onSubmit={handleApplySupplierCredit}>
          <section className="purchase-return-card">
            <div className="purchase-return-section-heading">
              <span className="purchase-return-section-heading__icon"><FiCreditCard /></span>
              <div><h2>Choose where to apply credit</h2><p>Select an open invoice from the same supplier.</p></div>
            </div>
            <div className="purchase-return-grid">
              <label>
                Supplier
                <select value={creditSupplierId} onChange={(event) => handleCreditSupplierChange(event.target.value)} required>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Payable purchase invoice
                <select
                  value={creditPurchaseId}
                  onChange={(event) => setCreditPurchaseId(event.target.value)}
                  disabled={!creditSupplierId || !creditInvoices.length}
                  required
                >
                  <option value="">Select invoice</option>
                  {creditInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} · Due {formatCurrency(invoice.balanceDue)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Apply amount (blank applies the minimum available)
                <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} />
              </label>
            </div>
            <div className="purchase-return-credit-balance">
              <div><small>Available supplier credit</small><strong>{formatCurrency(availableCredit)}</strong></div>
              {selectedCreditInvoice && <div><small>Selected invoice payable</small><strong>{formatCurrency(selectedCreditInvoice.balanceDue)}</strong></div>}
            </div>
            {creditNotes.length > 0 && (
              <ul className="purchase-return-credit-list">
                {creditNotes.map((credit) => (
                  <li key={credit.id}>
                    {credit.returnNumber} · {credit.Purchase?.invoiceNumber} · Remaining {formatCurrency(credit.remainingAmount)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {error && <div className="purchase-return-error" role="alert">{error}</div>}
          <div className="purchase-return-actions purchase-return-submit-bar">
            <span>Credit is applied to the invoice payable, not recorded as a cash payment.</span>
            <Button type="submit" variant="primary" loading={creditSaving} disabled={!availableCredit || !selectedCreditInvoice} icon={<FiCheckCircle />}>
              Apply Supplier Credit
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'detail' && record) {
    const itemsToPrint = record.items || [];
    return (
      <div className="purchase-return-page purchase-return-printable">
        <ToastContainer toasts={toast.toasts} />
        <div className="page-header no-print">
          <div>
            <h1>{record.returnNumber}</h1>
            <p className="page-header__sub">Purchase return debit note</p>
          </div>
          <div className="purchase-return-actions">
            <Button onClick={() => { setView('list'); loadList(1); }} icon={<FiArrowLeft />}>Back to returns</Button>
            {canPrint && <Button variant="primary" onClick={() => printReturn(record.id)} icon={<FiPrinter />}>Print</Button>}
            {canCancel && record.status === 'ACTIVE' && <Button variant="danger" onClick={() => setCancelTarget(record)}>Cancel debit note</Button>}
          </div>
        </div>
        <section className="purchase-return-card">
          <div className="purchase-return-detail-heading">
            <div className="purchase-return-detail-title">
              <span className="purchase-return-detail-icon"><FiRotateCcw /></span>
              <div><span className="purchase-return-eyebrow">PURCHASE RETURN</span><h2>Debit note</h2><strong>{record.returnNumber}</strong></div>
            </div>
            <Badge variant={record.status === 'ACTIVE' ? 'success' : 'neutral'}>{record.status}</Badge>
          </div>
          <div className="purchase-return-detail-grid">
            <div><small>Supplier</small><strong>{record.Party?.name}</strong><span>{record.Party?.GST || record.Party?.phone || ''}</span></div>
            <div><small>Original invoice</small><strong>{record.Purchase?.invoiceNumber}</strong><span>{dateLabel(record.Purchase?.purchaseDate)}</span></div>
            <div><small>Return date</small><strong>{dateLabel(record.returnDate)}</strong></div>
            <div><small>Reason</small><strong>{record.reason || '—'}</strong></div>
          </div>
          <div className="purchase-return-table-wrap">
            <table className="purchase-return-table">
              <thead><tr><th>Product / batch</th><th>Qty</th><th>Original rate</th><th>Taxable</th><th>GST</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {itemsToPrint.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.productName}</strong><small>Batch {item.batchNumber} · {item.priceType} · GST {Number(item.gstPercentage)}%</small></td>
                    <td>{Number(item.quantity)} {item.quantityUnit}</td>
                    <td>{formatCurrency(item.purchaseRate)}</td>
                    <td>{formatCurrency(item.taxableAmount)}</td>
                    <td>
                      {Number(item.igstAmount) > 0
                        ? `IGST ${formatCurrency(item.igstAmount)}`
                        : `CGST ${formatCurrency(item.cgstAmount)} + SGST ${formatCurrency(item.sgstAmount)}`}
                    </td>
                    <td className="text-right">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="purchase-return-detail-summary">
            <span>Taxable subtotal <strong>{formatCurrency(record.subtotal)}</strong></span>
            <span>Total GST <strong>{formatCurrency(record.totalTax)}</strong></span>
            <span className="purchase-return-grand-total">Debit note total <strong>{formatCurrency(record.grandTotal)}</strong></span>
            <span>Applied to original payable <strong>{formatCurrency(record.appliedToPayable)}</strong></span>
            <span>Supplier credit created <strong>{formatCurrency(record.supplierCreditAmount)}</strong></span>
            <span>Credit used <strong>{formatCurrency((record.creditApplications || []).reduce((sum, application) => sum + Number(application.amount || 0), 0))}</strong></span>
          </div>
          {record.notes && <p className="purchase-return-notes-text">{record.notes}</p>}
          <div className="purchase-return-audit">
            <span>Created by: {record.createdByUser?.name || record.createdBy || '—'}</span>
            <span>{record.status === 'CANCELLED' ? `Cancelled ${dateLabel(record.cancelledAt)}` : ''}</span>
          </div>
        </section>
      </div>
    );
  }

  const filteredRows = rows;
  const activeOnPage = filteredRows.filter((row) => row.status === 'ACTIVE').length;
  const pageValue = amount(filteredRows.reduce(
    (sum, row) => sum + Number(row.grandTotal || 0),
    0
  ));
  return (
    <div className="purchase-return-page purchase-return-list-page">
      <ToastContainer toasts={toast.toasts} />
      <ConfirmModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel Purchase Return?"
        message="This restores stock to the exact original batch and reverses the payable/credit adjustment."
        confirmLabel="Cancel debit note"
        loading={cancelLoading}
        icon="↩"
      />
      <header className="purchase-return-hero">
        <div className="purchase-return-hero__intro">
          <span className="purchase-return-hero__icon"><FiRotateCcw /></span>
          <div>
            <span className="purchase-return-eyebrow">PURCHASE MANAGEMENT</span>
          <h1>Purchase Returns</h1>
            <p>Manage supplier debit notes linked to original purchase batches.</p>
          </div>
        </div>
        <div className="purchase-return-hero__actions">
          {canCreate && (
            <Button onClick={() => { setError(''); setView('credits'); }} icon={<FiCreditCard />}>
              Apply supplier credit
            </Button>
          )}
          {canCreate && (
            <Button variant="primary" onClick={() => { resetForm(); setView('create'); }} icon={<FiPlus />}>
              Create purchase return
            </Button>
          )}
        </div>
      </header>

      <div className="purchase-return-stats" aria-label="Purchase return summary">
        <article className="purchase-return-stat">
          <span className="purchase-return-stat__icon"><FiFileText /></span>
          <div><small>Matching debit notes</small><strong>{totalRows}</strong></div>
        </article>
        <article className="purchase-return-stat">
          <span className="purchase-return-stat__icon purchase-return-stat__icon--green"><FiCheckCircle /></span>
          <div><small>Active on this page</small><strong>{activeOnPage}</strong></div>
        </article>
        <article className="purchase-return-stat">
          <span className="purchase-return-stat__icon purchase-return-stat__icon--amber"><FiCreditCard /></span>
          <div><small>Debit note value on this page</small><strong>{formatCurrency(pageValue)}</strong></div>
        </article>
      </div>

      <section className="purchase-return-card purchase-return-filter-card" aria-label="Filter purchase returns">
        <div className="purchase-return-filter-heading">
          <div><FiFilter /><strong>Find a debit note</strong></div>
          <span>{totalRows} {totalRows === 1 ? 'result' : 'results'}</span>
        </div>
        <div className="purchase-return-filters">
          <label className="purchase-return-search">
            <span>Search</span>
            <span className="purchase-return-search__control">
              <FiSearch aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Debit note or reason" />
            </span>
          </label>
          <label>
            <span>Supplier</span>
            <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} aria-label="Filter by supplier">
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label>
            <span>From date</span>
            <span className="purchase-return-date-control"><FiCalendar aria-hidden="true" /><input type="date" value={dateFilter.startDate} onChange={(event) => setDateFilter((current) => ({ ...current, startDate: event.target.value }))} aria-label="Start date" /></span>
          </label>
          <label>
            <span>To date</span>
            <span className="purchase-return-date-control"><FiCalendar aria-hidden="true" /><input type="date" value={dateFilter.endDate} onChange={(event) => setDateFilter((current) => ({ ...current, endDate: event.target.value }))} aria-label="End date" /></span>
          </label>
          <Button variant="primary" onClick={() => loadList(1)} icon={<FiSearch />}>Search</Button>
        </div>
      </section>
      {error && <div className="purchase-return-error" role="alert">{error}</div>}
      {loading ? <LoadingSpinner /> : filteredRows.length === 0 ? (
        <section className="purchase-return-card purchase-return-empty">
          <EmptyState title="No purchase returns found" description="Try changing the filters or create a return against an eligible purchase invoice." />
        </section>
      ) : (
        <>
          <section className="purchase-return-card purchase-return-records">
            <div className="purchase-return-records__heading">
              <div>
                <h2>Debit notes</h2>
                <p>Returns are recorded against the original purchase batch and invoice.</p>
              </div>
              <span className="purchase-return-record-count">{filteredRows.length} shown</span>
            </div>
          <div className="purchase-return-table-wrap">
            <table className="purchase-return-table">
              <thead><tr><th>Debit note</th><th>Date</th><th>Supplier</th><th>Original invoice</th><th className="text-right">Amount</th><th>Status</th><th>Supplier credit</th><th className="purchase-return-actions-cell">Actions</th></tr></thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td><strong className="purchase-return-number">{row.returnNumber}</strong></td>
                    <td><span className="purchase-return-date">{dateLabel(row.returnDate)}</span></td>
                    <td><strong className="purchase-return-primary-cell">{row.Party?.name || '—'}</strong></td>
                    <td><span className="purchase-return-invoice-number">{row.Purchase?.invoiceNumber || '—'}</span></td>
                    <td className="text-right"><strong>{formatCurrency(row.grandTotal)}</strong></td>
                    <td><Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge></td>
                    <td><span className={Number(row.supplierCreditAmount) > 0 ? 'purchase-return-credit-value' : 'purchase-return-zero-value'}>{formatCurrency(row.supplierCreditAmount)}</span></td>
                    <td>
                      <div className="purchase-return-row-actions">
                        <Button size="sm" onClick={() => openReturn(row.id)}>View details</Button>
                        {canPrint && <Button size="sm" aria-label={`Print ${row.returnNumber}`} onClick={() => printReturn(row.id)} icon={<FiPrinter />}>Print</Button>}
                        {canCancel && row.status === 'ACTIVE' && <Button size="sm" variant="danger" onClick={() => setCancelTarget(row)}>Cancel</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="purchase-return-pagination">
            <span>Page {page} of {totalPages}</span>
            <Button disabled={page <= 1} onClick={() => loadList(page - 1)}>Previous</Button>
            <Button disabled={page >= totalPages} onClick={() => loadList(page + 1)}>Next</Button>
          </div>
          </section>
        </>
      )}
    </div>
  );
}
