import { supabase } from '@/lib/supabase';
import type { Night } from '@/data/deck';

// 07_friends.sql + 12_profiles.sql + 15 (friends_kept) + 19 (friends_live)
export type FriendRow = { other_id: string; handle: string | null; display_name: string | null; status: 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' };
export async function friendsList(): Promise<FriendRow[]> {
  const { data, error } = await supabase.rpc('friends_list');
  if (error) throw error;
  return (data ?? []) as FriendRow[];
}
export type FriendKept = { friend: string; kept_at: string; id: string; slug: string; title: string; meta: string; body: string; poster_no: number | null; type_name: string; venue_name: string | null; city_slug: string; starts_at: string | null; image_url: string | null };
export async function friendsKept(limit = 60): Promise<FriendKept[]> {
  const { data, error } = await supabase.rpc('friends_kept', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as FriendKept[];
}
export async function friendRequest(handle: string): Promise<string> {
  const { data, error } = await supabase.rpc('friend_request', { p_handle: handle });
  if (error) throw error;
  return String(data);
}
export async function friendAccept(other: string) {
  const { error } = await supabase.rpc('friend_accept', { p_other: other });
  if (error) throw error;
}
export async function friendRemove(other: string) {
  const { error } = await supabase.rpc('friend_remove', { p_other: other });
  if (error) throw error;
}
export async function kept(): Promise<Night[]> {
  const { data, error } = await supabase.rpc('kept');
  if (error) throw error;
  return (data ?? []) as Night[];
}
