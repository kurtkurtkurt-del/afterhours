import { supabase } from '@/lib/supabase';
import { stashNights, type Night } from '@/data/deck';
import { remember } from '@/lib/offline';

export type NearNight = Night & { lat: number; lng: number; distance_km: number };

// nights_near(lat, lng, km): yakındaki geceler, en yakın önce (18_geo.sql).
// fonksiyon canlı projede henüz yoksa boş liste ve "missing" işareti döner.
export async function fetchNear(lat: number, lng: number, km: number, limit = 80): Promise<{ rows: NearNight[]; missing: boolean }> {
  // aynı yer (yaklaşık 1 km) ve yarıçap için son cevap kalır
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
