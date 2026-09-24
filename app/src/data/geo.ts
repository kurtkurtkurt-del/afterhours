import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import type { City } from '@/content/cities';

// aksanları at, küçük harfe indir: "İstanbul" → "istanbul", "München" → "munchen"
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ß/g, 'ss');

// konumdan şehir: ters geokodlama ile ad, sonra listedeki şehirle eşleme
export async function detectCity(lat: number, lng: number, cities: City[]): Promise<City | null> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const names = places.flatMap((p) => [p.city, p.subregion, p.region]).filter((x): x is string => !!x).map(fold);
    for (const n of names) {
      const hit = cities.find((c) => fold(c.name) === n || c.id === n || fold(c.name).startsWith(n) || n.startsWith(fold(c.name)));
      if (hit) return hit;
    }
  } catch {
    /* geokodlama yoksa kayıtlı şehir kalır */
  }
  return null;
}

// şehir merkezi: o şehrin koordinatlı gecelerinin ortalaması (cities tablosunda nokta yok)
const cache = new Map<string, [number, number]>();
export async function cityCentre(slug: string): Promise<[number, number] | null> {
  const hit = cache.get(slug);
  if (hit) return hit;
  const { data: city } = await supabase.from('cities').select('id').eq('slug', slug).maybeSingle();
  if (!city) return null;
  const { data } = await supabase.from('events').select('lat,lng').eq('city_id', city.id).not('lat', 'is', null).limit(400);
  const pts = (data ?? []) as { lat: number; lng: number }[];
  if (!pts.length) return null;
  // medyan: uç mekânlar ortalamayı kaydırmasın
  const lats = pts.map((p) => p.lat).sort((a, b) => a - b);
  const lngs = pts.map((p) => p.lng).sort((a, b) => a - b);
  const c: [number, number] = [lats[Math.floor(lats.length / 2)], lngs[Math.floor(lngs.length / 2)]];
  cache.set(slug, c);
  return c;
}
