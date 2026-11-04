/* afterhours — how the card collection changes with the session.
   Signed out: a note and a "sign in" button, no cards. Signed in: your own
   cards, the same ones the account page of the app shows — one per night
   you checked in to, read from my_cards (19_checkins.sql) with the same
   account, plus the night's track when it has one (previews_for, 63). The
   card is built from the row the way the app builds it (app/src/data/checkin.ts
   toCardData), so both look the same.

   A separate file, because cards.js loads BEFORE session.js and AH does
   not exist there yet. This script comes last.  */

(function () {
  const AH = window.AH;
  if (!AH || !window.CARDS) return;

  const button = document.querySelector(".cc-left .page-button");
  const note = document.querySelector(".cc-left .page-note");
  const cards = document.getElementById("cc-cards");

  const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
  const dayDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase() + " " +
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  /* As in the app: the card says only what the row knows; the design follows kind + slug. */
  function toCard(r, sound) {
    return {
      kind: CARDS.kindOf(r.type_name), id: r.slug, ty: r.type_name,
      t: r.title, d: dayDate(r.starts_at || r.checked_at), doors: r.starts_at ? hhmm(r.starts_at) : "",
      v: r.venue_name, city: r.city_name,
      crew: (r.crew || []).map((c) => String(c).toUpperCase()),
      track: sound ? sound.track : null, artist: sound ? sound.artist : null,
      photo: r.image_url || null,
    };
  }

  /* the music note: previews by slug → id → previews_for; nothing found means the motif */
  function sounds(rows) {
    const slugs = rows.map((r) => r.slug).filter(Boolean);
    if (!slugs.length) return Promise.resolve(new Map());
    const list = slugs.map((s) => '"' + s.replace(/"/g, "") + '"').join(",");
    return AH.request("/events?select=id,slug&slug=in.(" + list + ")")
      .then((events) => {
        const ids = (Array.isArray(events) ? events : []).map((e) => e.id);
        if (!ids.length) return new Map();
        return AH.request("/rpc/previews_for", { method: "POST", body: JSON.stringify({ p_events: ids }) }).then((previews) => {
          const bySlug = new Map();
          const slugOf = new Map(events.map((e) => [e.id, e.slug]));
          (Array.isArray(previews) ? previews : []).forEach((p) => bySlug.set(slugOf.get(p.event_id), { track: p.track, artist: p.artist }));
          return bySlug;
        });
      })
      .catch(() => new Map());
  }

  let shown = null;   /* "none" | "mine": draw only when it changes */
  function refresh() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    if (button) button.hidden = signedIn;
    if (!signedIn) {
      if (note) note.textContent = AH.t("cards.empty");
      if (shown !== "none" && window.CC_DRAW) window.CC_DRAW([]);
      shown = "none";
      if (cards) cards.hidden = true;
      return;
    }
    shown = "mine";
    if (cards) cards.hidden = true;
    if (note) note.textContent = AH.t("cards.loading");
    AH.request("/rpc/my_cards", { method: "POST", body: "{}" })
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        return sounds(list).then((map) => list.map((r) => toCard(r, map.get(r.slug))));
      })
      .then((list) => {
        if (window.CC_DRAW) window.CC_DRAW(list);
        if (cards) cards.hidden = !list.length;
        if (note) note.textContent = list.length ? AH.t("cards.count", { n: list.length }) : AH.t("cards.mine.empty");
      })
      .catch(() => { if (note) note.textContent = AH.t("cards.failed"); });
  }

  refresh();
  if (AH.sessionReady) AH.sessionReady.then(refresh);
  if (AH.onSessionChange) AH.onSessionChange(refresh);
})();
