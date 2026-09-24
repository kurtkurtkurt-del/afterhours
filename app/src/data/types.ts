import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type EventType = { id: string; label: string };

// spec'teki altı tür, spec sırasıyla. veritabanından okunur; ağ yoksa bu liste.
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
