/* afterhours — maps.
   Sehir semasi HTML'de elle cizildi; burasi sadece noktalari koyuyor.
   Hicbir animasyon dongusu yok: kureyi degistirmesinin sebebi de bu,
   o her karede yuzlerce bina ciziyordu.

   Nokta konumu mekanin koordinatindan (mekanlar.js) geliyor. Ayni
   mekanda birden fazla gece varsa ust uste binmesinler diye slug'dan
   uretilen sabit bir kaydirma uygulaniyor — her acilista ayni yerde. */

(function () {
  const NS = "http://www.w3.org/2000/svg";
  const katman = document.getElementById("ha-noktalar");
  const sema = document.getElementById("ha-sema");
  const kart = document.getElementById("ha-kart");
  const kartTur = document.getElementById("ha-kart-tur");
  const kartAd = document.getElementById("ha-kart-ad");
  const kartMeta = document.getElementById("ha-kart-meta");
  const dip = document.getElementById("ha-dip");
  if (!katman) return;

  const kartlar = window.POSTERS || [];
  const mekanlar = window.MEKANLAR || [];

  /* Etkinligin mekanini bul: canliyken kayittan geliyor, yerel modda
     meta satirindaki adlari tariyoruz (tohum ureteciyle ayni mantik). */
  function mekanBul(e) {
    const adaylar = [];
    if (e.mekan) adaylar.push(e.mekan);
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
    g.setAttribute("class", "ha-nokta");

    /* Buyuk gorunmez daire: fareyle yakalamasi kolay olsun */
    const hedef = document.createElementNS(NS, "circle");
    hedef.setAttribute("cx", m.x + k.dx);
    hedef.setAttribute("cy", m.y + k.dy);
    hedef.setAttribute("r", 13);
    hedef.setAttribute("class", "ha-nokta-hedef");

    const daire = document.createElementNS(NS, "circle");
    daire.setAttribute("cx", m.x + k.dx);
    daire.setAttribute("cy", m.y + k.dy);
    daire.setAttribute("r", 5.2);
    daire.setAttribute("class", "ha-nokta-daire");

    g.appendChild(hedef);
    g.appendChild(daire);

    const goster = () => {
      kart.hidden = false;
      kartTur.textContent = (e.tur || "").toUpperCase();
      kartAd.textContent = e.baslik;
      kartMeta.textContent = e.meta;
      g.classList.add("ustunde");
    };
    const gizle = () => { kart.hidden = true; g.classList.remove("ustunde"); };

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
