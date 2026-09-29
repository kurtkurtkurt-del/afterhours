import type { Night } from '@/data/deck';
import { t, tx } from '@/i18n/core';

export type When = 'tonight' | 'tomorrow' | 'weekend' | 'week' | 'month';

// label is the English fallback; screens translate with tx('when.' + id, label).
export const whens: { id: When; label: string }[] = [
  { id: 'tonight', label: 'tonight' },
  { id: 'tomorrow', label: 'tomorrow' },
  { id: 'weekend', label: 'this weekend' },
  { id: 'week', label: 'this week' },
  { id: 'month', label: 'this month' },
];

const H = 3600_000;
const D = 24 * H;

// Time window [from, to]. The deck arrives unfiltered by date and is filtered here.
function windowFor(when: When, now = new Date()): [number, number] {
  const ms = now.getTime();
  if (when === 'tonight') {
    // A night lasts until morning: until 08:00 tomorrow.
    const end = new Date(now);
    end.setHours(8, 0, 0, 0);
    if (end.getTime() <= ms) end.setTime(end.getTime() + D);
    return [ms - 6 * H, end.getTime()]; // a night that started up to 6 hours ago is still "tonight"
  }
  if (when === 'tomorrow') {
    // 08:00 tomorrow → 08:00 the day after
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(8, 0, 0, 0);
    return [start.getTime(), start.getTime() + D];
  }
  if (when === 'weekend') {
    // Friday 18:00 → Monday 06:00; on a weekday, the coming Friday.
    const day = now.getDay(); // 0 = Sunday
    const toFri = (5 - day + 7) % 7;
    const fri = new Date(now);
    fri.setDate(now.getDate() + toFri);
    fri.setHours(18, 0, 0, 0);
    const mon = fri.getTime() + 2 * D + 12 * H;
    if (day === 6 || day === 0 || (day === 1 && now.getHours() < 6)) {
      // Inside the weekend: this weekend's Friday is in the past.
      return [fri.getTime() - 7 * D, mon - 7 * D];
    }
    return [fri.getTime(), mon];
  }
  if (when === 'week') return [ms - 6 * H, ms + 7 * D];
  return [ms - 6 * H, ms + 31 * D];
}

// Date and time formatted like the web: "thu 26.09 · 20:00" / "thu 26.09".
// The weekday uses the language at call time (called during render).
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const two = (n: number) => String(n).padStart(2, '0');
export const dayName = (d: Date) => tx('day.' + DAYS[d.getDay()], DAYS[d.getDay()]);
export function dayLabel(iso: string | null): string {
  if (!iso) return t('deck.tba');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return t('deck.tba');
  return `${dayName(d)} ${two(d.getDate())}.${two(d.getMonth() + 1)}`;
}
// Nights without a date ("sommer 2027", "mittwochs") never fit a window and are dropped.
export function filterWhen(rows: Night[], when: When | null): Night[] {
  if (!when) return rows;
  const [from, to] = windowFor(when);
  return rows.filter((n) => {
    if (!n.starts_at) return false;
    const s = Date.parse(n.starts_at);
    return s >= from && s <= to;
  });
}
