/* afterhours — explore filtresi.
   Native <select> yerine kendi listemiz: basinca acilan beyaz bir panel,
   secili olan isaretli, bos sehirler kac gecesi oldugunu soyleyerek
   soluk duruyor.

   Bu ayni zamanda eski bir hileyi de gereksiz kildi: select'ler en uzun
   secenege gore genisledigi icin oku yaziya yapistirmak adina metni
   olcup genislik ayarliyorduk. Kendi dugmemiz zaten icerigi kadar. */

(function () {
  const alan = document.querySelector(".ex-filter");
  if (!alan) return;

  const AH = (window.AH = window.AH || {});
  const canli = () => AH.durum === "canli";

  /* Secili durum. Deste bunu okuyor. */
  AH.filtre = { ulke: "de", sehir: "munchen", tur: null, tarih: "tonight" };

  const TURLER = [
    { deger: null, ad: "all events" },
    { deger: "rave", ad: "rave" },
    { deger: "club-night", ad: "club night" },
    { deger: "konzert", ad: "konzert" },
    { deger: "festival", ad: "festival" },
    { deger: "meetup", ad: "meetup" },
    { deger: "hausparty", ad: "hausparty" },
  ];

  const TARIHLER = ["tonight", "tomorrow", "this weekend", "this week", "this month"]
    .map((t) => ({ deger: t, ad: t }));

  /* Backend kapaliyken elimizde tek sehir var; uydurmuyoruz. */
  const YEREL_SEHIRLER = [
    { slug: "munchen", name: "münchen", country: "Deutschland",
      country_slug: "de", n: (window.POSTERS || []).length },
  ];

  let sehirler = YEREL_SEHIRLER;

  /* ---------- acilir liste ---------- */

  const acikOlanlar = [];

  function liste(kutu, secenekler, seciliDeger, secildi) {
    const dugme = kutu.querySelector(".fl-button");
    const deger = kutu.querySelector(".fl-value");
    const panel = kutu.querySelector(".fl-list");

    const secili = secenekler.find((s) => s.deger === seciliDeger) ||
      secenekler.find((s) => !s.baslik);
    deger.textContent = secili ? secili.ad : "—";

    panel.textContent = "";
    secenekler.forEach((s) => {
      /* Grup basligi: tiklanmaz, sadece ayirir */
      if (s.baslik) {
        const b = document.createElement("p");
        b.className = "fl-group";
        b.textContent = s.baslik;
        panel.appendChild(b);
        return;
      }

      const oge = document.createElement("button");
      oge.type = "button";
      oge.className = "fl-item" + (s.deger === seciliDeger ? " selected" : "") +
        (s.bos ? " empty" : "");

      const ad = document.createElement("span");
      ad.textContent = s.ad;
      oge.appendChild(ad);

      if (s.not) {
        const not = document.createElement("em");
        not.className = "fl-note";
        not.textContent = s.not;
        oge.appendChild(not);
      }

      oge.addEventListener("click", () => {
        kapat(kutu);
        if (s.deger !== seciliDeger) secildi(s.deger);
      });
      panel.appendChild(oge);
    });

    dugme.onclick = (e) => {
      e.stopPropagation();
      const acikMi = kutu.classList.contains("open");
      hepsiniKapat();
      if (!acikMi) ac(kutu);
    };
  }

  function ac(kutu) {
    kutu.classList.add("open");
    kutu.querySelector(".fl-button").setAttribute("aria-expanded", "true");
    kutu.querySelector(".fl-list").hidden = false;
    acikOlanlar.push(kutu);
  }

  function kapat(kutu) {
    kutu.classList.remove("open");
    kutu.querySelector(".fl-button").setAttribute("aria-expanded", "false");
    kutu.querySelector(".fl-list").hidden = true;
  }

  function hepsiniKapat() {
    document.querySelectorAll(".fl.open").forEach(kapat);
  }

  document.addEventListener("click", hepsiniKapat);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hepsiniKapat(); });

  /* ---------- filtreler ---------- */

  const kutular = {
    ulke: alan.querySelector('[data-alan="ulke"]'),
    sehir: alan.querySelector('[data-alan="sehir"]'),
    tur: alan.querySelector('[data-alan="tur"]'),
    tarih: alan.querySelector('[data-alan="tarih"]'),
  };

  /* Ulkeler kitalarina gore gruplanip listeleniyor: 18 ulke duz bir
     liste olarak okunmuyor. Gecesi olan kitalar once. */
  function ulkeSecenekleri() {
    const gorulen = new Map();
    sehirler.forEach((s) => {
      if (!s.country_slug) return;
      const o = gorulen.get(s.country_slug) ||
        { deger: s.country_slug, ad: s.country, kita: s.continent || "", n: 0 };
      o.n += Number(s.n || 0);
      gorulen.set(s.country_slug, o);
    });

    const ulkeler = [...gorulen.values()];
    const kitalar = new Map();
    ulkeler.forEach((u) => {
      const g = kitalar.get(u.kita) || { ad: u.kita, n: 0, ulkeler: [] };
      g.n += u.n;
      g.ulkeler.push(u);
      kitalar.set(u.kita, g);
    });

    const sirali = [];
    [...kitalar.values()]
      .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad))
      .forEach((k) => {
        if (k.ad) sirali.push({ baslik: k.ad });
        k.ulkeler
          .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad))
          .forEach((u) => sirali.push({
            deger: u.deger, ad: u.ad, bos: !u.n,
            not: u.n ? u.n + " nights" : "nothing yet",
          }));
      });
    return sirali;
  }

  function sehirSecenekleri() {
    return sehirler
      .filter((s) => s.country_slug === AH.filtre.ulke)
      .map((s) => ({
        deger: s.slug,
        ad: s.name,
        bos: !Number(s.n),
        not: Number(s.n) ? Number(s.n) + " nights" : "nothing yet",
      }));
  }

  function ciz() {
    liste(kutular.ulke, ulkeSecenekleri(), AH.filtre.ulke, (v) => {
      AH.filtre.ulke = v;
      /* Ulke degisince o ulkenin ilk dolu sehrine gec */
      const o = sehirSecenekleri();
      const dolu = o.find((x) => !x.bos) || o[0];
      AH.filtre.sehir = dolu ? dolu.deger : null;
      ciz();
      yenile();
    });

    liste(kutular.sehir, sehirSecenekleri(), AH.filtre.sehir, (v) => {
      AH.filtre.sehir = v;
      ciz();
      yenile();
    });

    liste(kutular.tur, TURLER, AH.filtre.tur, (v) => {
      AH.filtre.tur = v;
      ciz();
      yenile();
    });

    /* Tarih henuz bir sey yapmiyor: etkinliklerin dortte ucunde tarih
       cikarimla dolduruldu, ona gore filtrelemek yaniltici olurdu. */
    liste(kutular.tarih, TARIHLER, AH.filtre.tarih, (v) => {
      AH.filtre.tarih = v;
      ciz();
    });
  }

  function yenile() {
    if (AH.desteyiYenile) AH.desteyiYenile("global deck");
  }

  /* "i feel lucky": seni gecesi olan rastgele bir sehre atar. Bulundugun
     sehri secmez — ayni yerde kalmak sansli hissettirmiyor. Tur de
     sifirlanir, gittigin yerde her sey acik olsun. */
  AH.filtreRastgele = function () {
    const dolu = sehirler.filter(
      (s) => Number(s.n) > 0 && s.slug !== AH.filtre.sehir);
    if (!dolu.length) return null;

    const secim = dolu[Math.floor(Math.random() * dolu.length)];
    AH.filtre.ulke = secim.country_slug;
    AH.filtre.sehir = secim.slug;
    AH.filtre.tur = null;
    ciz();
    return secim;
  };

  /* ---------- acilis ---------- */

  function sehirleriGetir() {
    if (!canli()) return Promise.resolve(YEREL_SEHIRLER);
    return AH.istek("/rpc/city_counts", { method: "POST", body: "{}" })
      .catch(() => YEREL_SEHIRLER);
  }

  Promise.resolve(AH.hazir)
    .then(sehirleriGetir)
    .then((liste) => {
      if (liste && liste.length) sehirler = liste;
      const benim = sehirler.find((s) => s.slug === AH.filtre.sehir);
      if (benim) AH.filtre.ulke = benim.country_slug || AH.filtre.ulke;
      ciz();
    });
})();
