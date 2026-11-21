import React, { useEffect, useRef, useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import {
  formatDateForInput,
  parseDateFromInput,
} from '../../utils/date';
import '../../styles/dateInput.css';

function toMaskedDate(value) {
  const input = String(value || '').trim();
  const isoDate = parseDateFromInput(input);
  if (isoDate) return formatDateForInput(isoDate);
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function emitDateChange(onChange, value) {
  onChange?.({ target: { value } });
}

export default function DateInput({
  value = '',
  onChange,
  min,
  max,
  className = 'form-input',
  disabled = false,
  required = false,
  ...inputProps
}) {
  const [draft, setDraft] = useState(formatDateForInput(value));
  const [error, setError] = useState('');
  const pickerRef = useRef(null);
  const textInputRef = useRef(null);
  const isoValue = parseDateFromInput(value) || '';

  useEffect(() => {
    setDraft(formatDateForInput(value));
    setError('');
  }, [value]);

  const updateDraft = (nextValue) => {
    const masked = toMaskedDate(nextValue);
    setDraft(masked);
    setError('');

    if (!masked) {
      textInputRef.current?.setCustomValidity(
        required ? 'Enter a date as DD/MM/YYYY.' : '',
      );
      emitDateChange(onChange, '');
      return;
    }

    const isoDate = parseDateFromInput(masked);
    if (isoDate && (!min || isoDate >= min) && (!max || isoDate <= max)) {
      textInputRef.current?.setCustomValidity('');
      emitDateChange(onChange, isoDate);
    } else {
      textInputRef.current?.setCustomValidity('Enter a valid date as DD/MM/YYYY.');
    }
  };

  const handleBlur = () => {
    if (!draft) {
      if (required) setError('Enter a date as DD/MM/YYYY.');
      return;
    }

    const isoDate = parseDateFromInput(draft);
    if (!isoDate) {
      setError('Enter a valid date as DD/MM/YYYY.');
    } else if (min && isoDate < min) {
      setError(`Date must be on or after ${formatDateForInput(min)}.`);
    } else if (max && isoDate > max) {
      setError(`Date must be on or before ${formatDateForInput(max)}.`);
    } else {
      setError('');
    }
  };

  return (
    <div className="date-input">
      <input
        {...inputProps}
        ref={textInputRef}
        type="text"
        className={className}
        value={draft}
        placeholder="DD/MM/YYYY"
        inputMode="numeric"
        maxLength={10}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        onChange={(event) => updateDraft(event.target.value)}
        onBlur={handleBlur}
      />
      <button
        className="date-input__picker"
        type="button"
        aria-label="Choose date"
        disabled={disabled}
        onClick={() => {
          if (typeof pickerRef.current?.showPicker === 'function') {
            pickerRef.current.showPicker();
          } else {
            pickerRef.current?.focus();
            pickerRef.current?.click();
          }
        }}
      >
        <FiCalendar aria-hidden="true" />
      </button>
      <input
        ref={pickerRef}
        className="date-input__native-picker"
        type="date"
        value={isoValue}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => updateDraft(event.target.value)}
      />
      {error && <span className="date-input__error" role="alert">{error}</span>}
    </div>
  );
}
