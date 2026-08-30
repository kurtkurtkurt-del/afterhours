/* afterhours — veri katmani.
   Sayfa acilirken once burasi calisir: veriyi ya Supabase'den ya da
   events-data.js'ten alir, window.POSTERS'a koyar, sonra sayfanin kendi
   betiklerini yukler. Boylece app.js / explore.js hic degismedi.

   <script src="data.js" data-yedek="events-data.js" data-sonra="app.js"></script>

   Backend kapaliyken (config.js bos) site bugunku haliyle birebir ayni
   calisir. Bu bilincli: baglanti kurulana kadar hicbir sey bozulmasin. */

(function () {
  const AYAR = window.AH_CONFIG || {};

  /* Gelistirme kolayligi: yerel taklit sunucuya yonlendirme.
     SADECE localhost'ta gecerli — yayindaki sitenin verisi adres
     cubugundan degistirilemesin. */
  const yerelMi = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (yerelMi) {
    const p = new URLSearchParams(location.search).get("backend");
    if (p) { AYAR.url = p; AYAR.anonKey = AYAR.anonKey || "local"; }
  }

  const acik = Boolean(AYAR.url && AYAR.anonKey);

  const benBetik = document.currentScript;
  const yedekYol = benBetik.dataset.yedek;
  const sonraki = (benBetik.dataset.sonra || "").split(",").map((s) => s.trim()).filter(Boolean);

  const AH = (window.AH = window.AH || {});
  AH.config = AYAR;
  AH.mode = "local";

  /* Poster dosyasi bugun dizideki siradan hesaplaniyor (index + 1).
     Veritabani bir gun eksik liste dondurdugunde posterler kaymasin
     diye her kayda kendi numarasini yaziyoruz. */
  function numberEvents(liste) {
    liste.forEach((e, i) => { if (!e.poster) e.poster = i + 1; });
    return liste;
  }
  AH.numberEvents = numberEvents;

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
    AH.mode = "local";
    if (sebep) console.warn("[afterhours] veritabanina baglanilamadi, yerel veri:", sebep);
    return betikleriYukle(yedekYol ? [yedekYol] : []).then(() => {
      /* events-data.js POSTERS'i `const` ile tanimliyor: global sozluksel
         bir bag, window'un ozelligi degil. window.POSTERS undefined'dir,
         cikplak POSTERS ise calisir. */
      try {
        numberEvents(POSTERS);
        /* Diger modullerin (swipes.js) gorebilmesi icin window'a da
           bagla; `const` tek basina window'a yazmiyor. */
        window.POSTERS = POSTERS;
      } catch (_) {}
    });
  }

  /* --- Supabase (PostgREST) --------------------------------------- */

  AH.request = function (yol, secenek = {}) {
    if (!acik) return Promise.reject(new Error("backend kapali"));
    const bas = {
      apikey: AYAR.anonKey,
      Authorization: "Bearer " + (AH.token || AYAR.anonKey),
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

  /* Veritabani ne derse desin, ekrana insan cumlesi cikmali.
     "404 {"code":"PGRST202","details":"Searched for the function..."}
     diye bir sey kullaniciya bir sey anlatmiyor; ona ne yapabilecegini
     soyleyen kisa bir cumle lazim. Ayrinti konsola dusuyor. */
  AH.errorText = function (hata, yedek) {
    const ham = String((hata && hata.message) || hata || "");
    console.warn("afterhours:", ham);

    if (/PGRST202|Searched for the function/i.test(ham))
      return "this part isn't switched on yet. it should be soon.";
    if (/^40[13]\b|JWT|token is expired/i.test(ham))
      return "your session ran out. sign in again.";
    if (/duplicate key|already exists|unique constraint/i.test(ham))
      return "that one is taken already.";
    if (/violates .*constraint|invalid input/i.test(ham))
      return "that doesn't fit — check the field and try again.";
    if (/^429\b|rate limit/i.test(ham))
      return "too fast. give it a minute.";
    if (/^5\d\d\b/.test(ham))
      return "the other end is having a moment. try again shortly.";
    if (/failed to fetch|networkerror|load failed|backend kapali/i.test(ham))
      return "no connection to the backend right now.";
    return yedek || "something went wrong. it has been noted.";
  };

  /* Veritabani satirini sayfanin bekledigi bicime cevir.
     Alan adlari events-data.js ile ayni kalmali; ekran degismesin. */
  function rowToEvent(r) {
    return {
      slug: r.slug,
      kind: r.type_name,
      title: r.title,
      meta: r.meta,
      body: r.body,
      poster: r.poster_no,
      /* Depoya yuklenmis poster varsa onun tam adresi; yoksa bos
         kalir ve posters/NN.svg kullanilir. */
      posterPath: r.poster_path
        ? (AYAR.url || "").replace(/\/$/, "") + "/storage/v1/object/public/posters/" + r.poster_path
        : null,
      // ekranin kullanmadigi ama ileride lazim olacaklar
      id: r.id,
      startsAt: r.starts_at,
      venue: r.venue_name,
      city: r.city_slug,
    };
  }
  AH.rowToEvent = rowToEvent;

  AH.events = function (tur, sehir) {
    const iste = () =>
      AH.request("/rpc/deck", {
        method: "POST",
        body: JSON.stringify({
          p_city: sehir || AYAR.city || "munchen",
          p_type: tur || null,
        }),
      }).then((satirlar) => satirlar.map(rowToEvent));

    return iste().catch((h) => {
      /* Elde eskimis/gecersiz bir jeton varsa sunucu 401 doner ve site
         bos kalirdi. Jetonu birakip anonim olarak tekrar deniyoruz:
         giris gecersizse bile gezinme calismali. */
      if (!/^401/.test(h.message) || !AH.token) throw h;
      console.warn("[afterhours] oturum gecersiz, anonim devam ediliyor");
      if (AH.dropSession) AH.dropSession();
      return iste();
    });
  };

  /* --- acilis ------------------------------------------------------ */

  /* Bazi sayfalar (login) sadece baglantiyi istiyor, etkinlik listesini
     degil. Yedek ve sonraki betik verilmemisse liste cekilmez. */
  const sadeceBaglanti = !yedekYol && !sonraki.length;
  if (sadeceBaglanti) {
    AH.mode = acik ? "live" : "local";
    AH.ready = Promise.resolve(AH.mode);
    return;
  }

  /* Oturum once cozulsun: deste "daha once attiklarimi" eleyecekse
     istek jetonla gitmeli. session.js yoksa beklenecek bir sey de yok. */
  const oturum = Promise.resolve(AH.sessionReady || null).catch(() => null);

  const hazir = !acik
    ? yedegeDon(null)
    : oturum
        /* Once yereldeki atislari hesaba tasi: deste ondan sonra
           gelsin ki tasinan kartlar zaten elenmis olsun. */
        .then(() => (AH.signedIn && AH.signedIn() && AH.atislariBirlestir
          ? AH.atislariBirlestir().catch(() => 0)
          : null))
        .then(() => AH.events())
        .then((liste) => {
          if (!liste.length) throw new Error("veritabani empty");
          window.POSTERS = numberEvents(liste);
          AH.mode = "live";
        })
        .catch(yedegeDon);

  AH.ready = hazir.then(() => betikleriYukle(sonraki)).then(() => AH.mode);
})();
