import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import { posterUrl } from '@/data/deck';
import type { DeckCard } from '@/components/CardFace';

// 33_waves.sql: upcoming nights kept in the 2nd and 3rd wave. via: the chain from
// your friend to the keeper (handles), the keeper last.
export type WaveKept = { wave: 2 | 3; via: string[]; kept_at: string; id: string; slug: string; title: string; poster_no: number | null; type_name: string; venue_name: string | null; city_slug: string; starts_at: string | null; image_url: string | null; ticket_url: string | null };

export async function wavesKept(limit = 80): Promise<WaveKept[]> {
  return remember('wavesKept', String(limit), async () => ((await must(supabase.rpc('waves_kept', { p_limit: limit }))) ?? []) as WaveKept[], 3);
}

// One card per night and wave; the first chain names it (rows come soonest first).
export function waveCards(rows: WaveKept[], wave: 2 | 3): DeckCard[] {
  const byId = new Map<string, DeckCard>();
  rows
    .filter((r) => r.wave === wave)
    .forEach((r) => {
      if (byId.has(r.id)) return;
      byId.set(r.id, {
        key: r.id, // the night id: undo takes the swipe back by it
        slug: r.slug,
        title: r.title,
        venue: r.venue_name,
        city: r.city_slug,
        kind: r.type_name.toLowerCase(),
        source: r.ticket_url ? 'ticket' : '',
        startsAt: r.starts_at,
        image: r.image_url,
        poster: r.image_url ? null : posterUrl({ poster_no: r.poster_no }),
        ticketUrl: r.ticket_url,
        friends: [],
        via: { wave, path: r.via.map((n) => n.toLowerCase()) },
      });
    });
  return [...byId.values()];
}
