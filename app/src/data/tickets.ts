import { supabase } from '@/lib/supabase';

// Did you get your ticket? (60_tickets.sql). Ticketmaster tells nobody who bought what,
// so the app asks once, when you come back from the ticket page. Yours alone.
export type TicketAnswer = 'got' | 'no';
const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
};
export const ticketMark = (slug: string, answer: TicketAnswer) => rpc<void>('ticket_mark', { p_slug: slug, p_answer: answer });
export const ticketState = (slug: string) => rpc<TicketAnswer | null>('ticket_state', { p_slug: slug });
export const ticketsMine = async () => new Set(((await rpc<string[]>('tickets_mine')) ?? []).map(String));
