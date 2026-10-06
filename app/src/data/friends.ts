import { supabase } from '@/lib/supabase';
import { stashNights, type Night } from '@/data/deck';
import { must, outbox, pendingJobs, remember, send } from '@/lib/offline';

// 07_friends.sql + 12_profiles.sql + 15 (friends_kept) + 19 (friends_live)
export type FriendRow = { other_id: string; handle: string | null; display_name: string | null; status: 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' };
export async function friendsList(): Promise<FriendRow[]> {
  return remember('friends', '', async () => ((await must(supabase.rpc('friends_list'))) ?? []) as FriendRow[]);
}
export type FriendKept = { friend: string; kept_at: string; id: string; slug: string; title: string; meta: string; body: string; poster_no: number | null; type_name: string; venue_name: string | null; city_slug: string; starts_at: string | null; image_url: string | null };
export async function friendsKept(limit = 60): Promise<FriendKept[]> {
  return remember('friendsKept', String(limit), async () => ((await must(supabase.rpc('friends_kept', { p_limit: limit }))) ?? []) as FriendKept[], 3);
}
// Requests, accepts and removals go through the outbox; each is safe to send twice.
const FRIEND_SHELVES = ['friends', 'friendsKept', 'live', 'suggested', 'photos', 'personCards'];
outbox(
  'friendRequest',
  async (j) => {
    const { data, error } = await supabase.rpc('friend_request', { p_handle: j.handle });
    if (error) throw error;
    return String(data);
  },
  FRIEND_SHELVES,
);
outbox(
  'friendAccept',
  async (j) => {
    const { error } = await supabase.rpc('friend_accept', { p_other: j.other });
    if (error) throw error;
  },
  FRIEND_SHELVES,
);
outbox(
  'friendRemove',
  async (j) => {
    const { error } = await supabase.rpc('friend_remove', { p_other: j.other });
    if (error) throw error;
  },
  FRIEND_SHELVES,
);

// The server's answer ('sent', 'accepted', 'notfound' …), or 'queued' while offline.
export async function friendRequest(handle: string): Promise<string> {
  const r = await send({ kind: 'friendRequest', handle });
  return r.queued ? 'queued' : String(r.result);
}
export async function friendAccept(other: string) {
  await send({ kind: 'friendAccept', other });
}
export async function friendRemove(other: string) {
  await send({ kind: 'friendRemove', other });
}

// What is still waiting for this person: their handle or id → the relation it leads to.
export function waitingRelations(): Map<string, Relation | 'none'> {
  const m = new Map<string, Relation | 'none'>();
  pendingJobs().forEach((j) => {
    if (j.kind === 'friendRequest') m.set(j.handle as string, 'outgoing');
    else if (j.kind === 'friendAccept') m.set(j.other as string, 'friend');
    else if (j.kind === 'friendRemove') m.set(j.other as string, 'none');
  });
  return m;
}
// 38_profile_lists.sql: the lists under a profile. Yours, or a confirmed friend's
// (their kept nights only when they show them); empty for anyone else.
export async function personKept(handle: string): Promise<Night[]> {
  const list = await remember('personKept', handle, async () => ((await must(supabase.rpc('person_kept', { p_handle: handle }))) ?? []) as Night[], 8);
  stashNights(list);
  return list;
}
export type PersonPerson = { handle: string | null; display_name: string | null };
export async function personPeople(handle: string): Promise<PersonPerson[]> {
  return remember('personPeople', handle, async () => ((await must(supabase.rpc('person_people', { p_handle: handle }))) ?? []) as PersonPerson[], 8);
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
