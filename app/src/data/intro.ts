import { supabase } from '@/lib/supabase';
import type { Lang } from '@/i18n/core';

// Ask for an intro (116_intro_hints.sql, backend/functions/intro-lines). For someone in
// the crowd of your people: a few small true things about the circle around them, and
// two or three first lines written from those things alone. Never anything they kept.
export type IntroHints = {
  steps: 2 | 3;
  ties: number;
  via: { h: string; n: string | null }[];
  city: string | null;
  same_city: boolean;
  kinds: { k: string; n: number }[];
  rooms: string[];
  shared: { t: string; s: string }[];
  shared_n: number;
};

// Who this person is to you: the chips the ask opens with. The edge function knows the same keys.
export const REASONS = ['night', 'circle', 'sound', 'city', 'heard', 'curious'] as const;
export type Reason = (typeof REASONS)[number];

export async function introHints(code: string): Promise<IntroHints | null> {
  const { data, error } = await supabase.rpc('intro_hints', { p_code: code });
  if (error) throw error;
  return (data as IntroHints | null) ?? null;
}

// The model runs on the server; no key in the app. No function yet, or nothing true to
// say: no lines, and the page shows none.
export async function introLines(code: string, reason: Reason, lang: Lang): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('intro-lines', { body: { code, reason, lang } });
  if (error) throw error;
  const lines = (data as { lines?: unknown } | null)?.lines;
  return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === 'string').slice(0, 3) : [];
}
