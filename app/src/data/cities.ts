import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import { cities as fallback, type City } from '@/content/cities';

type Row = { slug: string; name: string; status: string; sort_order: number; country: string | null; country_slug: string | null; n: number };

// Cities with nights from the database (city_counts), saved copy first; [] when there is
// nothing yet. The warm-up reads the same shelf, so the place picker never waits.
export async function loadCities(): Promise<City[]> {
  const data = await remember('cities', '', () => must(supabase.rpc('city_counts')), 1, { ttl: 10 * 60_000 }).catch(() => null);
  if (!data) return [];
  return (data as Row[])
    .filter((r) => r.n > 0)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ id: r.slug, name: r.name, nights: r.n, country: r.country ?? '', countrySlug: r.country_slug ?? '' }));
}

// Cities and night counts from the database (city_counts); a static list when offline.
export function useCities() {
  const [cities, setCities] = useState<City[]>(fallback);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCities().then((rows) => {
      if (cancelled || !rows.length) return;
      setCities(rows);
      setLive(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, live };
}
