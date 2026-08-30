/* afterhours — the three sample nights in the card collection.
   Bicim cards.js'in EVENTS yapisiyla ayni; cards da onun kendi
   ureteciyle ciziliyor (CARDS.front / CARDS.back). Poster degil,
   gercek afterhours karti.

   Metaller bilerek open ucundan secildi: krom, cirilanmis celik,
   titanyum.  */

window.CARD_SAMPLES = [
  { city: "istanbul",
    t: "Karaköy Alt Kat", ty: "CLUB NIGHT", v: "KARAKÖY", d: "19.09.26",
    metal: "chrome", motif: "moire",
    in: "23:12", out: "04:40", dur: "5H 28M",
    crew: ["E", "B", "S"], more: 7, aud: "0:51", msg: 18, who: "EDA",
    froze: "21.09", no: "0163", at1: "01:22", at2: "03:05",
    q1: ["vapur düdüğü duvardan geldi", "B", "02:14"],
    q2: ["bu saatte simit nereden", "E", "04:31"] },

  { city: "münchen",
    t: "Blitz", ty: "RAVE", v: "MUSEUMSINSEL 1", d: "23.09.26",
    metal: "steel", motif: "grid",
    in: "00:20", out: "06:05", dur: "5H 45M",
    crew: ["J", "L", "M", "K"], more: 11, aud: "0:33", msg: 24, who: "JONAS",
    froze: "25.09", no: "0208", at1: "02:10", at2: "04:48",
    q1: ["telefonlar cepte kaldı", "L", "03:02"],
    q2: ["arka oda daha iyiydi", "M", "05:40"] },

  { city: "berlin",
    t: "Betonhalle", ty: "RAVE", v: "KRAFTWERK MITTE", d: "12.09.26",
    metal: "titanium", motif: "iso",
    in: "23:50", out: "07:30", dur: "7H 40M",
    crew: ["A", "N"], more: 5, aud: "1:07", msg: 9, who: "ANNA",
    froze: "14.09", no: "0291", at1: "01:45", at2: "05:12",
    q1: ["drei etagen beton", "A", "02:30"],
    q2: ["draußen ist es schon hell", "N", "07:12"] },
];
