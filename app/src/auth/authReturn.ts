// What came back in an OAuth return address. Only a one-time PKCE ?code= is
// taken; a session handed over as #access_token=… is refused, because any link
// can carry one and sign this phone into somebody else's account (audit M-12).
// Kept free of React Native imports so it can be tested on its own.
export type AuthReturn =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string }
  | { kind: 'refused' }
  | { kind: 'none' };

export function readAuthReturn(url: string): AuthReturn {
  const at = url.indexOf('#');
  const head = at < 0 ? url : url.slice(0, at);
  const q = new URLSearchParams(head.includes('?') ? head.slice(head.indexOf('?') + 1) : '');
  const h = new URLSearchParams(at < 0 ? '' : url.slice(at + 1));
  const failed = h.get('error_description') ?? q.get('error_description') ?? h.get('error') ?? q.get('error');
  if (failed) return { kind: 'error', message: failed.replace(/\+/g, ' ') };
  if (h.has('access_token') || h.has('refresh_token') || q.has('access_token')) return { kind: 'refused' };
  const code = q.get('code');
  return code ? { kind: 'code', code } : { kind: 'none' };
}
