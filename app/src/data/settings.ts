import { supabase } from '@/lib/supabase';

// profile_settings satırı: sadece sahibi okur/yazar (12_profiles.sql)
export type Settings = {
  kept_visibility: 'friends' | 'private';
  discoverable: boolean;
  notify_email: boolean;
  locale: 'en' | 'de' | 'tr';
};

export async function fetchSettings(userId: string): Promise<Settings | null> {
  const { data } = await supabase.from('profile_settings').select('kept_visibility,discoverable,notify_email,locale').eq('user_id', userId).maybeSingle();
  return (data as Settings | null) ?? null;
}

export async function saveSettings(userId: string, patch: Partial<Settings>) {
  const { error } = await supabase.from('profile_settings').update(patch).eq('user_id', userId);
  if (error) throw error;
}

// ok · empty · format · taken · yours
export async function handleStatus(handle: string): Promise<string> {
  const { data, error } = await supabase.rpc('handle_status', { p_handle: handle });
  if (error) throw error;
  return String(data);
}

// kaydı bitirir / profili günceller. 'ok' ya da hata kodu döner.
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
