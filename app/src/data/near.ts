import { supabase } from '@/lib/supabase';
import { stashNights, type Night } from '@/data/deck';
import { remember } from '@/lib/offline';

export type NearNight = Night & { lat: number; lng: number; distance_km: number };

// nights_near(lat, lng, km): nearby nights, closest first (18_geo.sql).
// If the function is missing on the live project, returns an empty list flagged "missing".
export async function fetchNear(lat: number, lng: number, km: number, limit = 80): Promise<{ rows: NearNight[]; missing: boolean }> {
  // Keep the last answer for the same place (≈1 km) and radius.
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${km},${limit}`;
  return remember('near', key, async () => {
    const { data, error } = await supabase.rpc('nights_near', { p_lat: lat, p_lng: lng, p_km: km, p_limit: limit });
    if (error) {
      if (/nights_near|function|404/i.test(error.message)) return { rows: [] as NearNight[], missing: true };
      throw error;
    }
    const rows = (data ?? []) as NearNight[];
    stashNights(rows);
    return { rows, missing: false };
  }, 8);
}
