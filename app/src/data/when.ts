import type { Night } from '@/data/deck';

export type When = 'tonight' | 'weekend' | 'week' | 'month';

export const whens: { id: When; label: string }[] = [
  { id: 'tonight', label: 'tonight' },
  { id: 'weekend', label: 'this weekend' },
  { id: 'week', label: 'this week' },
  { id: 'month', label: 'this month' },
];

const H = 3600_000;
const D = 24 * H;

// zaman penceresi [from, to]. deste sunucudan tarih filtresiz gelir, burada elenir.
export function windowFor(when: When, now = new Date()): [number, number] {
  const t = now.getTime();
  if (when === 'tonight') {
    // gece sabaha kadar sürer: yarın 08:00'e kadar
    const end = new Date(now);
    end.setHours(8, 0, 0, 0);
    if (end.getTime() <= t) end.setTime(end.getTime() + D);
    return [t - 6 * H, end.getTime()]; // 6 saat önce başlamış gece hâlâ "bu gece"
  }
  if (when === 'weekend') {
    // cuma 18:00 → pazartesi 06:00; hafta içiyse gelecek cuma
    const day = now.getDay(); // 0 pazar
    const toFri = (5 - day + 7) % 7;
    const fri = new Date(now);
    fri.setDate(now.getDate() + toFri);
    fri.setHours(18, 0, 0, 0);
    const mon = fri.getTime() + 2 * D + 12 * H;
    if (day === 6 || day === 0 || (day === 1 && now.getHours() < 6)) {
      // hafta sonu içindeyiz: bu hafta sonunun cuması geçmişte
      return [fri.getTime() - 7 * D, mon - 7 * D];
    }
    return [fri.getTime(), mon];
  }
  if (when === 'week') return [t - 6 * H, t + 7 * D];
  return [t - 6 * H, t + 31 * D];
}

// tarihi olmayan geceler ("sommer 2027", "mittwochs") pencereye sığmaz, elenir.
export function filterWhen(rows: Night[], when: When | null): Night[] {
  if (!when) return rows;
  const [from, to] = windowFor(when);
  return rows.filter((n) => {
    if (!n.starts_at) return false;
    const s = Date.parse(n.starts_at);
    return s >= from && s <= to;
  });
}
