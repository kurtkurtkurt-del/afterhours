/* afterhours — explore: the wall.
   The deck is gone from the web (it lives in the app). What is left is
   the deck's filter line and, under it, every night that fits: a grid
   of posters, soonest first, the words only on hover.

   filters.js draws the four drop-downs and calls AH.redeal() when one
   changes; this file pulls the nights and hangs them. Live, city and
   kind are filtered in the database; the date window is cut out
   client-side, the same way the deck did it (the stored time is
   venue-local, so the date PART is compared, never shifted). */

(function () {
  const AH = (window.AH = window.AH || {});
  const CONFIG = window.AH_CONFIG || {};
  const wall = document.getElementById("ex-wall");
  const tally = document.getElementById("ex-tally");
  const empty = document.getElementById("ex-empty");
  if (!wall) return;

  /* The wall opens on the home city and any night: the whole world for
     tonight is four hundred posters of somewhere else. filters.js reads
     this instead of setting its own default. */
  AH.filter = { country: null, city: CONFIG.city || null, kind: null, date: "any night" };

  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const pad2 = (n) => String(n).padStart(2, "0");

  /* --- the date window, on the visitor's own calendar --- */

  function dayString(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function dateWindow(choice) {
    if (!choice || choice === "any night") return null;
    const now = new Date();
    const day = (n) => dayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
    if (choice === "tonight") return [day(0), day(0)];
    if (choice === "tomorrow") return [day(1), day(1)];
    if (choice === "this weekend") {
      const dow = now.getDay();                 /* sunday = 0 */
      const friday = dow === 0 ? -2 : 5 - dow;
      return [day(Math.max(friday, 0)), day(dow === 0 ? 0 : 7 - dow)];
    }
    if (choice === "this week") {
      const dow = now.getDay();
      return [day(0), day(dow === 0 ? 0 : 7 - dow)];
    }
    if (choice === "this month") {
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [day(0), dayString(last)];
    }
    return null;
  }

  function applyDate(list) {
    const w = dateWindow(AH.filter.date);
    if (!w) return list;
    return list.filter((e) => {
      const d = (e.startsAt || "").slice(0, 10);
      return d >= w[0] && d <= w[1];
    });
  }

  /* Local mode has no database to ask: the held list is sifted by kind */
  function applyKind(list) {
    if (!AH.filter.kind) return list;
    const name = AH.filter.kind.replace(/-/g, " ");
    return list.filter((e) => (e.kind || "").toLowerCase() === name);
  }

  /* --- the words on the band --- */

  /* The stored time is venue-local: read the digits, do not convert */
  function when(e) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(e.startsAt || "");
    if (!m) return e.meta || "";
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return DAYS[d.getDay()] + " " + m[3] + "." + m[2] + " · " + m[4] + ":" + m[5];
  }

  function place(e) {
    const venue = e.venue || "";
    const city = (e.city || "").replace(/-/g, " ");
    const same = (t) => t.toLowerCase().replace(/ü/g, "u").replace(/ö/g, "o");
    if (!venue) return city;
    if (!city || same(venue) === same(city)) return venue;
    return venue + " · " + city;
  }

  function hrefFor(e) {
    return e.source === "ticketmaster"
      ? "event/index.html?slug=" + encodeURIComponent(e.slug)
      : e.slug + "/index.html";
  }

  /* --- one poster --- */

  function tile(e) {
    const a = document.createElement("a");
    a.className = "ex-tile";
    a.href = hrefFor(e);

    /* A synced night has a photograph; a drawn one comes through <object>
       (an SVG in <img> cannot load its webfont). */
    let art;
    if (e.image) {
      art = document.createElement("img");
      art.src = e.image;
      art.alt = "";
      art.loading = "lazy";
      if (e.pos) art.style.objectPosition = e.pos;
    } else {
      art = document.createElement("object");
      art.type = "image/svg+xml";
      art.data = e.posterPath || ("../posters/" + pad2(e.poster || 1) + ".svg");
    }
    a.appendChild(art);

    const cap = document.createElement("div");
    cap.className = "ex-tile-cap";
    const name = document.createElement("p");
    name.className = "ex-tile-name";
    name.textContent = e.title;
    const line = document.createElement("p");
    line.className = "ex-tile-line";
    line.textContent = [when(e), place(e)].filter(Boolean).join(" · ");
    cap.appendChild(name);
    cap.appendChild(line);
    a.appendChild(cap);

    a.setAttribute("aria-label", e.title + ", " + line.textContent);
    return a;
  }

  /* --- hanging the wall --- */

  function hang(list) {
    wall.textContent = "";
    list.forEach((e) => wall.appendChild(tile(e)));

    const n = list.length;
    const city = AH.filter.city
      ? AH.filter.city.replace(/-/g, " ")
      : "everywhere";
    if (tally) tally.textContent = n ? n + (n === 1 ? " night · " : " nights · ") + city : "";

    if (empty) {
      empty.hidden = n > 0;
      empty.textContent = "nothing " + (AH.filter.date === "any night" ? "here" : AH.filter.date) + ". try another night, or another city.";
    }
  }

  /* How much to pull: the wall shows what fits, but a date window is
     cut out of a wider, date-ordered pull. */
  function pull() {
    const windowed = AH.filter.date && AH.filter.date !== "any night";
    if (AH.mode === "live" && AH.events) {
      return AH.events(AH.filter.kind, AH.filter.city, windowed ? 500 : 300)
        .then(applyDate)
        .catch(() => applyDate(applyKind(window.POSTERS || [])));
    }
    return Promise.resolve(applyDate(applyKind(window.POSTERS || [])));
  }

  let turn = 0;
  function redeal() {
    const mine = ++turn;
    return pull().then((list) => {
      /* A slower answer must not overwrite a newer choice */
      if (mine === turn) hang(list);
    });
  }

  /* filters.js calls this with a mode name; the wall has one mode */
  AH.redeal = () => redeal();

  redeal();
})();
