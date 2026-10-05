import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import { useAuth } from '@/auth/AuthContext';

// profile_me(): your card + counts + settings in one call (12_profiles.sql).
type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  city_slug: string | null;
  city_name: string | null;
  created_at: string;
  last_seen_at: string | null;
  kept_count: number;
  friend_count: number;
  comment_count: number;
};

// tick: refetch the profile when it changes (on returning to the page).
export function useProfile(tick = 0) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    remember('profile', '', () => must(supabase.rpc('profile_me'))).catch(() => null).then((data) => {
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setProfile(row as Profile);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, tick]);
  return session ? profile : null;
}

// 29_profile_more.sql: the longer text about you and links to other networks.
// handle null = you. about is null when empty or not visible; links is {} for non-friends.
export type LinkKind = 'instagram' | 'tiktok' | 'spotify' | 'soundcloud' | 'x' | 'website';
export type Extra = { about: string | null; links: Partial<Record<LinkKind, string>> };
export function useProfileExtra(handle: string | null, tick = 0, off = false) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [extra, setExtra] = useState<Extra | null>(null);
  useEffect(() => {
    if (!uid || off) return;
    let cancelled = false;
    remember('profileExtra', handle ?? '', () => must(supabase.rpc('profile_extra', { p_handle: handle })))
      .catch(() => null)
      .then((data) => {
        if (cancelled) return;
        const row = (Array.isArray(data) ? data[0] : data) as Extra | undefined;
        setExtra(row ? { about: row.about, links: row.links ?? {} } : { about: null, links: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, handle, tick, off]);
  return session && !off ? extra : null;
}

export async function saveAbout(about: string) {
  const { error } = await supabase.rpc('profile_about_set', { p_about: about });
  if (error) throw error;
}

// Returns 'ok' or 'format:<kind>' for the first value that does not fit.
export async function saveLinks(links: Partial<Record<LinkKind, string>>): Promise<string> {
  const { data, error } = await supabase.rpc('profile_links_set', { p_links: links });
  if (error) throw error;
  return String(data);
}
