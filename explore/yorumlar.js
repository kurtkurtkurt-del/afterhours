/* afterhours — explore: kartin yanindaki yorum alani.
   Ornek veri. Her etkinlik turunun kendi havuzu var; bir etkinlige
   dusen yorumlar slug'dan uretilen tohumla secilir, yani ayni kart
   her acilista ayni tartismayi gosterir.

   eski: gecmis edisyonlardan kalan yorumlar. Digerleri bu haftadan. */

const YORUM_HAVUZU = {

  "Konzert": [
    { kim: "lena_k", zaman: "Nov 2023", eski: true,
      metin: "Went to the same tour two years ago. The hall show is a different animal from the festival set — slower, and you actually hear the band talk between songs.",
      cevaplar: [ { kim: "tobi", zaman: "Nov 2023", metin: "Agreed. Seated until the encore, then nobody was seated." } ] },
    { kim: "marek", zaman: "Sept 2024", eski: true,
      metin: "Olympiahalle sound is fine if you're not under the balcony. Anything past block D and it turns to soup.",
      cevaplar: [ { kim: "annu", zaman: "Sept 2024", metin: "Confirmed. Stood at the back once, never again." } ] },
    { kim: "hbf_nights", zaman: "Mar 2025", eski: true,
      metin: "Doors said 18:30 and the support started 19:40. Don't rush your dinner.",
      cevaplar: [] },
    { kim: "seraph", zaman: "4 days ago",
      metin: "Tickets moved faster than last time. Two of us have spares if anyone's short.",
      cevaplar: [ { kim: "juli", zaman: "3 days ago", metin: "Still going? I'd take one." },
                  { kim: "seraph", zaman: "2 days ago", metin: "Gone — but people keep dropping them in here the week of." } ] },
    { kim: "dnk", zaman: "yesterday",
      metin: "Tram 20 back to the centre after is packed. U3 from Olympiazentrum is emptier even if it's a longer walk.",
      cevaplar: [] },
    { kim: "pia.m", zaman: "6 h ago",
      metin: "First time seeing them. Is it the kind of show where the whole floor sings, or is that just the internet?",
      cevaplar: [ { kim: "lena_k", zaman: "3 h ago", metin: "It's real. Bring a voice you don't need tomorrow." } ] }
  ],

  "Festival": [
    { kim: "vito", zaman: "Aug 2023", eski: true,
      metin: "The year it rained, the small stage turned into the best one — everyone squeezed under the roof and stayed there until 3.",
      cevaplar: [ { kim: "roh", zaman: "Aug 2023", metin: "Best accidental afterhours I've had." } ] },
    { kim: "sanne", zaman: "July 2024", eski: true,
      metin: "Bring cash for the food stalls. Half of them still don't take cards and the queue for the machine is its own festival.",
      cevaplar: [] },
    { kim: "ferro", zaman: "Sept 2024", eski: true,
      metin: "Went alone the first year and left with six people I still go out with. It's that kind of field.",
      cevaplar: [ { kim: "milo_b", zaman: "Sept 2024", metin: "Same. The queue for water is basically a dating app." } ] },
    { kim: "tess", zaman: "5 days ago",
      metin: "Line-up dropped and the second stage is quietly the better one again.",
      cevaplar: [ { kim: "ferro", zaman: "4 days ago", metin: "It's always the better one. That's the joke by now." } ] },
    { kim: "kaan", zaman: "2 days ago",
      metin: "Anyone doing the whole thing without camping? Last trains are the part I never plan properly.",
      cevaplar: [ { kim: "sanne", zaman: "yesterday", metin: "It fits inside one walk home if you stay east. That's the whole point of it." } ] },
    { kim: "obst", zaman: "11 h ago",
      metin: "Weather looks like it'll hold. Saying that out loud is probably a mistake.",
      cevaplar: [] }
  ],

  "Rave": [
    { kim: "0x_nadja", zaman: "Oct 2023", eski: true,
      metin: "The no-photo rule held all night, and you could feel it. Nobody was performing for anyone.",
      cevaplar: [ { kim: "stv", zaman: "Oct 2023", metin: "One guy tried and the whole floor turned around. Never seen a phone go away that fast." } ] },
    { kim: "mira", zaman: "Feb 2024", eski: true,
      metin: "Came at 1, thought I was early. Room was already full — this crowd starts before the internet says it does.",
      cevaplar: [] },
    { kim: "hallo_ben", zaman: "May 2025", eski: true,
      metin: "Closing set ran two hours over and nobody working there seemed to mind. That's the whole memory.",
      cevaplar: [ { kim: "0x_nadja", zaman: "May 2025", metin: "We left at 9 in the morning into full daylight. Brutal, correct." } ] },
    { kim: "lu", zaman: "3 days ago",
      metin: "Door is doing a hard no on groups of guys again. Not a complaint, just don't roll up six deep and act surprised.",
      cevaplar: [ { kim: "trm", zaman: "3 days ago", metin: "Also: they mean it about the phones now, not just on the poster." } ] },
    { kim: "esra_p", zaman: "yesterday",
      metin: "Who's playing the back room? The flyer says nothing and that's usually where the night actually happens.",
      cevaplar: [ { kim: "mira", zaman: "20 h ago", metin: "Unannounced on purpose. It was the better room last time too." } ] },
    { kim: "grau", zaman: "2 h ago",
      metin: "Bringing someone to their first one. Any advice that isn't 'drink water'?",
      cevaplar: [ { kim: "hallo_ben", zaman: "1 h ago", metin: "Agree on a meeting spot. Phones die, the room is dark, that's it." } ] }
  ],

  "Club Night": [
    { kim: "roza", zaman: "Dec 2023", eski: true,
      metin: "This used to be a Thursday thing and honestly it was better — smaller room, no queue, everyone there on purpose.",
      cevaplar: [ { kim: "n_than", zaman: "Dec 2023", metin: "The Thursday version is the one people still talk about." } ] },
    { kim: "kiez", zaman: "Jun 2024", eski: true,
      metin: "Basement gets to about 40 degrees by 2am. Leave the jacket at home, the wardrobe queue is the real enemy.",
      cevaplar: [] },
    { kim: "aylin", zaman: "Jan 2025", eski: true,
      metin: "Came for the headliner, stayed for the local who played first. Happens here more than anywhere else in the city.",
      cevaplar: [ { kim: "roza", zaman: "Jan 2025", metin: "That's the booking policy, not luck." } ] },
    { kim: "fitz", zaman: "4 days ago",
      metin: "Doors 23:59 is a bit of a statement but the room genuinely doesn't fill before 1.",
      cevaplar: [] },
    { kim: "meret", zaman: "2 days ago",
      metin: "Is it card only at the bar now? Got caught out last month with a wallet full of coins.",
      cevaplar: [ { kim: "kiez", zaman: "yesterday", metin: "Card at the bar, cash at the door. Annoying but consistent." } ] },
    { kim: "sol", zaman: "8 h ago",
      metin: "Two of us going, don't know anyone. Say hi if you're also standing near the pillar looking unsure.",
      cevaplar: [ { kim: "aylin", zaman: "5 h ago", metin: "The pillar is a legitimate meeting point at this place." } ] }
  ],

  "Meetup": [
    { kim: "hanna", zaman: "Oct 2023", eski: true,
      metin: "Went to the very first one when it was four people and a table. It's bigger now and somehow still not awkward.",
      cevaplar: [ { kim: "org_jo", zaman: "Oct 2023", metin: "Four people and one broken chair. We kept the chair." } ] },
    { kim: "pauli", zaman: "Apr 2024", eski: true,
      metin: "Come alone. Genuinely. Everyone who shows up in a pair ends up talking only to their pair.",
      cevaplar: [] },
    { kim: "bine", zaman: "Nov 2024", eski: true,
      metin: "Ends earlier than you'd think, then half the room walks to the same bar anyway. That part is the meetup.",
      cevaplar: [ { kim: "hanna", zaman: "Nov 2024", metin: "The second half is undocumented and that's fine." } ] },
    { kim: "yusuf", zaman: "6 days ago",
      metin: "Do you need to bring anything or is turning up enough? The listing is very relaxed about it.",
      cevaplar: [ { kim: "org_jo", zaman: "5 days ago", metin: "Turning up is enough. Bring something only if you want to show it." } ] },
    { kim: "clea", zaman: "yesterday",
      metin: "German or English? Asking for the friend I'm dragging along who's three weeks into the city.",
      cevaplar: [ { kim: "pauli", zaman: "22 h ago", metin: "Both, in the same sentence usually. Nobody minds." } ] },
    { kim: "rem", zaman: "4 h ago",
      metin: "Room fits about thirty and it was full last time twenty minutes in. Don't stroll in at half past.",
      cevaplar: [] }
  ],

  "Hausparty": [
    { kim: "wg_küche", zaman: "Mar 2024", eski: true,
      metin: "The kitchen is always the party. Every year we plan the living room, every year everyone stands by the fridge.",
      cevaplar: [ { kim: "flo", zaman: "Mar 2024", metin: "Put the good speaker in the kitchen and stop fighting it." } ] },
    { kim: "nemo", zaman: "Sept 2024", eski: true,
      metin: "Neighbours were fine until midnight, then the ceiling started talking to us. Take it inside at twelve and it stays a party.",
      cevaplar: [] },
    { kim: "juno_r", zaman: "Feb 2025", eski: true,
      metin: "Someone brought a record player and the whole night changed direction at 2am. Best thing that's happened in that flat.",
      cevaplar: [ { kim: "wg_küche", zaman: "Feb 2025", metin: "That was Timo. He's invited forever now." } ] },
    { kim: "sibel", zaman: "5 days ago",
      metin: "Address only goes out the day of, right? Don't want to plan a whole evening around a doorbell I can't find.",
      cevaplar: [ { kim: "nemo", zaman: "4 days ago", metin: "Day of, and it's the fourth floor. There is no lift. That's the ritual." } ] },
    { kim: "mo", zaman: "2 days ago",
      metin: "Bringing two people who don't know anyone. Is that a lot or normal here?",
      cevaplar: [ { kim: "juno_r", zaman: "yesterday", metin: "Normal. Two is fine, six is a different situation." } ] },
    { kim: "ana", zaman: "3 h ago",
      metin: "Last one ended with everyone on the staircase at 5am talking about nothing. Hoping for the same.",
      cevaplar: [] }
  ]
};

/* Slug'dan sabit tohum — ayni kart hep ayni tartismayi gostersin */
function YORUM_TOHUM(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — sehir.js'deki ile ayni sebep: basit LCG 2^53'u asip bozuluyor */
function YORUM_ZAR(tohum) {
  return function () {
    tohum |= 0; tohum = (tohum + 0x6D2B79F5) | 0;
    let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function YORUM_KARISTIR(dizi, zar) {
  const d = dizi.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(zar() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* Bir etkinlik icin 2 eski + 3 yeni konu */
function YORUMLARI_GETIR(etkinlik) {
  const havuz = YORUM_HAVUZU[etkinlik.tur] || [];
  const zar = YORUM_ZAR(YORUM_TOHUM(etkinlik.slug));
  const eski = YORUM_KARISTIR(havuz.filter((y) => y.eski), zar).slice(0, 2);
  const yeni = YORUM_KARISTIR(havuz.filter((y) => !y.eski), zar).slice(0, 3);
  return { eski, yeni };
}
