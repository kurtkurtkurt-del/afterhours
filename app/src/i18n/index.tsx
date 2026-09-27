import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { useAuth } from '@/auth/AuthContext';
import { fetchSettings, saveSettings } from '@/data/settings';
import { dict, type CountKey, type Key } from './dict';

export type { Key, CountKey } from './dict';

// üç dil: english · deutsch · türkçe. web sitesiyle aynı sözler, aynı sıra:
//   1. bu cihazda seçilmiş dil (kv-store 'afterhours.lang')
//   2. hesabın hatırladığı dil (profile_settings.locale), cihazda seçim yoksa
//   3. telefonun dili
//   4. english
// sözler src/i18n/parts/*.ts içinde, üç dil yan yana. anahtar tipli: olmayan
// bir anahtar tsc'de kırmızı yanar.

export type Lang = 'en' | 'de' | 'tr';
export const langs: Lang[] = ['en', 'de', 'tr'];
export const langNames: Record<Lang, string> = { en: 'english', de: 'deutsch', tr: 'türkçe' };

const KEY = 'afterhours.lang';
type Vars = Record<string, string | number>;
type Entry = { en: string; de: string; tr: string };

function known(code: unknown): Lang | null {
  const two = String(code ?? '').toLowerCase().slice(0, 2);
  return (langs as string[]).includes(two) ? (two as Lang) : null;
}

function fromDevice(): Lang | null {
  try {
    return known(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

function remembered(): Lang | null {
  try {
    return known(Storage.getItemSync(KEY));
  } catch {
    return null;
  }
}

// bileşen dışındaki kod (veri katmanı, hata sözleri) için modül düzeyinde dil
let current: Lang = remembered() ?? fromDevice() ?? 'en';

function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (vars[name] == null ? whole : String(vars[name])));
}

function word(lang: Lang, key: string): string | undefined {
  const entry = (dict as Record<string, Entry>)[key];
  if (!entry) return undefined;
  return entry[lang] ?? entry.en;
}

function make(lang: Lang) {
  const t = (key: Key, vars?: Vars) => fill(word(lang, key) ?? key, vars);
  // bir gece, üç gece. türkçe sayıdan sonra tekil kalır: iki hali aynı cümle.
  const tn = (key: CountKey, n: number, vars?: Vars) =>
    fill(word(lang, `${key}.${n === 1 ? 'one' : 'other'}`) ?? word(lang, `${key}.other`) ?? key, { n, ...vars });
  // anahtarı çalışırken kurulan sözler (tür, gün adı, sunucudan gelen kod).
  // sözlükte yoksa verilen yedeği, o da yoksa anahtarın kendisini döner.
  const tx = (key: string, fallback?: string, vars?: Vars) => fill(word(lang, key) ?? fallback ?? key, vars);
  return { t, tn, tx };
}

export type T = ReturnType<typeof make>['t'];

// bileşen DIŞINDA kullanılır; o anki dili okur. bileşen içinde useT() kullan,
// yoksa dil değişince ekran yeniden çizilmez.
export const t: T = (key, vars) => make(current).t(key, vars);
export const tn = (key: CountKey, n: number, vars?: Vars) => make(current).tn(key, n, vars);
export const tx = (key: string, fallback?: string, vars?: Vars) => make(current).tx(key, fallback, vars);
export const getLang = () => current;

// kendi açıklaması olmayan senkron gece tek bir hazır cümle taşır (ingilizce,
// sync-ticketmaster.mjs yazar). o cümle bizim; veri değil, çevrilir.
const SYNCED = /^A real night, straight off the listings for (.+?)\. What it turns into is decided at the door, same as always\.$/;
export function bodyText(body: string, say: T = t) {
  const found = SYNCED.exec(body.trim());
  return found ? say('synced.body', { city: found[1] }) : body;
}

// büyük harf stilde değil burada yapılır: react native'in stil ile büyütmesi
// telefonun diline bakar, uygulamanın diline değil. türkçede i→İ, ı→I;
// toUpperCase() cihazdan bağımsızdır (toLocaleUpperCase dilsiz kullanılmaz).
export function upper(text: string, lang: Lang = getLang()) {
  if (lang === 'tr') return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  return text.toUpperCase();
}

// uygulamanın dilinde OLMAYAN veri için: başlık, mekan, sanatçı, şehir,
// kullanıcı adı, tür adı, ingilizce marka sözleri. "pitbull" → "PITBULL".
export const upperData = (text: string) => text.toUpperCase();

type Value = ReturnType<typeof make> & { lang: Lang; setLang: (lang: Lang) => void; up: (text: string) => string };

const Ctx = createContext<Value>({ ...make(current), lang: current, setLang: () => {}, up: (text) => upper(text, current) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [lang, setState] = useState<Lang>(current);

  const setLang = useCallback(
    (next: Lang) => {
      current = next;
      try {
        Storage.setItemSync(KEY, next);
      } catch {}
      setState(next);
      // hesap da hatırlasın: web sitesi ve yeni bir cihaz buradan okur
      if (uid) saveSettings(uid, { locale: next }).catch(() => {});
    },
    [uid],
  );

  // bu cihazda hiç seçim yapılmadıysa hesabın dili gelir
  useEffect(() => {
    if (!uid || remembered()) return;
    let live = true;
    (async () => {
      const settings = await fetchSettings(uid).catch(() => null);
      const theirs = known(settings?.locale);
      if (!live || !theirs || remembered()) return;
      current = theirs;
      try {
        Storage.setItemSync(KEY, theirs);
      } catch {}
      setState(theirs);
    })();
    return () => {
      live = false;
    };
  }, [uid]);

  const value = useMemo(() => ({ ...make(lang), lang, setLang, up: (text: string) => upper(text, lang) }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// const { t, tn, tx, up, lang, setLang } = useLang();
export const useLang = () => useContext(Ctx);
// const t = useT();
export const useT = () => useContext(Ctx).t;
