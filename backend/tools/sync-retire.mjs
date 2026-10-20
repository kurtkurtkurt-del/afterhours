/* afterhours — what the Ticketmaster sync does with a night it no longer wants.

   It takes the night off the deck (is_published = false); it never deletes it.
   A delete on events cascades: the check-in cards people collected, the room
   lines, swipes, comments, rsvps and ticket answers all went with yesterday's
   nights, every morning (A0 on the release board). An unpublished night leaves
   the deck, the map and the counters, while the collection (my_cards) and the
   past feed still read it — the same state hide_past_events() (09) leaves the
   seeds in.

   Each function returns one PostgREST request; sync-ticketmaster.mjs sends it,
   test/sync-retire.test.mjs proves what it does to a person's data. */

/* nights from before `today` (YYYY-MM-DD) that are still up */
export function retirePast(today) {
  return {
    path: "/events?source=eq.ticketmaster&is_published=is.true&starts_at=lt." + today,
    method: "PATCH",
    body: { is_published: false },
  };
}

/* nights the house rules refuse (add-ons, early starts, repeated dates) */
export function retireIds(ids) {
  return {
    path: "/events?source=eq.ticketmaster&id=in.(" + ids.join(",") + ")",
    method: "PATCH",
    body: { is_published: false },
  };
}

/* every past night with a confirmed date, whatever its source: the job pg_cron
   runs at 05:30 (09), called by the sync too since the extension may be off (66).
   It answers with how many nights it took off. */
export function hidePast() {
  return { path: "/rpc/hide_past_events", method: "POST", body: {} };
}
