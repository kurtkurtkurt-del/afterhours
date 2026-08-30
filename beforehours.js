/* afterhours — beforehours yorumlari.
   Canliyken veritabanindan, degilse comment-pools.js'teki ornek havuzdan.
   Iki durumda da ayni bicim doner: { yeni: [...], eski: [...] }
   ve her konu { kim, zaman, metin, cevaplar: [...] }.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const OTUZ_GUN = 30 * 24 * 3600 * 1000;

  const AYAR = window.AH_CONFIG || {};
  const canli = () => Boolean(AYAR.url && AYAR.anonKey && AH.mode === "live");

  /* Veritabani satirlarini ekranin bekledigi bicime cevir.
     time_text ornek yorumlarda dolu ("4 days ago"); gercek yorumlarda
     bos, o zaman created_at'ten uretiyoruz. */
  function zamanYazisi(satir) {
    if (satir.time_text) return satir.time_text;
    const fark = Date.now() - new Date(satir.created_at).getTime();
    const saat = Math.floor(fark / 3600e3);
    if (saat < 1) return "just now";
    if (saat < 24) return saat + " h ago";
    const gun = Math.floor(saat / 24);
    if (gun === 1) return "yesterday";
    if (gun < 30) return gun + " days ago";
    return new Date(satir.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }

  function grupla(satirlar) {
    const konular = satirlar.filter((s) => !s.parent_id);
    const cevaplar = satirlar.filter((s) => s.parent_id);

    const cevir = (s) => ({
      id: s.id,
      kim: s.author || "someone",
      zaman: zamanYazisi(s),
      body: s.body,
      an: new Date(s.created_at).getTime(),
      cevaplar: cevaplar
        .filter((c) => c.parent_id === s.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((c) => ({ kim: c.author || "someone", zaman: zamanYazisi(c), body: c.body })),
    });

    const hepsi = konular.map(cevir).sort((a, b) => b.an - a.an);
    const sinir = Date.now() - OTUZ_GUN;
    return {
      yeni: hepsi.filter((k) => k.an >= sinir),
      eski: hepsi.filter((k) => k.an < sinir),
    };
  }

  AH.yorumlariGetir = function (etkinlik) {
    if (!canli() || !etkinlik || !etkinlik.id) {
      /* Yerel mod: comment-pools.js'teki havuz. Ayni secim, ayni sira. */
      try { return Promise.resolve(YORUMLARI_GETIR(etkinlik)); }
      catch (_) { return Promise.resolve({ yeni: [], eski: [] }); }
    }
    return AH.request(
      "/comments_public?event_id=eq." + encodeURIComponent(etkinlik.id) +
      "&order=created_at.desc&limit=60"
    )
      .then(grupla)
      .catch((h) => {
        console.warn("[afterhours] yorumlar alinamadi:", h.message);
        try { return YORUMLARI_GETIR(etkinlik); } catch (_) { return { yeni: [], eski: [] }; }
      });
  };

  /* Yazmak giris ister. author_id'yi veritabani oturumdan dolduruyor. */
  AH.yorumYaz = function (etkinlik, metin, ustId) {
    if (!canli()) return Promise.reject(new Error("backend kapali"));
    if (!(AH.signedIn && AH.signedIn())) return Promise.reject(new Error("page gerekli"));
    const govde = { event_id: etkinlik.id, body: String(metin).trim() };
    if (ustId) govde.parent_id = ustId;
    return AH.request("/comments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(govde),
    });
  };

  AH.yorumYazilabilir = () => canli() && AH.signedIn && AH.signedIn();
  AH.yorumBackendAcik = canli;
})();
