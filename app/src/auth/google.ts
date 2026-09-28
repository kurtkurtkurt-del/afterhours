import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

// google ile giriş. supabase'in google sağlayıcısı üzerinden, uygulamanın içinde
// açılan bir tarayıcı penceresiyle: google'da onaylanır, supabase uygulamaya
// afterhours://auth-callback adresiyle döner, oturum o adresten kurulur.
//
// misafirken basılırsa aynı kullanıcıya google bağlanır (kaydırmalar kaybolmaz).
// supabase panelinde "manual linking" kapalıysa bağlama reddedilir; o zaman
// normal giriş yapılır ve misafirin kaydırmaları misafirde kalır.
export const REDIRECT = 'afterhours://auth-callback';

WebBrowser.maybeCompleteAuthSession();

// dönüş adresinden oturum: #access_token=… (implicit) ya da ?code=… (pkce)
export async function sessionFromUrl(url: string) {
  const [, query = ''] = url.split('?');
  const [, hash = ''] = url.split('#');
  const q = new URLSearchParams(query.split('#')[0]);
  const h = new URLSearchParams(hash);
  const failed = h.get('error_description') ?? q.get('error_description') ?? h.get('error') ?? q.get('error');
  if (failed) throw new Error(failed.replace(/\+/g, ' '));
  const code = q.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  const access_token = h.get('access_token');
  const refresh_token = h.get('refresh_token');
  if (!access_token || !refresh_token) return false;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return true;
}

// true: giriş yapıldı · false: vazgeçildi · hata: mesajıyla fırlar
export async function signInWithGoogle(): Promise<boolean> {
  const options = { redirectTo: REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } };
  const { data: current } = await supabase.auth.getSession();
  let url: string | null = null;
  if (current.session?.user.is_anonymous) {
    const linked = await supabase.auth.linkIdentity({ provider: 'google', options });
    if (!linked.error) url = linked.data.url ?? null;
  }
  if (!url) {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options });
    if (error) throw error;
    url = data.url;
  }
  if (!url) throw new Error('no url');
  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
  if (result.type !== 'success') return false;
  return sessionFromUrl(result.url);
}
