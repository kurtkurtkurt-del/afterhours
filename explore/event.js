/* afterhours — the event page (a contact sheet).

   We do not write thirty-six pages for thirty-six nights: one layout,
   and the content
   and the content comes from the event's own record (data.js / events-data.js)
   and from the pools kept per type (event-data.js). Which piece lands on which
   night is picked with a seed made from the slug, so an event shows the same
   thing on every visit while no two events look alike.

   To add a night: one row in events-data.js (or in the database), and an
   empty shell at explore/<slug>/index.html. The rest comes from here. */

(function () {
  const area = document.querySelector(".cs");
  if (!area) return;

  const V = window.EVENT_POOLS || {};

  /* --- the seed: the same slug always builds the same night --- */
  function tohumla(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    /* mulberry32 — same reason as in globe.js: the multiply must not pass 2^53 */
    let t = h >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

  function shuffle(rnd, list) {
    const l = list.slice();
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  }

  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] ||
                           ["th", "st", "nd", "rd"][n % 100] || "th");

  /* --- the one meta line: "Olympiahalle · 11.09.26 · 18:30" --- */
  function parseMeta(meta) {
    const parts = String(meta || "").split("·").map((p) => p.trim()).filter(Boolean);
    const out = { venue: "", date: "", time: "" };
    parts.forEach((p) => {
      if (!out.time && /^\d{1,2}:\d{2}/.test(p)) out.time = p;
      else if (!out.date && /\d{1,2}\.\d{1,2}/.test(p)) out.date = p;
      else if (!out.venue) out.venue = p;
      else if (!out.date) out.date = p;
    });
    if (!out.venue) out.venue = parts[0] || "";
    return out;
  }

  const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  function weekdayFor(date, rnd) {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(date || "");
    if (m) {
      const d = new Date(2000 + +m[3], +m[2] - 1, +m[1]);
      if (!isNaN(d)) return WEEKDAYS[d.getDay()];
    }
    return pick(rnd, ["friday", "saturday", "thursday"]);
  }

  /* --- small helpers --- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function factRow(dt, dd) {
    const box = document.createElement("div");
    box.appendChild(el("dt", null, dt));
    box.appendChild(el("dd", null, dd));
    return box;
  }

  /* --- building the page --- */
  function build(e) {
    const rnd = tohumla(e.slug || "afterhours");
    const kind = e.kind || "Konzert";
    const m = parseMeta(e.meta);
    const day = weekdayFor(m.date, rnd);
    const posterPath = e.posterPath ||
      "../../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";

    /* which edition this is, and how many times it has been you */
    const edition = 2 + Math.floor(rnd() * 11);
    const picked = Math.min(edition - 1, Math.floor(rnd() * 3));

    area.textContent = "";

    /* ---- the left rail ---- */
    const ray = el("aside", "cs-rail");
    const poster = document.createElement("object");
    poster.className = "cs-poster";
    poster.type = "image/svg+xml";
    poster.data = posterPath;
    ray.appendChild(poster);

    const facts = el("dl", "cs-facts");
    if (m.time) facts.appendChild(factRow("doors", m.time));
    (V.FACTS[kind] || []).forEach(([a, b]) => facts.appendChild(factRow(a, b)));
    if (m.venue) facts.appendChild(factRow("room", m.venue.toLowerCase()));
    facts.appendChild(factRow("from", price(kind, rnd)));
    ray.appendChild(facts);
    area.appendChild(ray);

    /* ---- the middle column ---- */
    const middle = el("div", "cs-field");

    const crumb = el("nav", "crumb");
    const back = el("a", null, "explore");
    back.href = "../index.html";
    crumb.appendChild(back);
    crumb.appendChild(el("span", null, "/"));
    crumb.appendChild(el("span", null, (e.title || "").toLowerCase()));
    middle.appendChild(crumb);

    middle.appendChild(el("p", "cs-edition",
      "edition " + String(edition).padStart(2, "0") + " · your " + ordinal(picked + 1)));
    middle.appendChild(el("h1", "cs-title", e.title || ""));
    middle.appendChild(el("p", "cs-meta",
      [kind.toLowerCase(), m.date ? day + " " + m.date : day].join(" · ")));

    /* The first paragraph is the event's own line, the rest come from the pool
          for its type. A pooled paragraph that says the same thing as the event's
       soyluyorsa atlaniyor: iki kez "bring something" yaziyordu. */
    const pool = shuffle(rnd, V.BODY[kind] || []).filter((p) => !overlaps(p, e.body));
    [e.body, pool[0], pool[1]].filter(Boolean).forEach((p) =>
      middle.appendChild(el("p", "cs-text", p)));

    /* ---- the frames ---- */
    const section = el("section", "cs-section");
    section.appendChild(el("p", "cs-label", "the roll · five frames, one still blank"));

    const roles = V.ROLES[kind] || [];
    const names = shuffle(rnd, V.NAMES[kind] || []);
    const times = buildTimes(m.time, kind, rnd);
    const strip = el("ol", "cs-frames");

    for (let i = 0; i < 5; i++) {
      const frame = el("li", "cs-frame" + (i === 3 ? " empty" : ""));
      const shot = el("div", "cs-shot" + (i === 3 ? " empty" : ""));

      if (i === 3) {
        shot.textContent = "not shot yet";
      } else {
        /* A frame is a band of the poster. Four frames, four different bands. */
        const img = document.createElement("object");
        img.className = "cs-shot-img";
        img.type = "image/svg+xml";
        img.data = posterPath;
        img.style.setProperty("--shift", [0, 42, 83, 125][i > 3 ? 3 : i]);
        shot.appendChild(img);
      }

      frame.appendChild(shot);
      frame.appendChild(el("span", "cs-no", String(i + 1).padStart(2, "0")));
      frame.appendChild(el("p", "cs-role", roles[i] || ""));
      frame.appendChild(el("p", "cs-name",
        i === 3 ? "not announced" : (i === 2 ? e.title : names[i] || "—")));
      /* The empty frame has NO time: it fills the moment the door opens.
            Printing a number repeated the time on another frame. */
      frame.appendChild(el("p", "cs-clock",
        i === 3 ? "fills at the door" : times[i] || ""));
      strip.appendChild(frame);
    }

    section.appendChild(strip);
    section.appendChild(el("p", "cs-note",
      "An empty frame is not a gap. Nothing is announced until the doors are open."));
    middle.appendChild(section);

    /* ---- the editions you were at ---- */
    const past = el("section", "cs-section cs-section-past");
    past.appendChild(el("p", "cs-label", picked
      ? "editions you were at · " + picked + " of " + (edition - 1)
      : "your first one · " + (edition - 1) + " happened without you"));
    const box = el("div", "cs-past");
    past.appendChild(box);
    /* If you never went, the box stays empty; a sentence fills it. */
    if (!picked) past.appendChild(el("p", "cs-note",
      "Keep this one and the collection starts here."));
    middle.appendChild(past);
    area.appendChild(middle);

    /* ---- the right column ---- */
    const right = el("aside", "cs-right");
    right.appendChild(el("p", "cs-label", "which friends are going"));

    const who = el("ul", "cs-who");
    const friends = shuffle(rnd, V.FRIEND_NAMES).slice(0, 5);
    const states = V.STATES;
    friends.forEach((name, i) => {
      const row = el("li", states[i] === "can't" ? "out" : null);
      row.appendChild(el("span", "cs-who-name", name));
      row.appendChild(el("span", "cs-who-status", states[i]));
      who.appendChild(row);
    });
    right.appendChild(who);
    right.appendChild(el("p", "cs-tally", "3 going · 1 maybe · 1 out"));

    const [button, sub] = V.TICKET[kind] || V.TICKET["Konzert"];
    const bilet = el("a", "cs-ticket", button);
    bilet.href = "#";
    right.appendChild(bilet);
    right.appendChild(el("p", "cs-ticket-sub", sub));

    /* beforehours: what friends said about this night, this room, this date */
    const comments = el("section", "cs-comments");
    comments.appendChild(el("p", "cs-label", "beforehours · your friends"));

    const zamanlar = V.WHEN;
    shuffle(rnd, V.COMMENTS[kind] || []).slice(0, 4).forEach((y, i) => {
      comments.appendChild(buildComment(
        friends[i] || "someone", zamanlar[i + 1] || "today",
        fill(y.m, e, m, day),
        y.c ? { who: friends[(i + 2) % 5], when: zamanlar[i + 2] || "today",
                body: fill(y.c.m, e, m, day) } : null));
    });
    right.appendChild(comments);
    area.appendChild(right);

    /* ---- the past-edition cards (drawn by cards.js) ---- */
    drawCards(box, e, m, kind, picked, edition, rnd, friends);
  }

  /* If two texts share an uncommon word they are probably saying the same
     Kisa kelimeler (the, room, night) sayilmiyor. */
  const SIK = /^(the|and|that|with|this|there|their|which|about|after|before|until|people|night|nights|every|other|first|still|where|would)$/;

  function overlaps(a, b) {
    if (!a || !b) return false;
    const words = (y) => new Set(String(y).toLowerCase().match(/[a-zäöüß]{6,}/g) || []);
    const A = words(a), B = words(b);
    for (const k of A) if (!SIK.test(k) && B.has(k)) return true;
    return false;
  }

  function fill(text, e, m, day) {
    return String(text)
      .replace(/\{venue\}/g, m.venue || "the room")
      .replace(/\{name\}/g, e.title || "this one")
      .replace(/\{day\}/g, day);
  }

  function buildComment(who, when, text, reply) {
    const k = el("div", "c-topic");
    const top = el("div", "c-top");
    top.appendChild(el("span", "c-who", who));
    top.appendChild(el("span", "c-when", when));
    k.appendChild(top);
    k.appendChild(el("p", "c-text", text));
    if (reply) {
      const c = el("div", "c-replies");
      const box = el("div", "c-reply");
      const u = el("div", "c-top");
      u.appendChild(el("span", "c-who", reply.who));
      u.appendChild(el("span", "c-when", reply.when));
      box.appendChild(u);
      box.appendChild(el("p", "c-text", reply.body));
      c.appendChild(box);
      k.appendChild(c);
    }
    return k;
  }

  const PRICE = {
    "Konzert": [49, 89], "Festival": [59, 129], "Rave": [15, 28],
    "Club Night": [10, 18], "Hausparty": null, "Meetup": null,
  };

  function price(kind, rnd) {
    const a = PRICE[kind];
    if (!a) return "free";
    return "€" + (a[0] + Math.floor(rnd() * (a[1] - a[0])));
  }

  /* Starting from the door time, we build the times of the five frames. */
  function buildTimes(doors, kind, rnd) {
    const m = /^(\d{1,2}):(\d{2})/.exec(doors || "");
    let mins = m ? +m[1] * 60 + +m[2] : (kind === "Rave" || kind === "Club Night" ? 23 * 60 : 19 * 60);
    const gap = kind === "Meetup" ? 45 : 60 + Math.floor(rnd() * 30);
    const out = [];
    for (let i = 0; i < 5; i++) {
      mins += i === 0 ? 15 : gap;
      const s = Math.floor(mins / 60) % 24;
      out.push(String(s).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0"));
    }
    return out;
  }

  const METAL_LIST = ["steel", "chrome", "gunmetal", "titanium", "nickel", "anthracite", "brass", "copper"];
  const MOTIF_LIST = ["rays", "oval", "diagonal", "orbit", "grid", "moon", "moire", "bands", "iso", "descend"];
  const OVERHEARD = [
    "nobody in the front row sat down", "we lost each other by midnight",
    "the back room was better", "phones stayed in pockets",
    "side seats were the right call", "they said no encore. there was one",
    "we stayed until the lights came up", "the queue was the best part",
  ];

  function drawCards(box, e, m, kind, picked, edition, rnd, friends) {
    if (!window.CARDS || !picked) return;

    for (let i = 0; i < picked; i++) {
      const year = 26 - (i + 1) * 2;
      const night = {
        city: "münchen",
        t: e.title, ty: (kind || "").toUpperCase(),
        v: (m.venue || "münchen").toUpperCase(),
        d: "1" + (2 + i) + ".0" + (5 + i) + "." + year,
        metal: pick(rnd, METAL_LIST), motif: pick(rnd, MOTIF_LIST),
        in: "19:4" + i, out: "23:2" + i, dur: "3H 4" + i + "M",
        crew: friends.slice(0, 3).map((a) => a[0]),
        more: 3 + Math.floor(rnd() * 8), aud: "0:" + (20 + Math.floor(rnd() * 39)),
        msg: 8 + Math.floor(rnd() * 20), who: (friends[0] || "you").toUpperCase(),
        froze: "1" + (4 + i) + ".0" + (5 + i), no: "0" + (100 + Math.floor(rnd() * 800)),
        at1: "20:1" + i, at2: "22:3" + i,
        q1: [pick(rnd, OVERHEARD), (friends[1] || "L")[0], "21:1" + i],
        q2: [pick(rnd, OVERHEARD), (friends[2] || "M")[0], "23:0" + i],
      };

      const card = el("figure", "cs-past-card");
      const face = el("div", "cs-past-face");
      face.innerHTML = CARDS.front(night, "g" + i);
      card.appendChild(face);
      card.appendChild(el("figcaption", null,
        "edition " + String(edition - 1 - i).padStart(2, "0") +
        " · " + (m.venue || "münchen").toLowerCase() + " · " + night.d));
      box.appendChild(card);
    }
  }

  /* --- which event? the folder name in the address bar --- */
  function slugFromPath() {
    const p = location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
    return p[p.length - 1] || "";
  }

  /* data.js loads this through data-after, so POSTERS is ready by now. */
  const slug = slugFromPath();
  const e = (window.POSTERS || []).filter((x) => x.slug === slug)[0];
  if (e) build(e);
})();
