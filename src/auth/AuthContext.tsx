import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// şifre sıfırlama bağlantısı web sitesinin sayfasına döner; orada yeni şifre girilir
const RESET_URL = 'https://kurtkurtkurt-del.github.io/afterhours/reset/';

type Auth = {
  session: Session | null;
  ready: boolean;
  isAnonymous: boolean;
  // hesap açar; hesap zaten varsa girişi dener; anonim oturum varsa onu hesaba yükseltir.
  // hata mesajı döner, başarıda null.
  signUp: (email: string, password: string, city?: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  // hesapsız bakmak: cihaza özel anonim kullanıcı. kaydırmalar ona yazılır, sonra yükseltilir.
  signInAsGuest: () => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth>({
  session: null,
  ready: false,
  isAnonymous: false,
  signUp: async () => 'not ready',
  signIn: async () => 'not ready',
  signInAsGuest: async () => 'not ready',
  resetPassword: async () => 'not ready',
  signOut: async () => {},
});

// form doğrulama: supabase'e gitmeden önce, aynı sözlerle
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function checkEmail(email: string) {
  return EMAIL.test(email.trim()) ? null : 'that does not look like an email';
}
export function checkPassword(password: string) {
  if (password.length < 8) return 'password: at least 8 characters';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'password: letters and a number';
  return null;
}

// kimlik. web sitesiyle aynı: e-posta + şifre. kayıt olunca veritabanındaki
// tetikleyici profili kendisi açar (handle_new_user); anonim kullanıcı için de.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAnonymous = !!session?.user.is_anonymous;

  const signIn = useCallback(async (email: string, password: string) => {
    const bad = checkEmail(email);
    if (bad) return bad;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? plain(error.message) : null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, city?: string) => {
      const bad = checkEmail(email) ?? checkPassword(password);
      if (bad) return bad;
      const { data: cur } = await supabase.auth.getSession();
      if (cur.session?.user.is_anonymous) {
        // anonim oturum hesaba dönüşür: kaydırmalar ve profil aynı kullanıcıda kalır
        const { error } = await supabase.auth.updateUser({ email: email.trim(), password, data: city ? { city } : undefined });
        if (error) {
          if (/already|registered|exists/i.test(error.message)) return signIn(email, password);
          return plain(error.message);
        }
        return null;
      }
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: city ? { city } : {} } });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return signIn(email, password);
        return plain(error.message);
      }
      if (!data.session) return 'check your inbox to confirm your email';
      return null;
    },
    [signIn],
  );

  const signInAsGuest = useCallback(async () => {
    const { data: cur } = await supabase.auth.getSession();
    if (cur.session) return null; // zaten içeride
    const { error } = await supabase.auth.signInAnonymously();
    return error ? plain(error.message) : null;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const bad = checkEmail(email);
    if (bad) return bad;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_URL });
    return error ? plain(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return <Ctx.Provider value={{ session, ready, isAnonymous, signUp, signIn, signInAsGuest, resetPassword, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

// supabase mesajları büyük harfle başlar; ekran dili küçük harf
const plain = (m: string) => m.charAt(0).toLowerCase() + m.slice(1);
