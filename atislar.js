/* afterhours — atislar ve biriktirilenler.
   Giris yapmadan gezilebiliyor, o yuzden iki yer var:
     · girisliyken  → veritabani (her cihazda ayni)
     · girissizken  → localStorage (en azindan sayfa yenilenince durur)
   Giris yapildigi anda yereldekiler veritabanina tasinip siliniyor.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const KUTU = "afterhours.atislar";

  const yerelOku = () => {
    try { return JSON.parse(localStorage.getItem(KUTU) || "[]"); } catch (_) { return []; }
  };
  const yerelYaz = (l) => {
    try { localStorage.setItem(KUTU, JSON.stringify(l)); } catch (_) {}
  };

  function yerelEkle(slug, yon) {
    const l = yerelOku().filter((a) => a.slug !== slug);
    l.push({ slug, yon, an: Date.now() });
    yerelYaz(l);
  }

  /* --- yazma ------------------------------------------------------- */

  AH.atisKaydet = function (etkinlik, yon) {
    if (!etkinlik || !etkinlik.slug) return Promise.resolve();
    const kayit = yon > 0 || yon === "right" ? "right" : "left";

    if (!(AH.girisliMi && AH.girisliMi() && etkinlik.id)) {
      yerelEkle(etkinlik.slug, kayit);
      return Promise.resolve();
    }

    /* Ayni karta ikinci atis uzerine yazsin (tabloda benzersiz kisit var) */
    return AH.istek("/swipes", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ event_id: etkinlik.id, direction: kayit }),
    }).catch((h) => {
      console.warn("[afterhours] atis kaydedilemedi, yerele yazildi:", h.message);
      yerelEkle(etkinlik.slug, kayit);
    });
  };

  /* --- okuma ------------------------------------------------------- */

  /* Biriktirilenler: girisliyken veritabanindan, degilse yerelden.
     Ikisi de ayni bicimde doner: en son biriktirilen basta. */
  AH.biriktirilenler = function () {
    if (AH.girisliMi && AH.girisliMi()) {
      return AH.istek("/rpc/kept", { method: "POST", body: "{}" })
        .then((satirlar) => satirlar.map((s) => AH.satiriCevir(s.event)))
        .catch((h) => {
          console.warn("[afterhours] biriktirilenler alinamadi:", h.message);
          return yereldenEtkinlikler();
        });
    }
    return Promise.resolve(yereldenEtkinlikler());
  };

  function yereldenEtkinlikler() {
    const liste = window.POSTERS || [];
    return yerelOku()
      .filter((a) => a.yon === "right")
      .sort((a, b) => b.an - a.an)
      .map((a) => liste.find((e) => e.slug === a.slug))
      .filter(Boolean);
  }

  /* Daha once atilmis kartlar — deste bunlari atlayabilsin diye.
     Girisliyken veritabani zaten eliyor (deck fonksiyonu). */
  AH.atilanlar = function () {
    if (AH.girisliMi && AH.girisliMi()) return [];
    return yerelOku().map((a) => a.slug);
  };

  /* --- giriste tasima ---------------------------------------------- */

  /* Girissizken atilanlar kaybolmasin: giris yapilinca veritabanina
     gonderilip yerelden siliniyor. Slug → id cevirisi lazim, cunku
     yerelde id yok. */
  AH.atislariBirlestir = function () {
    const yerel = yerelOku();
    if (!yerel.length || !(AH.girisliMi && AH.girisliMi())) return Promise.resolve(0);

    const liste = window.POSTERS || [];
    const govde = yerel
      .map((a) => {
        const e = liste.find((x) => x.slug === a.slug);
        return e && e.id ? { event_id: e.id, direction: a.yon } : null;
      })
      .filter(Boolean);

    if (!govde.length) return Promise.resolve(0);

    return AH.istek("/swipes", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(govde),
    })
      .then(() => { yerelYaz([]); return govde.length; })
      .catch((h) => { console.warn("[afterhours] atislar tasinamadi:", h.message); return 0; });
  };

  if (AH.oturumDegisti) {
    AH.oturumDegisti((o) => { if (o && o.access_token) AH.atislariBirlestir(); });
  }
})();
