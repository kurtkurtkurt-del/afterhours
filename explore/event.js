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
  const AH = (window.AH = window.AH || {});

  /* --- the words ---
     The kind, the weekday and a person's answer stay the english codes
     the data and the code compare; these say them in the visitor's
     language. A kind the dictionary does not know is shown as it came. */
  function kindName(kind) {
    const key = "type." + String(kind || "").toLowerCase().replace(/\s+/g, "-");
    return AH.has(key) ? AH.t(key) : String(kind || "").toLowerCase();
  }

  const dayName = (code) => (AH.has("day." + code) ? AH.t("day." + code) : code);

  const STATUS_KEY = {
    "i'm in": "who.in", "maybe": "who.maybe",
    "not tonight": "who.not", "kept it": "night.status.kept",
  };
  const statusName = (code) => (STATUS_KEY[code] ? AH.t(STATUS_KEY[code]) : code);



  /* --- the seed: the same slug always builds the same night --- */
  function seeded(text) {
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

  const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  /* "11.09.26" → "11.09": the year is not news on a page about tonight */
  function shortDate(date) { return String(date || "").replace(/^(\d{1,2}\.\d{1,2})\.\d{2}$/, "$1"); }

  function weekdayFor(date, rnd) {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(date || "");
    if (m) {
      const d = new Date(2000 + +m[3], +m[2] - 1, +m[1]);
      if (!isNaN(d)) return WEEKDAYS[d.getDay()];
    }
    return pick(rnd, ["fri", "sat", "thu"]);
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
    const rnd = seeded(e.slug || "afterhours");
    const kind = e.kind || "Konzert";
    const m = parseMeta(e.meta);
    const day = dayName(weekdayFor(m.date, rnd));
    const posterPath = e.posterPath ||
      "../../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";

    /* which edition of the series this is. It used to add "your 3rd" —
       we have never known that, and the foot of the page now offers you
       a card you have not earned, so the two were calling each other a
       liar in the same column. */
    const edition = 2 + Math.floor(rnd() * 11);

    area.textContent = "";
    const stale = document.querySelector(".cs-earn");
    if (stale) stale.remove();

    /* ---- the left rail ---- */
    const ray = el("aside", "cs-rail");
    let poster;
    if (e.image) {
      /* A synced night: a photograph in the same 2:3 frame. */
      poster = document.createElement("img");
      poster.className = "cs-poster";
      poster.src = e.image;
      poster.alt = "";
    } else {
      poster = document.createElement("object");
      poster.className = "cs-poster";
      poster.type = "image/svg+xml";
      poster.data = posterPath;
    }
    /* The frame exists so the preview chip can sit ON the poster —
       nothing on the page moves for it. */
    const frame = el("div", "cs-poster-frame");
    frame.appendChild(poster);
    ray.appendChild(frame);

    /* A hand-picked night carries its most famous song (featured.js,
       when the page loads it); the chip plays the Apple Music preview. */
    const handPicked = (window.FEATURED || []).find((f) => f.slug === e.slug);
    if (handPicked && handPicked.song && handPicked.artist) previewChip(frame, handPicked);

    /* where · when · kind — the same three rows the app's night page has */
    const facts = el("dl", "cs-facts");
    if (m.venue) facts.appendChild(factRow(AH.t("night.fact.where"), m.venue.toLowerCase()));
    facts.appendChild(factRow(AH.t("night.fact.when"), [day + (m.date ? " " + shortDate(m.date) : ""), m.time].filter(Boolean).join(" · ")));
    facts.appendChild(factRow(AH.t("night.fact.kind"), kindName(kind) + " · " + AH.t(e.source === "ticketmaster" ? "word.ticket" : "word.szene")));
    (V.FACTS[kind] || []).forEach(([a, b]) => facts.appendChild(factRow(a, b)));
    ray.appendChild(facts);
    area.appendChild(ray);

    /* ---- the middle column ---- */
    const middle = el("div", "cs-field");

    const crumb = el("nav", "crumb");
    const back = el("a", null, AH.t("nav.explore"));
    back.href = "../index.html";
    crumb.appendChild(back);
    crumb.appendChild(el("span", null, "/"));
    crumb.appendChild(el("span", null, (e.title || "").toLowerCase()));
    middle.appendChild(crumb);

    middle.appendChild(el("p", "cs-edition",
      AH.t("night.edition", { n: String(edition).padStart(2, "0") })));
    middle.appendChild(el("h1", "cs-title", e.title || ""));
    middle.appendChild(el("p", "cs-meta",
      [kindName(kind), m.date ? day + " " + shortDate(m.date) : day].join(" · ")));

    /* The first paragraph is the event's own line, the rest come from the
       pool for its kind. A pooled paragraph that says the same thing as the
       event's own is skipped: it was printing "bring something" twice. */
    const pool = shuffle(rnd, V.BODY[kind] || []).filter((p) => !overlaps(p, e.body));
    [AH.bodyText(e.body), pool[0], pool[1]].filter(Boolean).forEach((p) =>
      middle.appendChild(el("p", "cs-text", p)));

    area.appendChild(middle);

    /* ---- the right column ---- */
    const right = el("aside", "cs-right");
    /* The site only shows the night and sells the way to it: the ticket and
       the app. Who is going, beforehours and where the night goes on live
       in the app. */
    /* One word, the same as in the app; the line under it is the kind's own note */
    const [, sub] = V.TICKET[kind] || V.TICKET["Konzert"];
    const ticket = el("a", "cs-ticket", AH.t("word.ticket"));
    /* A synced night has a real ticket page; the invented ones do not. */
    if (e.ticketUrl) {
      ticket.href = e.ticketUrl;
      ticket.target = "_blank";
      ticket.rel = "noopener";
    } else {
      ticket.href = "#";
    }
    right.appendChild(ticket);
    right.appendChild(el("p", "cs-ticket-sub", sub));

    /* The same night in the app: check in, keep, the room. The scheme
       link opens the app when it is installed; the line under it is
       the way to get it when it is not. */
    const APP = (window.AH_CONFIG && AH_CONFIG.app) || {};
    if (e.slug && APP.scheme) {
      const inApp = el("a", "cs-ticket cs-app", AH.t("night.app.open"));
      inApp.href = APP.scheme + "night/" + encodeURIComponent(e.slug);
      right.appendChild(inApp);
      const get = el("p", "cs-ticket-sub", AH.t("night.app.sub"));
      right.appendChild(get);
      /* the two store boxes; the app store one waits, dimmed, for an address */
      const stores = el("div", "stores stores-small");
      const play = el("a", "store store-play");
      play.href = APP.android || "../../help/index.html";
      play.target = "_blank";
      play.rel = "noopener";
      const badge = (small, big) =>
        "<span><small>" + AH.t(small) + "</small><b>" + AH.t(big) + "</b></span>";
      play.innerHTML = badge("store.play.small", "store.play.big");
      stores.appendChild(play);
      const ios = el(APP.ios ? "a" : "span", "store store-ios" + (APP.ios ? "" : " soon"));
      if (APP.ios) { ios.href = APP.ios; ios.target = "_blank"; ios.rel = "noopener"; }
      else { ios.setAttribute("aria-disabled", "true"); ios.title = AH.t("store.soon"); }
      ios.innerHTML = badge(APP.ios ? "store.ios.small.live" : "store.ios.small", "store.ios.big");
      stores.appendChild(ios);
      right.appendChild(stores);
    }

    area.appendChild(right);

    /* ---- what the night leaves you ----
       Deliberately NOT a fourth item in the grid. A sticky column is
       clamped to the grid CONTAINER, not to its own row, so as a grid
       child the band had the poster and the column of faces sliding down
       over the top of it — three sets of pictures on one screen with the
       black underneath them. Outside the grid the columns can only reach
       the end of the contact sheet, and the band is what comes after. */
    const band = buildCard(e, m, kind, handPicked, rnd);
    area.insertAdjacentElement("afterend", band);
  }

  /* If two texts share an uncommon word they are probably saying the
     same thing. Short and common words do not count. */
  const COMMON = /^(the|and|that|with|this|there|their|which|about|after|before|until|people|night|nights|every|other|first|still|where|would)$/;

  function overlaps(a, b) {
    if (!a || !b) return false;
    const words = (y) => new Set(String(y).toLowerCase().match(/[a-zäöüß]{6,}/g) || []);
    const A = words(a), B = words(b);
    for (const k of A) if (!COMMON.test(k) && B.has(k)) return true;
    return false;
  }








  const face = (name) => {
    const box = el("span", "cs-face");
    if (window.AVATAR) box.innerHTML = AVATAR(name);
    return box;
  };





  /* Only floors make an after: a concert or a meetup starting late is not
     somewhere you go on to. */
  const AFTER_KINDS = ["Rave", "Club Night", "Hausparty"];








  /* The preview chip on the poster: the act's most famous song, served
     from the Apple Music preview Apple hands out for exactly this
     purpose — the small arrow beside it leads to the store, as they ask.

     The search service rate-limits and stumbles now and then, so a
     failed lookup must NOT take the chip with it (it used to, and the
     chip "sometimes disappeared"): a stumble keeps the chip and the
     press simply asks again. Only a real "no such song" answer removes
     it. A found preview is remembered in the browser for a week, so a
     return visit plays without asking Apple anything. */
  function previewChip(frame, f) {
    const chip = el("div", "cs-preview");
    const button = el("button", "cs-preview-button");
    button.type = "button";
    button.appendChild(el("span", "cs-preview-icon"));
    const label = el("span", null, AH.t("night.preview.label"));
    button.appendChild(label);
    chip.appendChild(button);

    const line = el("div", "cs-preview-line");
    const fill = document.createElement("span");
    line.appendChild(fill);

    const CACHE = "afterhours.preview." + f.slug;
    const WEEK = 7 * 24 * 60 * 60 * 1000;

    let audio = null;
    let asking = null;

    function ready(url, storeUrl) {
      audio = new Audio(url);
      audio.addEventListener("timeupdate", () => {
        if (audio.duration) fill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
      });
      audio.addEventListener("play", () => {
        chip.classList.add("playing");
        label.textContent = f.song.toLowerCase();
      });
      audio.addEventListener("pause", () => chip.classList.remove("playing"));
      audio.addEventListener("ended", () => {
        fill.style.width = "0";
        label.textContent = AH.t("night.preview.label");
      });
      if (storeUrl && !chip.querySelector(".cs-preview-store")) {
        const store = el("a", "cs-preview-store", "↗");
        store.href = storeUrl;
        store.target = "_blank";
        store.rel = "noopener";
        store.title = AH.t("night.preview.store");
        chip.appendChild(store);
      }
      return audio;
    }

    function lookUp() {
      if (asking) return asking;
      asking = fetch("https://itunes.apple.com/search?media=music&entity=song&limit=1&term=" +
          encodeURIComponent(f.artist + " " + f.song))
        .then((r) => { if (!r.ok) throw new Error("answered " + r.status); return r.json(); })
        .then((j) => {
          const hit = j.results && j.results[0];
          if (!hit || !hit.previewUrl) {
            /* Apple truly has nothing: only now does the chip leave */
            chip.remove();
            line.remove();
            throw new Error("no such song");
          }
          try {
            localStorage.setItem(CACHE, JSON.stringify(
              { at: Date.now(), url: hit.previewUrl, store: hit.trackViewUrl || null }));
          } catch (_) {}
          return ready(hit.previewUrl, hit.trackViewUrl);
        })
        .catch((err) => {
          /* A stumble (rate limit, network): forget the attempt so the
             next press can try again. The chip stays. */
          asking = null;
          throw err;
        });
      return asking;
    }

    /* The address baked into featured.js comes first — no network, no
       rate limit, the chip is ready the moment the page is. The live
       search only runs for an entry without one, or as the fallback
       when a baked preview has died (the audio error below). */
    if (f.preview) {
      ready(f.preview, f.store);
      audio.addEventListener("error", () => {
        audio = null;
        lookUp().catch(() => {});
      }, { once: true });
    } else {
      let remembered = null;
      try {
        const kept = JSON.parse(localStorage.getItem(CACHE) || "null");
        if (kept && Date.now() - kept.at < WEEK && kept.url) remembered = kept;
      } catch (_) {}
      if (remembered) ready(remembered.url, remembered.store);
      else lookUp().catch(() => {});    /* warm it up; a miss can wait for the press */
    }

    button.addEventListener("click", () => {
      if (audio) {
        if (audio.paused) audio.play();
        else audio.pause();
        return;
      }
      label.textContent = AH.t("night.preview.finding");
      lookUp()
        .then((a) => { label.textContent = f.song.toLowerCase(); a.play(); })
        .catch(() => {
          if (!chip.isConnected) return;   /* the no-such-song road */
          label.textContent = AH.t("night.preview.label");
        });
    });

    frame.appendChild(chip);
    frame.appendChild(line);
  }

  const PRICE = {
    "Konzert": [49, 89], "Festival": [59, 129], "Rave": [15, 28],
    "Club Night": [10, 18], "Hausparty": null, "Meetup": null,
  };

  function price(kind, rnd) {
    const a = PRICE[kind];
    if (!a) return AH.t("night.free");
    return "€" + (a[0] + Math.floor(rnd() * (a[1] - a[0])));
  }

  const METAL_LIST = ["steel", "chrome", "gunmetal", "titanium", "nickel", "anthracite", "brass", "copper"];
  const MOTIF_LIST = ["rays", "oval", "diagonal", "orbit", "grid", "moon", "moire", "bands", "iso", "descend"];

  /* --- the card you leave with ---
     The only black on a white page and the last thing on it: paper, then
     the band, then the metal. Both faces, because the front is only who
     stood there — the back is where the night is actually written down.

     Nothing on it has happened yet. The slots are drawn and left empty
     rather than hidden or blurred: a blur says pay me, an empty slot says
     go. */
  function buildCard(e, m, kind, handPicked, rnd) {
    const band = el("section", "cs-earn");
    if (!window.CARDS) return band;

    band.appendChild(el("p", "cs-earn-label",
      AH.t("night.card.label")));

    const night = {
      t: cardTitle(e, handPicked),
      ty: (kind || "").toUpperCase(),
      v: (m.venue || e.city || "").toUpperCase(),
      d: m.date || "",
      /* A hand-picked night carries its own art direction — the metal and
         the motif are part of what makes it that night and not another.
         Everything else is dealt one from the slug, so a night always
         turns up wearing the same card. */
      metal: (handPicked && handPicked.metal) || pick(rnd, METAL_LIST),
      motif: (handPicked && handPicked.motif) || pick(rnd, MOTIF_LIST),
      blank: true,
      crew: [], more: 0, aud: "", msg: "", in: "", out: "", dur: "",
      who: "", at1: "", at2: "", froze: "", no: "",
      q1: ["", "", ""], q2: ["", "", ""],
    };

    const pair = el("div", "cs-earn-pair");
    [[AH.t("night.card.front"), CARDS.front(night, "e")], [AH.t("night.card.back"), CARDS.back(night, "e")]]
      .forEach(([side, svg]) => {
        const fig = el("figure", "cs-earn-card");
        const face = el("div", "cs-earn-face");
        face.innerHTML = svg;
        fig.appendChild(face);
        fig.appendChild(el("figcaption", null, side));
        pair.appendChild(fig);
      });
    band.appendChild(pair);

    const say = el("div", "cs-earn-say");
    say.appendChild(el("p", "cs-earn-line",
      AH.t("night.card.line")));
    say.appendChild(el("p", "cs-earn-sub",
      (handPicked && handPicked.card) ||
      AH.t("night.card.sub")));
    band.appendChild(say);

    return band;
  }

  /* The plate is 400 units wide and a listing title is not. A hand-picked
     night knows whose night it is; everything else is cut at the colon —
     "Artist: Tour Name" is how the listings are written — and, failing
     that, at the last word that still fits. */
  function cardTitle(e, handPicked) {
    if (handPicked && handPicked.artist) return handPicked.artist;
    const t = String(e.title || "").split(/[:\u2013\u2014|(]/)[0].trim();
    if (t.length <= 26) return t;
    const cut = t.slice(0, 26);
    const space = cut.lastIndexOf(" ");
    return (space > 12 ? cut.slice(0, space) : cut).trim();
  }

  /* --- which event? the folder name in the address bar --- */
  function slugFromPath() {
    const p = location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
    return p[p.length - 1] || "";
  }

  /* A night that is no longer in the data — the date went by and the
     cron job dropped it, or the address never led anywhere. The shell
     page still exists (and the globe, the sitemap and old links still
     point here), so an empty <main> is what a visitor got: header,
     footer, and nothing between. Say what happened instead. */
  function buildGone() {
    area.textContent = "";
    const middle = el("div", "cs-field");
    middle.style.gridColumn = "1 / -1";

    const crumb = el("nav", "crumb");
    const back = el("a", null, AH.t("nav.explore"));
    back.href = "../index.html";
    crumb.appendChild(back);
    crumb.appendChild(el("span", null, "/"));
    crumb.appendChild(el("span", null, AH.t("night.gone.crumb")));
    middle.appendChild(crumb);

    middle.appendChild(el("h1", "cs-title", AH.t("night.gone.title")));
    middle.appendChild(el("p", "cs-text",
      AH.t("night.gone.text")));

    const out = el("a", "cs-ticket", AH.t("night.gone.back"));
    out.href = "../index.html";
    middle.appendChild(out);
    area.appendChild(middle);
  }

  /* data.js loads this through data-after, so POSTERS is ready by now.
     POSTERS is the DECK, and the deck is one city's — a Berlin night is
     not in it while the site sits on München. Before declaring a page
     gone, ask the database for that one slug; only local mode (which
     truly holds nothing but the 36) goes straight to the gone page.

     A drawn night reads its slug off its own folder; a synced night has
     no folder and arrives at the shared shell as event/?slug=... — the
     address bar wins when it names one. */
  const slug = new URLSearchParams(location.search).get("slug") || slugFromPath();
  const e = (window.POSTERS || []).filter((x) => x.slug === slug)[0];
  if (e) {
    build(e);
  } else if (window.AH && AH.mode === "live" && AH.request) {
    AH.request("/events_public?slug=eq." + encodeURIComponent(slug) + "&limit=1")
      .then((rows) => {
        if (rows && rows[0] && AH.rowToEvent) build(AH.rowToEvent(rows[0]));
        else buildGone();
      })
      .catch(buildGone);
  } else {
    buildGone();
  }
})();
