/* afterhours — the explore filter.
   Our own list instead of a native <select>: a white panel that opens on
   click, the chosen row marked, empty cities left faint while still
   saying how many nights they have.

   This also retired an old trick: because a select is as wide as its
   longest option, we used to measure the text and set the width by hand
   just to keep the arrow next to the label. Our own button is already
   only as wide as its contents. */

(function () {
  const area = document.querySelector(".ex-filter");
  if (!area) return;

  const AH = (window.AH = window.AH || {});
  const live = () => AH.mode === "live";

  /* The chosen state. The deck reads this. */
  AH.filter = { country: "de", city: "munchen", kind: null, date: "tonight" };

  const KINDS = [
    { value: null, name: "all events" },
    { value: "rave", name: "rave" },
    { value: "club-night", name: "club night" },
    { value: "konzert", name: "konzert" },
    { value: "festival", name: "festival" },
    { value: "meetup", name: "meetup" },
    { value: "hausparty", name: "hausparty" },
  ];

  const DATES = ["tonight", "tomorrow", "this weekend", "this week", "this month"]
    .map((t) => ({ value: t, name: t }));

  /* With the backend off we have exactly one city; we do not invent more. */
  const LOCAL_CITIES = [
    { slug: "munchen", name: "münchen", country: "Deutschland",
      country_slug: "de", n: (window.POSTERS || []).length },
  ];

  let cities = LOCAL_CITIES;

  /* ---------- the drop-down ---------- */

  const openOnes = [];

  function list(box, options, currentValue, onPick) {
    const button = box.querySelector(".fl-button");
    const value = box.querySelector(".fl-value");
    const panel = box.querySelector(".fl-list");

    const chosen = options.find((s) => s.value === currentValue) ||
      options.find((s) => !s.title);
    value.textContent = chosen ? chosen.name : "—";

    panel.textContent = "";
    options.forEach((s) => {
      /* A group heading: not clickable, it only separates */
      if (s.title) {
        const b = document.createElement("p");
        b.className = "fl-group";
        b.textContent = s.title;
        panel.appendChild(b);
        return;
      }

      const item = document.createElement("button");
      item.type = "button";
      item.className = "fl-item" + (s.value === currentValue ? " selected" : "") +
        (s.empty ? " empty" : "");

      const name = document.createElement("span");
      name.textContent = s.name;
      item.appendChild(name);

      if (s.note) {
        const note = document.createElement("em");
        note.className = "fl-note";
        note.textContent = s.note;
        item.appendChild(note);
      }

      item.addEventListener("click", () => {
        close(box);
        if (s.value !== currentValue) onPick(s.value);
      });
      panel.appendChild(item);
    });

    button.onclick = (e) => {
      e.stopPropagation();
      const wasOpen = box.classList.contains("open");
      closeAll();
      if (!wasOpen) open(box);
    };
  }

  function open(box) {
    box.classList.add("open");
    box.querySelector(".fl-button").setAttribute("aria-expanded", "true");
    box.querySelector(".fl-list").hidden = false;
    openOnes.push(box);
  }

  function close(box) {
    box.classList.remove("open");
    box.querySelector(".fl-button").setAttribute("aria-expanded", "false");
    box.querySelector(".fl-list").hidden = true;
  }

  function closeAll() {
    document.querySelectorAll(".fl.open").forEach(close);
  }

  document.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  /* ---------- the filters ---------- */

  const boxes = {
    country: area.querySelector('[data-field="country"]'),
    city: area.querySelector('[data-field="city"]'),
    kind: area.querySelector('[data-field="kind"]'),
    date: area.querySelector('[data-field="date"]'),
  };

  /* Countries are grouped by continent: 18 countries do not read as one
     flat list. Continents that have nights come first. */
  function countryOptions() {
    const seen = new Map();
    cities.forEach((s) => {
      if (!s.country_slug) return;
      const o = seen.get(s.country_slug) ||
        { value: s.country_slug, name: s.country, continent: s.continent || "", n: 0 };
      o.n += Number(s.n || 0);
      seen.set(s.country_slug, o);
    });

    const countries = [...seen.values()];
    const continents = new Map();
    countries.forEach((c) => {
      const g = continents.get(c.continent) || { name: c.continent, n: 0, countries: [] };
      g.n += c.n;
      g.countries.push(c);
      continents.set(c.continent, g);
    });

    const ordered = [];
    [...continents.values()]
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
      .forEach((k) => {
        if (k.name) ordered.push({ title: k.name });
        k.countries
          .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
          .forEach((c) => ordered.push({
            value: c.value, name: c.name, empty: !c.n,
            note: c.n ? c.n + " nights" : "nothing yet",
          }));
      });
    return ordered;
  }

  function cityOptions() {
    return cities
      .filter((s) => s.country_slug === AH.filter.country)
      .map((s) => ({
        value: s.slug,
        name: s.name,
        empty: !Number(s.n),
        note: Number(s.n) ? Number(s.n) + " nights" : "nothing yet",
      }));
  }

  function draw() {
    list(boxes.country, countryOptions(), AH.filter.country, (v) => {
      AH.filter.country = v;
      /* When the country changes, move to its first city that has nights */
      const o = cityOptions();
      const full = o.find((x) => !x.empty) || o[0];
      AH.filter.city = full ? full.value : null;
      draw();
      redeal();
    });

    list(boxes.city, cityOptions(), AH.filter.city, (v) => {
      AH.filter.city = v;
      draw();
      redeal();
    });

    list(boxes.kind, KINDS, AH.filter.kind, (v) => {
      AH.filter.kind = v;
      draw();
      redeal();
    });

    /* The date does nothing yet: on three quarters of the events the date
       was filled in by inference, so filtering on it would mislead. */
    list(boxes.date, DATES, AH.filter.date, (v) => {
      AH.filter.date = v;
      draw();
    });
  }

  function redeal() {
    if (AH.redeal) AH.redeal("global deck");
  }

  /* "i feel lucky": throws you at a random city that has nights. It never
     picks the one you are in — staying put does not feel lucky. The kind
     is cleared too, so everything is open where you land. */
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

  /* ---------- start ---------- */

  function fetchCities() {
    if (!live()) return Promise.resolve(LOCAL_CITIES);
    return AH.request("/rpc/city_counts", { method: "POST", body: "{}" })
      .catch(() => LOCAL_CITIES);
  }

  Promise.resolve(AH.ready)
    .then(fetchCities)
    .then((rows) => {
      if (rows && rows.length) cities = rows;
      const mine = cities.find((s) => s.slug === AH.filter.city);
      if (mine) AH.filter.country = mine.country_slug || AH.filter.country;
      draw();
    });
})();
