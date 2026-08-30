/* afterhours — the comment column beside the card in explore.
   Sample data. Every event type has its own pool; which comments land on
   an event is picked with a seed made from its slug, so the same card
   always shows the same conversation.

   `old: true` marks a comment left over from an earlier edition of the
   night. Everything else is from this week. */

const COMMENT_POOL = {

  "Konzert": [
    { who: "lena_k", when: "Nov 2023", old: true,
      body: "Went to the same tour two years ago. The hall show is a different animal from the festival set — slower, and you actually hear the band talk between songs.",
      replies: [ { who: "tobi", when: "Nov 2023", body: "Agreed. Seated until the encore, then nobody was seated." } ] },
    { who: "marek", when: "Sept 2024", old: true,
      body: "Olympiahalle sound is fine if you're not under the balcony. Anything past block D and it turns to soup.",
      replies: [ { who: "annu", when: "Sept 2024", body: "Confirmed. Stood at the back once, never again." } ] },
    { who: "hbf_nights", when: "Mar 2025", old: true,
      body: "Doors said 18:30 and the support started 19:40. Don't rush your dinner.",
      replies: [] },
    { who: "seraph", when: "4 days ago",
      body: "Tickets moved faster than last time. Two of us have spares if anyone's short.",
      replies: [ { who: "juli", when: "3 days ago", body: "Still going? I'd take one." },
                  { who: "seraph", when: "2 days ago", body: "Gone — but people keep dropping them in here the week of." } ] },
    { who: "dnk", when: "yesterday",
      body: "Tram 20 back to the centre after is packed. U3 from Olympiazentrum is emptier even if it's a longer walk.",
      replies: [] },
    { who: "pia.m", when: "6 h ago",
      body: "First time seeing them. Is it the kind of show where the whole floor sings, or is that just the internet?",
      replies: [ { who: "lena_k", when: "3 h ago", body: "It's real. Bring a voice you don't need tomorrow." } ] }
  ],

  "Festival": [
    { who: "vito", when: "Aug 2023", old: true,
      body: "The year it rained, the small stage turned into the best one — everyone squeezed under the roof and stayed there until 3.",
      replies: [ { who: "roh", when: "Aug 2023", body: "Best accidental afterhours I've had." } ] },
    { who: "sanne", when: "July 2024", old: true,
      body: "Bring cash for the food stalls. Half of them still don't take cards and the queue for the machine is its own festival.",
      replies: [] },
    { who: "ferro", when: "Sept 2024", old: true,
      body: "Went alone the first year and left with six people I still go out with. It's that kind of field.",
      replies: [ { who: "milo_b", when: "Sept 2024", body: "Same. The queue for water is basically a dating app." } ] },
    { who: "tess", when: "5 days ago",
      body: "Line-up dropped and the second stage is quietly the better one again.",
      replies: [ { who: "ferro", when: "4 days ago", body: "It's always the better one. That's the joke by now." } ] },
    { who: "kaan", when: "2 days ago",
      body: "Anyone doing the whole thing without camping? Last trains are the part I never plan properly.",
      replies: [ { who: "sanne", when: "yesterday", body: "It fits inside one walk home if you stay east. That's the whole point of it." } ] },
    { who: "obst", when: "11 h ago",
      body: "Weather looks like it'll hold. Saying that out loud is probably a mistake.",
      replies: [] }
  ],

  "Rave": [
    { who: "0x_nadja", when: "Oct 2023", old: true,
      body: "The no-photo rule held all night, and you could feel it. Nobody was performing for anyone.",
      replies: [ { who: "stv", when: "Oct 2023", body: "One guy tried and the whole floor turned around. Never seen a phone go away that fast." } ] },
    { who: "mira", when: "Feb 2024", old: true,
      body: "Came at 1, thought I was early. Room was already full — this crowd starts before the internet says it does.",
      replies: [] },
    { who: "hallo_ben", when: "May 2025", old: true,
      body: "Closing set ran two hours over and nobody working there seemed to mind. That's the whole memory.",
      replies: [ { who: "0x_nadja", when: "May 2025", body: "We left at 9 in the morning into full daylight. Brutal, correct." } ] },
    { who: "lu", when: "3 days ago",
      body: "Door is doing a hard no on groups of guys again. Not a complaint, just don't roll up six deep and act surprised.",
      replies: [ { who: "trm", when: "3 days ago", body: "Also: they mean it about the phones now, not just on the poster." } ] },
    { who: "esra_p", when: "yesterday",
      body: "Who's playing the back room? The flyer says nothing and that's usually where the night actually happens.",
      replies: [ { who: "mira", when: "20 h ago", body: "Unannounced on purpose. It was the better room last time too." } ] },
    { who: "grau", when: "2 h ago",
      body: "Bringing someone to their first one. Any advice that isn't 'drink water'?",
      replies: [ { who: "hallo_ben", when: "1 h ago", body: "Agree on a meeting spot. Phones die, the room is dark, that's it." } ] }
  ],

  "Club Night": [
    { who: "roza", when: "Dec 2023", old: true,
      body: "This used to be a Thursday thing and honestly it was better — smaller room, no queue, everyone there on purpose.",
      replies: [ { who: "n_than", when: "Dec 2023", body: "The Thursday version is the one people still talk about." } ] },
    { who: "kiez", when: "Jun 2024", old: true,
      body: "Basement gets to about 40 degrees by 2am. Leave the jacket at home, the wardrobe queue is the real enemy.",
      replies: [] },
    { who: "aylin", when: "Jan 2025", old: true,
      body: "Came for the headliner, stayed for the local who played first. Happens here more than anywhere else in the city.",
      replies: [ { who: "roza", when: "Jan 2025", body: "That's the booking policy, not luck." } ] },
    { who: "fitz", when: "4 days ago",
      body: "Doors 23:59 is a bit of a statement but the room genuinely doesn't fill before 1.",
      replies: [] },
    { who: "meret", when: "2 days ago",
      body: "Is it card only at the bar now? Got caught out last month with a wallet full of coins.",
      replies: [ { who: "kiez", when: "yesterday", body: "Card at the bar, cash at the door. Annoying but consistent." } ] },
    { who: "sol", when: "8 h ago",
      body: "Two of us going, don't know anyone. Say hi if you're also standing near the pillar looking unsure.",
      replies: [ { who: "aylin", when: "5 h ago", body: "The pillar is a legitimate meeting point at this place." } ] }
  ],

  "Meetup": [
    { who: "hanna", when: "Oct 2023", old: true,
      body: "Went to the very first one when it was four people and a table. It's bigger now and somehow still not awkward.",
      replies: [ { who: "org_jo", when: "Oct 2023", body: "Four people and one broken chair. We kept the chair." } ] },
    { who: "pauli", when: "Apr 2024", old: true,
      body: "Come alone. Genuinely. Everyone who shows up in a pair ends up talking only to their pair.",
      replies: [] },
    { who: "bine", when: "Nov 2024", old: true,
      body: "Ends earlier than you'd think, then half the room walks to the same bar anyway. That part is the meetup.",
      replies: [ { who: "hanna", when: "Nov 2024", body: "The second half is undocumented and that's fine." } ] },
    { who: "yusuf", when: "6 days ago",
      body: "Do you need to bring anything or is turning up enough? The listing is very relaxed about it.",
      replies: [ { who: "org_jo", when: "5 days ago", body: "Turning up is enough. Bring something only if you want to show it." } ] },
    { who: "clea", when: "yesterday",
      body: "German or English? Asking for the friend I'm dragging along who's three weeks into the city.",
      replies: [ { who: "pauli", when: "22 h ago", body: "Both, in the same sentence usually. Nobody minds." } ] },
    { who: "rem", when: "4 h ago",
      body: "Room fits about thirty and it was full last time twenty minutes in. Don't stroll in at half past.",
      replies: [] }
  ],

  "Hausparty": [
    { who: "wg_küche", when: "Mar 2024", old: true,
      body: "The kitchen is always the party. Every year we plan the living room, every year everyone stands by the fridge.",
      replies: [ { who: "flo", when: "Mar 2024", body: "Put the good speaker in the kitchen and stop fighting it." } ] },
    { who: "nemo", when: "Sept 2024", old: true,
      body: "Neighbours were fine until midnight, then the ceiling started talking to us. Take it inside at twelve and it stays a party.",
      replies: [] },
    { who: "juno_r", when: "Feb 2025", old: true,
      body: "Someone brought a record player and the whole night changed direction at 2am. Best thing that's happened in that flat.",
      replies: [ { who: "wg_küche", when: "Feb 2025", body: "That was Timo. He's invited forever now." } ] },
    { who: "sibel", when: "5 days ago",
      body: "Address only goes out the day of, right? Don't want to plan a whole evening around a doorbell I can't find.",
      replies: [ { who: "nemo", when: "4 days ago", body: "Day of, and it's the fourth floor. There is no lift. That's the ritual." } ] },
    { who: "mo", when: "2 days ago",
      body: "Bringing two people who don't know anyone. Is that a lot or normal here?",
      replies: [ { who: "juno_r", when: "yesterday", body: "Normal. Two is fine, six is a different situation." } ] },
    { who: "ana", when: "3 h ago",
      body: "Last one ended with everyone on the staircase at 5am talking about nothing. Hoping for the same.",
      replies: [] }
  ]
};

/* A fixed seed from the slug — the same card always shows the same talk */
function COMMENT_SEED(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — same reason as in globe.js: a plain LCG breaks past 2^53 */
function COMMENT_RAND(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function COMMENT_SHUFFLE(list, rand) {
  const d = list.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* Two older topics and three from this week, per event. */
function COMMENTS_FOR(event) {
  const pool = COMMENT_POOL[event.kind] || [];
  const rand = COMMENT_RAND(COMMENT_SEED(event.slug));
  const older = COMMENT_SHUFFLE(pool.filter((c) => c.old), rand).slice(0, 2);
  const recent = COMMENT_SHUFFLE(pool.filter((c) => !c.old), rand).slice(0, 3);
  return { older, recent };
}
