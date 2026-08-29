/* afterhours — veri katmani.
   Sayfa acilirken once burasi calisir: veriyi ya Supabase'den ya da
   events-data.js'ten alir, window.POSTERS'a koyar, sonra sayfanin kendi
   betiklerini yukler. Boylece app.js / explore.js hic degismedi.

   <script src="veri.js" data-yedek="events-data.js" data-sonra="app.js"></script>

   Backend kapaliyken (ayar.js bos) site bugunku haliyle birebir ayni
   calisir. Bu bilincli: baglanti kurulana kadar hicbir sey bozulmasin. */

(function () {
  const AYAR = window.AH_AYAR || {};
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
      try { numaralandir(POSTERS); } catch (_) {}
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
      if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 200));
      return c.status === 204 ? null : c.json();
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
      // ekranin kullanmadigi ama ileride lazim olacaklar
      id: r.id,
      basliyor: r.starts_at,
      mekan: r.venue_name,
      sehir: r.city_slug,
    };
  }
  AH.satiriCevir = satiriCevir;

  AH.etkinlikler = function (tur) {
    return AH.istek("/rpc/deck", {
      method: "POST",
      body: JSON.stringify({ p_city: AYAR.sehir || "munchen", p_type: tur || null }),
    }).then((satirlar) => satirlar.map(satiriCevir));
  };

  /* --- acilis ------------------------------------------------------ */

  const hazir = !acik
    ? yedegeDon(null)
    : AH.etkinlikler()
        .then((liste) => {
          if (!liste.length) throw new Error("veritabani bos");
          window.POSTERS = numaralandir(liste);
          AH.durum = "canli";
        })
        .catch(yedegeDon);

  AH.hazir = hazir.then(() => betikleriYukle(sonraki)).then(() => AH.durum);
})();
