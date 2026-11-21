import React, {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../../utils/currency';
import { loadBatchesCached } from '../../utils/productBatchCache';

function formatPurchaseDate(value) {
  if (!value) return '—';
  const dateText = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

export default function BatchPriceHistory({
  productId,
  priceType,
  children,
}) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [position, setPosition] = useState(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 180);
  }, [clearCloseTimer]);

  const openHistory = useCallback(() => {
    if (!productId) return;
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, productId]);

  useEffect(() => {
    if (!open || !productId) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setHistory([]);
    loadBatchesCached(productId, { historyOnly: true })
      .then((response) => {
        const data = response?.data?.data || response?.data || response;
        if (active) setHistory(Array.isArray(data) ? data.slice(0, 5) : []);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || 'Could not load batch price history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, productId, retryCount]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideInteraction = (event) => {
      if (
        !anchorRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideInteraction, true);
    document.addEventListener('touchstart', handleOutsideInteraction, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideInteraction, true);
      document.removeEventListener('touchstart', handleOutsideInteraction, true);
    };
  }, [open]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  useLayoutEffect(() => {
    if (!open || !popoverRef.current || !anchorRef.current) return undefined;
    const updatePosition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const popover = popoverRef.current?.getBoundingClientRect();
      if (!anchor || !popover) return;
      const margin = 12;
      const left = Math.max(
        margin,
        Math.min(anchor.left, window.innerWidth - popover.width - margin),
      );
      let top = anchor.bottom + 8;
      if (top + popover.height > window.innerHeight - margin) {
        top = anchor.top - popover.height - 8;
      }
      top = Math.max(margin, Math.min(top, window.innerHeight - popover.height - margin));
      setPosition({ left, top });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, history.length, loading, error]);

  const input = cloneElement(children, {
    ref: anchorRef,
    onMouseEnter: (event) => {
      children.props.onMouseEnter?.(event);
      openHistory();
    },
    onMouseLeave: (event) => {
      children.props.onMouseLeave?.(event);
      scheduleClose();
    },
    onFocus: (event) => {
      children.props.onFocus?.(event);
      openHistory();
    },
    onBlur: (event) => {
      children.props.onBlur?.(event);
      scheduleClose();
    },
    onPointerDown: (event) => {
      children.props.onPointerDown?.(event);
      if (event.pointerType === 'touch') openHistory();
    },
    onTouchStart: (event) => {
      children.props.onTouchStart?.(event);
      openHistory();
    },
  });

  return (
    <>
      {input}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="batch-price-history"
            style={{
              left: position?.left ?? 12,
              top: position?.top ?? 12,
              visibility: position ? 'visible' : 'hidden',
            }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            aria-label={`Last five batch ${priceType} prices`}
          >
            <div className="batch-price-history__title">Last 5 batches</div>
            {loading ? (
              <div className="batch-price-history__state">Loading price history…</div>
            ) : error ? (
              <div className="batch-price-history__state batch-price-history__state--error">
                <span>{error}</span>
                <button
                  type="button"
                  className="batch-price-history__retry"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  Retry
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="batch-price-history__state">No previous price history.</div>
            ) : (
              <table className="batch-price-history__table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Purchase Date</th>
                    <th>MRP</th>
                    <th>{priceType === 'sales' ? 'Sales Price' : 'Purchase Price'}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((batch, index) => (
                    <tr
                      key={batch.id || `${batch.batchNumber}-${index}`}
                      className={index === 0 ? 'batch-price-history__latest' : ''}
                    >
                      <td>
                        <span className="batch-price-history__rank">
                          {index === 0 ? 'Latest' : 'Previous'}
                        </span>
                        <span>{batch.batchNumber || '—'}</span>
                      </td>
                      <td>{formatPurchaseDate(batch.purchaseDate)}</td>
                      <td>{formatCurrency(batch.mrp)}</td>
                      <td>
                        {formatCurrency(
                          priceType === 'sales' ? batch.salePrice : batch.purchasePrice,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
