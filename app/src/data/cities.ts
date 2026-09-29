import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import { cities as fallback, type City } from '@/content/cities';

type Row = { slug: string; name: string; status: string; sort_order: number; n: number };

// Cities and night counts from the database (city_counts); a static list when offline.
export function useCities() {
  const [cities, setCities] = useState<City[]>(fallback);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    remember('cities', '', () => must(supabase.rpc('city_counts')))
      .catch(() => null)
      .then((data) => {
        if (cancelled || !data) return;
        const rows = (data as Row[])
          .filter((r) => r.n > 0)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((r) => ({ id: r.slug, name: r.name, nights: r.n }));
        if (rows.length) {
          setCities(rows);
          setLive(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, live };
}
