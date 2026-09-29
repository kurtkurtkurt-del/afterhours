import type { Key } from '@/i18n/dict';

// Rotating lines on the sign-up screen. Order lives here; strings in i18n/parts/home.ts.
export const taglines: readonly Key[] = ['tagline.1', 'tagline.2', 'tagline.3', 'tagline.4', 'tagline.5'];

export const tagline = {
  size: 34,          // font size
  lineHeight: 40,
  in: 500,           // fade-in, ms
  out: 350,          // fade-out, ms
  base: 1600,        // base reading time, ms
  perWord: 320,      // extra reading time per word, ms
  rise: 14,          // px risen while fading in
} as const;
