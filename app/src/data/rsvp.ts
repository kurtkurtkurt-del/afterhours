import { supabase } from '@/lib/supabase';
import { must, outbox, pendingJobs, remember, send } from '@/lib/offline';

// 32_rsvp.sql: who is coming. Your answer to a night, seen by your confirmed friends.
export type Answer = 'in' | 'maybe' | 'out';
export type Rsvp = { event_id: string; user_id: string; name: string; answer: Answer; mine: boolean };

outbox(
  'rsvp',
  async (j) => {
    const { error } = await supabase.rpc('rsvp_set', { p_event: j.eventId, p_answer: j.answer });
    if (error) throw error;
  },
  ['rsvp'],
);

// null takes your answer back. Offline it waits in the outbox.
export async function rsvpSet(eventId: string, answer: Answer | null) {
  await send({ kind: 'rsvp', eventId, answer });
}

// Yours and your friends' answers for these nights (saved copy offline, empty when
// signed out). Your answers still waiting in the outbox replace the saved ones.
export async function rsvpFor(eventIds: string[]): Promise<Rsvp[]> {
  if (!eventIds.length) return [];
  const key = [...eventIds].sort().join(',');
  const rows = await remember('rsvp', key, async () => ((await must(supabase.rpc('rsvp_for', { p_events: eventIds }))) ?? []) as Rsvp[], 10).catch(() => [] as Rsvp[]);
  const waiting = new Map<string, Answer | null>();
  pendingJobs('rsvp').forEach((j) => waiting.set(j.eventId as string, j.answer as Answer | null));
  if (!waiting.size) return rows;
  const me = rows.find((r) => r.mine);
  const out = rows.filter((r) => !(r.mine && waiting.has(r.event_id)));
  waiting.forEach((answer, event_id) => {
    if (answer && eventIds.includes(event_id)) out.push({ event_id, user_id: me?.user_id ?? '', name: me?.name ?? '', answer, mine: true });
  });
  return out;
}
