import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { onBackOnline } from '@/lib/offline';

// A counter that increments whenever the tab gains focus or the connection returns;
// data-fetching effects depend on it.
export function useRefreshOnFocus() {
  const [tick, setTick] = useState(0);
  useEffect(() => onBackOnline(() => setTick((t) => t + 1)), []);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, []),
  );
  return tick;
}
