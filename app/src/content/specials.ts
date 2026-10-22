import type { Key } from '@/i18n';

// Specialties (owner, 22.10.2026): decks of one occasion — halloween, new year, the fourth
// of july, oktoberfest — under the groups on connect. Each is played like the friends'
// deck; around it, motifs of the occasion (components/Motifs.tsx). The nights come from
// the listings by their names (data/specials.ts), from every city, yours first.
export type SpecialId = 'halloween' | 'newyear' | 'july4' | 'oktoberfest';

export type Special = {
  id: SpecialId;
  label: Key;
  // Postgres regex on the title (case-insensitive, \m \M = word edges: "nye" is not "kanye").
  match: string;
  // When it happens, for the order of the row and "back in …" on an empty deck.
  month: number; // 1–12
  day: number;
  // The colours of its cover and of the room around its deck.
  ground: string;
  deep: string;
  ink: string; // words on the cover
  accents: string[];
};

export const specials: Special[] = [
  {
    id: 'halloween',
    label: 'special.halloween',
    match: '(hallowe.?en|helloween|samhain|cadılar bayram)',
    month: 10,
    day: 31,
    ground: '#E0711F',
    deep: '#2A1238',
    ink: '#FFF3E4',
    accents: ['#F59A2E', '#7B3FA0', '#F6E7C8'],
  },
  {
    id: 'newyear',
    label: 'special.newyear',
    match: '(silvester|new.?year|\\mnye\\M|yılbaşı|neujahr|hogmanay)',
    month: 12,
    day: 31,
    ground: '#14182B',
    deep: '#05060D',
    ink: '#FFF6DE',
    accents: ['#E8B04B', '#F4E3B0', '#C9CED8', '#E2574C'],
  },
  {
    id: 'july4',
    label: 'special.july4',
    match: '(4th of july|fourth of july|independence day|\\mjuly 4)',
    month: 7,
    day: 4,
    ground: '#1F3A93',
    deep: '#0E1C4D',
    ink: '#FFFFFF',
    accents: ['#C8102E', '#FFFFFF', '#8FB2F2'],
  },
  {
    id: 'oktoberfest',
    label: 'special.oktoberfest',
    match: '(oktoberfest|octoberfest|\\mwiesn|bierfest)',
    month: 9,
    day: 20,
    ground: '#1E6FB8',
    deep: '#0D3A63',
    ink: '#FFFFFF',
    accents: ['#FFFFFF', '#D9A441', '#7FB4E6'],
  },
];

export const specialOf = (id: SpecialId) => specials.find((s) => s.id === id)!;

// The next time it happens (today counts until the day is over).
export function nextDate(s: Special, now = new Date()) {
  const y = now.getFullYear();
  const day = new Date(y, s.month - 1, s.day);
  const end = new Date(y, s.month - 1, s.day + 1);
  return now < end ? day : new Date(y + 1, s.month - 1, s.day);
}

// Soonest occasion first.
export const bySoonest = (list: Special[], now = new Date()) => [...list].sort((a, b) => nextDate(a, now).getTime() - nextDate(b, now).getTime());
