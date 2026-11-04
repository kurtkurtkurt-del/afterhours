import { serverText } from '@/lib/serverText';
import { supabase } from '@/lib/supabase';
import { OfflineError, invalidate, must, outbox, peek, pendingJobs, remember, send, type Job } from '@/lib/offline';
import type { Night } from '@/data/deck';
import CARDS, { type NightCardData } from '@/content/cardsgen';
import { previewsFor } from '@/data/previews';
import type { Key } from '@/i18n/dict';

// 19_checkins.sql: check_in, my_cards, room_info, room_list, room_post, friends_live

// Code → string key, resolved at render time: t(reasons[code]).
export const reasons: Record<string, Key> = {
  signedout: 'checkin.reason.signedout',
  nonight: 'checkin.reason.nonight',
  notnow: 'checkin.reason.notnow',
  far: 'checkin.reason.far',
  notthere: 'checkin.reason.notthere',
  frozen: 'checkin.reason.frozen',
  toolate: 'checkin.reason.toolate',
  offline: 'offline.write',
};
// The error's code; unknown errors are returned as-is (lower-cased). Screens store this.
export const reasonCode = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  return Object.keys(reasons).find((k) => m.includes(k)) ?? serverText(e);
};

// Until 37_offline.sql is in the database the functions have their old parameters:
// PostgREST answers PGRST202 and the old call is made instead.
const oldSignature = (e: { code?: string; message?: string } | null) => !!e && (e.code === 'PGRST202' || /could not find the function/i.test(e.message ?? ''));

// Check-in and room lines go through the outbox. The job's own id and time travel with
// it, so a retry finds the first try (37_offline.sql) and the card keeps the moment the
// button was pressed, not the moment the connection came back.
const ROOM_SHELVES = ['cards', 'roomInfo', 'roomList', 'live', 'personCards'];
outbox(
  'checkIn',
  async (j) => {
    const base = { p_slug: j.slug, p_lat: (j.lat as number | undefined) ?? null, p_lng: (j.lng as number | undefined) ?? null };
    let r = await supabase.rpc('check_in', { ...base, p_at: new Date(j.at).toISOString() });
    if (oldSignature(r.error)) r = await supabase.rpc('check_in', base);
    if (r.error) throw r.error;
    return Number(r.data);
  },
  ROOM_SHELVES,
);
outbox(
  'roomPost',
  async (j) => {
    const base = { p_slug: j.slug, p_body: j.body };
    let r = await supabase.rpc('room_post', { ...base, p_client_id: j.id });
    if (oldSignature(r.error)) r = await supabase.rpc('room_post', base);
    if (r.error) throw r.error;
  },
  ROOM_SHELVES,
);

// The card number, or null when it waits in the outbox (offline).
export async function checkIn(slug: string, lat?: number, lng?: number): Promise<number | null> {
  const r = await send({ kind: 'checkIn', slug, lat, lng });
  return r.queued ? null : Number(r.result);
}

// Within an hour the card can be taken back (88_checkin_truth.sql): the row and the
// pushes that have not left go; the room shelves are read again.
export async function checkOut(slug: string): Promise<boolean> {
  const r = await must(supabase.rpc('check_out', { p_slug: slug }));
  invalidate(...ROOM_SHELVES);
  return !!r;
}

const waitingCheckIn = (slug: string) => pendingJobs('checkIn').find((j) => j.slug === slug);

// A check-in still in the outbox as a card: the night from the phone's shelf, number 0
// until the server gives it one. Without a saved night there is nothing to draw.
function waitingCard(j: Job): CardRow | null {
  const n = peek<Night>('night', j.slug as string);
  if (!n) return null;
  const at = new Date(j.at).toISOString();
  return {
    card_no: 0, checked_at: at, freeze_at: new Date(j.at + 6 * 3600_000).toISOString(), frozen: false,
    slug: n.slug, title: n.title, type_name: n.type_name, venue_name: n.venue_name, city_name: n.city_name,
    starts_at: n.starts_at, image_url: n.image_url, crew: [], crew_more: 0, who_count: 1, post_count: 0,
    q1_body: null, q1_who: null, q1_at: null, q2_body: null, q2_who: null, q2_at: null, waiting: true,
  };
}

export type CardRow = {
  card_no: number; checked_at: string; freeze_at: string; frozen: boolean;
  slug: string; title: string; type_name: string; venue_name: string | null; city_name: string;
  starts_at: string | null; image_url: string | null;
  crew: string[]; crew_more: number; who_count: number; post_count: number;
  q1_body: string | null; q1_who: string | null; q1_at: string | null;
  q2_body: string | null; q2_who: string | null; q2_at: string | null;
  waiting?: boolean; // made offline, still in the outbox
};

// Yours, newest first; check-ins still in the outbox come first as waiting cards.
export async function myCards(): Promise<CardRow[]> {
  const waiting = pendingJobs('checkIn').map(waitingCard).filter((c): c is CardRow => !!c).reverse();
  let cards: CardRow[];
  try {
    cards = await remember('cards', '', async () => ((await must(supabase.rpc('my_cards'))) ?? []) as CardRow[]);
  } catch (e) {
    if (e instanceof OfflineError && waiting.length) return waiting;
    throw e;
  }
  const have = new Set(cards.map((c) => c.slug));
  return [...waiting.filter((c) => !have.has(c.slug)), ...cards];
}

// A friend's cards (36_person_cards.sql): empty for anyone who is not a friend.
export async function personCards(handle: string): Promise<CardRow[]> {
  return remember('personCards', handle, async () => ((await must(supabase.rpc('person_cards', { p_handle: handle }))) ?? []) as CardRow[], 8);
}

export type RoomInfo = { event_id: string; checked_in: boolean; freeze_at: string; frozen: boolean; who_count: number; initials: string[] };
// A check-in waiting in the outbox opens the room on this phone already.
export async function roomInfo(slug: string): Promise<RoomInfo | null> {
  const waiting = waitingCheckIn(slug);
  let row: RoomInfo | null = null;
  try {
    const data = await remember('roomInfo', slug, () => must(supabase.rpc('room_info', { p_slug: slug })), 30);
    row = ((Array.isArray(data) ? data[0] : data) as RoomInfo) ?? null;
  } catch (e) {
    if (!waiting) throw e;
  }
  if (!waiting) return row;
  if (row) return { ...row, checked_in: true };
  const n = peek<Night>('night', slug);
  return { event_id: n?.id ?? '', checked_in: true, freeze_at: new Date(waiting.at + 6 * 3600_000).toISOString(), frozen: false, who_count: 1, initials: [] };
}

export type RoomPost = { id: string; body: string; who: string; mine: boolean; created_at: string; waiting?: boolean };
// Lines still in the outbox are added at the end, marked waiting.
export async function roomList(slug: string): Promise<RoomPost[]> {
  const waiting: RoomPost[] = pendingJobs('roomPost')
    .filter((j) => j.slug === slug)
    .map((j) => ({ id: j.id, body: j.body as string, who: '', mine: true, created_at: new Date(j.at).toISOString(), waiting: true }));
  let list: RoomPost[] = [];
  try {
    list = await remember('roomList', slug, async () => ((await must(supabase.rpc('room_list', { p_slug: slug }))) ?? []) as RoomPost[], 30);
  } catch (e) {
    if (!waiting.length) throw e;
  }
  return [...list, ...waiting];
}
// Offline the line waits in the outbox and shows at once (roomList).
export async function roomPost(slug: string, body: string) {
  await send({ kind: 'roomPost', slug, body });
}

export type LiveFriend = { friend_id: string; handle: string | null; display_name: string | null; slug: string; title: string; venue_name: string | null; checked_at: string };
export async function friendsLive(): Promise<LiveFriend[]> {
  return remember('live', '', async () => ((await must(supabase.rpc('friends_live'))) ?? []) as LiveFriend[]);
}

// For the generator (content/cardsgen.js): the card says only what the row knows. The
// design comes from the kind and the slug inside the generator, so a night always
// renders the same card. The track, when the night has one, comes from cardSounds.
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
const dayDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()} ${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`;
};

export type CardSound = { track: string; artist: string };

export function toCardData(r: CardRow, sound?: CardSound | null): NightCardData {
  return {
    kind: CARDS.kindOf(r.type_name), id: r.slug, ty: r.type_name,
    t: r.title, d: dayDate(r.starts_at ?? r.checked_at), doors: r.starts_at ? hhmm(r.starts_at) : '',
    v: r.venue_name, city: r.city_name,
    crew: r.crew.map((c) => c.toUpperCase()),
    track: sound?.track ?? null, artist: sound?.artist ?? null,
    photo: r.image_url,
  };
}

// The music note: the night's preview track (63_previews.sql), by slug. Nights without
// one are simply missing from the map; the card then shows the small motif.
export async function cardSounds(slugs: string[]): Promise<Map<string, CardSound>> {
  const out = new Map<string, CardSound>();
  const list = [...new Set(slugs.filter(Boolean))];
  if (!list.length) return out;
  try {
    const ids = await remember('cardIds', list.slice().sort().join(','), async () => (await must(supabase.from('events').select('id,slug').in('slug', list))) as { id: string; slug: string }[], 8, { ttl: 6 * 3600_000 });
    const previews = await previewsFor(ids.map((e) => e.id));
    ids.forEach((e) => {
      const p = previews.get(e.id);
      if (p) out.set(e.slug, { track: p.track, artist: p.artist });
    });
  } catch {
    // offline or refused: the cards keep their motif
  }
  return out;
}
