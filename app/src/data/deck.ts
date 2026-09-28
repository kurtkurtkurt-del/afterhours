import { supabase } from '@/lib/supabase';
import { cachedRead, markSwiped, must, remember, send, shelve, swipedHere } from '@/lib/offline';

// events_public satırı; deck() ve kept() bunu döner
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

// deste: şehrin henüz kaydırılmamış geceleri. null şehir = dünya, null tür = hepsi.
// çevrimdışıyken son kaydedilen deste, bu telefonda o arada kaydırılanlar çıkarılarak
export async function fetchDeck(city: string | null, type: string | null = null, limit = 40) {
  const { value, stale } = await cachedRead('deck', `${city ?? '*'}|${type ?? '*'}|${limit}`, async () => ((await must(supabase.rpc('deck', { p_city: city, p_type: type, p_limit: limit }))) ?? []) as Night[], 12);
  if (!stale) {
    stashNights(value);
    return value;
  }
  const gone = await swipedHere();
  return value.filter((n) => !gone.has(n.slug));
}

// gecenin sayfası: çevrimdışıyken desteden, tutulanlardan ya da haritadan kaydedilenden açılır
export const stashNights = (list: Night[]) => shelve('night', list.map((n) => [n.slug, n]), 500).catch(() => {});
export async function fetchNight(slug: string): Promise<Night | null> {
  return remember('night', slug, async () => (await must(supabase.from('events_public').select('*').eq('slug', slug).maybeSingle())) as Night | null, 500);
}

// keep / let go. giriş gerektirir; aynı kart ikinci kez kaydırılırsa üstüne yazar.
// ağ yoksa sıraya girer, bağlantı gelince gider (lib/offline.ts)
export async function swipe(slug: string, direction: 'left' | 'right') {
  await markSwiped(slug);
  await send({ kind: 'swipe', slug, direction });
}

// tutulan kartlar, en yeni önce
export async function fetchKept() {
  const list = await remember('kept', '', async () => ((await must(supabase.rpc('kept'))) ?? []) as Night[]);
  stashNights(list);
  return list;
}

// geri al: kendi kaydırma satırını siler; kart yeniden desteye düşer
export async function unswipe(eventId: string, slug?: string) {
  if (slug) await markSwiped(slug, false);
  await send({ kind: 'unswipe', eventId });
}

// hepsini sıfırla: kaydırmaların tamamı silinir, deste baştan başlar
export async function resetSwipes() {
  const { error } = await supabase.rpc('swipes_reset');
  if (error) throw error;
}

// poster adresi: fotoğrafı olmayan gecelerin el çizimi svg afişi, web sitesinden
export const SITE = 'https://kurtkurtkurt-del.github.io/afterhours/';
export function posterUrl(n: { poster_no: number | null; poster_path?: string | null }) {
  if (n.poster_path) return SITE + n.poster_path.replace(/^\/+/, '');
  if (n.poster_no) return SITE + 'posters/' + String(n.poster_no).padStart(2, '0') + '.svg';
  return null;
}
