/* afterhours — swipes and the cards you keep.
   The site can be used without an account, so there are two places a
   swipe can live:
     · signed in  → the database (the same on every device)
     · signed out → localStorage (at least it survives a reload)
   The moment someone signs in, what is in the browser is pushed up and
   cleared.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const KEY = "afterhours.swipes";
  const OLD_KEY = "afterhours.atislar";      /* before the code spoke English */

  const readLocal = () => {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || "[]";
      /* The old rows carried Turkish field names; read them either way. */
      return JSON.parse(raw).map((s) => ({
        slug: s.slug,
        direction: s.direction || s.yon,
        at: s.at || s.an,
      }));
    } catch (_) { return []; }
  };
  const writeLocal = (list) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      localStorage.removeItem(OLD_KEY);
    } catch (_) {}
  };

  function addLocal(slug, direction) {
    const list = readLocal().filter((s) => s.slug !== slug);
    list.push({ slug, direction, at: Date.now() });
    writeLocal(list);
  }

  /* --- writing ------------------------------------------------------ */

  /* The chain of writes still in the air. Reset waits on this: without it
     the last swipe could land on the server AFTER the delete and show the
     card as swiped again. */
  let pendingWrites = Promise.resolve();
  const queue = (p) => {
    pendingWrites = pendingWrites.then(() => p, () => p);
    return p;
  };

  AH.saveSwipe = function (event, direction) {
    if (!event || !event.slug) return Promise.resolve();
    const value = direction > 0 || direction === "right" ? "right" : "left";

    if (!(AH.signedIn && AH.signedIn())) {
      addLocal(event.slug, value);
      return Promise.resolve();
    }

    /* Written by slug: no need to know the id, and a second swipe on the
       same card overwrites the first (the function has an on-conflict). */
    return queue(AH.request("/rpc/swipe_set", {
      method: "POST",
      body: JSON.stringify({ p_slug: event.slug, p_direction: value }),
    })).catch((err) => {
      console.warn("[afterhours] swipe not saved, kept locally:", err.message);
      addLocal(event.slug, value);
    });
  };

  /* --- reading ------------------------------------------------------ */

  /* What you kept: from the database when signed in, from the browser
     otherwise. Both come back the same way, newest first. */
  AH.kept = function () {
    if (AH.signedIn && AH.signedIn()) {
      return AH.request("/rpc/kept", { method: "POST", body: "{}" })
        .then((rows) => rows.map(AH.rowToEvent))
        .catch((err) => {
          console.warn("[afterhours] couldn't load what you kept:", err.message);
          return keptFromLocal();
        });
    }
    return Promise.resolve(keptFromLocal());
  };

  function keptFromLocal() {
    const all = window.POSTERS || [];
    return readLocal()
      .filter((s) => s.direction === "right")
      .sort((a, b) => b.at - a.at)
      .map((s) => all.find((e) => e.slug === s.slug))
      .filter(Boolean);
  }

  /* Cards already swiped, so the deck can skip them. Signed in the
     database has already dropped them (the deck function does it). */
  AH.swipedSlugs = function () {
    if (AH.signedIn && AH.signedIn()) return [];
    return readLocal().map((s) => s.slug);
  };

  /* --- reset -------------------------------------------------------- */

  /* Deal me a fresh deck: every swipe goes. From the database when signed
     in, from the browser otherwise. There is no undo — ask first. */
  AH.resetSwipes = function () {
    writeLocal([]);
    if (!(AH.signedIn && AH.signedIn())) return Promise.resolve(0);
    /* Let the writes in the air land, then delete. */
    return pendingWrites
      .catch(() => {})
      .then(() => AH.request("/rpc/swipes_reset", { method: "POST", body: "{}" }))
      .then((n) => (typeof n === "number" ? n : 0))
      .catch((err) => {
        console.warn("[afterhours] couldn't reset swipes:", err.message);
        return 0;
      });
  };

  /* --- carrying them over at sign-in -------------------------------- */

  /* What was swiped signed out should not be lost: on sign-in it is sent
     up and cleared locally. Slugs are enough, so this can run the moment
     the session appears — the event list does not need to be loaded.

     Two callers fire it at load (the data layer's chain and the
     session-change listener), and when both landed before the local list
     was cleared every swipe went up twice. Harmless (the write upserts)
     but wasteful; one merge at a time, the second caller joins it. */
  let merging = null;
  AH.mergeSwipes = function () {
    if (merging) return merging;
    const local = readLocal();
    if (!local.length || !(AH.signedIn && AH.signedIn())) return Promise.resolve(0);

    merging = Promise.all(
      local.map((s) =>
        AH.request("/rpc/swipe_set", {
          method: "POST",
          body: JSON.stringify({ p_slug: s.slug, p_direction: s.direction }),
        }).then(() => true, () => false)
      )
    ).then((results) => {
      if (results.every(Boolean)) { writeLocal([]); return results.length; }
      /* If some failed, keep them locally and try again next time. */
      console.warn("[afterhours] some swipes did not carry over, keeping them local");
      return results.filter(Boolean).length;
    }).finally(() => { merging = null; });
    return merging;
  };

  if (AH.onSessionChange) {
    AH.onSessionChange((s) => { if (s && s.access_token) AH.mergeSwipes(); });
  }
})();
