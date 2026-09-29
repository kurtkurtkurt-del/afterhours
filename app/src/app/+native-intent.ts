// Incoming links. afterhours://night/<slug> already maps to night/[slug].
// Web addresses (…/afterhours/explore/event/index.html?slug=…) are rewritten to routes; anything else passes through.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const m = /explore\/event\/(?:index\.html)?\?(?:.*&)?slug=([^&#]+)/.exec(path);
    if (m) return `/night/${decodeURIComponent(m[1])}`;
  } catch {}
  return path;
}
