import { useEffect, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import type { AccountType } from '@/data/settings';

// 42_staff.sql. Every staff write is a function with its own check in the database;
// what this file hides or shows is only for looks, the rule is there.

// ------------------------------------------------------------------ the role

// The last role is kept on the phone so the panel tab is there at once on launch.
const KEY = 'role';
let current: AccountType | null = (Storage.getItemSync(KEY) as AccountType | null) ?? null;
const listeners = new Set<(r: AccountType | null) => void>();
const announce = (r: AccountType | null) => {
  current = r;
  try {
    if (r) Storage.setItemSync(KEY, r);
    else Storage.removeItemSync(KEY);
  } catch {}
  listeners.forEach((l) => l(r));
};

export async function refreshRole() {
  const { data, error } = await supabase.rpc('my_role');
  // Before 42 is applied: no my_role, nobody is staff.
  announce(error ? null : ((data as AccountType | null) ?? 'user'));
}

export function useRole() {
  const { session, isAnonymous } = useAuth();
  const [role, setRole] = useState(current);
  const uid = session?.user.id;
  useEffect(() => {
    listeners.add(setRole);
    return () => {
      listeners.delete(setRole);
    };
  }, []);
  useEffect(() => {
    if (!uid || isAnonymous) announce(null);
    else refreshRole().catch(() => {});
  }, [uid, isAnonymous]);
  return uid && !isAnonymous ? role : null;
}

export const isStaff = (r: AccountType | null) => r === 'admin' || r === 'community_manager';

// -------------------------------------------------------------------- lists

export type Place = { slug: string; name: string };
export type Venue = { id: string; name: string; city: string };

// Every city, also the ones without a night yet (useCities shows only those with nights).
export async function allCities(): Promise<Place[]> {
  const { data, error } = await supabase.from('cities').select('slug,name').order('sort_order');
  if (error) throw error;
  return (data ?? []) as Place[];
}

export async function venuesIn(city: string): Promise<Venue[]> {
  const { data, error } = await supabase.from('venues').select('id,name,cities!inner(slug)').eq('cities.slug', city).order('name').limit(300);
  if (error) throw error;
  return (data ?? []).map((v) => ({ id: v.id as string, name: v.name as string, city }));
}

// ------------------------------------------------------------------- nights

export type StaffNight = {
  id: string;
  slug: string;
  title: string;
  city_slug: string;
  type_slug: string;
  venue_id: string | null;
  starts_at: string;
  body: string;
  ticket_url: string | null;
  image_url: string | null;
  is_published: boolean;
  created_by: string | null;
  maker: string | null;
  // 43_event_submit.sql: staff · user (sent in by someone), and where a sent-in one stands
  source?: 'staff' | 'user';
  review?: 'pending' | 'rejected' | null;
};

const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const staffNights = () => rpc<StaffNight[]>('staff_events', { p_limit: 200 });
export const saveNight = (n: {
  id: string | null;
  title: string;
  city: string;
  type: string;
  venue: string | null;
  date: string;
  time: string;
  body: string;
  ticket: string;
  image: string;
  published: boolean;
}) =>
  rpc<string>('staff_event_save', {
    p_id: n.id,
    p_title: n.title,
    p_city: n.city,
    p_type: n.type,
    p_venue: n.venue,
    p_date: n.date,
    p_time: n.time,
    p_body: n.body,
    p_ticket_url: n.ticket,
    p_image_url: n.image,
    p_published: n.published,
  });
export const deleteNight = (id: string) => rpc<void>('staff_event_delete', { p_id: id });

// 43_event_submit.sql: anyone with an account sends a ticketed night in; the staff decide.
export type NightDraft = { title: string; city: string; type: string; venue: string | null; date: string; time: string; body: string; ticket: string; image: string };
export const submitNight = (n: NightDraft) =>
  rpc<string>('event_submit', {
    p_title: n.title,
    p_city: n.city,
    p_type: n.type,
    p_venue: n.venue,
    p_date: n.date,
    p_time: n.time,
    p_body: n.body,
    p_ticket_url: n.ticket,
    p_image_url: n.image,
  });
export type Submission = { id: string; slug: string; title: string; starts_at: string; review: 'pending' | 'rejected' | null; review_note: string | null; is_published: boolean };
export const mySubmissions = () => rpc<Submission[]>('event_submissions');
export type Pending = {
  id: string;
  slug: string;
  title: string;
  city_slug: string;
  type_slug: string;
  venue_name: string | null;
  starts_at: string;
  body: string;
  ticket_url: string | null;
  image_url: string | null;
  maker: string | null;
  handle: string | null;
  sent_at: string;
};
export const pendingNights = () => rpc<Pending[]>('staff_pending');
export const reviewNight = (id: string, ok: boolean, note: string | null) => rpc<void>('staff_review', { p_id: id, p_ok: ok, p_note: note });

export const saveVenue = (v: { id: string | null; city: string; name: string; lat: number | null; lng: number | null }) =>
  rpc<string>('staff_venue_save', { p_id: v.id, p_city: v.city, p_name: v.name, p_lat: v.lat, p_lng: v.lng });

// ---------------------------------------------------------------------- djs

export type DjForm = { name: string; genre: string; sound: 'house' | 'techno' | 'rap'; city: string | null; bio: string; photo: string };
export type MyDj = DjForm & { id: string; slug: string };
export type DjSetRow = { id: string; venue: string; starts_at: string; hours: number };

export const saveDj = (f: DjForm) =>
  rpc<string>('staff_dj_save', { p_id: null, p_name: f.name, p_genre: f.genre, p_sound: f.sound, p_city: f.city, p_bio: f.bio, p_photo: f.photo });

export async function myDj(): Promise<MyDj | null> {
  const rows = await rpc<{ id: string; slug: string; name: string; genre: string; sound: DjForm['sound']; city_slug: string | null; bio: string | null; photo_url: string | null }[]>('dj_mine');
  const r = rows?.[0];
  return r ? { id: r.id, slug: r.slug, name: r.name, genre: r.genre, sound: r.sound, city: r.city_slug, bio: r.bio ?? '', photo: r.photo_url ?? '' } : null;
}
export const saveMyDj = (f: DjForm) =>
  rpc<string>('dj_save_mine', { p_name: f.name, p_genre: f.genre, p_sound: f.sound, p_city: f.city, p_bio: f.bio, p_photo: f.photo });

export const setsOf = (dj: string) => rpc<DjSetRow[]>('dj_sets_of', { p_dj: dj });
export const addSet = (s: { dj: string; venue: string; city: string | null; date: string; time: string; hours: number }) =>
  rpc<string>('dj_set_add', { p_dj: s.dj, p_venue: s.venue, p_city: s.city, p_date: s.date, p_time: s.time, p_hours: s.hours });
export const deleteSet = (id: string) => rpc<void>('dj_set_delete', { p_id: id });

// ----------------------------------------------------------------- comments

export type StaffComment = { id: string; body: string; author: string | null; night: string; night_slug: string; is_hidden: boolean; created_at: string };
export const staffComments = () => rpc<StaffComment[]>('staff_comments', { p_limit: 100 });
export const hideComment = (id: string, hidden: boolean) => rpc<void>('staff_comment_hide', { p_id: id, p_hidden: hidden });

// -------------------------------------------------------------------- admin

export type Overview = {
  people: number;
  people_week: number;
  managers: number;
  djs: number;
  nights_ahead: number;
  nights_staff: number;
  venues: number;
  comments_week: number;
  pending?: number;
  reported?: number;
  feedback_open: number | null;
};
export type Person = { id: string; handle: string | null; display_name: string | null; role: AccountType; created_at: string };
export type LogLine = { at: string; who: string; action: string; target: string; target_id: string | null; note: string | null };
export type Feedback = { id: string; kind: string; body: string; author: string | null; contact: string | null; handled: boolean; created_at: string };

export const overview = () => rpc<Overview>('admin_overview');
export const people = (q: string) => rpc<Person[]>('admin_people', { p_query: q });
export const setPersonType = (user: string, type: AccountType) => rpc<string>('admin_set_type', { p_user: user, p_type: type });
export const staffLog = () => rpc<LogLine[]>('admin_log', { p_limit: 200 });
export const feedbackList = () => rpc<Feedback[]>('feedback_list', { p_limit: 200 });
export async function markFeedback(id: string, handled: boolean) {
  const { error } = await supabase.from('feedback').update({ handled }).eq('id', id);
  if (error) throw error;
}

// The error a function raised, as a short line for the screen.
export const why = (e: unknown) => String((e as { message?: string })?.message ?? e).toLowerCase();

// 49_design_reads.sql: people by role, with nights kept and groups (design 17C)
export type PersonRow = Person & { nights: number; groups: number };
export type RoleCounts = { all: number; dj: number; community_manager: number; admin: number; new: number };
export const peopleBy = (q: string, role: string) => rpc<PersonRow[]>('admin_people_by', { p_query: q, p_role: role });
export const roleCounts = () => rpc<RoleCounts>('admin_role_counts');
