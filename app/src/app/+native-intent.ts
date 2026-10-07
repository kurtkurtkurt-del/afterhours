// Incoming links. afterhours://night/<slug> already maps to night/[slug], afterhours://groups/join?code=… to groups/join.
// Web addresses (…/afterhours/explore/event/index.html?slug=…) are rewritten to routes; anything else passes through.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const m = /explore\/event\/(?:index\.html)?\?(?:.*&)?slug=([^&#]+)/.exec(path);
    if (m) return `/night/${decodeURIComponent(m[1])}`;
    // A group invitation (…/afterhours/g/?c=CODE, the link groups/invite.tsx shares)
    const g = /(?:^|\/)g\/(?:index\.html)?\?(?:.*&)?c=([A-Za-z0-9]+)/.exec(path);
    if (g) return `/groups/join?code=${g[1].toUpperCase()}`;
  } catch {}
  return path;
}
