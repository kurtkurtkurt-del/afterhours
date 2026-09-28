import { useEffect, useRef } from 'react';

// zaten açık olan sekmeye yeniden basınca o sekme başına döner: en üste kayar,
// açık pencereler kapanır, seçimler ilk haline gelir. neyin "baş" olduğunu her
// ekran kendi bilir; bu yalnızca haberi taşır. (TabBar.tsx haber verir)
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
