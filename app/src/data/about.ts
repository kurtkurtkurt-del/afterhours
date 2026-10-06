import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import type { Lang } from '@/i18n';

// 40_event_about.sql: "who is this?" — a few lines about the act on a night, written
// ahead of time from a source (Wikipedia) and stored per night and language. A night
// without a row has no "who is this?". Saved on the phone like everything else.
export type About = { event_id: string; name: string; kicker: string; who: string | null; facts: string[]; source_url: string };

export async function aboutFor(ids: string[], lang: Lang): Promise<Map<string, About>> {
  if (!ids.length) return new Map();
  const key = `${lang}|${[...ids].sort().join(',')}`;
  const rows = await remember('about', key, async () => ((await must(supabase.rpc('about_for', { p_events: ids, p_lang: lang }))) ?? []) as About[], 12, { ttl: 6 * 3600_000 }).catch(
    () => [] as About[],
  );
  return new Map(rows.map((r) => [r.event_id, r]));
}
