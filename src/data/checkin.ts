import { supabase } from '@/lib/supabase';
import type { NightCardData } from '@/content/cardsgen';

// 19_checkins.sql: check_in, my_cards, room_info, room_list, room_post, friends_live

export const reasons: Record<string, string> = {
  signedout: 'sign in to check in',
  nonight: 'this night is gone',
  notnow: 'check in opens six hours before the night',
  far: 'you need to be at the door for this one',
  notthere: 'only the people who were there can write here',
  frozen: 'this room is frozen',
};
export const reason = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  const code = Object.keys(reasons).find((k) => m.includes(k));
  return code ? reasons[code] : m.toLowerCase();
};

export async function checkIn(slug: string, lat?: number, lng?: number): Promise<number> {
  const { data, error } = await supabase.rpc('check_in', { p_slug: slug, p_lat: lat ?? null, p_lng: lng ?? null });
  if (error) throw error;
  return Number(data);
}

export type CardRow = {
  card_no: number; checked_at: string; freeze_at: string; frozen: boolean;
  slug: string; title: string; type_name: string; venue_name: string | null; city_name: string;
  starts_at: string | null; image_url: string | null;
  crew: string[]; crew_more: number; who_count: number; post_count: number;
  q1_body: string | null; q1_who: string | null; q1_at: string | null;
  q2_body: string | null; q2_who: string | null; q2_at: string | null;
};

export async function myCards(): Promise<CardRow[]> {
  const { data, error } = await supabase.rpc('my_cards');
  if (error) throw error;
  return (data ?? []) as CardRow[];
}

export type RoomInfo = { event_id: string; checked_in: boolean; freeze_at: string; frozen: boolean; who_count: number; initials: string[] };
export async function roomInfo(slug: string): Promise<RoomInfo | null> {
  const { data, error } = await supabase.rpc('room_info', { p_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as RoomInfo) ?? null;
}

export type RoomPost = { id: string; body: string; who: string; mine: boolean; created_at: string };
export async function roomList(slug: string): Promise<RoomPost[]> {
  const { data, error } = await supabase.rpc('room_list', { p_slug: slug });
  if (error) throw error;
  return (data ?? []) as RoomPost[];
}
export async function roomPost(slug: string, body: string) {
  const { error } = await supabase.rpc('room_post', { p_slug: slug, p_body: body });
  if (error) throw error;
}

export type LiveFriend = { friend_id: string; handle: string | null; display_name: string | null; slug: string; title: string; venue_name: string | null; checked_at: string };
export async function friendsLive(): Promise<LiveFriend[]> {
  const { data, error } = await supabase.rpc('friends_live');
  if (error) throw error;
  return (data ?? []) as LiveFriend[];
}

// üreteç için: metal ve motif gecenin kimliğinden seçilir, kart hep aynı çıkar
const METALS = ['steel', 'gold', 'chrome', 'copper', 'gunmetal', 'brass', 'rose', 'titanium', 'nickel', 'anthracite'];
const MOTIFS = ['rays', 'oval', 'diagonal', 'orbit', 'grid', 'moon', 'moire', 'bands', 'iso', 'descend'];
const hash = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
const ddmm = (iso: string | null, year = false) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', year ? { day: '2-digit', month: '2-digit', year: '2-digit' } : { day: '2-digit', month: '2-digit' }) : '';

export function toCardData(r: CardRow): NightCardData {
  const h = hash(r.slug);
  const start = r.starts_at ?? r.checked_at;
  const end = new Date(new Date(start).getTime() + 6 * 3600_000).toISOString();
  return {
    t: r.title.length > 28 ? r.title.slice(0, 27).trimEnd() + '…' : r.title, ty: r.type_name.toUpperCase(), v: (r.venue_name ?? r.city_name).toUpperCase(), d: ddmm(start, true),
    metal: METALS[h % METALS.length], motif: MOTIFS[(h >> 4) % MOTIFS.length],
    in: hhmm(r.checked_at), out: hhmm(end), dur: '6H 00M',
    crew: r.crew.map((c) => c.toUpperCase()), more: r.crew_more, aud: '0:00', msg: r.post_count,
    who: (r.q1_who ?? '').toUpperCase(), froze: ddmm(r.freeze_at), no: String(r.card_no).padStart(4, '0'),
    at1: hhmm(r.q1_at), at2: hhmm(r.q2_at),
    q1: r.q1_body ? [r.q1_body, r.q1_who?.toUpperCase() ?? '', hhmm(r.q1_at)] : undefined,
    q2: r.q2_body ? [r.q2_body, r.q2_who?.toUpperCase() ?? '', hhmm(r.q2_at)] : undefined,
    blank: !r.frozen && r.post_count === 0,
  };
}
