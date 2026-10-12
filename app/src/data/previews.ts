import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';

// 63_previews.sql: listen to the artist — a 30 second preview of the act on a night
// (Apple, matched ahead of time by backend/tools/previews.mjs). A night without a row
// has no listen button. Saved on the phone like everything else.
export type Preview = { event_id: string; track: string; artist: string; preview_url: string; link: string | null; source: 'apple' | 'deezer' };

export async function previewsFor(ids: string[]): Promise<Map<string, Preview>> {
  if (!ids.length) return new Map();
  const key = [...ids].sort().join(',');
  const rows = await remember('previews', key, async () => ((await must(supabase.rpc('previews_for', { p_events: ids }))) ?? []) as Preview[], 12, { ttl: 6 * 3600_000 }).catch(
    () => [] as Preview[],
  );
  return new Map(rows.map((r) => [r.event_id, r]));
}
