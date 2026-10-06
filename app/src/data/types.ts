import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';

type EventType = { id: string; label: string };

// The six event types in spec order. Read from the database; this list when offline.
const fallback: EventType[] = [
  { id: 'rave', label: 'rave' },
  { id: 'club-night', label: 'club night' },
  { id: 'konzert', label: 'konzert' },
  { id: 'festival', label: 'festival' },
  { id: 'meetup', label: 'meetup' },
  { id: 'hausparty', label: 'hausparty' },
];

export function useEventTypes() {
  const [types, setTypes] = useState<EventType[]>(fallback);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('event_types')
      .select('slug,name,sort_order')
      .order('sort_order')
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        setTypes(data.map((t) => ({ id: t.slug as string, label: (t.name as string).toLowerCase() })));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return types;
}

// Published nights per type in a city (06_views.sql event_counts), for the counts in the
// type picker. Everywhere (no city) has no counts.
export async function typeCounts(city: string | null): Promise<Record<string, number> | null> {
  if (!city) return null;
  const rows = await remember('typeCounts', city, () => must(supabase.rpc('event_counts', { p_city: city })), 20, { ttl: 10 * 60_000 }).catch(() => null);
  if (!rows) return null;
  const out: Record<string, number> = {};
  (rows as { type_slug: string; n: number }[]).forEach((r) => (out[r.type_slug] = Number(r.n)));
  return out;
}
