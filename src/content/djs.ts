// sahte dj'ler ve setler. gerçek veri supabase'e sonra gelir (dj + set tabloları).
// fotoğraflar assets/djs/<id>.jpg — yer tutucu kesitler; dosyayı değiştirmek yeter.
export type Dj = { id: string; name: string; genre: string; photo: number };
export type DjSet = { dj: string; venue: string; startsAt: Date; hours: number };

export const djs: Dj[] = [
  { id: 'mara-volt', name: 'mara volt', genre: 'techno', photo: require('../../assets/djs/mara-volt.jpg') },
  { id: 'levent-ok', name: 'levent ok', genre: 'house', photo: require('../../assets/djs/levent-ok.jpg') },
  { id: 'nachtfalter', name: 'nachtfalter', genre: 'rave', photo: require('../../assets/djs/nachtfalter.jpg') },
  { id: 'ines-okur', name: 'ines okur', genre: 'deep house', photo: require('../../assets/djs/ines-okur.jpg') },
  { id: 'tuesday-club', name: 'tuesday club', genre: 'house', photo: require('../../assets/djs/tuesday-club.jpg') },
  { id: 'dilan-k', name: 'dilan k.', genre: 'rap', photo: require('../../assets/djs/dilan-k.jpg') },
  { id: 'orbit-9', name: 'orbit 9', genre: 'techno', photo: require('../../assets/djs/orbit-9.jpg') },
  { id: 'selin', name: 'selin', genre: 'house', photo: require('../../assets/djs/selin.jpg') },
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
