// sahte dj'ler, kadran üstünde birer frekans. gerçek veri supabase'e sonra gelir.
export type Dj = { id: string; name: string; genre: string; where: string; next: string; freq: number };

export const BAND: [number, number] = [87.5, 108.0]; // fm bandı

export const djs: Dj[] = [
  { id: 'mara-volt', name: 'mara volt', genre: 'techno', where: 'blitz resident', next: 'fri 26.09', freq: 89.3 },
  { id: 'tuesday-club', name: 'tuesday club', genre: 'house', where: 'rote sonne', next: 'tue 30.09', freq: 91.9 },
  { id: 'levent-ok', name: 'levent ok', genre: 'house', where: 'harry klein', next: 'sat 27.09', freq: 95.2 },
  { id: 'nachtfalter', name: 'nachtfalter', genre: 'rave', where: 'szene only', next: 'sun 28.09', freq: 98.7 },
  { id: 'ines-okur', name: 'ines okur', genre: 'deep house', where: 'istanbul · kadıköy', next: 'thu 02.10', freq: 102.5 },
  { id: 'dilan-k', name: 'dilan k.', genre: 'rap', where: 'bahnwärter thiel', next: 'sat 04.10', freq: 106.1 },
];

export const LOCK = 0.35; // mhz: bu kadar yakınsa istasyon yakalanmış sayılır
