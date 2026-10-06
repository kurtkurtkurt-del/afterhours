import { supabase } from '@/lib/supabase';
import { invalidate, must, outbox, pendingJobs, remember, send } from '@/lib/offline';
import type { SparkKind } from '@/content/sparks';

// 27_sparks.sql + 28_spark_waves.sql + 30_spark_map.sql. The tables are closed; these calls are the only way in.

// An invite waiting for your answer: a friend started it.
export type SparkInvite = {
  id: string;
  kind: SparkKind;
  title: string;
  starts_at: string;
  place: string | null;
  host_handle: string | null;
  host_name: string | null;
  going: number;
  wave: number | null; // steps from the host to you (1 = your friend)
};

// How far a spark travels: 1 your friends · 2 and their friends · 3 one step further.
export type Reach = 1 | 2 | 3;

// The function is missing until 27_sparks.sql is pasted into Supabase.
export class SparksNotReady extends Error {}
const notReady = (e: { code?: string; message?: string }) => e.code === 'PGRST202' || /could not find the function/i.test(e.message ?? '');

// spot: where you are, so the spark shows on the map (null: no spot).
export async function sparkCreate(kind: SparkKind, title: string, startsAt: Date, place: string, reach: Reach, spot: [number, number] | null): Promise<string> {
  const args = { p_kind: kind, p_title: title, p_starts_at: startsAt.toISOString(), p_place: place, p_reach: reach };
  const { data, error } = await supabase.rpc('spark_create', spot ? { ...args, p_lat: spot[0], p_lng: spot[1] } : args);
  if (error) throw notReady(error) ? new SparksNotReady(error.message) : error;
  invalidate('sparkMine', 'sparksNear');
  return String(data);
}

// How many people each wave holds, counted up. null when unknown (offline, not set up).
export type Audience = { wave1: number; wave2: number; wave3: number };
export async function sparkAudience(): Promise<Audience | null> {
  const data = await remember('sparkAudience', '', () => must(supabase.rpc('spark_audience'))).catch(() => null);
  return ((data ?? []) as Audience[])[0] ?? null;
}

// Answers and cancels still in the outbox: spark id → answer ('cancel' for your own).
function waiting() {
  const m = new Map<string, string>();
  pendingJobs().forEach((j) => {
    if (j.kind === 'sparkAnswer') m.set(j.spark as string, j.answer as string);
    else if (j.kind === 'sparkCancel') m.set(j.spark as string, 'cancel');
  });
  return m;
}

// Empty when signed out, offline or not set up yet: the spark panel simply has no invites.
// Saved copy offline; invites answered in or out while offline are left out.
export async function sparkInbox(): Promise<SparkInvite[]> {
  const list = await remember('sparkInbox', '', async () => ((await must(supabase.rpc('spark_inbox'))) ?? []) as SparkInvite[]).catch(() => [] as SparkInvite[]);
  const w = waiting();
  return list.filter((i) => !['in', 'out', 'cancel'].includes(w.get(i.id) ?? ''));
}

const SPARK_SHELVES = ['sparkInbox', 'sparkMine', 'sparksNear', 'sparkGet', 'sparkPeople'];
outbox(
  'sparkAnswer',
  async (j) => {
    const { error } = await supabase.rpc('spark_answer', { p_spark: j.spark, p_answer: j.answer });
    if (error) throw error;
  },
  SPARK_SHELVES,
);
outbox(
  'sparkCancel',
  async (j) => {
    const { error } = await supabase.rpc('spark_cancel', { p_spark: j.spark });
    if (error) throw error;
  },
  SPARK_SHELVES,
);

// Answers and cancels wait in the outbox offline (both are safe to send twice).
export async function sparkAnswer(spark: string, answer: 'in' | 'out' | 'waiting') {
  await send({ kind: 'sparkAnswer', spark, answer });
}

// What you started, with the answers so far (ended ones drop off after a day).
export type MySpark = { id: string; kind: SparkKind; title: string; starts_at: string; place: string | null; reach: number | null; invited: number; going: number; not_going: number };
export async function sparkMine(): Promise<MySpark[]> {
  const list = await remember('sparkMine', '', async () => ((await must(supabase.rpc('spark_mine'))) ?? []) as MySpark[]).catch(() => [] as MySpark[]);
  const w = waiting();
  return list.filter((s) => w.get(s.id) !== 'cancel');
}

// A spark as the map and its page see it: your answer, whether it is yours, its spot
// (blurred to ~1 km unless you are the host or a friend of the host).
export type SeenSpark = SparkInvite & { mine: boolean; my_answer: 'waiting' | 'in' | 'out' | null; lat: number | null; lng: number | null };
export type NearSpark = SeenSpark & { lat: number; lng: number; distance_km: number };
export async function sparksNear(lat: number, lng: number, km: number): Promise<NearSpark[]> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${Math.round(km)}`;
  const list = await remember('sparksNear', key, async () => ((await must(supabase.rpc('sparks_near', { p_lat: lat, p_lng: lng, p_km: km }))) ?? []) as NearSpark[], 6).catch(() => [] as NearSpark[]);
  const w = waiting();
  return list
    .filter((s) => w.get(s.id) !== 'cancel')
    .map((s) => (w.has(s.id) ? { ...s, my_answer: w.get(s.id) as NearSpark['my_answer'] } : s));
}
// 35_spark_people.sql: who answered, by name (host: in and out; someone in: who else is in).
export type SparkPerson = { name: string; answer: 'in' | 'out'; answered_at: string | null; me: boolean };
export async function sparkPeople(id: string): Promise<SparkPerson[]> {
  return remember('sparkPeople', id, async () => ((await must(supabase.rpc('spark_people', { p_spark: id }))) ?? []) as SparkPerson[], 20).catch(() => []);
}
export async function sparkCancel(id: string) {
  await send({ kind: 'sparkCancel', spark: id });
}
export async function sparkGet(id: string): Promise<SeenSpark | null> {
  const data = await remember('sparkGet', id, () => must(supabase.rpc('spark_get', { p_spark: id })), 20);
  const s = ((data ?? []) as SeenSpark[])[0] ?? null;
  const a = waiting().get(id);
  if (!s || !a) return s;
  return a === 'cancel' ? null : { ...s, my_answer: a as SeenSpark['my_answer'] };
}
