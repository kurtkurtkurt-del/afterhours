import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { onBackOnline } from '@/lib/offline';

// sekme her öne geldiğinde ve internet geri geldiğinde artan sayaç:
// veri çeken effect'ler buna bağlanır
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
