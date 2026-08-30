/* afterhours — arkadaslar.
   Butun is veritabanindaki fonksiyonlarda; burasi sadece cagiriyor.
   Girissizken hepsi bos doner, hata firlatmaz: sayfa bozulmasin.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const canli = () => Boolean(AH.request && AH.signedIn && AH.signedIn() && AH.mode === "live");

  const cagir = (fn, govde) =>
    AH.request("/rpc/" + fn, { method: "POST", body: JSON.stringify(govde || {}) });

  /* Skaler donen fonksiyonlar ciplak deger dondurur; bazi katmanlar
     tek satir/tek kolon sarmalar. Ikisini de ayni sekilde okuyalim. */
  const skaler = (fn) => (c) => {
    if (Array.isArray(c)) c = c[0];
    if (c && typeof c === "object" && fn in c) return c[fn];
    return c;
  };

  AH.myProfile = function () {
    if (!canli()) return Promise.resolve(null);
    const id = AH.session && AH.session.user && AH.session.user.id;
    if (!id) return Promise.resolve(null);
    return AH.request("/profiles?id=eq." + id).then((r) => (r && r[0]) || null).catch(() => null);
  };

  AH.setHandle = function (handle) {
    const id = AH.session && AH.session.user && AH.session.user.id;
    if (!canli() || !id) return Promise.reject(new Error("page gerekli"));
    const h = String(handle).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(h)) {
      return Promise.reject(new Error("3-20 karakter, kucuk harf/rakam/alt cizgi"));
    }
    return AH.request("/profiles?id=eq." + id, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ handle: h }),
    });
  };

  AH.friends = function () {
    if (!canli()) return Promise.resolve([]);
    return cagir("friends_list").catch(() => []);
  };

  /* Donus: 'gonderildi' | 'kabul' | 'bulunamadi' | 'kendine' */
  AH.friendRequest = (handle) =>
    cagir("friend_request", { p_handle: handle }).then(skaler("friend_request"));
  AH.friendAccept = (id) =>
    cagir("friend_accept", { p_other: id }).then(skaler("friend_accept"));
  AH.friendRemove = (id) =>
    cagir("friend_remove", { p_other: id }).then(skaler("friend_remove"));

  /* "friends liked swipes" destesi */
  AH.friendsKept = function () {
    if (!canli()) return Promise.resolve([]);
    return cagir("friends_kept", { p_limit: 60 })
      .then((satirlar) =>
        satirlar.map((s) => ({
          slug: s.slug, kind: s.type_name, title: s.title, meta: s.meta,
          body: s.body, poster: s.poster_no, id: s.id,
          friend: s.friend, startsAt: s.starts_at, venue: s.venue_name,
        }))
      )
      .catch(() => []);
  };
})();
