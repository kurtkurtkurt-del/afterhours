/* afterhours — Munih mekanlari.
   x/y, sehir semasinin 1440x900 tasarim uzayindaki konum; saat/sure
   mekanin ne zaman acildigi ve kac saat acik kaldigi (footerdaki
   "kac oda acik" sayaci bunu kullaniyor).

   Bu dizi once app.js'in icindeydi; maps sayfasi da ayni koordinatlari
   kullaniyor, o yuzden tek yere tasindi. */

/* ---------- Mekan saatleri ----------
   Footer'daki "kac oda acik" sayaci bunu kullanir. */

const MEKANLAR = [
  { ad: "OLYMPIAHALLE",      x: 512, y: 236, saat: 18.5, sure: 4 },
  { ad: "OLYMPIAPARK",       x: 556, y: 288, saat: 19.5, sure: 4 },
  { ad: "ZENITH",            x: 946, y: 196, saat: 25.0, sure: 5 },
  { ad: "TONHALLE",          x: 902, y: 236, saat: 22.0, sure: 6 },
  { ad: "SCHWABING",         x: 760, y: 300, saat: 21.0, sure: 4 },
  { ad: "MAXVORSTADT",       x: 664, y: 396, saat: 22.2, sure: 8 },
  { ad: "NEUHAUSEN",         x: 556, y: 430, saat: 21.5, sure: 5 },
  { ad: "P1",                x: 792, y: 404, saat: 23.0, sure: 6 },
  { ad: "PIMPERNEL",         x: 748, y: 444, saat: 22.0, sure: 6 },
  { ad: "MUSEUMSINSEL 1",    x: 828, y: 478, saat: 24.0, sure: 7 },
  { ad: "HAIDHAUSEN",        x: 892, y: 494, saat: 20.0, sure: 4 },
  { ad: "WESTEND",           x: 596, y: 552, saat: 19.0, sure: 3 },
  { ad: "MILLA",             x: 726, y: 556, saat: 22.0, sure: 5 },
  { ad: "GLOCKENBACH",       x: 764, y: 578, saat: 19.0, sure: 4 },
  { ad: "SCHLACHTHOF",       x: 704, y: 614, saat: 18.0, sure: 4 },
  { ad: "BAHNWÄRTER THIEL",  x: 668, y: 662, saat: 21.1, sure: 6 },
  { ad: "SUNNY RED",         x: 636, y: 690, saat: 22.6, sure: 6 },
  { ad: "ALTE UTTING",       x: 700, y: 706, saat: 18.5, sure: 4 },
  { ad: "GIESING",           x: 812, y: 682, saat: 20.0, sure: 4 },
  { ad: "RIEM",              x: 1128, y: 512, saat: 20.0, sure: 8 },
];

/* `const` global window'a yazilmaz; diger modullerin gorebilmesi icin
   acikca bagliyoruz (POSTERS ile ayni durum). */
window.MEKANLAR = MEKANLAR;
