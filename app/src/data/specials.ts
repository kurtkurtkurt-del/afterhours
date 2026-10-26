import { supabase } from '@/lib/supabase';
import { must, remember, swipedHere } from '@/lib/offline';
import { stashNights, type Night } from '@/data/deck';
import type { Special } from '@/content/specials';

// The nights of one occasion (content/specials.ts): every published night still ahead
// whose name matches, from every city — your city first, then by date. Kept on the shelf
// like the deck, so a deck opens offline; nights swiped on this phone are left out.
export async function fetchSpecial(s: Special, city: string | null, limit = 60): Promise<Night[]> {
  const gone = await swipedHere();
  const rows = await remember('special', s.id, async () => {
    const from = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const list = ((await must(supabase.from('events_public').select('*').gte('starts_at', from).filter('title', 'imatch', s.match).order('starts_at').limit(limit))) ?? []) as Night[];
    stashNights(list);
    return list;
  }, 4, { ttl: 30 * 60_000 }).catch(() => [] as Night[]);
  const mine = (n: Night) => (city && n.city_slug === city ? 0 : 1);
  return rows.filter((n) => !gone.has(n.slug)).sort((a, b) => mine(a) - mine(b));
}
