import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';

// 97_venue_desk.sql: a community manager runs a room. Every write is a function with
// its own check in the database; what the desk hides or shows is only for looks.

const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
};

export type MyVenue = {
  id: string;
  slug: string;
  name: string;
  city_slug: string;
  city_name: string;
  lat: number | null;
  lng: number | null;
  managers: number;
  nights_ahead: number;
  kept_30: number;
  checkins_30: number;
  featured: number;
};
export const myVenues = () => rpc<MyVenue[]>('my_venues');

export type Manager = { user_id: string; handle: string | null; display_name: string | null; since: string };
export const venueManagers = (venue: string) => rpc<Manager[]>('venue_managers_of', { p_venue: venue });
export const assignVenue = (venue: string, handle: string, on: boolean) => rpc<void>('admin_venue_assign', { p_venue: venue, p_handle: handle, p_on: on });

// the phone book: every room with a manager, for one room to write another
export type VenuePerson = { venue_id: string; venue: string; city_slug: string; city_name: string; user_id: string; handle: string | null; display_name: string | null; mine: boolean };
export const venuePeople = () => rpc<VenuePerson[]>('venue_people');

// the badge on a profile: the rooms a person runs (handle null = you)
export type RunsVenue = { id: string; slug: string; name: string; city_slug: string; city_name: string };
export const personVenues = (handle: string | null) => rpc<RunsVenue[]>('person_venues', { p_handle: handle });
// the badge: a person's rooms, [] while loading or before 97 is in the database
export function useRunsVenues(handle: string | null, off = false) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [runs, setRuns] = useState<RunsVenue[]>([]);
  useEffect(() => {
    if (off || (!handle && !uid)) return;
    let live = true;
    personVenues(handle).then((l) => live && setRuns(l), () => {});
    return () => {
      live = false;
    };
  }, [handle, uid, off]);
  return runs;
}

export type VenueNight = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  is_published: boolean;
  source: string;
  review: 'pending' | 'rejected' | null;
  featured_at: string | null;
  image_url: string | null;
  ticket_url: string | null;
  kept: number;
  letgo: number;
  checkins: number;
  going: number;
  maybe: number;
  tickets: number;
  comments: number;
};
export const venueNights = (venue: string, from?: string, to?: string) =>
  rpc<VenueNight[]>('venue_nights', { p_venue: venue, ...(from ? { p_from: from } : {}), ...(to ? { p_to: to } : {}) });

export type VenueStats = {
  nights_30: number;
  nights_prev: number;
  nights_ahead: number;
  kept_30: number;
  kept_prev: number;
  letgo_30: number;
  checkins_30: number;
  checkins_prev: number;
  tickets_30: number;
  going: number;
  comments_30: number;
  reach: number;
  last_push: string | null;
};
export const venueStats = (venue: string) => rpc<VenueStats>('venue_stats', { p_venue: venue });

export type VenueComment = { id: string; body: string; author: string | null; handle: string | null; night: string; night_slug: string; is_hidden: boolean; created_at: string };
export const venueComments = (venue: string) => rpc<VenueComment[]>('venue_comments', { p_venue: venue, p_limit: 150 });

export const featureNight = (id: string, on: boolean) => rpc<void>('night_feature', { p_id: id, p_on: on });

// the room speaks to its people: returns how many it went to
export const venuePush = (venue: string, line: string) => rpc<number>('venue_push', { p_venue: venue, p_line: line });
