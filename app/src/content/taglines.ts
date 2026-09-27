import type { Key } from '@/i18n/dict';

// sign up ekranında dönüşümlü satırlar. sıra burada; sözler i18n/parts/home.ts içinde.
export const taglines: readonly Key[] = ['tagline.1', 'tagline.2', 'tagline.3', 'tagline.4', 'tagline.5'];

export const tagline = {
  size: 34,          // font boyutu
  lineHeight: 40,
  in: 500,           // belirme süresi, ms
  out: 350,          // kaybolma süresi
  base: 1600,        // okuma süresi tabanı
  perWord: 320,      // kelime başına ek okuma süresi
  rise: 14,          // belirirken kaç px alttan gelir
} as const;
