import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableOptionSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  const selected = options.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? options.filter((option) =>
          option.label.toLocaleLowerCase().includes(query),
        )
      : options;
  }, [options, search]);

  useEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxHeight = Math.min(240, window.innerHeight - 24);
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < Math.min(maxHeight, 180) && rect.top > spaceBelow;
      const width = Math.min(rect.width, window.innerWidth - 16);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight,
        ...(placeAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }

    function closeOnOutsideClick(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && position) {
      searchRef.current?.focus();
    }
  }, [open, position]);

  useEffect(() => {
    setActiveIndex((index) =>
      filteredOptions.length ? Math.min(index, filteredOptions.length - 1) : 0,
    );
  }, [filteredOptions]);

  function choose(option) {
    onChange(option.value);
    setSearch('');
    setOpen(false);
    setActiveIndex(0);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown' && filteredOptions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filteredOptions.length);
    } else if (event.key === 'ArrowUp' && filteredOptions.length) {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + filteredOptions.length) % filteredOptions.length,
      );
    } else if (event.key === 'Enter' && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="form-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              zIndex: 3000,
              left: position.left,
              top: position.top,
              bottom: position.bottom,
              width: position.width,
              maxHeight: position.maxHeight,
              overflow: 'auto',
              padding: 8,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <input
              ref={searchRef}
              className="form-input"
              type="search"
              value={search}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              style={{ marginBottom: 6 }}
            />
            <div role="listbox" aria-label={searchPlaceholder}>
              {filteredOptions.length ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={String(option.value) === String(value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 10px',
                      border: 0,
                      borderRadius: 4,
                      textAlign: 'left',
                      background:
                        index === activeIndex ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div
                  role="status"
                  style={{ padding: 10, color: 'var(--text-muted)' }}
                >
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
