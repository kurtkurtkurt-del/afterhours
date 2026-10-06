import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { must, outbox, pendingJobs, remember, send, useShelf } from '@/lib/offline';
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

// Also used by data/warm.ts to fill the shelf before the account page is opened.
export const loadProfile = () => remember('profile', '', () => must(supabase.rpc('profile_me')));

// tick: refetch the profile when it changes (on returning to the page).
export function useProfile(tick = 0) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const fresh = useShelf('profile');
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadProfile().catch(() => null).then((data) => {
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setProfile(row as Profile);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, tick, fresh]);
  return session ? profile : null;
}

// 29_profile_more.sql: the longer text about you and links to other networks.
// handle null = you. about is null when empty or not visible; links is {} for non-friends.
export type LinkKind = 'instagram' | 'tiktok' | 'spotify' | 'soundcloud' | 'x' | 'website' | 'whatsapp';
export type Extra = { about: string | null; links: Partial<Record<LinkKind, string>> };
export function useProfileExtra(handle: string | null, tick = 0, off = false) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [extra, setExtra] = useState<Extra | null>(null);
  const fresh = useShelf('profileExtra');
  useEffect(() => {
    if (!uid || off) return;
    let cancelled = false;
    remember('profileExtra', handle ?? '', () => must(supabase.rpc('profile_extra', { p_handle: handle })))
      .catch(() => null)
      .then((data) => {
        if (cancelled) return;
        const row = (Array.isArray(data) ? data[0] : data) as Extra | undefined;
        const got: Extra = row ? { about: row.about, links: row.links ?? {} } : { about: null, links: {} };
        // Yours: what is still waiting in the outbox shows as saved.
        if (handle === null)
          pendingJobs().forEach((j) => {
            if (j.kind === 'about') got.about = (j.about as string) || null;
            if (j.kind === 'links') got.links = j.links as Extra['links'];
          });
        setExtra(got);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, handle, tick, off, fresh]);
  return session && !off ? extra : null;
}

// The longer text and the links wait in the outbox offline.
outbox(
  'about',
  async (j) => {
    const { error } = await supabase.rpc('profile_about_set', { p_about: j.about });
    if (error) throw error;
  },
  ['profileExtra'],
);
outbox(
  'links',
  async (j) => {
    const { data, error } = await supabase.rpc('profile_links_set', { p_links: j.links });
    if (error) throw error;
    // A value that does not fit is a refusal (the offline bar says so when it was queued).
    if (String(data) !== 'ok') throw Object.assign(new Error(String(data)), { result: String(data) });
    return 'ok';
  },
  ['profileExtra'],
);

export async function saveAbout(about: string) {
  await send({ kind: 'about', about });
}

// Returns 'ok' or 'format:<kind>' for the first value that does not fit. Offline the
// links are queued and 'ok' is returned; the server checks them when they go out.
export async function saveLinks(links: Partial<Record<LinkKind, string>>): Promise<string> {
  try {
    await send({ kind: 'links', links });
    return 'ok';
  } catch (e) {
    const result = (e as { result?: string }).result;
    if (result) return result;
    throw e;
  }
}
