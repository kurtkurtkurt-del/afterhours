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

    if (!(AH.girisliMi && AH.girisliMi())) {
      yerelEkle(etkinlik.slug, kayit);
      return Promise.resolve();
    }

    /* slug ile yaziyoruz: id bilmeye gerek yok, ayni karta ikinci atis
       da uzerine yaziyor (fonksiyonun icinde on conflict var). */
    return AH.istek("/rpc/swipe_set", {
      method: "POST",
      body: JSON.stringify({ p_slug: etkinlik.slug, p_direction: kayit }),
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
        .then((satirlar) => satirlar.map(AH.satiriCevir))
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

    /* Slug ile yaziliyor, o yuzden etkinlik listesinin yuklenmis
       olmasi gerekmiyor: giris aninda hemen calisabiliyor. */
    return Promise.all(
      yerel.map((a) =>
        AH.istek("/rpc/swipe_set", {
          method: "POST",
          body: JSON.stringify({ p_slug: a.slug, p_direction: a.yon }),
        }).then(() => true, () => false)
      )
    ).then((sonuclar) => {
      if (sonuclar.every(Boolean)) { yerelYaz([]); return sonuclar.length; }
      /* Bir kismi gecmediyse yerelde kalsin, bir dahaki sefere denenir */
      console.warn("[afterhours] bazi atislar tasinamadi, yerelde tutuluyor");
      return sonuclar.filter(Boolean).length;
    });
  };

  if (AH.oturumDegisti) {
    AH.oturumDegisti((o) => { if (o && o.access_token) AH.atislariBirlestir(); });
  }
})();
