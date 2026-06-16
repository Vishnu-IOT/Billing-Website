/* ===== useToast ===== */
import { useState, useCallback } from 'react';

let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'default', duration = 2800) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const success = useCallback((msg) => showToast(msg, 'success'), [showToast]);
  const error   = useCallback((msg) => showToast(msg, 'error'),   [showToast]);
  const warning = useCallback((msg) => showToast(msg, 'warning'), [showToast]);

  return { toasts, showToast, success, error, warning };
}
