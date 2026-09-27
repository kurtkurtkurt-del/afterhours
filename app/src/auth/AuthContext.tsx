import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
// döngü: '@/i18n' bu dosyayı içe alır. t yalnızca fonksiyonların içinde çağrılır.
import { t } from '@/i18n';
import type { Key } from '@/i18n/dict';

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
  signUp: async () => t('auth.notready'),
  signIn: async () => t('auth.notready'),
  signInAsGuest: async () => t('auth.notready'),
  resetPassword: async () => t('auth.notready'),
  signOut: async () => {},
});

// form doğrulama: supabase'e gitmeden önce, aynı sözlerle
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function checkEmail(email: string) {
  return EMAIL.test(email.trim()) ? null : t('auth.email');
}
export function checkPassword(password: string) {
  if (password.length < 8) return t('auth.password.short');
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return t('auth.password.mix');
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
        // anonim oturum hesaba dönüşür: kaydırmalar ve profil aynı kullanıcıda kalır.
        // e-posta onayı açıksa kullanıcı bağlantıya tıklayana kadar anonim kalır.
        const { data, error } = await supabase.auth.updateUser({ email: email.trim(), password });
        if (error) {
          if (/already|registered|exists/i.test(error.message)) {
            return t('auth.exists');
          }
          return plain(error.message);
        }
        if (data.user?.is_anonymous || data.user?.new_email) return t('auth.confirm');
        return null;
      }
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: city ? { city } : {} } });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return signIn(email, password);
        return plain(error.message);
      }
      // onay açıkken mevcut e-postaya sahte bir kullanıcı döner (kimliksiz): aslında hesap var, giriş dene
      if (data.user && (data.user.identities?.length ?? 0) === 0) return signIn(email, password);
      if (!data.session) return t('auth.confirm');
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

// supabase'in bilinen ingilizce mesajları → söz anahtarı. sıra önemli: ilk uyan kazanır.
const known: [RegExp, Key][] = [
  [/invalid login credentials/i, 'auth.error.credentials'],
  [/email not confirmed/i, 'auth.error.unconfirmed'],
  [/already (been )?registered|already exists/i, 'auth.error.registered'],
  [/rate limit|too many requests|for security purposes/i, 'auth.error.rate'],
  [/should be different from the old password/i, 'auth.error.same'],
  [/password should be|weak password|password is known to be weak/i, 'auth.error.weak'],
  [/anonymous sign-?ins are disabled/i, 'auth.error.noguest'],
  [/signups? (are )?not allowed|signups? (are )?disabled/i, 'auth.error.closed'],
  [/unable to validate email|email address .* is invalid|invalid email/i, 'auth.error.invalid'],
  [/network request failed|failed to fetch/i, 'auth.error.network'],
];

// bilinen mesaj çevrilir; bilinmeyen sunucunun sözüyle kalır.
// supabase mesajları büyük harfle başlar; ekran dili küçük harf
export function authMessage(m: string) {
  const hit = known.find(([re]) => re.test(m));
  return hit ? t(hit[1]) : m.charAt(0).toLowerCase() + m.slice(1);
}
const plain = authMessage;
