import { supabase } from '@/lib/supabase';
import { prefetchImages } from '@/lib/images';
import { cachedRead, forgetSwiped, invalidate, markSwiped, must, peek, remember, send, shelve, swipedHere } from '@/lib/offline';

// An events_public row, as returned by deck() and kept().
export type Night = {
  id: string;
  slug: string;
  title: string;
  meta: string;
  body: string;
  poster_no: number | null;
  poster_path: string | null;
  image_url: string | null;
  ticket_url: string | null;
  starts_at: string | null;
  starts_at_estimated: boolean;
  date_text: string | null;
  type_slug: string;
  type_name: string;
  city_slug: string;
  city_name: string;
  venue_name: string | null;
  source: string | null;
};

// The deck: the city's nights not yet swiped. null city = everywhere, null type = all.
// The saved deck opens at once, minus what was swiped on this phone since; a fresh one
// is fetched behind it for next time. A saved deck that is nearly used up waits for the
// server instead (when online), so the deck does not run dry.
export async function fetchDeck(city: string | null, type: string | null = null, limit = 40) {
  const key = `${city ?? '*'}|${type ?? '*'}|${limit}`;
  const gone = await swipedHere();
  const saved = peek<Night[]>('deck', key);
  const thin = !saved || saved.filter((n) => !gone.has(n.slug)).length < 8;
  const { value } = await cachedRead('deck', key, async () => {
    const rows = ((await must(supabase.rpc('deck', { p_city: city, p_type: type, p_limit: limit }))) ?? []) as Night[];
    stashNights(rows);
    prefetchImages(rows.slice(0, 10).map((n) => n.image_url));
    return rows;
  }, 12, { fresh: thin });
  // Also on a fresh deck: a swipe still waiting in the outbox is not on the server yet.
  return value.filter((n) => !gone.has(n.slug));
}

// A night page: offline it opens from what was saved from the deck, keeps or the map.
export const stashNights = (list: Night[]) => shelve('night', list.map((n) => [n.slug, n]), 500).catch(() => {});
export async function fetchNight(slug: string): Promise<Night | null> {
  return remember('night', slug, async () => (await must(supabase.from('events_public').select('*').eq('slug', slug).maybeSingle())) as Night | null, 500);
}

// Keep / let go. Requires sign-in; swiping the same card again overwrites.
// Offline it is queued and sent on reconnect (lib/offline.ts).
export async function swipe(slug: string, direction: 'left' | 'right') {
  await markSwiped(slug);
  await send({ kind: 'swipe', slug, direction });
}

// Undo: deletes your own swipe row; the card returns to the deck.
export async function unswipe(eventId: string, slug?: string) {
  if (slug) await markSwiped(slug, false);
  await send({ kind: 'unswipe', eventId });
}

// Reset: deletes every swipe; the deck starts over.
export async function resetSwipes() {
  const { error } = await supabase.rpc('swipes_reset');
  if (error) throw error;
  forgetSwiped();
  invalidate('deck', 'kept', 'yours');
}

// Poster URL: the site's hand-drawn SVG for nights without a photo.
export const SITE = 'https://kurtkurtkurt-del.github.io/afterhours/';
export function posterUrl(n: { poster_no: number | null; poster_path?: string | null }) {
  if (n.poster_path) return SITE + n.poster_path.replace(/^\/+/, '');
  if (n.poster_no) return SITE + 'posters/' + String(n.poster_no).padStart(2, '0') + '.svg';
  return null;
}
