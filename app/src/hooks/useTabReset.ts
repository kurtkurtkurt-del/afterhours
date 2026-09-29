import { useEffect, useRef } from 'react';

// Pressing an already-open tab resets it: scrolls to the top, closes open sheets and
// restores selections. Each screen decides what its start is; this only carries the
// signal (sent by TabBar.tsx).
type Handler = () => void;
const handlers = new Map<string, Set<Handler>>();

export function tabPressedAgain(tab: string) {
  handlers.get(tab)?.forEach((fn) => fn());
}

export function useTabReset(tab: string, fn: Handler) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    const call = () => latest.current();
    const set = handlers.get(tab) ?? new Set<Handler>();
    set.add(call);
    handlers.set(tab, set);
    return () => {
      set.delete(call);
    };
  }, [tab]);
}
