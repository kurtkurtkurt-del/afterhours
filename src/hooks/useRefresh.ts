import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

// sekme her öne geldiğinde artan sayaç: veri çeken effect'ler buna bağlanır
export function useRefreshOnFocus() {
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, []),
  );
  return tick;
}
