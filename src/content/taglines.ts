// sign up ekranında dönüşümlü satırlar. sıra burada.
export const taglines = [
  'explore the nights your city hides.',
  'find tonight before it finds you.',
  'every city has an afterhours. find yours.',
  'the night is a map. start walking.',
  "explore what's still going at 4am.",
] as const;

export const tagline = {
  size: 34,          // font boyutu
  lineHeight: 40,
  in: 500,           // belirme süresi, ms
  out: 350,          // kaybolma süresi
  base: 1600,        // okuma süresi tabanı
  perWord: 320,      // kelime başına ek okuma süresi
  rise: 14,          // belirirken kaç px alttan gelir
} as const;
