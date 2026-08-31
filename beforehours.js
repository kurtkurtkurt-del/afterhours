/* afterhours — beforehours comments.
   Live, they come from the database; otherwise from the sample pool in
   comment-pools.js. Both paths return the same shape:

     { recent: [...], older: [...] }

   and every topic is { id, who, when, body, at, replies: [...] }.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

  const CONFIG = window.AH_CONFIG || {};
  const live = () => Boolean(CONFIG.url && CONFIG.anonKey && AH.mode === "live");

  /* Turn a database row into what the screen expects. time_text is filled
     in on the sample comments ("4 days ago"); on real ones it is empty and
     we work it out from created_at. */
  function whenText(row) {
    if (row.time_text) return row.time_text;
    const gap = Date.now() - new Date(row.created_at).getTime();
    const hours = Math.floor(gap / 3600e3);
    if (hours < 1) return "just now";
    if (hours < 24) return hours + " h ago";
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 30) return days + " days ago";
    return new Date(row.created_at)
      .toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }

  /* One table, two levels: a row without parent_id is a topic, a row with
     one is a reply to it. */
  function group(rows) {
    const topics = rows.filter((r) => !r.parent_id);
    const replies = rows.filter((r) => r.parent_id);

    const shape = (r) => ({
      id: r.id,
      who: r.author || "someone",
      when: whenText(r),
      body: r.body,
      at: new Date(r.created_at).getTime(),
      replies: replies
        .filter((c) => c.parent_id === r.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((c) => ({ who: c.author || "someone", when: whenText(c), body: c.body })),
    });

    const all = topics.map(shape).sort((a, b) => b.at - a.at);
    const cutoff = Date.now() - THIRTY_DAYS;
    return {
      recent: all.filter((t) => t.at >= cutoff),
      older: all.filter((t) => t.at < cutoff),
    };
  }

  const EMPTY = { recent: [], older: [] };

  AH.comments = function (event) {
    if (!live() || !event || !event.id) {
      /* Local mode: the pool in comment-pools.js. Same picks, same order. */
      try { return Promise.resolve(COMMENTS_FOR(event)); }
      catch (_) { return Promise.resolve(EMPTY); }
    }
    /* Topics first, then THEIR replies. One mixed fetch with a limit cut
       threads at random: a reply past the sixtieth row vanished, and an
       orphan whose topic fell outside the window used up a slot for
       nothing. Two requests always hand back whole conversations. */
    const base = "/comments_public?event_id=eq." + encodeURIComponent(event.id);
    return AH.request(base + "&parent_id=is.null&order=created_at.desc&limit=30")
      .then((topics) => {
        if (!topics.length) return [];
        const ids = topics.map((t) => t.id).join(",");
        return AH.request(
          base + "&parent_id=in.(" + ids + ")&order=created_at.asc&limit=200"
        ).then((replies) => topics.concat(replies));
      })
      .then(group)
      .catch((err) => {
        console.warn("[afterhours] couldn't load comments:", err.message);
        try { return COMMENTS_FOR(event); } catch (_) { return EMPTY; }
      });
  };

  /* Writing needs an account. The database fills author_id from the
     session, so the browser never says who it is writing as. */
  AH.postComment = function (event, text, parentId) {
    if (!live()) return Promise.reject(new Error("backend is off"));
    if (!(AH.signedIn && AH.signedIn())) return Promise.reject(new Error("sign in first"));
    const body = { event_id: event.id, body: String(text).trim() };
    if (parentId) body.parent_id = parentId;
    return AH.request("/comments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
  };

  AH.canComment = () => live() && AH.signedIn && AH.signedIn();
  AH.commentsLive = live;
})();
