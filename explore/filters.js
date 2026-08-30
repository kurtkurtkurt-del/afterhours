/* afterhours — explore filtresi.
   Native <select> yerine kendi listemiz: basinca acilan beyaz bir panel,
   chosen olan isaretli, empty cities kac gecesi oldugunu soyleyerek
   soluk duruyor.

   Bu ayni zamanda eski bir hileyi de gereksiz kildi: select'ler en uzun
   secenege gore genisledigi icin oku yaziya yapistirmak adina metni
   olcup genislik ayarliyorduk. Kendi dugmemiz zaten icerigi kadar. */

(function () {
  const area = document.querySelector(".ex-filter");
  if (!area) return;

  const AH = (window.AH = window.AH || {});
  const live = () => AH.mode === "live";

  /* Secili status. Deste bunu okuyor. */
  AH.filter = { country: "de", city: "munchen", kind: null, date: "tonight" };

  const TURLER = [
    { value: null, name: "all events" },
    { value: "rave", name: "rave" },
    { value: "club-night", name: "club night" },
    { value: "konzert", name: "konzert" },
    { value: "festival", name: "festival" },
    { value: "meetup", name: "meetup" },
    { value: "hausparty", name: "hausparty" },
  ];

  const TARIHLER = ["tonight", "tomorrow", "this weekend", "this week", "this month"]
    .map((t) => ({ value: t, name: t }));

  /* Backend kapaliyken elimizde tek sehir var; uydurmuyoruz. */
  const LOCAL_CITIES = [
    { slug: "munchen", name: "münchen", country: "Deutschland",
      country_slug: "de", n: (window.POSTERS || []).length },
  ];

  let cities = LOCAL_CITIES;

  /* ---------- acilir list ---------- */

  const acikOlanlar = [];

  function list(box, secenekler, seciliDeger, secildi) {
    const button = box.querySelector(".fl-button");
    const value = box.querySelector(".fl-value");
    const panel = box.querySelector(".fl-list");

    const chosen = secenekler.find((s) => s.value === seciliDeger) ||
      secenekler.find((s) => !s.title);
    value.textContent = chosen ? chosen.name : "—";

    panel.textContent = "";
    secenekler.forEach((s) => {
      /* Grup basligi: tiklanmaz, sadece ayirir */
      if (s.title) {
        const b = document.createElement("p");
        b.className = "fl-group";
        b.textContent = s.title;
        panel.appendChild(b);
        return;
      }

      const item = document.createElement("button");
      item.type = "button";
      item.className = "fl-item" + (s.value === seciliDeger ? " selected" : "") +
        (s.empty ? " empty" : "");

      const name = document.createElement("span");
      name.textContent = s.name;
      item.appendChild(name);

      if (s.not) {
        const not = document.createElement("em");
        not.className = "fl-note";
        not.textContent = s.not;
        item.appendChild(not);
      }

      item.addEventListener("click", () => {
        kapat(box);
        if (s.value !== seciliDeger) secildi(s.value);
      });
      panel.appendChild(item);
    });

    button.onclick = (e) => {
      e.stopPropagation();
      const acikMi = box.classList.contains("open");
      hepsiniKapat();
      if (!acikMi) open(box);
    };
  }

  function open(box) {
    box.classList.add("open");
    box.querySelector(".fl-button").setAttribute("aria-expanded", "true");
    box.querySelector(".fl-list").hidden = false;
    acikOlanlar.push(box);
  }

  function kapat(box) {
    box.classList.remove("open");
    box.querySelector(".fl-button").setAttribute("aria-expanded", "false");
    box.querySelector(".fl-list").hidden = true;
  }

  function hepsiniKapat() {
    document.querySelectorAll(".fl.open").forEach(kapat);
  }

  document.addEventListener("click", hepsiniKapat);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hepsiniKapat(); });

  /* ---------- filtreler ---------- */

  const boxes = {
    country: area.querySelector('[data-field="country"]'),
    city: area.querySelector('[data-field="city"]'),
    kind: area.querySelector('[data-field="kind"]'),
    date: area.querySelector('[data-field="date"]'),
  };

  /* Ulkeler kitalarina gore gruplanip listeleniyor: 18 ulke duz bir
     list olarak okunmuyor. Gecesi olan continents once. */
  function ulkeSecenekleri() {
    const gorulen = new Map();
    cities.forEach((s) => {
      if (!s.country_slug) return;
      const o = gorulen.get(s.country_slug) ||
        { value: s.country_slug, name: s.country, continent: s.continent || "", n: 0 };
      o.n += Number(s.n || 0);
      gorulen.set(s.country_slug, o);
    });

    const countries = [...gorulen.values()];
    const continents = new Map();
    countries.forEach((u) => {
      const g = continents.get(u.continent) || { name: u.continent, n: 0, countries: [] };
      g.n += u.n;
      g.countries.push(u);
      continents.set(u.continent, g);
    });

    const ordered = [];
    [...continents.values()]
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
      .forEach((k) => {
        if (k.name) ordered.push({ title: k.name });
        k.countries
          .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
          .forEach((u) => ordered.push({
            value: u.value, name: u.name, empty: !u.n,
            not: u.n ? u.n + " nights" : "nothing yet",
          }));
      });
    return ordered;
  }

  function sehirSecenekleri() {
    return cities
      .filter((s) => s.country_slug === AH.filter.country)
      .map((s) => ({
        value: s.slug,
        name: s.name,
        empty: !Number(s.n),
        not: Number(s.n) ? Number(s.n) + " nights" : "nothing yet",
      }));
  }

  function draw() {
    list(boxes.country, ulkeSecenekleri(), AH.filter.country, (v) => {
      AH.filter.country = v;
      /* Ulke degisince o ulkenin ilk full sehrine gec */
      const o = sehirSecenekleri();
      const full = o.find((x) => !x.empty) || o[0];
      AH.filter.city = full ? full.value : null;
      draw();
      yenile();
    });

    list(boxes.city, sehirSecenekleri(), AH.filter.city, (v) => {
      AH.filter.city = v;
      draw();
      yenile();
    });

    list(boxes.kind, TURLER, AH.filter.kind, (v) => {
      AH.filter.kind = v;
      draw();
      yenile();
    });

    /* Tarih henuz bir sey yapmiyor: etkinliklerin dortte ucunde tarih
       cikarimla dolduruldu, ona gore filtrelemek yaniltici olurdu. */
    list(boxes.date, TARIHLER, AH.filter.date, (v) => {
      AH.filter.date = v;
      draw();
    });
  }

  function yenile() {
    if (AH.redeal) AH.redeal("global deck");
  }

  /* "i feel lucky": seni gecesi olan rastgele bir sehre atar. Bulundugun
     sehri secmez — ayni yerde kalmak sansli hissettirmiyor. Tur de
     sifirlanir, gittigin yerde her sey acik olsun. */
  AH.randomCity = function () {
    const full = cities.filter(
      (s) => Number(s.n) > 0 && s.slug !== AH.filter.city);
    if (!full.length) return null;

    const choice = full[Math.floor(Math.random() * full.length)];
    AH.filter.country = choice.country_slug;
    AH.filter.city = choice.slug;
    AH.filter.kind = null;
    draw();
    return choice;
  };

  /* ---------- acilis ---------- */

  function fetchCities() {
    if (!live()) return Promise.resolve(LOCAL_CITIES);
    return AH.request("/rpc/city_counts", { method: "POST", body: "{}" })
      .catch(() => LOCAL_CITIES);
  }

  Promise.resolve(AH.ready)
    .then(fetchCities)
    .then((list) => {
      if (list && list.length) cities = list;
      const mine = cities.find((s) => s.slug === AH.filter.city);
      if (mine) AH.filter.country = mine.country_slug || AH.filter.country;
      draw();
    });
})();
