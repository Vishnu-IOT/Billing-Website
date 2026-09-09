/* ===== useInfiniteScroll ===== */
// Reveals items in batches as the user scrolls, instead of Prev/Next pages.
// Drop-in alternative to usePagination — same `items` input, but returns a
// growing `visible` slice plus a `sentinelRef` to attach to a div at the
// bottom of the list, and a `containerRef` to attach to the fixed-height
// scrollable box wrapping the list. The observer watches for the sentinel
// entering THAT box (not the page viewport), so the table has a fixed
// height and only its own content scrolls.
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

export function useInfiniteScroll(items = [], batchSize = 20) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef(null);
  const containerRef = useRef(null); // attach to the fixed-height, overflow-y:auto wrapper

  // reset back to the first batch whenever the underlying list changes
  // (new filters, new search term, new data reload)
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items, batchSize]);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + batchSize, items.length));
  }, [batchSize, items.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return undefined;

    // root: containerRef.current if provided (scrolls inside the box);
    // falls back to the page viewport if no fixed-height wrapper is used
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: containerRef.current || null, rootMargin: '150px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return {
    visible,
    hasMore,
    loadMore,
    sentinelRef,
    containerRef,
    total: items.length,
    shown: visible.length,
  };
}
