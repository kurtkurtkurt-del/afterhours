import { launchImageLibraryAsync } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import type { Night } from '@/data/deck';
import { SITE } from '@/data/deck';

// 44_groups.sql. Every call goes through a function that first checks you are in the group.

export type GroupColor = 'red' | 'gold' | 'blue' | 'green' | 'violet' | 'paper';
export const GROUP_COLORS: Record<GroupColor, string> = {
  red: '#E5322D',
  gold: '#D9A441',
  blue: '#3E6FD8',
  green: '#3FA36B',
  violet: '#8A5CD6',
  paper: '#F3F1EC',
};
export const GROUP_EMOJI = ['🪩', '🎧', '🎉', '🍻', '🌙', '🔥', '🎸', '🕺', '💃', '🌅', '⚡', '✦'];

export type GroupRow = {
  id: string;
  name: string;
  emoji: string;
  color: GroupColor;
  cover_path: string | null;
  kind: 'lasting' | 'once';
  city_slug: string | null;
  date_from: string | null;
  date_to: string | null;
  members: number;
  faces: string[];
  matches: number;
  to_swipe: number;
  live: number;
  archived: boolean;
};
export type Member = { id: string; handle: string | null; name: string | null; role: 'owner' | 'member' };
export type Group = Omit<GroupRow, 'members' | 'faces' | 'matches' | 'to_swipe' | 'live'> & { me: string; members: Member[]; visible?: boolean };
export type GroupForm = { name: string; emoji: string; color: GroupColor; kind: 'lasting' | 'once'; city: string | null; from: string | null; to: string | null };
export type Match = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  venue_name: string | null;
  city_name: string;
  image_url: string | null;
  poster_no: number | null;
  poster_path: string | null;
  yes: number;
  no: number;
  members: number;
  status: 'match' | 'most' | 'some';
  yes_ids: string[];
};
export type LivePerson = { id: string; name: string; answer: 'left' | 'right' | null };
export type LiveState = { card: Night | null; left: number; people: LivePerson[] | null };
export type Peek = { id: string; name: string; emoji: string; color: GroupColor; cover_path: string | null; members: number; mine: boolean; open: boolean; names?: string[]; owner?: string | null; plan_title?: string | null };
export type Suggestion = { user_id: string; handle: string | null; name: string | null; shared: number };

const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const coverUrl = (path: string | null) => (path ? supabase.storage.from('photos').getPublicUrl(path).data.publicUrl : null);

export const myGroups = () => rpc<GroupRow[]>('my_groups');
export const groupGet = (id: string) => rpc<Group>('group_get', { p_id: id });
export const groupSuggest = () => rpc<Suggestion[]>('group_suggest');

const formArgs = (f: GroupForm) => ({
  p_name: f.name,
  p_emoji: f.emoji,
  p_color: f.color,
  p_kind: f.kind,
  p_city: f.city,
  p_from: f.from || null,
  p_to: f.to || null,
});
export const groupCreate = (f: GroupForm, members: string[]) => rpc<string>('group_create', { ...formArgs(f), p_members: members });
export const groupUpdate = (id: string, f: GroupForm) => rpc<void>('group_update', { p_id: id, ...formArgs(f) });
export const groupAdd = (id: string, users: string[]) => rpc<number>('group_add', { p_id: id, p_users: users });
export const groupRemove = (id: string, user: string) => rpc<void>('group_remove', { p_id: id, p_user: user });
export const groupLeave = (id: string) => rpc<void>('group_leave', { p_id: id });
export const groupDelete = (id: string) => rpc<void>('group_delete', { p_id: id });

export const groupInvite = (id: string) => rpc<string>('group_invite', { p_id: id });
export const groupPeek = async (code: string) => (await rpc<Peek[]>('group_peek', { p_code: code }))?.[0] ?? null;
export const groupJoin = (code: string) => rpc<string>('group_join', { p_code: code });
// The link in an invitation: a page on the site that opens the app (g/index.html).
export const inviteUrl = (code: string) => `${SITE}g/?c=${encodeURIComponent(code)}`;

export const groupDeck = (id: string) => rpc<Night[]>('group_deck', { p_id: id, p_limit: 80 });
export const groupSwipe = (id: string, event: string, direction: 'left' | 'right') => rpc<void>('group_swipe', { p_id: id, p_event: event, p_direction: direction });
export const groupUnswipe = (id: string, event: string) => rpc<void>('group_unswipe', { p_id: id, p_event: event });
export const groupMatches = (id: string) => rpc<Match[]>('group_matches', { p_id: id });

export const liveHere = (id: string) => rpc<void>('group_live_here', { p_id: id });
export const liveLeave = (id: string) => rpc<void>('group_live_leave', { p_id: id });
export const liveState = (id: string) => rpc<LiveState>('group_live_state', { p_id: id });
export const liveSkip = (id: string, event: string) => rpc<void>('group_live_skip', { p_id: id, p_event: event });

// Cover: pick, shrink to 1080 wide, upload into your own folder of the photos bucket,
// point the group at it, drop the old file if it was yours.
export async function chooseCover(id: string, uid: string): Promise<string | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];
  const ctx = ImageManipulator.manipulate(asset.uri);
  if ((asset.width ?? 0) > 1080) ctx.resize({ width: 1080 });
  const img = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  const path = `${uid}/group-${id}-${Date.now()}.jpg`;
  const bytes = await new File(img.uri).arrayBuffer();
  const sent = await supabase.storage.from('photos').upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (sent.error) throw sent.error;
  const was = await rpc<string | null>('group_set_cover', { p_id: id, p_path: path });
  if (was && was.startsWith(uid + '/')) await supabase.storage.from('photos').remove([was]).catch(() => {});
  return path;
}

export const why = (e: unknown) => String((e as { message?: string })?.message ?? e).toLowerCase();

// ------------------------------------------------- deciding (46_group_plans.sql)

export type PlanNight = { id: string; slug: string; title: string; starts_at: string | null; venue_name: string | null; image_url: string | null };
export type RoundOption = PlanNight & { votes: number; voters: string[] };
export type Round = { id: string; closes_at: string; started_by: string | null; mine: boolean; voted: number; my_vote: string | null; options: RoundOption[] };
export type PlanPerson = { id: string; name: string | null; answer: 'in' | 'maybe' | 'out' | null; ticket: boolean };
export type Plan = PlanNight & { city_name: string; ticket_url: string | null; set_by: string | null; people: PlanPerson[] };
export type PlanState = { members: number; round: Round | null; plan: Plan | null };
export type Line = { id: number; user_id: string | null; name: string | null; kind: 'say' | 'plan' | 'round' | 'won'; body: string; event_slug: string | null; created_at: string; mine: boolean };

export const groupPlan = (id: string) => rpc<PlanState>('group_plan', { p_group: id });
export const roundStart = (id: string, events: string[], hours: number) => rpc<string>('round_start', { p_group: id, p_events: events, p_hours: hours });
export const roundVote = (round: string, event: string) => rpc<void>('round_vote', { p_round: round, p_event: event });
export const roundClose = (round: string) => rpc<string | null>('round_close', { p_round: round });
export const planSet = (id: string, event: string | null) => rpc<void>('plan_set', { p_group: id, p_event: event });
export const planTicket = (id: string, got: boolean) => rpc<void>('plan_ticket', { p_group: id, p_got: got });
export const groupSay = (id: string, body: string) => rpc<number>('group_say', { p_group: id, p_body: body });
export const groupUnsay = (line: number) => rpc<void>('group_unsay', { p_id: line });
export const groupThread = (id: string, after: number) => rpc<Line[]>('group_thread', { p_group: id, p_after: after });

// ------------------------------------------- the night and after (47_group_nights.sql)

export type GroupNight = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  venue_name: string | null;
  city_name: string;
  image_url: string | null;
  people: { id: string; name: string | null; card: number }[];
  all_of_us: boolean;
  photos: number;
  cover: string | null;
};
export type AlbumPhoto = { id: string; path: string; user_id: string | null; name: string | null; created_at: string; mine: boolean };
export type GroupStats = {
  nights: number;
  nights_year: number;
  room: string | null;
  regular: { name: string | null; n: number } | null;
  matches: number;
  votes: number;
  photos: number;
  kinds: string[];
  hour: number | null;
};
export type AlsoThere = { id: string; name: string; emoji: string; color: GroupColor; friends: string[] };

export const groupNights = (id: string) => rpc<GroupNight[]>('group_nights', { p_group: id });
export const groupAlbum = (id: string, event: string) => rpc<AlbumPhoto[]>('group_album', { p_group: id, p_event: event });
export const groupStats = (id: string) => rpc<GroupStats>('group_stats', { p_group: id });
export const groupSetVisible = (id: string, visible: boolean) => rpc<void>('group_set_visible', { p_group: id, p_visible: visible });
export const groupAlsoThere = (id: string) => rpc<AlsoThere[]>('group_also_there', { p_group: id });
export const photoUrl = coverUrl;

export async function albumAdd(id: string, event: string, uid: string): Promise<boolean> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = picked.canceled ? null : picked.assets?.[0];
  if (!asset) return false;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if ((asset.width ?? 0) > 1440) ctx.resize({ width: 1440 });
  const img = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  const path = `${uid}/album-${id}-${Date.now()}.jpg`;
  const sent = await supabase.storage.from('photos').upload(path, await new File(img.uri).arrayBuffer(), { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (sent.error) throw sent.error;
  try {
    await rpc<string>('group_photo_add', { p_group: id, p_event: event, p_path: path });
  } catch (e) {
    await supabase.storage.from('photos').remove([path]).catch(() => {});
    throw e;
  }
  return true;
}
export async function albumRemove(photo: string, uid: string) {
  const path = await rpc<string | null>('group_photo_remove', { p_id: photo });
  if (path && path.startsWith(uid + '/')) await supabase.storage.from('photos').remove([path]).catch(() => {});
}

// 49_design_reads.sql: every photo of the group, for the wall on "our nights" (11E)
export type WallPhoto = { id: string; path: string; event_id: string; event_title: string; starts_at: string | null; name: string | null; mine: boolean; created_at: string };
export const groupWall = (id: string) => rpc<WallPhoto[]>('group_wall', { p_group: id });
