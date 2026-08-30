/* afterhours — maps.
   The city schematic is drawn by hand in the HTML; this only places the
   dots. There is no animation loop at all, which is why it replaced the
   globe: that drew hundreds of buildings on every frame.

   A dot's position comes from the venue's coordinates (venues.js). When
   one venue has more than one night, a fixed offset made from the slug
   keeps them from stacking — in the same place every time. */

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

  /* Find the event's venue: live it comes from the record, in local mode
     we scan the names in the meta line (the same logic as the seed
     builder). */
  function findVenue(e) {
    const candidates = [];
    if (e.venue) candidates.push(e.venue);
    (e.meta || "").split("·").forEach((p) => candidates.push(p.trim()));

    for (const ham of candidates) {
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

  /* Keep them from stacking on one point: a small fixed offset from the slug */
  function kaydir(slug) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    const aci = (h % 360) * (Math.PI / 180);
    const uzaklik = 7 + (h % 11);
    return { dx: Math.cos(aci) * uzaklik, dy: Math.sin(aci) * uzaklik };
  }

  let yerlesen = 0;

  cards.forEach((e) => {
    const m = findVenue(e);
    if (!m) return;                     /* a night with no venue is not on the map */
    yerlesen++;

    const k = kaydir(e.slug);
    const g = document.createElementNS(NS, "a");
    g.setAttribute("href", "../explore/" + e.slug + "/index.html");
    g.setAttribute("class", "map-dot");

    /* A large invisible circle: easy to catch with the pointer */
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

  /* When the pointer moves to empty map, the card closes */
  sema.addEventListener("mouseleave", () => { card.hidden = true; });
})();
