/* ===== useReportData — server-side filters / search / sort / pagination =====
 *
 * `draft`   = what the user is editing in the filter bar
 * `applied` = what was last sent to the backend (Apply / Reset)
 * Search is debounced and applied live; sort, page and page-size refetch at once.
 * Exports re-query ALL pages with the same applied filters + search + sort.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAllReportPages } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';
import { buildFilterParams, getColumns, getDefaultFilters, getDefaultSort } from './reportRegistry';

export const PAGE_SIZES = [10, 25, 50, 100];
const EXPORT_PAGE_SIZE = 500; // backend MAX_LIMIT

const errMessage = (err) => err?.response?.data?.message || err?.message || 'Failed to load report';

export function useReportData(def) {
  const [draft, setDraft] = useState(() => getDefaultFilters(def));
  const [applied, setApplied] = useState(() => getDefaultFilters(def));
  const [searchText, setSearchText] = useState('');
  const search = useDebounce(searchText, 400).trim();
  const [sort, setSort] = useState(() => getDefaultSort(def, getDefaultFilters(def)));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [state, setState] = useState({ rows: [], summary: null, pagination: null, party: null, loading: false, error: null });
  const reqId = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const missingRequired = useMemo(
    () => (def.requires || []).filter((k) => !applied[k]),
    [def, applied]
  );

  // everything the backend needs, in backend parameter names
  const buildParams = useCallback(
    (extra = {}) => ({
      ...buildFilterParams(applied),
      ...(!def.noSearch && search ? { search } : {}),
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
      ...extra,
    }),
    [def, applied, search, sort]
  );

  useEffect(() => {
    if (missingRequired.length) {
      setState({ rows: [], summary: null, pagination: null, party: null, loading: false, error: null });
      return;
    }
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    def.fetch(buildParams({ page, limit }))
      .then((res) => {
        if (id !== reqId.current) return; // a newer request superseded this one
        setState({
          rows: res?.data || [],
          summary: res?.summary || null,
          pagination: res?.pagination || null,
          party: res?.party || null,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (id !== reqId.current) return;
        setState({ rows: [], summary: null, pagination: null, party: null, loading: false, error: errMessage(err) });
      });
  }, [def, buildParams, page, limit, missingRequired.length, reloadKey]);

  // ── actions ────────────────────────────────────────────────────────────────
  const patchDraft = useCallback((patch) => setDraft((d) => ({ ...d, ...patch })), []);

  const applyFilters = useCallback(() => {
    setApplied(draft);
    setSort(getDefaultSort(def, draft)); // e.g. Stock Summary groupBy changes the sortable columns
    setPage(1);
  }, [def, draft]);

  const resetFilters = useCallback(() => {
    const fresh = getDefaultFilters(def);
    setDraft(fresh);
    setApplied(fresh);
    setSearchText('');
    setSort(getDefaultSort(def, fresh));
    setPage(1);
  }, [def]);

  const changeSearch = useCallback((v) => { setSearchText(v); setPage(1); }, []);
  const changeLimit = useCallback((n) => { setLimit(n); setPage(1); }, []);

  const toggleSort = useCallback((sortKey) => {
    setSort((s) => (s.sortBy === sortKey
      ? { sortBy: sortKey, sortOrder: s.sortOrder === 'asc' ? 'desc' : 'asc' }
      : { sortBy: sortKey, sortOrder: 'asc' }));
    setPage(1);
  }, []);

  // Whole filtered dataset (all pages) for Excel / PDF / Print.
  const fetchAll = useCallback(
    () => fetchAllReportPages(def.fetch, buildParams(), { limit: EXPORT_PAGE_SIZE }),
    [def, buildParams]
  );

  return {
    draft, applied, patchDraft, applyFilters, resetFilters,
    searchText, changeSearch,
    sort, toggleSort,
    page, setPage, limit, changeLimit,
    ...state,
    columns: getColumns(def, applied),
    missingRequired,
    reload,
    fetchAll,
  };
}
