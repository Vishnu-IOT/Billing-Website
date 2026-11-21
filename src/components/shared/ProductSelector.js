import React, {
  useState,
  useMemo,
  useRef,
  useId,
  useEffect,
  useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { matchesProductSearch } from '../../utils/productSearch';

export function ProductSelector({
  products,
  categories,
  brands,
  value,
  onChange,
  onBarcodeScan,
  onCreateMissingBarcode,
  autoFocus = false,
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [missingBarcode, setMissingBarcode] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const scanInProgress = useRef(false);
  const searchInputRef = useRef(null);
  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const listboxId = useId();

  const selected = products.find(
    (p) => String(p.id || p._id) === String(value)
  );

  const brandNamesById = useMemo(
    () =>
      new Map(
        (brands || []).map((brand) => [
          String(brand.id || brand._id),
          brand.name || brand.brand || '',
        ]),
      ),
    [brands],
  );
  const categoryNamesById = useMemo(
    () =>
      new Map(
        (categories || []).map((category) => [
          String(category.id || category._id),
          category.category || category.name || '',
        ]),
      ),
    [categories],
  );

  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 20);

    return products
      .filter((product) =>
        matchesProductSearch(product, search, [
          product.code,
          brandNamesById.get(String(product.brandId)),
          categoryNamesById.get(String(product.categoryId)),
        ]),
      )
      .slice(0, 20);
  }, [products, search, brandNamesById, categoryNamesById]);

  function select(product) {
    onChange(String(product.id || product._id), product);
    setOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setScanStatus(null);
    setHighlightedIndex(-1);
    setOpen(true);
  }

  async function handleBarcodeLookup() {
    try {
      const result = await onBarcodeScan(search.trim());
      const productName = result?.product?.name || 'Product';
      const variantName = result?.variant?.variantName
        ? ` (${result.variant.variantName})`
        : '';
      setSearch('');
      setMissingBarcode('');
      setHighlightedIndex(-1);
      setScanStatus({
        type: 'success',
        message: `${productName}${variantName} added to purchase items`,
      });
    } catch (error) {
      const barcode = search.trim();
      setScanStatus({
        type: error.status === 404 ? 'notFound' : 'error',
        message: error.status === 404
          ? 'Product not found. Would you like to create this product?'
          : error.message || 'Barcode lookup failed',
      });
      setMissingBarcode(error.status === 404 ? barcode : '');
    } finally {
      scanInProgress.current = false;
      searchInputRef.current?.focus({ preventScroll: true });
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'ArrowDown' && filtered.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) =>
        index < 0 || index === filtered.length - 1 ? 0 : index + 1,
      );
      return;
    }

    if (event.key === 'ArrowUp' && filtered.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) =>
        index < 0 ? filtered.length - 1 : (index - 1 + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();

    if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
      select(filtered[highlightedIndex]);
      return;
    }

    if (!onBarcodeScan || !search.trim() || scanInProgress.current) return;

    scanInProgress.current = true;
    setScanStatus({ type: 'loading', message: 'Looking up barcode…' });
    handleBarcodeLookup();
  }

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updateDropdownPosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceAbove = Math.max(0, rect.top - 8);
      const spaceBelow = Math.max(0, viewportHeight - rect.bottom - 8);
      const openAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
      const availableSpace = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(80, Math.min(300, availableSpace));
      const popupHeight = Math.min(
        dropdownRef.current?.getBoundingClientRect().height || maxHeight,
        maxHeight,
      );

      setDropdownPosition({
        left: rect.left,
        top: openAbove
          ? Math.max(8, rect.top - popupHeight - 4)
          : Math.min(rect.bottom + 4, viewportHeight - maxHeight - 8),
        width: rect.width,
        maxHeight,
      });
    };

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open, filtered.length, scanStatus]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (
        !anchorRef.current?.contains(event.target) &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    dropdownRef.current
      ?.querySelector(`[data-product-index="${highlightedIndex}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightedIndex]);

  return (
    <div
      ref={anchorRef}
      data-product-selector-anchor="true"
      style={{ position: 'relative' }}
    >
      {onBarcodeScan ? (
        <input
          ref={searchInputRef}
          autoFocus={autoFocus}
          className="invoice-input"
          placeholder={selected?.name || 'Search product or scan barcode…'}
          value={search}
          onChange={handleSearchChange}
          onClick={() => setOpen(true)}
          onKeyDown={handleSearchKeyDown}
          disabled={scanStatus?.type === 'loading'}
          aria-label="Search product or scan barcode"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
        />
      ) : (
        <div
          className="invoice-select"
          role="combobox"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={listboxId}
          style={{
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span>{selected ? selected.name : 'Select Product...'}</span>

          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
        </div>
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition?.top ?? 0,
            left: dropdownPosition?.left ?? 0,
            width: dropdownPosition?.width ?? 0,
            maxHeight: dropdownPosition?.maxHeight ?? 300,
            visibility: dropdownPosition ? 'visible' : 'hidden',
            zIndex: 450,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(0,0,0,.12)',
          }}
        >
          {!onBarcodeScan && (
            <div style={{ padding: 8 }}>
              <input
                ref={searchInputRef}
                autoFocus
                className="invoice-input"
                placeholder="Search product..."
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search product"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={
                  highlightedIndex >= 0
                    ? `${listboxId}-option-${highlightedIndex}`
                    : undefined
                }
              />
            </div>
          )}

          {scanStatus && (
            <div
              className={
                scanStatus.type === 'error' || scanStatus.type === 'notFound'
                  ? 'um-error-text'
                  : 'form-hint'
              }
              role={
                scanStatus.type === 'error' || scanStatus.type === 'notFound'
                  ? 'alert'
                  : 'status'
              }
              aria-live="polite"
              style={{ padding: '0 8px 8px' }}
            >
              {scanStatus.type === 'loading' && '⏳ '}
              {scanStatus.type === 'success' && '✓ '}
              {scanStatus.message}
              {scanStatus.type === 'notFound' && onCreateMissingBarcode && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    onCreateMissingBarcode(missingBarcode);
                    setSearch('');
                    setOpen(false);
                    setScanStatus(null);
                    setMissingBarcode('');
                  }}
                >
                  Create Product
                </button>
              )}
            </div>
          )}

          <div
            id={listboxId}
            role="listbox"
            style={{
              maxHeight: Math.max(40, (dropdownPosition?.maxHeight || 300) - 60),
              overflowY: 'auto',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: 12 }}>No products found</div>
            ) : (
              filtered.map((p, index) => (
                <div
                  key={p.id || p._id}
                  id={`${listboxId}-option-${index}`}
                  data-product-index={index}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => select(p)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    background: index === highlightedIndex ? '#f1f5f9' : '#fff',
                  }}
                >
                  <div>{p.name}</div>

                  {p.salePrice && <small>₹{p.salePrice}</small>}
                </div>
              ))
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
}
