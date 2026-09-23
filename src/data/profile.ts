import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';

// profile_me(): kendi kartın + sayılar + ayarlar, tek çağrı (12_profiles.sql)
export type Profile = {
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

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase.rpc('profile_me').then(({ data }) => {
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setProfile(row as Profile);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);
  return session ? profile : null;
}
