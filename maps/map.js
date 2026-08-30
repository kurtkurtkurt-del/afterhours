/* afterhours — maps.
   Sehir semasi HTML'de elle cizildi; burasi sadece noktalari koyuyor.
   Hicbir animasyon dongusu yok: kureyi degistirmesinin sebebi de bu,
   o her karede yuzlerce bina ciziyordu.

   Nokta konumu mekanin koordinatindan (venues.js) geliyor. Ayni
   mekanda birden fazla gece varsa top uste binmesinler diye slug'dan
   uretilen sabit bir kaydirma uygulaniyor — her acilista ayni yerde. */

(function () {
  const NS = "http://www.w3.org/2000/svg";
  const katman = document.getElementById("map-dots");
  const sema = document.getElementById("map-schema");
  const card = document.getElementById("map-card");
  const kartTur = document.getElementById("map-card-kind");
  const kartAd = document.getElementById("map-card-name");
  const kartMeta = document.getElementById("map-card-meta");
  const dip = document.getElementById("map-footline");
  if (!katman) return;

  const cards = window.POSTERS || [];
  const venues = window.VENUES || [];

  /* Etkinligin mekanini bul: canliyken kayittan geliyor, yerel modda
     meta satirindaki adlari tariyoruz (seed ureteciyle ayni mantik). */
  function mekanBul(e) {
    const adaylar = [];
    if (e.venue) adaylar.push(e.venue);
    (e.meta || "").split("·").forEach((p) => adaylar.push(p.trim()));

    for (const ham of adaylar) {
      if (!ham) continue;
      const aday = ham.toUpperCase().trim();
      const m =
        venues.find((x) => x.name === aday) ||
        venues.find((x) => aday.startsWith(x.name) || x.name.startsWith(aday)) ||
        venues.find((x) => aday.includes(x.name));
      if (m) return m;
    }
    return null;
  }

  /* Ayni noktada yigilmasinlar: slug'a bagli kucuk, sabit bir kaydirma */
  function kaydir(slug) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    const aci = (h % 360) * (Math.PI / 180);
    const uzaklik = 7 + (h % 11);
    return { dx: Math.cos(aci) * uzaklik, dy: Math.sin(aci) * uzaklik };
  }

  let yerlesen = 0;

  cards.forEach((e) => {
    const m = mekanBul(e);
    if (!m) return;                     /* mekani olmayan gece haritada yok */
    yerlesen++;

    const k = kaydir(e.slug);
    const g = document.createElementNS(NS, "a");
    g.setAttribute("href", "../explore/" + e.slug + "/index.html");
    g.setAttribute("class", "map-dot");

    /* Buyuk gorunmez circle: fareyle yakalamasi kolay olsun */
    const target = document.createElementNS(NS, "circle");
    target.setAttribute("cx", m.x + k.dx);
    target.setAttribute("cy", m.y + k.dy);
    target.setAttribute("r", 13);
    target.setAttribute("class", "map-dot-target");

    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", m.x + k.dx);
    circle.setAttribute("cy", m.y + k.dy);
    circle.setAttribute("r", 5.2);
    circle.setAttribute("class", "map-dot-circle");

    g.appendChild(target);
    g.appendChild(circle);

    const show = () => {
      card.hidden = false;
      kartTur.textContent = (e.kind || "").toUpperCase();
      kartAd.textContent = e.title;
      kartMeta.textContent = e.meta;
      g.classList.add("over");
    };
    const hide = () => { card.hidden = true; g.classList.remove("over"); };

    g.addEventListener("mouseenter", show);
    g.addEventListener("mouseleave", hide);
    g.addEventListener("focus", show);
    g.addEventListener("blur", hide);

    katman.appendChild(g);
  });

  const eksik = cards.length - yerlesen;
  dip.textContent =
    yerlesen + " nights placed" +
    (eksik ? " · " + eksik + " without a venue yet" : "") +
    " · schematic, note to scale";

  /* Fare haritanin bosluguna gidince card kapansin */
  sema.addEventListener("mouseleave", () => { card.hidden = true; });
})();
