// sahte dj'ler, kadran üstünde birer frekans. gerçek veri supabase'e sonra gelir.
// photo: assets/djs/<id>.jpg — şimdilik yer tutucu kesitler; dosyayı değiştirmek yeter.
// sound: kilitlenince çalacak müzik türü.
import type { Genre } from '@/content/music';

export type Dj = { id: string; name: string; genre: string; sound: Genre; where: string; next: string; freq: number; photo: number };

export const BAND: [number, number] = [87.5, 108.0]; // fm bandı

export const djs: Dj[] = [
  { id: 'mara-volt', name: 'mara volt', genre: 'techno', sound: 'techno', where: 'blitz resident', next: 'fri 26.09', freq: 89.3, photo: require('../../assets/djs/mara-volt.jpg') },
  { id: 'tuesday-club', name: 'tuesday club', genre: 'house', sound: 'house', where: 'rote sonne', next: 'tue 30.09', freq: 91.9, photo: require('../../assets/djs/tuesday-club.jpg') },
  { id: 'levent-ok', name: 'levent ok', genre: 'house', sound: 'house', where: 'harry klein', next: 'sat 27.09', freq: 95.2, photo: require('../../assets/djs/levent-ok.jpg') },
  { id: 'nachtfalter', name: 'nachtfalter', genre: 'rave', sound: 'techno', where: 'szene only', next: 'sun 28.09', freq: 98.7, photo: require('../../assets/djs/nachtfalter.jpg') },
  { id: 'ines-okur', name: 'ines okur', genre: 'deep house', sound: 'house', where: 'istanbul · kadıköy', next: 'thu 02.10', freq: 102.5, photo: require('../../assets/djs/ines-okur.jpg') },
  { id: 'dilan-k', name: 'dilan k.', genre: 'rap', sound: 'rap', where: 'bahnwärter thiel', next: 'sat 04.10', freq: 106.1, photo: require('../../assets/djs/dilan-k.jpg') },
];

export const LOCK = 0.35; // mhz: bu kadar yakınsa istasyon yakalanmış sayılır
