import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../../utils/currency';
import { formatQuantity } from '../../utils/quantityUnits';
import {
  invalidateBatchCache,
  loadBatchesCached,
} from '../../utils/productBatchCache';

function batchId(batch) {
  return String(batch.id || batch._id || '');
}

function batchAvailableQuantity(batch) {
  return Number(batch.availableQuantity ?? batch.quantity ?? 0);
}

function sortFifo(batches) {
  const time = (batch) => {
    const t = new Date(
      batch.createdAt || batch.created_at || batch.mfgDate || 0,
    ).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  // Oldest receipt first; the id keeps the order stable when timestamps tie.
  return [...batches].sort(
    (a, b) => time(a) - time(b) || Number(batchId(a)) - Number(batchId(b)),
  );
}

// Every cart row mounts its own selector, so the same product's batches used
// to be fetched once per row. Share one in-flight/short-lived request per
// product instead. Stock changes after a sale/purchase/return, so callers
// invalidate the cache (see invalidateBatchCache).
export default function BatchSelector({
  productId,
  side = 'sales',
  value = '',
  onSelect,
  autoSelectFirst = false,
  // Batch ids already allocated on OTHER cart lines of this product, so a split
  // line defaults to the next FIFO batch instead of repeating the same one.
  excludeIds = [],
  // Quantity entered on this line, used to warn when the batch cannot cover it.
  requestedQuantity,
  allowUnbatchedStock = false,
  allowUnavailableSelection = false,
  hideControl = false,
}) {
  const [batches, setBatches] = useState([]);
  const [hasBatchRecords, setHasBatchRecords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onSelectRef = useRef(onSelect);
  const valueRef = useRef(value);
  const excludeRef = useRef(excludeIds);
  onSelectRef.current = onSelect;
  valueRef.current = value;
  excludeRef.current = excludeIds;

  useEffect(() => {
    if (!productId) {
      setBatches([]);
      setHasBatchRecords(false);
      setError('');
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    loadBatchesCached(productId, {
      availableOnly: side === 'sales',
      includeBatchId:
        side === 'sales' && allowUnavailableSelection ? valueRef.current : '',
    })
      .then((response) => {
        const data = response?.data?.data || response?.data || response;
        const fetched = Array.isArray(data) ? data : [];
        if (!active) return;
        setHasBatchRecords(fetched.length > 0);
        const selectable =
          side === 'purchase'
            ? fetched
            : fetched.filter((batch) => batchAvailableQuantity(batch) > 0);
        const eligible = sortFifo(selectable);
        const currentSelection = allowUnavailableSelection
          ? fetched.find(
              (batch) => batchId(batch) === String(valueRef.current || ''),
            )
          : null;
        const displayBatches =
          currentSelection &&
          !eligible.some(
            (batch) => batchId(batch) === batchId(currentSelection),
          )
            ? sortFifo([...eligible, currentSelection])
            : eligible;
        setBatches(displayBatches);
        const selectedBatchAvailable = displayBatches.some(
          (batch) => batchId(batch) === String(valueRef.current || ''),
        );
        if (autoSelectFirst && eligible.length > 0 && !selectedBatchAvailable) {
          const taken = new Set((excludeRef.current || []).map(String));
          const next =
            eligible.find((batch) => !taken.has(batchId(batch))) || eligible[0];
          onSelectRef.current?.(next);
        } else if (valueRef.current && !selectedBatchAvailable) {
          onSelectRef.current?.(null);
        }
      })
      .catch((fetchError) => {
        if (active) {
          setBatches([]);
          setError(fetchError.message || 'Could not load product batches');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, autoSelectFirst, side, allowUnavailableSelection, value]);

  const selected = useMemo(
    () => batches.find((batch) => batchId(batch) === String(value)),
    [batches, value],
  );

  if (hideControl && loading) return null;
  if (loading) {
    return <span className="price-gst-hint">Loading batches…</span>;
  }
  if (error) {
    return <span className="um-error-text">{error}</span>;
  }
  if (hideControl && batches.length === 0) return null;
  if (batches.length === 0) {
    if (allowUnbatchedStock && !hasBatchRecords) {
      return (
        <span className="price-gst-hint">
          No batch records — product stock will be used
        </span>
      );
    }
    return <span className="price-gst-hint">No available batches</span>;
  }

  const priceField = side === 'purchase' ? 'purchasePrice' : 'salePrice';
  const takenIds = new Set((excludeIds || []).map(String));
  const available = selected ? batchAvailableQuantity(selected) : 0;
  const overAllocated =
    side === 'sales' &&
    selected &&
    Number(requestedQuantity) > 0 &&
    Number(requestedQuantity) > available;

  if (hideControl) {
    return overAllocated ? (
      <div className="um-error-text" role="alert">
        Quantity exceeds available stock for this selection.
      </div>
    ) : null;
  }

  return (
    <div style={{ minWidth: 150 }}>
      <select
        className="form-select"
        value={value || ''}
        onChange={(event) => {
          const batch = batches.find(
            (candidate) => batchId(candidate) === event.target.value,
          );
          onSelect?.(batch || null);
        }}
        aria-label="Select product batch"
      >
        <option value="">Select batch</option>
        {batches.map((batch) => (
          <option
            key={batchId(batch)}
            value={batchId(batch)}
            disabled={takenIds.has(batchId(batch)) && batchId(batch) !== String(value)}
          >
            {batch.batchNumber || batch.batchNo || batchId(batch)} —{' '}
            {formatQuantity(batchAvailableQuantity(batch))} available
            {' · MRP '}{formatCurrency(batch.MRP ?? batch.mrp ?? 0)}
            {takenIds.has(batchId(batch)) && batchId(batch) !== String(value)
              ? ' (on another line)'
              : ''}
          </option>
        ))}
      </select>
      {selected && (
        <div className="price-gst-hint">
          MRP {formatCurrency(selected.MRP ?? selected.mrp ?? 0)}
          {' · '}Price {formatCurrency(selected[priceField] ?? selected.sellingPrice ?? 0)}
          {' · '}Discount {Number(selected.discount) || 0}%
          {' · '}GST {Number(selected.gstPercentage) || 0}%
        </div>
      )}
      {overAllocated && (
        <div className="um-error-text" role="alert">
          Only {formatQuantity(available)} in this batch. Use “Split batch” to
          take the rest from the next batch.
        </div>
      )}
    </div>
  );
}

export { batchAvailableQuantity, batchId, invalidateBatchCache };
