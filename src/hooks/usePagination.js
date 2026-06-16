/* ===== usePagination ===== */
import { useState, useMemo } from 'react';

export function usePagination(items = [], rowsPerPage = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return items.slice(start, start + rowsPerPage);
  }, [items, safePage, rowsPerPage]);

  const from = items.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const to   = Math.min(safePage * rowsPerPage, items.length);

  function goToPage(p) { setPage(Math.max(1, Math.min(p, totalPages))); }
  function resetPage()  { setPage(1); }

  return { page: safePage, totalPages, paginated, from, to, total: items.length, goToPage, resetPage };
}
