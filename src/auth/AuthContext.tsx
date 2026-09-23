import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// deneme hesabı: boş formla girenler buna bağlanır, böylece keep/let go ve profil çalışır.
// ilk girişte hesap yoksa açılır. herkes aynı hesabı paylaşır; gizli bir şey yok.
export const DEMO = { email: 'demo@afterhours.app', password: 'afterhours-demo-2026' };

type Auth = {
  session: Session | null;
  ready: boolean;
  // hesap açar; hesap zaten varsa girişi dener. hata mesajı döner, başarıda null.
  signUp: (email: string, password: string, city?: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth>({
  session: null,
  ready: false,
  signUp: async () => 'not ready',
  signIn: async () => 'not ready',
  signOut: async () => {},
});

// kimlik. web sitesiyle aynı: e-posta + şifre. kayıt olunca veritabanındaki
// tetikleyici profili kendisi açar (handle_new_user).
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? plain(error.message) : null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, city?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: city ? { city } : {} },
      });
      if (error) {
        // "already registered" → giriş dene
        if (/already|registered|exists/i.test(error.message)) return signIn(email, password);
        return plain(error.message);
      }
      // e-posta onayı açıksa oturum gelmez; hesap var ama giriş onaydan sonra
      if (!data.session) return 'check your inbox to confirm your email';
      return null;
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return <Ctx.Provider value={{ session, ready, signUp, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

// supabase mesajları büyük harfle başlar; ekran dili küçük harf
const plain = (m: string) => m.charAt(0).toLowerCase() + m.slice(1);
