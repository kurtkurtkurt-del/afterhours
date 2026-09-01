/* afterhours — the data layer.
   This runs first on every page: it fetches the events either from
   Supabase or from events-data.js, puts them on window.POSTERS, and only
   then loads the page's own scripts. That is why app.js and explore.js
   never had to change when the backend arrived.

   <script src="data.js" data-fallback="events-data.js" data-after="app.js"></script>

   With the backend off (config.js empty) the site behaves exactly as it
   did before there was one. That is deliberate: nothing may break while
   the connection is still being set up. */

(function () {
  const CONFIG = window.AH_CONFIG || {};

  /* A convenience for development: point the site at the local mock
     server. ONLY on localhost — the published site's data must not be
     switchable from the address bar. */
  const onLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (onLocalhost) {
    const override = new URLSearchParams(location.search).get("backend");
    if (override) { CONFIG.url = override; CONFIG.anonKey = CONFIG.anonKey || "local"; }
  }

  const enabled = Boolean(CONFIG.url && CONFIG.anonKey);

  const thisScript = document.currentScript;
  const fallbackPath = thisScript.dataset.fallback;
  const thenLoad = (thisScript.dataset.after || "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  /* data-sample="N" deals the page a RANDOM worldwide hand instead of
     the deck's soonest-first order. The landing uses it: its wall wants
     twenty nights from anywhere, not whatever happens to start next in
     one timezone. A larger pool is fetched and shuffled here, because
     the database orders, it does not gamble. */
  const sample = parseInt(thisScript.dataset.sample || "", 10) || 0;
  const SAMPLE_POOL = 300;

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  const AH = (window.AH = window.AH || {});
  AH.config = CONFIG;
  AH.mode = "local";

  /* Today the poster file is worked out from the position in the array
     (index + 1). Should the database ever return a short list, we write
     each record's own number onto it so the posters cannot shift.
     A synced night must NOT be handed a number — with or without a
     photograph, it would be wearing someone else's art. */
  function numberEvents(list) {
    list.forEach((e, i) => {
      if (!e.poster && !e.image && e.source !== "ticketmaster") e.poster = i + 1;
    });
    return list;
  }
  AH.numberEvents = numberEvents;

  /* Load scripts IN ORDER. Dynamically added scripts are async by
     default; without async=false the order breaks and app.js runs with
     no data. */
  function loadScripts(paths) {
    return paths.reduce(
      (chain, path) =>
        chain.then(
          () =>
            new Promise((done, fail) => {
              const s = document.createElement("script");
              s.src = path;
              s.async = false;
              s.onload = done;
              s.onerror = () => fail(new Error("could not load: " + path));
              document.head.appendChild(s);
            })
        ),
      Promise.resolve()
    );
  }

  function fallBack(reason) {
    AH.mode = "local";
    if (reason) console.warn("[afterhours] no database, using local data:", reason);
    return loadScripts(fallbackPath ? [fallbackPath] : []).then(() => {
      /* events-data.js declares POSTERS with `const`: a global lexical
         binding, not a property of window. window.POSTERS is undefined
         there, while a bare POSTERS works. */
      try {
        numberEvents(POSTERS);
        /* Bind it onto window as well so other modules (swipes.js) can
           see it; `const` alone does not write to window. */
        window.POSTERS = POSTERS;
      } catch (_) {}
    });
  }

  /* --- Supabase (PostgREST) --------------------------------------- */

  AH.request = function (path, options = {}) {
    if (!enabled) return Promise.reject(new Error("backend is off"));
    /* A token expires after about an hour, and the session only refreshed
       itself at page load — a deck left open past that had every write
       fail. Ask the session to renew first; it answers without a fetch
       while the token is still good, and the headers are built AFTER so
       they carry the fresh token. */
    const renewed = AH.refreshSession
      ? Promise.resolve(AH.refreshSession()).catch(() => null)
      : Promise.resolve(null);
    return renewed.then(() => {
      const headers = {
        apikey: CONFIG.anonKey,
        Authorization: "Bearer " + (AH.token || CONFIG.anonKey),
        "Content-Type": "application/json",
      };
      return fetch(CONFIG.url.replace(/\/$/, "") + "/rest/v1" + path, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });
    }).then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(res.status + " " + text.slice(0, 200));
      /* Prefer: return=minimal answers a 201 with an EMPTY body; trying to
         parse that as JSON was making successful requests look failed. */
      if (!text) return null;
      try { return JSON.parse(text); } catch (_) { return null; }
    });
  };

  /* Whatever the database says, a person should read a sentence.
     `404 {"code":"PGRST202","details":"Searched for the function..."}`
     tells them nothing; they need one short line about what they can do.
     The detail goes to the console. */
  AH.errorText = function (error, fallbackLine) {
    const raw = String((error && error.message) || error || "");
    console.warn("afterhours:", raw);

    if (/PGRST202|Searched for the function/i.test(raw))
      return "this part isn't switched on yet. it should be soon.";
    if (/^40[13]\b|JWT|token is expired/i.test(raw))
      return "your session ran out. sign in again.";
    if (/duplicate key|already exists|unique constraint/i.test(raw))
      return "that one is taken already.";
    if (/violates .*constraint|invalid input/i.test(raw))
      return "that doesn't fit — check the field and try again.";
    if (/^429\b|rate limit/i.test(raw))
      return "too fast. give it a minute.";
    if (/^5\d\d\b/.test(raw))
      return "the other end is having a moment. try again shortly.";
    if (/failed to fetch|networkerror|load failed|backend is off/i.test(raw))
      return "no connection to the backend right now.";
    return fallbackLine || "something went wrong. it has been noted.";
  };

  /* Turn a database row into the shape the screen expects. The field
     names have to match events-data.js so nothing on screen changes. */
  function rowToEvent(r) {
    return {
      slug: r.slug,
      kind: r.type_name,
      title: r.title,
      meta: r.meta,
      body: r.body,
      poster: r.poster_no,
      /* The full address of an uploaded poster, if there is one; empty
         otherwise, and then posters/NN.svg is used. */
      posterPath: r.poster_path
        ? (CONFIG.url || "").replace(/\/$/, "") +
          "/storage/v1/object/public/posters/" + r.poster_path
        : null,
      /* A synced night (Ticketmaster) has a photograph and a real ticket
         page instead of a drawn poster and a folder of its own. */
      image: r.image_url || null,
      ticketUrl: r.ticket_url || null,
      source: r.source || "seed",
      // not used on screen yet, but wanted later
      id: r.id,
      startsAt: r.starts_at,
      venue: r.venue_name,
      city: r.city_slug,
    };
  }
  AH.rowToEvent = rowToEvent;

  /* A null city means the whole world — the deck function reads it that
     way — and null is also the default: the deck opens on everywhere,
     the filter narrows it down. A deck is 99 cards: the database would
     default to 60, so the size is asked for by name. */
  AH.events = function (kind, city) {
    const ask = () =>
      AH.request("/rpc/deck", {
        method: "POST",
        body: JSON.stringify({
          p_city: city || null,
          p_type: kind || null,
          p_limit: 99,
        }),
      }).then((rows) => rows.map(rowToEvent));

    return ask().catch((err) => {
      /* An old or invalid token makes the server answer 401 and the site
         would sit empty. Drop the token and try again anonymously:
         browsing has to work even when the sign-in does not. */
      if (!/^401/.test(err.message) || !AH.token) throw err;
      console.warn("[afterhours] session no longer valid, continuing anonymously");
      if (AH.dropSession) AH.dropSession();
      return ask();
    });
  };

  /* --- start ------------------------------------------------------- */

  /* Some pages (login) only want the connection, not the event list. If
     no fallback and no follow-up script were given, we do not fetch. */
  const connectionOnly = !fallbackPath && !thenLoad.length;
  if (connectionOnly) {
    AH.mode = enabled ? "live" : "local";
    AH.ready = Promise.resolve(AH.mode);
    return;
  }

  /* Settle the session first: if the deck is going to drop "the ones I
     already swiped", the request has to carry a token. With no
     session.js there is nothing to wait for. */
  const session = Promise.resolve(AH.sessionReady || null).catch(() => null);

  /* The sampled hand: a wide worldwide pull, shuffled, cut to size.
     Only nights with a photograph make the wall — a night without one
     has nothing to hang — and a recurring show (the same title on ten
     dates) hangs once, not three times.

     When featured.js is on the page, its hand-picked twenty come FIRST,
     in their written order; the random pool only fills what is left
     (and the gaps the calendar tears — a featured night whose date has
     passed is gone from the database, and the pool covers for it). */
  const askFeatured = () => {
    const wanted = (window.FEATURED || []).filter((f) => f.slug);
    if (!wanted.length) return Promise.resolve([]);
    const list = wanted.map((f) => '"' + f.slug + '"').join(",");
    return AH.request("/events_public?slug=in.(" + encodeURIComponent(list) + ")")
      .then((rows) => {
        const bySlug = new Map(rows.map((r) => [r.slug, r]));
        return wanted
          .filter((f) => bySlug.has(f.slug))
          .map((f) => {
            const e = rowToEvent(bySlug.get(f.slug));
            if (f.pos) e.pos = f.pos;
            /* The wall speaks its own line for a hand-picked night */
            if (f.body) e.body = f.body;
            return e;
          });
      })
      .catch(() => []);
  };

  const askSample = () =>
    askFeatured().then((featured) => {
      const taken = new Set(featured.map((e) => e.slug));
      return AH.request("/rpc/deck", {
        method: "POST",
        body: JSON.stringify({ p_city: null, p_type: null, p_limit: SAMPLE_POOL }),
      }).then((rows) => {
        const byTitle = new Map();
        shuffle(rows.filter((r) => r.image_url && !taken.has(r.slug))).forEach((r) => {
          if (!byTitle.has(r.title)) byTitle.set(r.title, r);
        });
        const fill = [...byTitle.values()]
          .slice(0, Math.max(0, sample - featured.length))
          .map(rowToEvent);
        return featured.concat(fill);
      });
    });

  const ready = !enabled
    ? fallBack(null)
    : session
        /* Carry the local swipes up to the account first, so the deck
           comes back with those cards already dropped. */
        .then(() => (AH.signedIn && AH.signedIn() && AH.mergeSwipes
          ? AH.mergeSwipes().catch(() => 0)
          : null))
        .then(() => (sample ? askSample() : AH.events()))
        .then((list) => {
          if (!list.length) throw new Error("the database came back empty");
          window.POSTERS = numberEvents(list);
          AH.mode = "live";
        })
        .catch(fallBack);

  AH.ready = ready.then(() => loadScripts(thenLoad)).then(() => AH.mode);
})();
