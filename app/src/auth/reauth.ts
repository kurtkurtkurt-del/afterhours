import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { signInWithApple } from '@/auth/apple';
import { signInWithGoogle } from '@/auth/google';

// Deleting the account wants a sign-in from the last ten minutes (111): the server reads
// when from the token, so a stolen session cannot delete. A password account proves it
// with the password (data/safety.ts reauth); a Google or Apple account signs in again
// through its own sheet on the phone. If another account comes back, its session is
// dropped and nothing is deleted; the person signs in again with the right one. (The
// session before is not put back: its refresh token may have turned over meanwhile.)
// On the web the Google page would leave and come back as whoever was picked, so the
// web asks for a sign-in of its own (or the email link of the site delete/ page).
// true: signed in again · false: cancelled
export async function signInAgain(): Promise<boolean> {
  const { data: before } = await supabase.auth.getUser();
  const user = before.user;
  if (!user) throw new Error('sign in first');
  const providers = (user.identities ?? []).map((i) => i.provider);
  let ok: boolean;
  if (Platform.OS !== 'web' && providers.includes('google')) ok = await signInWithGoogle();
  else if (Platform.OS === 'ios' && providers.includes('apple')) ok = await signInWithApple();
  else throw new Error('sign in again first');
  if (!ok) return false;
  const { data: after } = await supabase.auth.getUser();
  if (after.user?.id !== user.id) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('that was another account');
  }
  return true;
}
