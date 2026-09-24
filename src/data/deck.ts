import { supabase } from '@/lib/supabase';

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
export async function fetchDeck(city: string | null, type: string | null = null, limit = 40) {
  const { data, error } = await supabase.rpc('deck', { p_city: city, p_type: type, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as Night[];
}

// keep / let go. giriş gerektirir; aynı kart ikinci kez kaydırılırsa üstüne yazar.
export async function swipe(slug: string, direction: 'left' | 'right') {
  const { error } = await supabase.rpc('swipe_set', { p_slug: slug, p_direction: direction });
  if (error) throw error;
}

// tutulan kartlar, en yeni önce
export async function fetchKept() {
  const { data, error } = await supabase.rpc('kept');
  if (error) throw error;
  return (data ?? []) as Night[];
}

// geri al: kendi kaydırma satırını siler; kart yeniden desteye düşer
export async function unswipe(eventId: string) {
  const { error } = await supabase.from('swipes').delete().eq('event_id', eventId);
  if (error) throw error;
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
