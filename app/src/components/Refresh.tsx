import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { invalidateAll } from '@/lib/offline';
import { colors } from '@/theme/tokens';

// Pull to refresh (owner, 03.11.2026): pulling a page down from the top asks every shelf
// on screen again from the server. `also` is for what a page reads outside the shelves.
// Usage: const refresh = usePullRefresh(); <ScrollView refreshControl={refresh} />
export function usePullRefresh(also?: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([invalidateAll(), Promise.resolve(also?.()).catch(() => {}), new Promise((r) => setTimeout(r, 600))]);
    } finally {
      setRefreshing(false);
    }
  }, [also]);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.paper} colors={[colors.ink]} progressBackgroundColor={colors.paper} />;
}
