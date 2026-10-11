import { supabase } from '@/lib/supabase';

// Direct messages (59_dms.sql): friends only, one thread per pair. The tables are
// closed; these calls are the only way in. Who has seen what is kept on the phone
// (data/messages.ts), as for rooms and groups.
export type DmThread = { id: string; other_id: string; handle: string | null; name: string | null; last_body: string | null; last_mine: boolean | null; last_id: number | null; last_at: string };
export type DmLine = { id: number; user_id: string; name: string | null; body: string; created_at: string; mine: boolean };

const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const dmList = () => rpc<DmThread[]>('dm_list');
export const dmStart = (handle: string) => rpc<string>('dm_start', { p_handle: handle });
export const dmSend = (thread: string, body: string) => rpc<number>('dm_send', { p_thread: thread, p_body: body });
export const dmUnsay = (id: number) => rpc<void>('dm_unsay', { p_id: id });
export const dmThread = (thread: string, after: number) => rpc<DmLine[]>('dm_thread', { p_thread: thread, p_after: after });
export const why = (e: unknown) => String((e as { message?: string })?.message ?? e).toLowerCase();
