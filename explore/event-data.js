/* afterhours — the content of the event page.

   We do not write a page per night: the layout is one, and the content
   comes from here. The pools are split by the KIND of event; which part
   lands on which night is chosen by a seed made from the slug — so the
   same event shows the same thing every time it is opened, while no two
   events look alike. (explore/comment-pools.js works the same way.)

   A hand-written night goes into SPECIAL and overrides the pool.  */

window.EVENT_POOLS = (function () {

  /* The words of the pools live in lang/src/explore.json (pool.<kind>.*),
     all three languages side by side and every list the same length and
     order — so the pick seeded from the slug lands on the same item in
     every language. Here only the shape is kept. */
  const AH = window.AH || {};
  const KINDS = {
    "Konzert": "konzert", "Festival": "festival", "Rave": "rave",
    "Club Night": "club-night", "Hausparty": "hausparty", "Meetup": "meetup",
  };
  const word = (key) => (AH.t ? AH.t(key) : key);
  const words = (key) => { const v = word(key); return Array.isArray(v) ? v : []; };
  const perKind = (fn) => {
    const out = {};
    Object.keys(KINDS).forEach((kind) => { out[kind] = fn("pool." + KINDS[kind]); });
    return out;
  };

  /* --- the credits: the things that are the same every edition --- */
  /* e.g. Konzert: curfew 23:00 · capacity 11 000 · door no re-entry ·
     payment card only · photos allowed · walk 9 min */
  const FACTS = perKind((pool) => {
    const values = words(pool + ".fact.values");
    return words(pool + ".fact.labels").map((label, i) => [label, values[i] || ""]);
  });

  /* --- the after: what is still open once a night ends ---
     Rooms, not line-ups. They are invented while the after is a sketch;
     the moment it is wired to the deck they come out of our own events —
     same city, same night, later start. Nothing here is booked with the
     event, which is the whole point of the section. */
  const AFTERS = [
    ["Basement Nine", "club night"],
    ["Room Two", "after"],
    ["The Late Hold", "club night"],
    ["Concrete Garden", "rave"],
    ["Blue Hour", "after"],
    ["Third Floor", "club night"],
    ["Nightform", "rave"],
    ["The Annex", "after"],
    ["Long Player", "club night"],
    ["Back Room Radio", "after"],
    ["Six Til Late", "club night"],
    ["The Slow Room", "after"],
  ];

  /* --- how long a night of each kind runs, in hours ---
     Doors plus this is when the room empties, and the after starts
     counting from there. A rave does not need an after at midnight; it
     needs one at six. */
  const RUNS = {
    "Konzert": 3, "Festival": 7, "Rave": 8,
    "Club Night": 6, "Hausparty": 5, "Meetup": 3,
  };

  /* --- the introduction paragraphs ---
     The first paragraph is the event's own text; the ones here have to add
     something ON TOP of it, not say the same thing in other words. Should
     they still collide, event.js looks for a shared word and drops one. */
  const BODY = perKind((pool) => words(pool + ".paragraphs"));

  /* --- the ticket button: not every kind is selling the same thing --- */
  /* The button says "ticket" everywhere (as in the app); only the note
     under it changes with the kind. */
  const TICKET = perKind((pool) => [word("word.ticket"), word(pool + ".ticket")]);

  /* --- arkadaslar --- */
  const FRIEND_NAMES = [
    "Lina", "Emre", "Mira", "Jonas", "Selin", "Deniz", "Kaya", "Nora",
    "Bosse", "Ada", "Tuna", "Ilay", "Marek", "Juli", "Ege", "Rana",
  ];

  /* Codes, not words: event.js compares them and says them through the
     dictionary (who.in · who.maybe · who.not · night.status.kept).
     What a person's answer to a night can be — the app's three answers to
     "who's coming?" (i'm in · maybe · not tonight), plus "kept it": the
     swipe and nothing more, the card is in their collection. */
  const STATES = ["i'm in", "i'm in", "i'm in", "kept it", "maybe", "not tonight"];


  /* --- what friends left on this night (beforehours) ---
     {venue}, {name} and {day} are filled in from the event itself, so the
     comment really is about THAT night. */
  /* Six per kind; the fourth one is a question and carries the answer. */
  const COMMENTS = perKind((pool) =>
    words(pool + ".comments").map((m, i) =>
      i === 3 ? { m: m, c: { m: word(pool + ".reply") } } : { m: m }));

  const WHEN = words("pool.when");

  return { FACTS, AFTERS, RUNS, BODY, TICKET, FRIEND_NAMES, STATES, COMMENTS, WHEN };
})();
