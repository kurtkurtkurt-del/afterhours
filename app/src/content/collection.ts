import CARDS, { type NightCardData } from '@/content/cardsgen';

// sitedeki kart koleksiyonu örnekleri (cards/card-data.js) + üreticinin kendi gecelerinden üçü.
// check-in gelince burası kullanıcının gerçek kartlarıyla dolar.
export const samples: NightCardData[] = [
  { city: "istanbul",
    t: "Karaköy Alt Kat", ty: "CLUB NIGHT", v: "KARAKÖY", d: "19.09.26",
    metal: "chrome", motif: "moire",
    in: "23:12", out: "04:40", dur: "5H 28M",
    crew: ["E", "B", "S"], more: 7, aud: "0:51", msg: 18, who: "EDA",
    froze: "21.09", no: "0163", at1: "01:22", at2: "03:05",
    q1: ["the ferry horn came through the wall", "B", "02:14"],
    q2: ["where do you get simit at this hour", "E", "04:31"] },

  { city: "münchen",
    t: "Blitz", ty: "RAVE", v: "MUSEUMSINSEL 1", d: "23.09.26",
    metal: "steel", motif: "grid",
    in: "00:20", out: "06:05", dur: "5H 45M",
    crew: ["J", "L", "M", "K"], more: 11, aud: "0:33", msg: 24, who: "JONAS",
    froze: "25.09", no: "0208", at1: "02:10", at2: "04:48",
    q1: ["the phones stayed in our pockets", "L", "03:02"],
    q2: ["the back room was the better one", "M", "05:40"] },

  { city: "berlin",
    t: "Betonhalle", ty: "RAVE", v: "KRAFTWERK MITTE", d: "12.09.26",
    metal: "titanium", motif: "iso",
    in: "23:50", out: "07:30", dur: "7H 40M",
    crew: ["A", "N"], more: 5, aud: "1:07", msg: 9, who: "ANNA",
    froze: "14.09", no: "0291", at1: "01:45", at2: "05:12",
    q1: ["drei etagen beton", "A", "02:30"],
    q2: ["draußen ist es schon hell", "N", "07:12"] },
];

export const collection: NightCardData[] = [...samples, CARDS.nights[0], CARDS.nights[5], CARDS.nights[7]];
