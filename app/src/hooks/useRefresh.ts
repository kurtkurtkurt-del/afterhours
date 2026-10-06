import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { onBackOnline, useShelf } from '@/lib/offline';

// A counter that increments whenever the tab gains focus or the connection returns,
// and when one of the named shelves got something new from a background fetch;
// data-fetching effects depend on it.
export function useRefreshOnFocus(...shelves: string[]) {
  const [tick, setTick] = useState(0);
  const fresh = useShelf(...shelves);
  useEffect(() => onBackOnline(() => setTick((t) => t + 1)), []);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, []),
  );
  return tick + fresh;
}
