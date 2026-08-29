/* afterhours — veri katmani.
   Sayfa acilirken once burasi calisir: veriyi ya Supabase'den ya da
   events-data.js'ten alir, window.POSTERS'a koyar, sonra sayfanin kendi
   betiklerini yukler. Boylece app.js / explore.js hic degismedi.

   <script src="veri.js" data-yedek="events-data.js" data-sonra="app.js"></script>

   Backend kapaliyken (ayar.js bos) site bugunku haliyle birebir ayni
   calisir. Bu bilincli: baglanti kurulana kadar hicbir sey bozulmasin. */

(function () {
  const AYAR = window.AH_AYAR || {};

  /* Gelistirme kolayligi: yerel taklit sunucuya yonlendirme.
     SADECE localhost'ta gecerli — yayindaki sitenin verisi adres
     cubugundan degistirilemesin. */
  const yerelMi = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (yerelMi) {
    const p = new URLSearchParams(location.search).get("backend");
    if (p) { AYAR.url = p; AYAR.anonKey = AYAR.anonKey || "yerel"; }
  }

  const acik = Boolean(AYAR.url && AYAR.anonKey);

  const benBetik = document.currentScript;
  const yedekYol = benBetik.dataset.yedek;
  const sonraki = (benBetik.dataset.sonra || "").split(",").map((s) => s.trim()).filter(Boolean);

  const AH = (window.AH = window.AH || {});
  AH.ayar = AYAR;
  AH.durum = "yerel";

  /* Poster dosyasi bugun dizideki siradan hesaplaniyor (index + 1).
     Veritabani bir gun eksik liste dondurdugunde posterler kaymasin
     diye her kayda kendi numarasini yaziyoruz. */
  function numaralandir(liste) {
    liste.forEach((e, i) => { if (!e.poster) e.poster = i + 1; });
    return liste;
  }
  AH.numaralandir = numaralandir;

  /* Betikleri SIRAYLA yukle. Dinamik eklenen betikler varsayilan olarak
     async'tir; async=false olmadan sira bozulur ve app.js verisiz kalir. */
  function betikleriYukle(yollar) {
    return yollar.reduce(
      (zincir, yol) =>
        zincir.then(
          () =>
            new Promise((tamam, hata) => {
              const s = document.createElement("script");
              s.src = yol;
              s.async = false;
              s.onload = tamam;
              s.onerror = () => hata(new Error("yuklenemedi: " + yol));
              document.head.appendChild(s);
            })
        ),
      Promise.resolve()
    );
  }

  function yedegeDon(sebep) {
    AH.durum = "yerel";
    if (sebep) console.warn("[afterhours] veritabanina baglanilamadi, yerel veri:", sebep);
    return betikleriYukle(yedekYol ? [yedekYol] : []).then(() => {
      /* events-data.js POSTERS'i `const` ile tanimliyor: global sozluksel
         bir bag, window'un ozelligi degil. window.POSTERS undefined'dir,
         cikplak POSTERS ise calisir. */
      try {
        numaralandir(POSTERS);
        /* Diger modullerin (atislar.js) gorebilmesi icin window'a da
           bagla; `const` tek basina window'a yazmiyor. */
        window.POSTERS = POSTERS;
      } catch (_) {}
    });
  }

  /* --- Supabase (PostgREST) --------------------------------------- */

  AH.istek = function (yol, secenek = {}) {
    if (!acik) return Promise.reject(new Error("backend kapali"));
    const bas = {
      apikey: AYAR.anonKey,
      Authorization: "Bearer " + (AH.jeton || AYAR.anonKey),
      "Content-Type": "application/json",
    };
    return fetch(AYAR.url.replace(/\/$/, "") + "/rest/v1" + yol, {
      ...secenek,
      headers: { ...bas, ...(secenek.headers || {}) },
    }).then(async (c) => {
      const yazi = await c.text();
      if (!c.ok) throw new Error(c.status + " " + yazi.slice(0, 200));
      /* Prefer: return=minimal 201'i BOS govdeyle donuyor; bunu JSON
         diye ayristirmaya calismak istegi basarisiz gosteriyordu. */
      if (!yazi) return null;
      try { return JSON.parse(yazi); } catch (_) { return null; }
    });
  };

  /* Veritabani satirini sayfanin bekledigi bicime cevir.
     Alan adlari events-data.js ile ayni kalmali; ekran degismesin. */
  function satiriCevir(r) {
    return {
      slug: r.slug,
      tur: r.type_name,
      baslik: r.title,
      meta: r.meta,
      metin: r.body,
      poster: r.poster_no,
      /* Depoya yuklenmis poster varsa onun tam adresi; yoksa bos
         kalir ve posters/NN.svg kullanilir. */
      posterYolu: r.poster_path
        ? (AYAR.url || "").replace(/\/$/, "") + "/storage/v1/object/public/posters/" + r.poster_path
        : null,
      // ekranin kullanmadigi ama ileride lazim olacaklar
      id: r.id,
      basliyor: r.starts_at,
      mekan: r.venue_name,
      sehir: r.city_slug,
    };
  }
  AH.satiriCevir = satiriCevir;

  AH.etkinlikler = function (tur, sehir) {
    const iste = () =>
      AH.istek("/rpc/deck", {
        method: "POST",
        body: JSON.stringify({
          p_city: sehir || AYAR.sehir || "munchen",
          p_type: tur || null,
        }),
      }).then((satirlar) => satirlar.map(satiriCevir));

    return iste().catch((h) => {
      /* Elde eskimis/gecersiz bir jeton varsa sunucu 401 doner ve site
         bos kalirdi. Jetonu birakip anonim olarak tekrar deniyoruz:
         giris gecersizse bile gezinme calismali. */
      if (!/^401/.test(h.message) || !AH.jeton) throw h;
      console.warn("[afterhours] oturum gecersiz, anonim devam ediliyor");
      if (AH.oturumuBirak) AH.oturumuBirak();
      return iste();
    });
  };

  /* --- acilis ------------------------------------------------------ */

  /* Bazi sayfalar (login) sadece baglantiyi istiyor, etkinlik listesini
     degil. Yedek ve sonraki betik verilmemisse liste cekilmez. */
  const sadeceBaglanti = !yedekYol && !sonraki.length;
  if (sadeceBaglanti) {
    AH.durum = acik ? "canli" : "yerel";
    AH.hazir = Promise.resolve(AH.durum);
    return;
  }

  /* Oturum once cozulsun: deste "daha once attiklarimi" eleyecekse
     istek jetonla gitmeli. oturum.js yoksa beklenecek bir sey de yok. */
  const oturum = Promise.resolve(AH.oturumHazir || null).catch(() => null);

  const hazir = !acik
    ? yedegeDon(null)
    : oturum
        /* Once yereldeki atislari hesaba tasi: deste ondan sonra
           gelsin ki tasinan kartlar zaten elenmis olsun. */
        .then(() => (AH.girisliMi && AH.girisliMi() && AH.atislariBirlestir
          ? AH.atislariBirlestir().catch(() => 0)
          : null))
        .then(() => AH.etkinlikler())
        .then((liste) => {
          if (!liste.length) throw new Error("veritabani bos");
          window.POSTERS = numaralandir(liste);
          AH.durum = "canli";
        })
        .catch(yedegeDon);

  AH.hazir = hazir.then(() => betikleriYukle(sonraki)).then(() => AH.durum);
})();
