/* afterhours — the faces.

   Nobody has uploaded a photograph yet, and an initial in a box was
   standing in for one. This draws the placeholder instead: a frame shot
   in a dark room, which is the only kind of picture this site would ever
   have of anybody. You can tell two people apart and you cannot see
   either of their faces — that is the honest amount for a night that has
   not happened.

   Everything comes from the name, so a person wears the same face on
   every page and no two of them collide. When real photographs arrive
   the only thing to change is the <img> that replaces the return of
   this function. */

window.AVATAR = (function () {

  /* Same hash and same generator as the event page: one seed, one face. */
  function seeded(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let t = h >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const grey = (n) => {
    const v = Math.max(0, Math.min(255, Math.round(n)));
    return "#" + v.toString(16).padStart(2, "0").repeat(3);
  };

  /* One figure: a head and the shoulders under it, dropped anywhere in
     the frame — including half out of it. Centring them was the mistake
     in the first pass: a head in the middle of a square is the icon
     every site uses for "no picture", and the whole point here is that
     this is a picture. */
  function figure(x, y, r, tone, op) {
    const sw = r * 2.05;
    return `<g fill="${tone}" opacity="${op.toFixed(2)}">
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>
    <path d="M${(x - sw).toFixed(1)} 104
             C ${(x - sw * 0.9).toFixed(1)} ${(y + r * 1.05).toFixed(1)},
               ${(x + sw * 0.9).toFixed(1)} ${(y + r * 1.05).toFixed(1)},
               ${(x + sw).toFixed(1)} 104 Z"/>
  </g>`;
  }

  return function avatar(name) {
    const rnd = seeded(String(name || "?"));
    /* An id that cannot collide with another face on the page: two
       gradients sharing an id is one gradient, and the second person
       would have been lit by the first one's lamp. */
    const id = "av" + Math.floor(rnd() * 1e9).toString(36);

    /* Most of these were taken in the dark. A few were not — a smoking
       area, a doorway, somebody's kitchen — and those keep the strip
       from reading as one photograph repeated. */
    const dark = rnd() < 0.74;
    const base = dark ? 3 + rnd() * 9 : 186 + rnd() * 46;
    /* How much lamp there is. The bottom of this range is a frame that is
       almost entirely dark with one edge catching something, which is what
       most photographs from a night like this actually are. */
    const lit = dark ? 96 + rnd() * 140 : 78 + rnd() * 52;

    /* The lamp, and never in the middle of the frame. The whole picture
       is really this: one light source and whoever was standing in front
       of it. */
    const lx = 10 + rnd() * 80;
    const ly = 4 + rnd() * 54;

    /* Close crop, and closer than sounds sensible written down: the head
       is big enough that the frame cuts it nearly every time. That is the
       whole difference between a photograph and the little grey person a
       site shows when there is no photograph — a head that fits neatly
       inside a square, centred, with two clean shoulders under it, IS
       that icon, and it is what the pale frames kept drawing. A crop
       cannot be mistaken for it. */
    /* Never in the middle of the frame. Uniform placement kept putting the
       occasional head dead centre, and a centred head is the icon again
       however pale the room is — so the position is drawn from the outer
       thirds and one edge always takes a bite out of somebody. */
    const hx = rnd() < 0.5 ? 4 + rnd() * 30 : 66 + rnd() * 30;
    const hy = 24 + rnd() * 28;
    const hr = 25 + rnd() * 13;
    const tilt = -13 + rnd() * 26;

    /* A silhouette goes the other way from the room it is standing in:
       nearly black against a lamp, dark grey against a blown-out wall.
       Low contrast was what made the first pass look broken. */
    const fig = grey(dark ? rnd() * 9 : 26 + rnd() * 44);

    /* Somebody standing behind them, further from the light. A night is
       a crowd, and one head alone in a frame is a passport photo. */
    const second = rnd() < 0.6;
    const sx = hx + (rnd() < 0.5 ? -1 : 1) * (38 + rnd() * 30);
    const sy = hy + 6 + rnd() * 16;
    const sr = hr * (0.55 + rnd() * 0.2);

    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="l${id}" cx="${lx.toFixed(1)}%" cy="${ly.toFixed(1)}%" r="66%">
      <stop offset="0" stop-color="${grey(lit)}"/>
      <stop offset="0.38" stop-color="${grey(base + (dark ? 26 : -34))}"/>
      <stop offset="1" stop-color="${grey(base)}"/>
    </radialGradient>
    <filter id="g${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="100" height="100" fill="url(#l${id})"/>
  ${dark ? "" : `<path d="M${(-28 + rnd() * 46).toFixed(0)} 0 L100 0 L100 44 L0 100 Z" fill="#ffffff" opacity="${(0.18 + rnd() * 0.16).toFixed(2)}"/>`}
  ${second ? figure(sx, sy, sr, fig, 0.42 + rnd() * 0.2) : ""}
  ${figure(hx, hy, hr, fig, 0.82 + rnd() * 0.18)}
  <rect width="100" height="100" filter="url(#g${id})" opacity="${(0.2 + rnd() * 0.14).toFixed(2)}"/>
</svg>`;
  };
})();
