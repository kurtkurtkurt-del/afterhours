// sahte dj'ler ve setler. gerçek veri supabase'e sonra gelir (dj + set tabloları).
// fotoğraflar assets/djs/<id>.jpg — yer tutucu kesitler; dosyayı değiştirmek yeter.
import type { Genre } from '@/content/music';

export type Dj = { id: string; name: string; genre: string; sound: Genre; city: string; since: number; followers: string; photo: number; photoUrl?: string | null };
export type Track = { title: string; where: string; date: string; length: string };
export type DjSet = { dj: string; venue: string; startsAt: Date; hours: number };

export const djs: Dj[] = [
  { id: 'mara-volt', name: 'mara volt', genre: 'techno', sound: 'techno', city: 'münchen', since: 2023, followers: '1.2k', photo: require('../../assets/djs/mara-volt.jpg') },
  { id: 'levent-ok', name: 'levent ok', genre: 'house', sound: 'house', city: 'münchen', since: 2021, followers: '3.4k', photo: require('../../assets/djs/levent-ok.jpg') },
  { id: 'nachtfalter', name: 'nachtfalter', genre: 'rave', sound: 'techno', city: 'münchen', since: 2024, followers: '680', photo: require('../../assets/djs/nachtfalter.jpg') },
  { id: 'ines-okur', name: 'ines okur', genre: 'deep house', sound: 'house', city: 'istanbul', since: 2022, followers: '2.1k', photo: require('../../assets/djs/ines-okur.jpg') },
  { id: 'tuesday-club', name: 'tuesday club', genre: 'house', sound: 'house', city: 'münchen', since: 2020, followers: '940', photo: require('../../assets/djs/tuesday-club.jpg') },
  { id: 'dilan-k', name: 'dilan k.', genre: 'rap', sound: 'rap', city: 'münchen', since: 2024, followers: '1.5k', photo: require('../../assets/djs/dilan-k.jpg') },
  { id: 'orbit-9', name: 'orbit 9', genre: 'techno', sound: 'techno', city: 'berlin', since: 2019, followers: '5.2k', photo: require('../../assets/djs/orbit-9.jpg') },
  { id: 'selin', name: 'selin', genre: 'house', sound: 'house', city: 'münchen', since: 2025, followers: '310', photo: require('../../assets/djs/selin.jpg') },
];

export const djById = (id: string) => djs.find((d) => d.id === id)!;

// setler "şimdi"ye göre kurulur ki ekran her açılışta canlı görünsün:
// biri bir saat önce başlamış, ikisi bu gece ileride, gerisi hafta içinde.
export function sets(now = new Date()): DjSet[] {
  const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * 3600_000);
  return [
    { dj: 'levent-ok', venue: 'harry klein', startsAt: at(-1), hours: 3 },
    { dj: 'mara-volt', venue: 'blitz', startsAt: at(2.5), hours: 4 },
    { dj: 'nachtfalter', venue: 'szene', startsAt: at(5), hours: 5 },
    { dj: 'ines-okur', venue: 'kadıköy · alt kat', startsAt: at(26), hours: 4 },
    { dj: 'tuesday-club', venue: 'rote sonne', startsAt: at(50), hours: 3 },
    { dj: 'orbit-9', venue: 'blitz', startsAt: at(74), hours: 5 },
    { dj: 'dilan-k', venue: 'bahnwärter thiel', startsAt: at(98), hours: 2 },
    { dj: 'selin', venue: 'harry klein', startsAt: at(122), hours: 3 },
  ];
}

// dj'nin kayıtlı setleri. sahte; gerçekte dj'nin yüklediği kayıt ya da soundcloud bağlantısı.
// çalınca şimdilik dj'nin türündeki arka plan müziği başlar.
export function tracksFor(dj: Dj): Track[] {
  const venues: Record<string, string[]> = {
    techno: ['blitz', 'rote sonne', 'blitz', 'bahnwärter thiel', 'blitz', 'szene'],
    house: ['harry klein', 'rote sonne', 'harry klein', 'kadıköy · alt kat', 'pimpernel', 'harry klein'],
    rap: ['bahnwärter thiel', 'milla', 'bahnwärter thiel', 'muffathalle', 'milla', 'import export'],
  };
  const kinds = ['closing set', 'opening', 'b2b', 'all night', 'live', 'afterhours'];
  const dates = ['26.09', '12.09', '30.08', '16.08', '02.08', '19.07'];
  const lengths = ['1h 42m', '2h 05m', '1h 18m', '3h 10m', '0h 58m', '2h 31m'];
  return kinds.map((k, i) => ({ title: `${venues[dj.sound][i]} · ${k}`, where: venues[dj.sound][i], date: dates[i], length: lengths[i] }));
}
