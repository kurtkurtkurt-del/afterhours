/* afterhours — somebody's page.

   You get here from a name: the column of who is going on a night. So
   the page answers the question you had when you pressed it, in this
   order — how you reach them, who they are, the nights they kept, and
   what those nights left them with.

   Everything is drawn from the handle with the same seed the event page
   uses, so a person looks the same from every night. Where a real
   account carries that handle, its own name, line, city and date take
   over; the nights on the roll are real nights from the listings in
   their city either way. */

(function () {
  const area = document.querySelector(".pf");
  if (!area) return;

  const AH = (window.AH = window.AH || {});
  const query = new URLSearchParams(location.search);
  const handle = String(query.get("handle") || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  const via = String(query.get("via") || "").split(",")
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, "")).filter(Boolean).slice(0, 2);

  /* --- the seed: the same handle always builds the same person --- */
  function seeded(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
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
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : "";

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const face = (name, cls) => {
    const box = el("span", "cs-face " + (cls || ""));
    if (window.AVATAR) box.innerHTML = AVATAR(name);
    return box;
  };

  /* --- the pools a drawn person is made of --- */
  const CITIES = [
    ["munchen", "münchen"], ["berlin", "berlin"], ["hamburg", "hamburg"], ["wien", "wien"],
    ["zurich", "zürich"], ["london", "london"], ["amsterdam", "amsterdam"], ["istanbul", "istanbul"],
    ["paris", "paris"], ["frankfurt", "frankfurt"],
  ];
  const BIOS = [
    "goes early, leaves late. side seats, always.",
    "front row or nothing. asks for the setlist after.",
    "the back room is usually better.",
    "phone stays in the pocket. ask me the day after.",
    "loses everyone by midnight, finds them at the door.",
    "here for the support act, honestly.",
    "one night a week, no exceptions, no plans.",
    "will walk out during the encore to catch the last train.",
  ];
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august"];
  const NAMES = ["Lina", "Emre", "Mira", "Jonas", "Selin", "Deniz", "Kaya", "Nora",
                 "Bosse", "Ada", "Tuna", "Ilay", "Marek", "Juli", "Ege", "Rana"];
  const METALS = ["steel", "chrome", "gunmetal", "titanium", "nickel", "anthracite", "brass", "copper", "rose", "gold"];
  const MOTIFS = ["rays", "oval", "diagonal", "orbit", "grid", "moon", "moire", "bands", "iso", "descend"];
  const OVERHEARD = [
    "nobody in the front row sat down", "we lost each other by midnight",
    "the back room was better", "phones stayed in pockets",
    "side seats were the right call", "they said no encore. there was one",
    "we stayed until the lights came up", "the queue was the best part",
  ];

  if (!handle) {
    area.appendChild(el("p", "pf-none", "nobody here by that name."));
    return;
  }

  const rnd = seeded(handle);
  const person = {
    handle: handle,
    name: cap(handle),
    city: pick(rnd, CITIES),
    bio: pick(rnd, BIOS),
    since: pick(rnd, MONTHS) + " 26",
    kept: 12 + Math.floor(rnd() * 40),
    friends: 6 + Math.floor(rnd() * 20),
    real: false,
  };
  const others = shuffle(rnd, NAMES.filter((n) => n.toLowerCase() !== handle)).slice(0, 8);

  /* A real account with this handle: its own name, line, city, date. */
  function realProfile() {
    if (!(AH.mode === "live" && AH.request)) return Promise.resolve(null);
    return AH.request("/rpc/profile_card", { method: "POST", body: JSON.stringify({ p_handle: handle }) })
      .then((rows) => {
        const r = Array.isArray(rows) ? rows[0] : rows;
        if (!r || !r.handle) return null;
        const d = r.created_at ? new Date(r.created_at) : null;
        return {
          real: true,
          name: r.display_name || cap(handle),
          bio: r.bio || "",
          cityName: r.city_name || null,
          since: d && !isNaN(d) ? MONTHS.concat(["september", "october", "november", "december"])[d.getMonth()] + " " + String(d.getFullYear()).slice(2) : null,
          kept: r.kept_count != null ? r.kept_count : null,
          isFriend: Boolean(r.is_friend),
        };
      })
      .catch(() => null);
  }

  /* The nights: real ones from the listings, in their city, with a
     picture — nine of them, dealt by the seed so the roll holds still. */
  function nightsFor(citySlug) {
    const local = () => Promise.resolve((window.POSTERS || []).slice());
    if (!(AH.mode === "live" && AH.events)) return local();
    return AH.events(null, citySlug, 99)
      .then((list) => {
        const shot = list.filter((e) => e.image);
        return shot.length >= 9 ? shot : AH.events(null, null, 99).then((all) => all.filter((e) => e.image));
      })
      .catch(local);
  }

  const me = () => (AH.myProfile ? AH.myProfile().catch(() => null) : Promise.resolve(null));

  Promise.resolve(AH.ready)
    .then(() => Promise.all([realProfile(), nightsFor(person.city[0]), me()]))
    .then(([real, nights, mine]) => {
      /* A real account: nothing drawn from the pools may be said about
         a real person. No line if they wrote none, no counts the database
         did not hand over — the roll and the friends row then carry no
         number at all. */
      if (real) {
        person.real = true;
        person.name = real.name;
        person.bio = real.bio || "";
        if (real.cityName) person.city = [person.city[0], real.cityName];
        if (real.since) person.since = real.since;
        person.kept = real.kept != null ? real.kept : null;
        person.friends = null;
        person.isFriend = real.isFriend;
      }
      const isMe = Boolean(mine && mine.handle && mine.handle === handle);
      build(person, shuffle(rnd, nights).slice(0, 9), isMe);
    })
    .catch((err) => {
      console.warn("[afterhours] couldn't build the page:", err);
      build(person, (window.POSTERS || []).slice(0, 9), false);
    });

  /* ------------------------------------------------------------ build */

  function build(p, nights, isMe) {
    area.textContent = "";
    document.title = p.name.toLowerCase() + " | afterhours";

    /* ---- the path: how you reach them (D) ---- */
    if (!isMe) area.appendChild(buildPath(p));

    /* ---- who they are (A's head) ---- */
    const head = el("section", "pf-head");
    head.appendChild(face(p.name, "pf-portrait"));
    const id = el("div", "pf-id");
    id.appendChild(el("h1", "pf-name", p.name));
    id.appendChild(el("p", "pf-meta", ["@" + p.handle, p.city[1], "since " + p.since].join(" · ")));
    if (p.bio) id.appendChild(el("p", "pf-bio", p.bio));
    head.appendChild(id);
    area.appendChild(head);

    /* ---- the roll (A) ---- */
    area.appendChild(buildRoll(p, nights));

    /* ---- which friends, and you and them ---- */
    area.appendChild(buildFriends(p, isMe));

    /* ---- the shelf (C): what those nights left them with ---- */
    area.insertAdjacentElement("afterend", buildShelf(p, nights));
  }

  /* You are the filled square, as everywhere on the site. Every hop is a
     face with a name under it; the hairlines between are the
     introductions you would have to ask for. */
  function buildPath(p) {
    const box = el("section", "pf-path");
    box.appendChild(el("p", "cs-label", via.length
      ? "how you reach " + p.name.toLowerCase()
      : "you and " + p.name.toLowerCase()));
    const row = el("div", "pf-hops");

    const you = el("div", "pf-hop you");
    you.appendChild(el("span", "pf-hop-mark"));
    you.appendChild(el("p", "pf-hop-name", "you"));
    row.appendChild(you);

    via.forEach((h, i) => {
      row.appendChild(el("span", "pf-hop-link"));
      const hop = el("a", "pf-hop");
      hop.href = "index.html?handle=" + encodeURIComponent(h) + (i ? "&via=" + encodeURIComponent(via.slice(0, i).join(",")) : "");
      hop.appendChild(face(cap(h), "pf-hop-face"));
      hop.appendChild(el("p", "pf-hop-name", cap(h)));
      hop.appendChild(el("p", "pf-hop-rel", i === 0 ? "your friend" : "friend of " + via[i - 1]));
      row.appendChild(hop);
    });

    row.appendChild(el("span", "pf-hop-link"));
    const them = el("div", "pf-hop them");
    them.appendChild(face(p.name, "pf-hop-face"));
    them.appendChild(el("p", "pf-hop-name", p.name));
    them.appendChild(el("p", "pf-hop-rel",
      via.length === 0 ? (p.isFriend ? "your friend" : "not yet a friend")
      : via.length === 1 ? "friend of " + via[0]
      : "friend of friend of " + via[0]));
    row.appendChild(them);
    box.appendChild(row);

    if (via.length) box.appendChild(el("p", "cs-note",
      cap(via[via.length - 1]) + " can introduce you. Nothing on this page is a message; that still has to happen in a room."));
    return box;
  }

  /* The nights they kept, as a contact sheet: black and white, numbered,
     one frame still blank. Every frame is a real night in their city and
     leads to its page. */
  function buildRoll(p, nights) {
    const box = el("section", "pf-roll");
    box.appendChild(el("p", "cs-label", p.kept != null
      ? "the roll · " + p.kept + " nights kept, " + nights.length + " shot"
      : "the roll · " + nights.length + " shot"));
    const grid = el("ol", "pf-frames");

    nights.forEach((e, i) => {
      const li = el("li", "pf-frame");
      const a = el("a", "pf-shot");
      a.href = e.image ? "../explore/event/index.html?slug=" + encodeURIComponent(e.slug)
                       : "../explore/" + e.slug + "/index.html";
      if (e.image) {
        const img = document.createElement("img");
        img.src = e.image;
        img.alt = "";
        img.loading = "lazy";
        a.appendChild(img);
      } else {
        a.classList.add("bare");
      }
      li.appendChild(a);
      const line = el("p", "pf-frame-line");
      line.appendChild(el("span", "pf-no", String(i + 1).padStart(2, "0")));
      line.appendChild(el("span", "pf-frame-name", e.title || ""));
      li.appendChild(line);
      const m = String(e.meta || "").split("·").map((s) => s.trim()).filter(Boolean);
      li.appendChild(el("p", "pf-frame-meta", [m[0], m[1]].filter(Boolean).join(" · ")));
      grid.appendChild(li);
    });

    /* The empty frame: the next one. Not a gap. */
    const blank = el("li", "pf-frame");
    blank.appendChild(el("span", "pf-shot empty", "not shot yet"));
    const line = el("p", "pf-frame-line");
    line.appendChild(el("span", "pf-no", String(nights.length + 1).padStart(2, "0")));
    line.appendChild(el("span", "pf-frame-name dim", "the next one"));
    blank.appendChild(line);
    blank.appendChild(el("p", "pf-frame-meta", "fills at the door"));
    grid.appendChild(blank);

    box.appendChild(grid);
    return box;
  }

  function buildFriends(p, isMe) {
    const box = el("section", "pf-friends");
    const left = el("div", "pf-friends-list");
    left.appendChild(el("p", "cs-label", p.friends != null ? "which friends · " + p.friends : "which friends"));
    const row = el("div", "pf-faces");
    others.forEach((n) => {
      const a = el("a", "pf-face-link");
      a.href = "index.html?handle=" + encodeURIComponent(n.toLowerCase()) + "&via=" + encodeURIComponent(p.handle);
      a.title = n;
      a.appendChild(face(n, "pf-small-face"));
      row.appendChild(a);
    });
    if (p.friends != null && p.friends > others.length) row.appendChild(el("span", "pf-more", "+" + (p.friends - others.length)));
    left.appendChild(row);
    box.appendChild(left);

    if (!isMe) {
      const right = el("div", "pf-you");
      right.appendChild(el("p", "cs-label", "you and " + p.name.toLowerCase()));
      const chain = el("span", "cs-chain open");
      chain.appendChild(el("span", "cs-chain-you"));
      via.concat([p.name]).forEach((n) => {
        chain.appendChild(el("span", "cs-chain-link"));
        chain.appendChild(face(cap(n), "cs-chain-face"));
      });
      chain.appendChild(el("span", "cs-chain-word",
        via.length === 0 ? (p.isFriend ? "your friend" : "not yet a friend")
        : via.length === 1 ? "friend of " + via[0]
        : "friend of friend of " + via[0]));
      right.appendChild(chain);
      box.appendChild(right);
    }
    return box;
  }

  /* The shelf: the cards those nights left them with. The same black
     band the event page ends on, and the same plate — here with the
     nights of the roll on it, in metals dealt by the seed. */
  function buildShelf(p, nights) {
    const band = el("section", "cs-earn pf-shelf");
    const count = Math.min(nights.length, 3 + Math.floor(rnd() * 3));
    band.appendChild(el("p", "cs-earn-label",
      "the cards " + p.name.toLowerCase() + " left with · " + count));
    if (!window.CARDS) return band;

    const shelf = el("div", "pf-cards");
    nights.slice(0, count).forEach((e, i) => {
      const m = String(e.meta || "").split("·").map((s) => s.trim()).filter(Boolean);
      const night = {
        t: shortTitle(e.title), ty: (e.kind || "").toUpperCase(),
        v: (m[0] || p.city[1]).toUpperCase(), d: m[1] || "",
        metal: pick(rnd, METALS), motif: pick(rnd, MOTIFS),
        in: "2" + i + ":1" + i, out: "0" + i + ":4" + i, dur: (3 + i % 3) + "H " + (10 + i * 7) + "M",
        crew: others.slice(i, i + 3).map((n) => n[0]), more: 2 + Math.floor(rnd() * 7),
        aud: "0:" + (20 + Math.floor(rnd() * 39)), msg: 6 + Math.floor(rnd() * 20),
        who: (others[i] || p.name).toUpperCase(),
        froze: (m[1] || "").slice(0, 5), no: "0" + (100 + Math.floor(rnd() * 800)),
        at1: "2" + i + ":4" + i, at2: "0" + i + ":1" + i,
        q1: [pick(rnd, OVERHEARD), (others[i + 1] || "L")[0], "2" + i + ":5" + i],
        q2: [pick(rnd, OVERHEARD), (others[i + 2] || "M")[0], "0" + i + ":2" + i],
      };
      const fig = el("figure", "cs-earn-card");
      const faceBox = el("div", "cs-earn-face");
      faceBox.innerHTML = CARDS.front(night, "s" + i);
      fig.appendChild(faceBox);
      fig.appendChild(el("figcaption", null, night.metal + " · " + (night.d || "").toLowerCase()));
      shelf.appendChild(fig);
    });
    band.appendChild(shelf);

    const say = el("div", "cs-earn-say");
    say.appendChild(el("p", "cs-earn-line", "One card per night, written by the room."));
    say.appendChild(el("p", "cs-earn-sub",
      "The front is who stood there. The back is what the night sounded like and what got said in it. " +
      "None of these are real yet — a collection starts with the first night actually gone to."));
    band.appendChild(say);
    return band;
  }

  /* "Artist: Tour Name" is how the listings are written; the plate is 400
     units wide. */
  function shortTitle(t) {
    const s = String(t || "").split(/[:–—|(]/)[0].trim();
    if (s.length <= 26) return s;
    const cut = s.slice(0, 26), sp = cut.lastIndexOf(" ");
    return (sp > 12 ? cut.slice(0, sp) : cut).trim();
  }
})();
