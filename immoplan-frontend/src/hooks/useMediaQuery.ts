import { useSyncExternalStore } from 'react';

function subscribe(query: MediaQueryList, callback: () => void) {
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

/** SSR-safe : `false` côté serveur. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(query);
      return subscribe(mq, onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
