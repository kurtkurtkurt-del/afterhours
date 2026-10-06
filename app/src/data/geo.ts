import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { remember } from '@/lib/offline';
import type { City } from '@/content/cities';

// Strip accents and lower-case: "İstanbul" → "istanbul", "München" → "munchen".
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ß/g, 'ss');

// City from a location: reverse-geocode the name, then match it against the list.
export async function detectCity(lat: number, lng: number, cities: City[]): Promise<City | null> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const names = places.flatMap((p) => [p.city, p.subregion, p.region]).filter((x): x is string => !!x).map(fold);
    for (const n of names) {
      const hit = cities.find((c) => fold(c.name) === n || c.id === n || fold(c.name).startsWith(n) || n.startsWith(fold(c.name)));
      if (hit) return hit;
    }
  } catch {
    /* without geocoding, the stored city stays */
  }
  return null;
}

// City centre: the average of that city's geolocated nights (cities have no coordinates).
const cache = new Map<string, [number, number]>();
export async function cityCentre(slug: string): Promise<[number, number] | null> {
  const hit = cache.get(slug);
  if (hit) return hit;
  const pts = await remember('centre', slug, async () => {
    const { data: city, error: e1 } = await supabase.from('cities').select('id').eq('slug', slug).maybeSingle();
    if (e1) throw e1;
    if (!city) return [];
    const { data, error } = await supabase.from('events').select('lat,lng').eq('city_id', city.id).not('lat', 'is', null).limit(400);
    if (error) throw error;
    return (data ?? []) as { lat: number; lng: number }[];
  }, 40, { ttl: 7 * 24 * 3600_000 });
  if (!pts.length) return null;
  // Median, so outlying venues do not skew it.
  const lats = pts.map((p) => p.lat).sort((a, b) => a - b);
  const lngs = pts.map((p) => p.lng).sort((a, b) => a - b);
  const c: [number, number] = [lats[Math.floor(lats.length / 2)], lngs[Math.floor(lngs.length / 2)]];
  cache.set(slug, c);
  return c;
}
