import { supabase } from '@/lib/supabase';
import { stashNights, type Night } from '@/data/deck';
import { must, remember } from '@/lib/offline';

// 07_friends.sql + 12_profiles.sql + 15 (friends_kept) + 19 (friends_live)
export type FriendRow = { other_id: string; handle: string | null; display_name: string | null; status: 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' };
export async function friendsList(): Promise<FriendRow[]> {
  return remember('friends', '', async () => ((await must(supabase.rpc('friends_list'))) ?? []) as FriendRow[]);
}
export type FriendKept = { friend: string; kept_at: string; id: string; slug: string; title: string; meta: string; body: string; poster_no: number | null; type_name: string; venue_name: string | null; city_slug: string; starts_at: string | null; image_url: string | null };
export async function friendsKept(limit = 60): Promise<FriendKept[]> {
  return remember('friendsKept', String(limit), async () => ((await must(supabase.rpc('friends_kept', { p_limit: limit }))) ?? []) as FriendKept[], 3);
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
  const list = await remember('kept', '', async () => ((await must(supabase.rpc('kept'))) ?? []) as Night[]);
  stashNights(list);
  return list;
}

// 25_people.sql: finding friends. Public card only (handle, name, city);
// people who turned discoverable off never appear.
export type Relation = 'none' | 'friend' | 'outgoing' | 'incoming';
export type Person = { id: string; handle: string; display_name: string | null; city_name: string | null; mutual: number };
export type Found = Person & { relation: Relation };
export type Suggested = Person & { reason: 'mutual' | 'city' | 'new' };
export async function peopleSearch(query: string): Promise<Found[]> {
  const { data, error } = await supabase.rpc('people_search', { p_query: query, p_limit: 12 });
  if (error) throw error;
  return (data ?? []) as Found[];
}
export async function peopleSuggested(n = 3): Promise<Suggested[]> {
  return remember('suggested', String(n), async () => ((await must(supabase.rpc('people_suggested', { p_limit: n }))) ?? []) as Suggested[]);
}

// A person's public card (12_profiles.sql profile_card) plus how you stand with them.
export type PersonCard = { handle: string; display_name: string | null; bio: string | null; city_name: string | null; created_at: string; is_friend: boolean; kept_count: number | null };
export async function person(handle: string): Promise<{ card: PersonCard; found: Found | null } | null> {
  const [card, found] = await Promise.all([
    must(supabase.rpc('profile_card', { p_handle: handle })).then((rows) => ((rows ?? []) as PersonCard[])[0] ?? null),
    peopleSearch(handle).then((rows) => rows.find((r) => r.handle === handle) ?? null).catch(() => null),
  ]);
  return card ? { card, found } : null;
}
