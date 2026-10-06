import { Image } from 'expo-image';

// Download pictures to the disk cache ahead of time (expo-image keeps them there), so
// they show at once and offline. Empty and repeated addresses are skipped; failures are
// quiet, the picture simply loads when it is shown.
const asked = new Set<string>();
export function prefetchImages(urls: (string | null | undefined)[]) {
  const fresh = [...new Set(urls.filter((u): u is string => !!u && /^https?:/.test(u) && !asked.has(u)))];
  if (!fresh.length) return;
  fresh.forEach((u) => asked.add(u));
  Image.prefetch(fresh, 'disk').catch(() => {});
}
