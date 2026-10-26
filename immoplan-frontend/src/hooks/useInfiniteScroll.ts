import { useRef, useCallback, useEffect } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetching: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll({
  onLoadMore,
  hasNextPage,
  isFetching,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetching) {
        onLoadMore();
      }
    },
    [onLoadMore, hasNextPage, isFetching]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection, rootMargin]);

  return { sentinelRef };
}
