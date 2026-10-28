import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Storage from 'expo-sqlite/kv-store';
import { readAuthReturn } from '@/auth/authReturn';
import { supabase } from '@/lib/supabase';

// Sign in with Google through Supabase's Google provider, in an in-app browser
// window: the user approves at Google, Supabase redirects to afterhours://auth-callback,
// and the session is built from that URL.
//
// Pressed as a guest, Google is linked to the same user (swipes are kept).
// If "manual linking" is off in the Supabase dashboard linking is refused; then a
// normal sign-in happens and the guest's swipes stay with the guest.
// afterhours://auth-callback in a real build; in Expo Go the app has no scheme of its
// own, so the return address is Expo Go's exp://…/--/auth-callback (allowed in Supabase
// with the redirect pattern exp://**).
const REDIRECT = Linking.createURL('auth-callback');

WebBrowser.maybeCompleteAuthSession();

// The PKCE verifier lives in supabase-js's storage (lib/supabase.ts, flowType 'pkce');
// next to it we keep when this phone started a Google sign-in. A return address is
// only traded for a session if one was started here in the last ten minutes, and
// only once: that mark is our `state`. A code nobody here asked for is dropped.
const PENDING = 'auth.google.started';
const PENDING_MS = 10 * 60 * 1000;

// Session from the redirect URL: ?code=… (PKCE) only — see auth/authReturn.ts.
export async function sessionFromUrl(url: string) {
  const back = readAuthReturn(url);
  if (back.kind === 'error') throw new Error(back.message);
  if (back.kind !== 'code') return false;
  const started = Number(await Storage.getItem(PENDING));
  await Storage.removeItem(PENDING);
  if (!started || Date.now() - started > PENDING_MS) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(back.code);
  if (error) throw error;
  return true;
}

// true: signed in · false: cancelled · throws with a message on error
export async function signInWithGoogle(): Promise<boolean> {
  if (Platform.OS === 'web') return signInWithGoogleWeb();
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
  await Storage.setItem(PENDING, String(Date.now()));
  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
  if (result.type !== 'success') return false;
  // Android may hand the same address to auth-callback too, which may trade the code
  // first (this one then fails or finds nothing); then the session is already here.
  const traded = await sessionFromUrl(result.url).catch((e: unknown) => e);
  if (traded === true) return true;
  const { data: after } = await supabase.auth.getSession();
  if (after.session && !after.session.user.is_anonymous) return true;
  if (traded instanceof Error) throw traded;
  return false;
}

// Web (the PWA): the whole page goes to Google and comes back to where it was;
// detectSessionInUrl (lib/supabase.ts) builds the session from the returning URL.
async function signInWithGoogleWeb(): Promise<boolean> {
  const options = { redirectTo: window.location.href.split(/[?#]/)[0], queryParams: { prompt: 'select_account' } };
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user.is_anonymous) {
    const linked = await supabase.auth.linkIdentity({ provider: 'google', options });
    if (!linked.error) return false;
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options });
  if (error) throw error;
  // The page is leaving; nothing to report here.
  return false;
}
