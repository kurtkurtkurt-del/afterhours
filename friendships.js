/* afterhours — friendships.
   All of the work happens in database functions; this file only calls
   them. Signed out every call resolves empty instead of throwing, so a
   page never breaks because nobody is logged in.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const live = () =>
    Boolean(AH.request && AH.signedIn && AH.signedIn() && AH.mode === "live");

  const call = (fn, body) =>
    AH.request("/rpc/" + fn, { method: "POST", body: JSON.stringify(body || {}) });

  /* Functions returning a scalar hand back a bare value, but some layers
     wrap it in a single row with a single column. Read both the same way. */
  const scalar = (fn) => (answer) => {
    if (Array.isArray(answer)) answer = answer[0];
    if (answer && typeof answer === "object" && fn in answer) return answer[fn];
    return answer;
  };

  AH.myProfile = function () {
    if (!live()) return Promise.resolve(null);
    const id = AH.session && AH.session.user && AH.session.user.id;
    if (!id) return Promise.resolve(null);
    return AH.request("/profiles?id=eq." + id)
      .then((rows) => (rows && rows[0]) || null)
      .catch(() => null);
  };

  /* Returns 'ok' | 'taken' | 'format' | 'empty' | 'signedout'. It goes
     through profile_setup(), the same road registration takes — so
     choosing a handle here also finishes an unfinished registration.
     The direct PATCH this replaced left onboarded_at unset, and the
     register page then sent the person back to "pick a handle". */
  AH.setHandle = function (handle) {
    if (!live()) return Promise.reject(new Error("sign in first"));
    const h = String(handle).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(h)) return Promise.resolve("format");
    return call("profile_setup", { p_handle: h }).then(scalar("profile_setup"));
  };

  AH.friends = function () {
    if (!live()) return Promise.resolve([]);
    return call("friends_list").catch(() => []);
  };

  /* Returns: 'sent' | 'accepted' | 'notfound' | 'yourself' */
  AH.friendRequest = (handle) =>
    call("friend_request", { p_handle: handle }).then(scalar("friend_request"));
  AH.friendAccept = (id) =>
    call("friend_accept", { p_other: id }).then(scalar("friend_accept"));
  AH.friendRemove = (id) =>
    call("friend_remove", { p_other: id }).then(scalar("friend_remove"));

  /* The "friends liked swipes" deck. */
  AH.friendsKept = function () {
    if (!live()) return Promise.resolve([]);
    return call("friends_kept", { p_limit: 60 })
      .then((rows) =>
        rows.map((r) => ({
          slug: r.slug, kind: r.type_name, title: r.title, meta: r.meta,
          body: r.body, poster: r.poster_no, id: r.id,
          image: r.image_url || null,
          friend: r.friend, startsAt: r.starts_at, venue: r.venue_name,
        }))
      )
      .catch(() => []);
  };
})();
