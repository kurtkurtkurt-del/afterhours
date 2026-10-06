import { supabase } from '@/lib/supabase';
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
  return String(data);
}

// How many people each wave holds, counted up. null when unknown (offline, not set up).
export type Audience = { wave1: number; wave2: number; wave3: number };
export async function sparkAudience(): Promise<Audience | null> {
  const { data, error } = await supabase.rpc('spark_audience');
  if (error) return null;
  return ((data ?? []) as Audience[])[0] ?? null;
}

// Empty when signed out, offline or not set up yet: the spark panel simply has no invites.
export async function sparkInbox(): Promise<SparkInvite[]> {
  const { data, error } = await supabase.rpc('spark_inbox');
  if (error) return [];
  return (data ?? []) as SparkInvite[];
}

export async function sparkAnswer(spark: string, answer: 'in' | 'out' | 'waiting') {
  const { error } = await supabase.rpc('spark_answer', { p_spark: spark, p_answer: answer });
  if (error) throw error;
}

// What you started, with the answers so far (ended ones drop off after a day).
export type MySpark = { id: string; kind: SparkKind; title: string; starts_at: string; place: string | null; reach: number | null; invited: number; going: number; not_going: number };
export async function sparkMine(): Promise<MySpark[]> {
  const { data, error } = await supabase.rpc('spark_mine');
  if (error) return [];
  return (data ?? []) as MySpark[];
}

// A spark as the map and its page see it: your answer, whether it is yours, its spot
// (blurred to ~1 km unless you are the host or a friend of the host).
export type SeenSpark = SparkInvite & { mine: boolean; my_answer: 'waiting' | 'in' | 'out' | null; lat: number | null; lng: number | null };
export type NearSpark = SeenSpark & { lat: number; lng: number; distance_km: number };
export async function sparksNear(lat: number, lng: number, km: number): Promise<NearSpark[]> {
  const { data, error } = await supabase.rpc('sparks_near', { p_lat: lat, p_lng: lng, p_km: km });
  if (error) return [];
  return (data ?? []) as NearSpark[];
}
// 35_spark_people.sql: who answered, by name (host: in and out; someone in: who else is in).
export type SparkPerson = { name: string; answer: 'in' | 'out'; answered_at: string | null; me: boolean };
export async function sparkPeople(id: string): Promise<SparkPerson[]> {
  const { data, error } = await supabase.rpc('spark_people', { p_spark: id });
  if (error) return [];
  return (data ?? []) as SparkPerson[];
}
export async function sparkCancel(id: string) {
  const { error } = await supabase.rpc('spark_cancel', { p_spark: id });
  if (error) throw error;
}
export async function sparkGet(id: string): Promise<SeenSpark | null> {
  const { data, error } = await supabase.rpc('spark_get', { p_spark: id });
  if (error) throw error;
  return ((data ?? []) as SeenSpark[])[0] ?? null;
}
