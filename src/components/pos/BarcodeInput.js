/* ===== BARCODE INPUT — Universal Search ===== */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { formatCurrency } from '../../utils/currency';

/**
 * Universal Product Search
 * - Detects mobile to avoid auto-keyboard
 * - Supports Barcode, Name, HSN search
 * - Shows dropdown for multiple matches
 * - Exact barcode match (scanner) triggers instant add
 * - Arrow keys & Enter for navigation
 */
export default function BarcodeInput({ products, onProductFound, onNotFound, disabled }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | success | error
  const statusTimer = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimeout = useRef(null);
  const dropdownRef = useRef(null);

  /* ── Mobile Detection ── */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 || ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* ── Desktop Auto-focus on load ── */
  useEffect(() => {
    if (!isMobile && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobile, disabled]);

  /* ── Focus Input Helper ── */
  const focusInput = useCallback(() => {
    if (inputRef.current && !disabled && !isMobile) {
      inputRef.current.focus();
    }
  }, [disabled, isMobile]);

  /* F2 shortcut to refocus barcode bar */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'F2') {
        e.preventDefault();
        focusInput();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusInput]);

  /* ── Close dropdown when clicking outside ── */
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Play beep sound using Web Audio API ── */
  function playBeep(success = true) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 880 : 400;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio not available — fail silently
    }
  }

  function showStatus(type) {
    clearTimeout(statusTimer.current);
    setStatus(type);
    statusTimer.current = setTimeout(() => setStatus('idle'), 1200);
  }

  /* ── Exact Barcode Helper ── */
  function findExactBarcode(scanVal) {
    if (!scanVal || !products?.length) return null;
    return products.find((p) => p.barcode && p.barcode === scanVal) || null;
  }

  /* ── Typing & Debounce Search ── */
  const handleInputChange = (e) => {
    const val = e.target.value;
    setValue(val);
    setHighlightedIndex(-1);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      const v = val.trim().toLowerCase();
      const matches = products
        .filter((p) => {
          const bMatch = p.barcode && p.barcode.toLowerCase().includes(v);
          const hMatch = p.HSNCode && p.HSNCode.toLowerCase().includes(v);
          const nMatch = p.name && p.name.toLowerCase().includes(v);
          return bMatch || hMatch || nMatch;
        })
        .slice(0, 50); // limit for perf

      setSuggestions(matches);
      setIsOpen(matches.length > 0);
    }, 150);
  };

  /* ── Select Product Action ── */
  const handleSelectProduct = (product) => {
    playBeep(true);
    showStatus('success');
    onProductFound(product);
    setValue('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);

    if (!isMobile) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  };

  /* ── Keyboard Navigation ── */
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (value.trim()) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const scanVal = value.trim();
      if (!scanVal) return;

      // 1. Instant check for EXACT barcode (scanner priority)
      const exact = findExactBarcode(scanVal);
      if (exact) {
        handleSelectProduct(exact);
        return;
      }

      // 2. If dropdown is open and item highlighted
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectProduct(suggestions[highlightedIndex]);
        return;
      }

      // 3. Fallback logic
      const v = scanVal.toLowerCase();
      const exactAlt =
        products.find((p) => p.sku && p.sku.toLowerCase() === v) ||
        products.find((p) => p.HSNCode && p.HSNCode.toLowerCase() === v) ||
        products.find((p) => p.name && p.name.toLowerCase() === v);

      if (exactAlt) {
        handleSelectProduct(exactAlt);
      } else if (suggestions.length === 1) {
        // Only one suggestion found, auto select
        handleSelectProduct(suggestions[0]);
      } else if (suggestions.length > 1) {
        // Force open dropdown, select first
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        // Nothing found
        playBeep(false);
        showStatus('error');
        onNotFound?.(scanVal);
        setValue('');
      }
    }
  }

  /* ── Scroll highlighted item into view ── */
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const listItems = dropdownRef.current.querySelectorAll('.suggestion-item');
      if (listItems[highlightedIndex]) {
        listItems[highlightedIndex].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  /* ── Styles based on status ── */
  const borderColor =
    status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : 'var(--border-focus)';

  const bgColor =
    status === 'success' ? '#f0fdf4' : status === 'error' ? '#fef2f2' : '#fff';

  return (
    <div className="barcode-bar" style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
      <div
        className={`barcode-input-wrap ${status}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 10,
          border: `2px solid ${borderColor}`,
          background: bgColor,
          transition: 'all 0.2s ease',
          boxShadow: status !== 'idle' ? `0 0 0 3px ${borderColor}22` : 'var(--shadow-sm)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Search / Scanner Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : '#64748b'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.trim() && suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={
            isMobile
              ? 'Tap to search product...'
              : 'Scan barcode or type name/HSN... (F2)'
          }
          disabled={disabled}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
          }}
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={() => {
              setValue('');
              setSuggestions([]);
              setIsOpen(false);
              focusInput();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Status indicator */}
        {status === 'success' && (
          <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            ✓ Added
          </span>
        )}
        {status === 'error' && (
          <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            ✗ Not found
          </span>
        )}
        {status === 'idle' && !isMobile && (
          <kbd
            style={{
              fontSize: 10,
              padding: '2px 5px',
              background: '#f1f5f9',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              color: '#64748b',
              whiteSpace: 'nowrap',
            }}
          >
            F2
          </kbd>
        )}
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            maxHeight: '320px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {suggestions.map((item, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={item.id || item._id || index}
                className="suggestion-item"
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectProduct(item)}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  background: isHighlighted ? '#f8fafc' : '#fff',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isHighlighted ? '#0f172a' : '#334155',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      display: 'flex',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    {item.barcode && <span>BC: {item.barcode}</span>}
                    {item.HSNCode && <span>HSN: {item.HSNCode}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(item.sellingPrice || item.price || 0)}
                  </div>
                  {item.stock !== undefined && (
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: item.stock > 0 ? '#16a34a' : '#dc2626',
                        marginTop: '4px',
                      }}
                    >
                      {item.stock} in stock
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scan flash animation overlay */}
      {status === 'success' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            background: 'rgba(22,163,74,0.08)',
            pointerEvents: 'none',
            animation: 'scanFlash 0.4s ease',
            zIndex: 3,
          }}
        />
      )}
    </div>
  );
}
