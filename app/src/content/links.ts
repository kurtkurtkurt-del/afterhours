import type { LinkKind } from '@/data/profile';

// Where else to find someone. The value is a name on that network (website: a full
// address); url() turns it into the page that opens.
export const LINKS: { kind: LinkKind; label: string; prefix: string; url: (v: string) => string}[] = [
  { kind: 'instagram', label: 'instagram', prefix: '@', url: (v) => `https://instagram.com/${v}` },
  { kind: 'tiktok', label: 'tiktok', prefix: '@', url: (v) => `https://www.tiktok.com/@${v}` },
  { kind: 'spotify', label: 'spotify', prefix: '', url: (v) => `https://open.spotify.com/user/${v}` },
  { kind: 'soundcloud', label: 'soundcloud', prefix: '', url: (v) => `https://soundcloud.com/${v}` },
  { kind: 'x', label: 'x', prefix: '@', url: (v) => `https://x.com/${v}` },
  { kind: 'whatsapp', label: 'whatsapp', prefix: '+', url: (v) => `https://wa.me/${v}` },
  { kind: 'website', label: 'website', prefix: '', url: (v) => v },
];

// What was typed or pasted on the phone — "@name", a share link from the app
// (open.spotify.com/user/<id>?si=…, instagram.com/<name>, x.com/<name>) — made into the
// bare name the url() above expects. A website keeps its address.
export function cleanLink(kind: LinkKind, v: string): string {
  const raw = v.trim();
  if (kind === 'website') return raw;
  if (kind === 'whatsapp') return raw.replace(/[^\d]/g, '');
  const m = /^(?:https?:\/\/)?(?:www\.|open\.|m\.)?[\w.-]+\.[a-z]{2,}\/(?:user\/|@)?([^/?#\s]+)/i.exec(raw);
  return (m ? m[1] : raw).replace(/^@+/, '').replace(/[?#].*$/, '').trim();
}
