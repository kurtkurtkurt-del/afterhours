import { supabase } from '@/lib/supabase';
import { must, remember, send } from '@/lib/offline';

// profile_settings row: only the owner reads and writes it (12_profiles.sql).
export type Settings = {
  kept_visibility: 'friends' | 'private';
  discoverable: boolean;
  notify_email: boolean;
  locale: 'en' | 'de' | 'tr';
  // 26_push.sql; missing until that file is applied, which reads as on
  notify_requests?: boolean;
  notify_accepts?: boolean;
  notify_matches?: boolean;
  notify_live?: boolean;
  notify_nights?: boolean;
  notify_rooms?: boolean;
  notify_replies?: boolean;
  notify_digest?: boolean;
  notify_djs?: boolean;
  notify_waves?: boolean;
  // 26 + 34_spark_push.sql
  notify_sparks?: boolean;
};

export async function fetchSettings(userId: string): Promise<Settings | null> {
  const data = await remember('settings', '', () => must(supabase.from('profile_settings').select('*').eq('user_id', userId).maybeSingle())).catch(() => null);
  return (data as Settings | null) ?? null;
}

export async function saveSettings(userId: string, patch: Partial<Settings>) {
  // Switch changes are queued while offline.
  await send({ kind: 'settings', userId, patch });
}

// ok · empty · format · taken · yours
export async function handleStatus(handle: string): Promise<string> {
  const { data, error } = await supabase.rpc('handle_status', { p_handle: handle });
  if (error) throw error;
  return String(data);
}

// Finishes registration / updates the profile. Returns 'ok' or an error code.
export async function saveProfile(p: { handle: string; name: string; city: string | null; bio: string }): Promise<string> {
  const { data, error } = await supabase.rpc('profile_setup', {
    p_handle: p.handle,
    p_display_name: p.name,
    p_city_slug: p.city,
    p_bio: p.bio,
  });
  if (error) throw error;
  return String(data);
}

export async function exportMe(): Promise<string> {
  const { data, error } = await supabase.rpc('export_me');
  if (error) throw error;
  return JSON.stringify(data, null, 2);
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
}
