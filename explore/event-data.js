/* afterhours — etkinlik sayfasinin icerigi.

   Her night icin ayri sayfa yazmiyoruz: sayfanin duzeni tek, icerigi
   buradan geliyor. Havuzlar etkinlik TURUNE gore ayrilmis; hangi
   parcanin hangi geceye dustugunu slug'dan uretilen tohum seciyor —
   yani ayni etkinlik her acilista ayni seyi gosteriyor, ama iki
   etkinlik birbirine benzemiyor. (explore/comment-pools.js de boyle.)

   Elle yazilmis bir night varsa OZEL'e konuyor ve havuzu eziyor.  */

window.EVENT_POOLS = (function () {

  /* --- kunye: her edisyonda ayni olan seyler --- */
  const FACTS = {
    "Konzert": [
      ["curfew", "23:00"], ["capacity", "11 000"], ["door", "no re-entry"],
      ["payment", "card only"], ["photos", "allowed"], ["walk", "9 min"],
    ],
    "Festival": [
      ["ends", "late"], ["capacity", "18 000"], ["door", "re-entry until 22:00"],
      ["payment", "cashless wristband"], ["photos", "allowed"], ["walk", "14 min"],
    ],
    "Rave": [
      ["closes", "when it closes"], ["capacity", "700"], ["door", "no re-entry"],
      ["payment", "cash"], ["photos", "none, stickers at the door"], ["walk", "6 min"],
    ],
    "Club Night": [
      ["closes", "06:00"], ["capacity", "400"], ["door", "one in, one out after 01:00"],
      ["payment", "cash preferred"], ["photos", "not on the floor"], ["walk", "4 min"],
    ],
    "Hausparty": [
      ["quiet by", "02:00"], ["capacity", "as many as fit"], ["door", "ring, don't knock"],
      ["payment", "bring something"], ["photos", "ask first"], ["walk", "3 min"],
    ],
    "Meetup": [
      ["ends", "when the table empties"], ["capacity", "24 seats"], ["door", "just come in"],
      ["payment", "free"], ["photos", "sure"], ["walk", "5 min"],
    ],
  };

  /* --- karelerdeki roller --- */
  const ROLES = {
    "Konzert":    ["dj set", "support", "headline", "special guest", "after"],
    "Festival":   ["opening", "second stage", "headline", "special guest", "closing"],
    "Rave":       ["opening", "resident", "b2b", "special guest", "closing"],
    "Club Night": ["warm up", "resident", "main floor", "special guest", "back room"],
    "Hausparty":  ["kitchen", "living room", "balcony", "whoever brings it", "last hour"],
    "Meetup":     ["host", "table one", "table two", "whoever turns up", "afterwards"],
  };

  /* --- kareye dusecek isimler --- */
  const NAMES = {
    "Konzert": ["Keys Open Doors", "Lou Capri", "Neon Ferry", "Vera Sound", "Club Set", "Hall Light", "The Long Way"],
    "Festival": ["Morgenrot", "Feldweg", "Zwei Uhr", "Sonnenbank", "Waldbühne DJs", "Letzte Bahn", "Platzregen"],
    "Rave": ["Kessel", "Nachtform", "Untertag", "Halle 4", "Bitterfeld", "Stahlbad", "Nordwand"],
    "Club Night": ["Spätdienst", "Marmor", "Kleiner Raum", "Grauzone", "Radio Süd", "Zwischenwand"],
    "Hausparty": ["Someone's brother", "The record box", "Two speakers", "Whoever cooks", "The stairwell"],
    "Meetup": ["Ida", "Bosse", "Nele & Tim", "The quiet table", "Whoever stays"],
  };

  /* --- tanitim paragraflari: ilki etkinligin kendi metni, sonrakiler burada --- */
  /* --- tanitim paragraflari ---
     Ilk paragraf etkinligin kendi metni; buradakiler onun USTUNE bir sey
     koymali, ayni seyi baska kelimelerle soylememeli. Yine de carpisma
     olursa event.js ortak kelimeye bakip eliyor. */
  const BODY = {
    "Konzert": [
      "The floor fills politely for the first half hour — everyone still holding a drink with both hands, still working out where their friends ended up — and then the lights drop and the room stops behaving like a room.",
      "Three or four times in the set the whole thing falls quiet enough that you can hear the ceiling. Those are the parts people describe badly afterwards and remember for years.",
      "The middle stretch is what gets argued about on the way out: either the best twenty minutes of the night, or the point where the room was lost, depending entirely on where you were standing.",
      "Seats on the side are worth it if you want to see how the stage is built. The floor is worth it if you don't care.",
    ],
    "Festival": [
      "It starts in daylight, which changes everything: you can see who you came with, you can see the ground, and for the first hours it behaves more like a park than a festival.",
      "Two stages are audible at once from most of the site. People treat that as a feature and drift between them instead of committing to one.",
      "Whatever the weather does, the smaller stage wins. When it rains everyone squeezes under the roof and simply stays there.",
      "The last slot on the small stage is usually the one people talk about afterwards, whatever the poster says.",
    ],
    "Rave": [
      "It opens slower than the poster suggests. The first two hours belong to the people who came alone, and they are usually the best two hours.",
      "The room does one thing all night and does not apologise for it. If you need a break there is a corridor, and the corridor is part of the night.",
      "It ends without an announcement. The lights come up on whoever is still standing there, and that is the whole ceremony.",
      "Nobody checks the time after three, which is either the appeal or the warning, depending on what your monday looks like.",
    ],
    "Club Night": [
      "Two rooms, one door, and a crowd that moves between them all night depending on which one is louder.",
      "The handover between the early and the late booking is the actual show — one goes out on the record the other comes in on, and the floor never notices the seam.",
      "It is small enough that you will run into the same four people three times. That is either the point or the problem.",
      "Nothing peaks before one. Arrive at eleven and you get the room to yourself, which is a real offer.",
    ],
    "Hausparty": [
      "No stage, no booking, no schedule — just a flat that agreed to this and a stairwell that will have become the smoking area by midnight.",
      "The neighbours have been told. That is the only reason there is a time on this page, and it is the one rule that actually holds.",
      "It winds down rather than ends: the music gets quieter by itself, and by the last hour it is six people and a kettle.",
      "Whoever gets there first decides what the next hour sounds like. Come early if you have opinions about that.",
    ],
    "Meetup": [
      "You do not need to know anybody. That is not a nice sentence on a page, it is how the seating actually works.",
      "It runs on a table, not a stage. Whoever talks longest is usually the person who turned up for the first time.",
      "Nothing is recorded and nothing gets posted afterwards. What is said at the table stays at the table, which is why people say more at it.",
      "A smaller version of it continues around the corner afterwards, and that part is not organised by anybody.",
    ],
  };

  /* --- bilet dugmesi: her tur ayni seyi satmiyor --- */
  const TICKET = {
    "Konzert":    ["get the ticket", "goes to the venue's own shop"],
    "Festival":   ["get the ticket", "day and weekend passes"],
    "Rave":       ["get on the list", "door price is cash only"],
    "Club Night": ["get on the list", "cheaper before midnight"],
    "Hausparty":  ["ask for the address", "you get it the day before"],
    "Meetup":     ["save a seat", "free, but the table is small"],
  };

  /* --- arkadaslar --- */
  const FRIEND_NAMES = [
    "Lina", "Emre", "Mira", "Jonas", "Selin", "Deniz", "Kaya", "Nora",
    "Bosse", "Ada", "Tuna", "Ilay", "Marek", "Juli", "Ege", "Rana",
  ];

  const STATES = ["going", "going", "going", "maybe", "can't"];


  /* --- arkadaslarin bu geceye birakdiklari (beforehours) ---
     {mekan}, {ad} ve {gun} yerlerine etkinligin kendi bilgisi giriyor,
     boylece yorum gercekten O geceden bahsediyor. */
  const COMMENTS = {
    "Konzert": [
      { m: "Third time for me. They play the record front to back, so don't turn up only for the singles." },
      { m: "{mekan} is flat until about halfway. If you're short, the side seats are the honest choice." },
      { m: "It's on a {gun}. Everyone leaves through one station — walk out during the encore or make peace with it." },
      { m: "Who is on before? I can't find a single thing about them.",
        c: { m: "Support from the berlin dates. Worth being early for." } },
      { m: "Not making this one. Someone record the quiet part for me." },
      { m: "Last time the support started forty minutes after doors. Don't rush your dinner." },
    ],
    "Festival": [
      { m: "Bring cash for the food stalls. Half of them still don't take it off the wristband and the queue for the machine is its own festival." },
      { m: "{mekan} gets muddy in one hour flat if it rains. Shoes you don't like." },
      { m: "Went alone the first year and left with six people I still go out with. It's that kind of field." },
      { m: "Is anyone doing the {gun} one or is everyone going the other day?",
        c: { m: "We're doing both. It's the same wristband." } },
      { m: "The small stage is the whole point. Don't spend the night in front of the big one." },
      { m: "Meeting at the entrance at four, then we lose each other for six hours as usual." },
    ],
    "Rave": [
      { m: "Doors say early but nothing happens for two hours. Come late or come alone, both are fine." },
      { m: "{mekan} has one corridor and it's where everyone actually talks." },
      { m: "Stickers at the door again. Just leave the phone in your jacket, it's easier." },
      { m: "Anyone driving back? {gun} means no trains until five.",
        c: { m: "I've got two seats. Leaving whenever it ends." } },
      { m: "Last time I stayed until the lights came up and I'd still do it again." },
      { m: "Cash only, and the machine on the corner is always empty. Bring it with you." },
    ],
    "Club Night": [
      { m: "Cheaper before midnight and the room is better then anyway." },
      { m: "{mekan} does one in one out after one. If we're going, we go together." },
      { m: "The back room is the reason to come. Nobody tells you that." },
      { m: "Is this the same booking as last month?",
        c: { m: "Same two, different order. The handover is the good bit." } },
      { m: "I'll be there but I'm leaving at three. {gun} and I have a shift." },
      { m: "Don't eat first. There's nothing open after and you'll regret it." },
    ],
    "Hausparty": [
      { m: "I'm bringing the speaker again, someone else bring the cable this time." },
      { m: "{mekan} — fourth floor, no lift. Wear something you can climb in." },
      { m: "Quiet by two means quiet by two. The neighbours were decent about it last time." },
      { m: "What are people bringing? I don't want four bottles of the same thing.",
        c: { m: "Put it in the group. I've got the ice." } },
      { m: "It's a {gun}, so I'm coming late and staying to the end." },
      { m: "Last one turned into breakfast. No promises." },
    ],
    "Meetup": [
      { m: "You don't need to bring anything or know anyone. That is genuinely how it works." },
      { m: "{mekan} is easy to miss from the street — it's the door next to the bakery." },
      { m: "First time I came I said nothing for an hour and it was still worth it." },
      { m: "Is there space this {gun}?",
        c: { m: "Always. Somebody drops out every time." } },
      { m: "We usually end up around the corner afterwards. That part is the best part." },
      { m: "Bring a page if you've got one. If not, come anyway." },
    ],
  };

  const WHEN = ["3 days ago", "2 days ago", "yesterday", "9 h ago", "6 h ago", "3 h ago"];

  return { FACTS, ROLES, NAMES, BODY, TICKET, FRIEND_NAMES, STATES, COMMENTS, WHEN };
})();
