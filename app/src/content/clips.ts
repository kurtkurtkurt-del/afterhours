import type { Genre } from '@/content/music';

// Sample DJ clips until DJs can share their own. Each plays the first 30 seconds of one
// of the royalty-free background tracks in the DJ's genre (content/music.ts).
// when: where and when it was played; the words are translated at render time.
export type Clip = {
  id: string;
  dj: string; // DJ slug
  title: string;
  sound: Genre;
  track: number; // index into tracks[sound]
  when: { venue: string; day: 'lastNight' | 'lastWeek' | 'daysAgo' | 'own'; n?: number; time?: string };
  likes: string[]; // initials of friends who liked it
};

export const CLIP_SECONDS = 30;

export const clips: Clip[] = [
  { id: 'c1', dj: 'mara-volt', title: 'closing, the last 30 seconds', sound: 'techno', track: 0, when: { venue: 'blitz', day: 'lastNight', time: '03:12' }, likes: ['d', 's'] },
  { id: 'c2', dj: 'orbit-9', title: 'untitled 07 (own edit)', sound: 'techno', track: 3, when: { venue: '', day: 'own' }, likes: ['m', 'd', 'k'] },
  { id: 'c3', dj: 'levent-ok', title: 'warm up at harry klein', sound: 'house', track: 1, when: { venue: 'harry klein', day: 'lastWeek', time: '23:40' }, likes: ['a'] },
  { id: 'c4', dj: 'dilan-k', title: 'b2b with friends', sound: 'rap', track: 2, when: { venue: 'milla', day: 'daysAgo', n: 3 }, likes: [] },
  { id: 'c5', dj: 'selin', title: 'sunrise on the roof', sound: 'house', track: 5, when: { venue: 'rote sonne', day: 'lastWeek', time: '06:05' }, likes: ['e'] },
  { id: 'c6', dj: 'ines-okur', title: 'alt kat, 4am', sound: 'house', track: 7, when: { venue: 'kadıköy · alt kat', day: 'daysAgo', n: 6 }, likes: [] },
];
