import { Share } from 'react-native';
import { SITE } from '@/data/deck';
import { dayLabel } from '@/data/when';
import { t } from '@/i18n/core';

// The night's web page; this is the shared link (it carries a preview card).
export const nightUrl = (slug: string) => `${SITE}explore/event/index.html?slug=${encodeURIComponent(slug)}`;

// A night as a message, short enough to read at a glance in WhatsApp:
//
//   lake street dive
//   wed 07.10 · 20:00 · münchen
//   coming?
//   https://…
//
// The act comes first ("lake street dive - 2026 european tour" → "lake street dive"),
// the link last on its own line so the app draws its preview under the text. Only the
// message is passed: giving the link separately as well made it appear twice.
export function shareNight(n: { slug: string; title: string; starts_at: string | null; venue_name?: string | null; city_name?: string | null }) {
  const act = n.title.split(/\s+[-–:|]\s+/)[0].trim().toLowerCase() || n.title.toLowerCase();
  const d = n.starts_at ? new Date(n.starts_at) : null;
  const time = d && !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null;
  const when = [dayLabel(n.starts_at), time, (n.venue_name ?? n.city_name ?? '').toLowerCase() || null].filter(Boolean).join(' · ');
  const message = [act, when, t('share.coming'), nightUrl(n.slug)].join('\n');
  return Share.share({ message }).catch(() => {});
}
