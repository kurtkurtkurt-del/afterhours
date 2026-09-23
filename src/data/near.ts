import { supabase } from '@/lib/supabase';
import type { Night } from '@/data/deck';

export type NearNight = Night & { lat: number; lng: number; distance_km: number };

// nights_near(lat, lng, km): yakındaki geceler, en yakın önce (18_geo.sql).
// fonksiyon canlı projede henüz yoksa boş liste ve "missing" işareti döner.
export async function fetchNear(lat: number, lng: number, km: number, limit = 80): Promise<{ rows: NearNight[]; missing: boolean }> {
  const { data, error } = await supabase.rpc('nights_near', { p_lat: lat, p_lng: lng, p_km: km, p_limit: limit });
  if (error) {
    if (/nights_near|function|404/i.test(error.message)) return { rows: [], missing: true };
    throw error;
  }
  return { rows: (data ?? []) as NearNight[], missing: false };
}
