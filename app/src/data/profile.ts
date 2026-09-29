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
