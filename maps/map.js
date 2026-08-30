/* afterhours — maps.
   Sehir semasi HTML'de elle cizildi; burasi sadece noktalari koyuyor.
   Hicbir animasyon dongusu yok: kureyi degistirmesinin sebebi de bu,
   o her karede yuzlerce bina ciziyordu.

   Nokta konumu mekanin koordinatindan (venues.js) geliyor. Ayni
   mekanda birden fazla gece varsa ust uste binmesinler diye slug'dan
   uretilen sabit bir kaydirma uygulaniyor — her acilista ayni yerde. */

(function () {
  const NS = "http://www.w3.org/2000/svg";
  const katman = document.getElementById("map-dots");
  const sema = document.getElementById("map-schema");
  const kart = document.getElementById("map-card");
  const kartTur = document.getElementById("map-card-kind");
  const kartAd = document.getElementById("map-card-name");
  const kartMeta = document.getElementById("map-card-meta");
  const dip = document.getElementById("map-footline");
  if (!katman) return;

  const kartlar = window.POSTERS || [];
  const mekanlar = window.VENUES || [];

  /* Etkinligin mekanini bul: canliyken kayittan geliyor, yerel modda
     meta satirindaki adlari tariyoruz (tohum ureteciyle ayni mantik). */
  function mekanBul(e) {
    const adaylar = [];
    if (e.venue) adaylar.push(e.venue);
    (e.meta || "").split("·").forEach((p) => adaylar.push(p.trim()));

    for (const ham of adaylar) {
      if (!ham) continue;
      const aday = ham.toUpperCase().trim();
      const m =
        mekanlar.find((x) => x.ad === aday) ||
        mekanlar.find((x) => aday.startsWith(x.ad) || x.ad.startsWith(aday)) ||
        mekanlar.find((x) => aday.includes(x.ad));
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

  kartlar.forEach((e) => {
    const m = mekanBul(e);
    if (!m) return;                     /* mekani olmayan gece haritada yok */
    yerlesen++;

    const k = kaydir(e.slug);
    const g = document.createElementNS(NS, "a");
    g.setAttribute("href", "../explore/" + e.slug + "/index.html");
    g.setAttribute("class", "map-dot");

    /* Buyuk gorunmez daire: fareyle yakalamasi kolay olsun */
    const hedef = document.createElementNS(NS, "circle");
    hedef.setAttribute("cx", m.x + k.dx);
    hedef.setAttribute("cy", m.y + k.dy);
    hedef.setAttribute("r", 13);
    hedef.setAttribute("class", "map-dot-target");

    const daire = document.createElementNS(NS, "circle");
    daire.setAttribute("cx", m.x + k.dx);
    daire.setAttribute("cy", m.y + k.dy);
    daire.setAttribute("r", 5.2);
    daire.setAttribute("class", "map-dot-circle");

    g.appendChild(hedef);
    g.appendChild(daire);

    const goster = () => {
      kart.hidden = false;
      kartTur.textContent = (e.kind || "").toUpperCase();
      kartAd.textContent = e.title;
      kartMeta.textContent = e.meta;
      g.classList.add("over");
    };
    const gizle = () => { kart.hidden = true; g.classList.remove("over"); };

    g.addEventListener("mouseenter", goster);
    g.addEventListener("mouseleave", gizle);
    g.addEventListener("focus", goster);
    g.addEventListener("blur", gizle);

    katman.appendChild(g);
  });

  const eksik = kartlar.length - yerlesen;
  dip.textContent =
    yerlesen + " nights placed" +
    (eksik ? " · " + eksik + " without a venue yet" : "") +
    " · schematic, not to scale";

  /* Fare haritanin bosluguna gidince kart kapansin */
  sema.addEventListener("mouseleave", () => { kart.hidden = true; });
})();
