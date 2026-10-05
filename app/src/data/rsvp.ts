import { supabase } from '@/lib/supabase';

// 32_rsvp.sql: who is coming. Your answer to a night, seen by your confirmed friends.
export type Answer = 'in' | 'maybe' | 'out';
export type Rsvp = { event_id: string; user_id: string; name: string; answer: Answer; mine: boolean };

// null takes your answer back.
export async function rsvpSet(eventId: string, answer: Answer | null) {
  const { error } = await supabase.rpc('rsvp_set', { p_event: eventId, p_answer: answer });
  if (error) throw error;
}

// Yours and your friends' answers for these nights (empty when signed out or offline).
export async function rsvpFor(eventIds: string[]): Promise<Rsvp[]> {
  if (!eventIds.length) return [];
  const { data, error } = await supabase.rpc('rsvp_for', { p_events: eventIds });
  if (error) return [];
  return (data ?? []) as Rsvp[];
}
