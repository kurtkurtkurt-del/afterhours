import { SITE } from '@/data/deck';
import type { DeckCard } from '@/components/CardFace';

// Sample waves: nights kept by friends of friends (2nd wave) and their friends
// (3rd wave), until real data exists. path: the chain starting after you; the first
// name is your friend, the last is the keeper.
// Nights use the site's hand-drawn posters (posters/NN.svg).
const day = (n: number, h: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};
const poster = (n: number) => `${SITE}posters/${String(n).padStart(2, '0')}.svg`;
const card = (key: string, title: string, kind: string, venue: string, n: number, h: number, no: number, path: string[], wave: 2 | 3): DeckCard => ({
  key,
  slug: '',
  title,
  venue,
  city: 'munchen',
  kind,
  source: 'szene',
  startsAt: day(n, h),
  image: null,
  poster: poster(no),
  ticketUrl: null,
  friends: [],
  via: { wave, path },
});

export const wave2: DeckCard[] = [
  card('w2-blitz', 'Blitz', 'rave', 'Museumsinsel 1', 1, 23, 11, ['mira', 'tarık'], 2),
  card('w2-silo', 'Silo West', 'rave', 'Westend', 2, 22, 13, ['jonas', 'noa'], 2),
  card('w2-blurred', '10 Years Blurred Vision', 'club night', 'Harry Klein', 3, 23, 17, ['lina', 'ece'], 2),
  card('w2-unterwelt', 'Unterwelt', 'club night', 'Glockenbach', 4, 0, 20, ['selin', 'felix'], 2),
  card('w2-stock', '3. Stock Links', 'hausparty', 'Maxvorstadt', 5, 21, 22, ['deniz', 'mele'], 2),
  card('w2-platten', 'Plattenabend', 'hausparty', 'Haidhausen', 6, 20, 25, ['erdem', 'hana'], 2),
];

export const wave3: DeckCard[] = [
  card('w3-zine', 'Zine Klub', 'meetup', 'Schwabing', 2, 19, 27, ['mira', 'tarık', 'yusuf'], 3),
  card('w3-riso', 'Riso Abend', 'meetup', 'Au', 3, 19, 31, ['lina', 'ece', 'ruby'], 3),
  card('w3-strobo', 'Strobo', 'rave', 'Obersendling', 4, 23, 33, ['jonas', 'noa', 'lev'], 3),
  card('w3-tunnel', 'Tunnelblick', 'rave', 'Werksviertel', 6, 23, 34, ['selin', 'felix', 'ana'], 3),
  card('w3-spiegel', 'Spiegelsaal', 'club night', 'Sendling', 7, 23, 35, ['zeynep', 'kai', 'bo'], 3),
];
