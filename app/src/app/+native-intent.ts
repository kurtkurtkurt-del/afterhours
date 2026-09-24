// gelen bağlantılar. afterhours://night/<slug> zaten night/[slug] rotasına düşer.
// web adresi (…/afterhours/explore/event/index.html?slug=…) rotaya çevrilir; gerisi olduğu gibi.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const m = /explore\/event\/(?:index\.html)?\?(?:.*&)?slug=([^&#]+)/.exec(path);
    if (m) return `/night/${decodeURIComponent(m[1])}`;
  } catch {}
  return path;
}
