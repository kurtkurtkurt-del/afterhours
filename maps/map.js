/* afterhours — maps.
   The city schematic is drawn by hand in the HTML; this only places the
   dots. There is no animation loop at all, which is why it replaced the
   globe: that drew hundreds of buildings on every frame.

   A dot's position comes from the venue's coordinates (venues.js). When
   one venue has more than one night, a fixed offset made from the slug
   keeps them from stacking — in the same place every time. */

(function () {
  const NS = "http://www.w3.org/2000/svg";
  const layer = document.getElementById("map-dots");
  const schema = document.getElementById("map-schema");
  const card = document.getElementById("map-card");
  const cardKind = document.getElementById("map-card-kind");
  const cardName = document.getElementById("map-card-name");
  const cardMeta = document.getElementById("map-card-meta");
  const footline = document.getElementById("map-footline");
  if (!layer) return;

  const cards = window.POSTERS || [];
  const venues = window.VENUES || [];

  /* Find the event's venue: live it comes from the record, in local mode
     we scan the names in the meta line (the same logic as the seed
     builder). */
  function findVenue(e) {
    const candidates = [];
    if (e.venue) candidates.push(e.venue);
    (e.meta || "").split("·").forEach((p) => candidates.push(p.trim()));

    for (const raw of candidates) {
      if (!raw) continue;
      const name = raw.toUpperCase().trim();
      const m =
        venues.find((x) => x.name === name) ||
        venues.find((x) => name.startsWith(x.name) || x.name.startsWith(name)) ||
        venues.find((x) => name.includes(x.name));
      if (m) return m;
    }
    return null;
  }

  /* Keep them from stacking on one point: a small fixed offset from the slug */
  function offset(slug) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    const angle = (h % 360) * (Math.PI / 180);
    const distance = 7 + (h % 11);
    return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance };
  }

  let placed = 0;

  cards.forEach((e) => {
    const m = findVenue(e);
    if (!m) return;                     /* a night with no venue is not on the map */
    placed++;

    const k = offset(e.slug);
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
      cardKind.textContent = (e.kind || "").toUpperCase();
      cardName.textContent = e.title;
      cardMeta.textContent = e.meta;
      g.classList.add("over");
    };
    const hide = () => { card.hidden = true; g.classList.remove("over"); };

    g.addEventListener("mouseenter", show);
    g.addEventListener("mouseleave", hide);
    g.addEventListener("focus", show);
    g.addEventListener("blur", hide);

    layer.appendChild(g);
  });

  const missing = cards.length - placed;
  footline.textContent =
    placed + " nights placed" +
    (missing ? " · " + missing + " without a venue yet" : "") +
    " · schematic, note to scale";

  /* When the pointer moves to empty map, the card closes */
  schema.addEventListener("mouseleave", () => { card.hidden = true; });
})();
