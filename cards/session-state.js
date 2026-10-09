/* afterhours — how the card collection changes with the session.
   Signed out: the sample cards and a "sign in" button. Signed in: your own
   cards, the same ones the account page of the app shows — one per night
   you checked in to, read from my_cards (19_checkins.sql) with the same
   account. The card is drawn from the row the way the app draws it
   (app/src/data/checkin.ts toCardData), so both look the same.

   A separate file, because cards.js loads BEFORE session.js and AH does
   not exist there yet. This script comes last.  */

(function () {
  const AH = window.AH;
  if (!AH) return;

  const button = document.querySelector(".cc-left .page-button");
  const note = document.querySelector(".cc-left .page-note");
  const cards = document.getElementById("cc-cards");

  /* As in the app: metal and motif come from the night, so a card always renders the same. */
  const METALS = ["steel", "gold", "chrome", "copper", "gunmetal", "brass", "rose", "titanium", "nickel", "anthracite"];
  const MOTIFS = ["rays", "oval", "diagonal", "orbit", "grid", "moon", "moire", "bands", "iso", "descend"];
  const hash = (s) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
  const ddmm = (iso, year) => (iso ? new Date(iso).toLocaleDateString("en-GB",
    year ? { day: "2-digit", month: "2-digit", year: "2-digit" } : { day: "2-digit", month: "2-digit" }) : "");
  const up = (s) => String(s || "").toUpperCase();

  function toCard(r) {
    const h = hash(r.slug || "");
    const start = r.starts_at || r.checked_at;
    const end = new Date(new Date(start).getTime() + 6 * 3600000).toISOString();
    return {
      city: String(r.city_name || "").toLowerCase(),
      t: r.title.length > 28 ? r.title.slice(0, 27).trimEnd() + "…" : r.title,
      ty: up(r.type_name), v: up(r.venue_name || r.city_name), d: ddmm(start, true),
      metal: METALS[h % METALS.length], motif: MOTIFS[(h >> 4) % MOTIFS.length],
      in: hhmm(r.checked_at), out: hhmm(end), dur: "6H 00M",
      crew: (r.crew || []).map(up), more: r.crew_more || 0, aud: "0:00", msg: r.post_count || 0,
      who: up(r.q1_who), froze: ddmm(r.freeze_at), no: String(r.card_no).padStart(4, "0"),
      at1: hhmm(r.q1_at), at2: hhmm(r.q2_at),
      q1: r.q1_body ? [r.q1_body, up(r.q1_who), hhmm(r.q1_at)] : undefined,
      q2: r.q2_body ? [r.q2_body, up(r.q2_who), hhmm(r.q2_at)] : undefined,
      blank: !r.frozen && !r.post_count,
    };
  }

  let shown = null;   /* "samples" | "mine": draw only when it changes */
  function refresh() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    if (button) button.hidden = signedIn;
    if (!signedIn) {
      if (note) note.textContent = AH.t("cards.empty");
      if (shown !== "samples" && window.CC_DRAW && window.CARD_SAMPLES) window.CC_DRAW(window.CARD_SAMPLES);
      shown = "samples";
      if (cards) cards.hidden = false;
      return;
    }
    shown = "mine";
    if (cards) cards.hidden = true;            /* no samples flash while your own load */
    if (note) note.textContent = AH.t("cards.loading");
    AH.request("/rpc/my_cards", { method: "POST", body: "{}" })
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : []).map(toCard);
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
