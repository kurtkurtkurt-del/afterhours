/* afterhours — the turning city globe.
   No Three.js: its own projection maths, drawn onto a canvas.
   As if you were looking down at an atlas: the buildings sit on the
   globe, only the near hemisphere is visible, and turning it brings the
   far side round. */

(function () {
  const stage = document.getElementById("s4-stage");
  if (!stage) return;

  const NS = "http://www.w3.org/2000/svg";
  const G = 1440, Y = 900;
  const R = 540;                              // radius of the globe
  const CAM_Y = 1150, CAM_Z = 1180;
  const DISTANCE = Math.hypot(CAM_Y, CAM_Z);
  const TILT = Math.atan2(CAM_Y, CAM_Z);
  const FOCUS = 2300;
  const CENTRE_X = G / 2, CENTRE_Y = 1000;

  const ROOF = ["#4e535b", "#454a52", "#3c4149", "#565c65", "#3a3f47"];
  const SIDE_A = ["#2c3036", "#272b31", "#22262b", "#31363d", "#212429"];
  const SIDE_B = ["#1b1e22", "#181a1e", "#15171b", "#1f2227", "#141619"];
  const OUTLINE = "#5c626b";

  /* The previous LCG multiply ran past 2^53 and lost precision; once the
     generator breaks
     regular gaps appeared across the globe. mulberry32 is safe in 32 bits. */
  let seed = 20260828 >>> 0;
  function rnd() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const cosE = Math.cos(TILT), sinE = Math.sin(TILT);

  // ---------- vector helpers ----------
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a) => { const u = Math.hypot(a[0], a[1], a[2]); return [a[0] / u, a[1] / u, a[2] / u]; };

  const CAMERA = [0, CAM_Y, CAM_Z];
  const VIEW = unit(CAMERA);

  // ---------- buildings on the globe (fibonacci spread) ----------
  const BUILDINGS = [];
  const COUNT = 4200;

  for (let i = 0; i < COUNT; i++) {
    const yy = 1 - (i / (COUNT - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - yy * yy));
    const angle = i * 2.399963;
    const u = [Math.cos(angle) * ring, yy, Math.sin(angle) * ring];

    // Continents: a few waves so that empty regions appear
    const land =
      Math.sin(u[0] * 3.1 + 0.6) +
      Math.cos(u[2] * 2.7 - 1.1) +
      Math.sin((u[1] + u[0]) * 2.2);
    if (rnd() > 0.93) continue;

    // At the pole the cross product with [0,1,0] is zero; use another reference there
    const ref = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const east = unit(cross(ref, u));
    const north = cross(u, east);

    BUILDINGS.push({
      u: u, east: east, north: north,
      g: 11 + rnd() * 8,
      d: 11 + rnd() * 8,
      h: 5 + rnd() * 20 + (land > 1.2 ? 16 : 0),
      tone: Math.floor(rnd() * 5),
    });
  }

  // ---------- the beacons: the colour comes from that night's poster ----------
  const SLUG = ["asap-rocky", "nick-cave", "bonez-mc-raf-camora", "thirty-seconds-to-mars", "annenmaykantereit", "elysium", "tollwood", "mondscheinexpress", "isle-of-summer", "zamanand", "blitz", "rote-sonne-bahnwarter", "silo-west", "cfu-open-air", "daytime-rave", "echonomist", "10-years-blurred-vision", "legal-blitz", "bahnwarter-techno-nacht", "unterwelt", "kuchentisch", "3-stock-links", "boxenturm", "klingel-14", "plattenabend", "vierter-stock", "zine-klub", "kaffee-karten", "nachtlinie", "sprechstunde", "riso-abend", "lange-tafel", "strobo", "tunnelblick", "spiegelsaal", "pegel"];

  const NIGHTS = [
    ["A$AP Rocky", "KONZERT", "18:30", 21, "#ffd93d", "01"],
    ["Nick Cave", "KONZERT", "20:00", 26, "#e8d9b8", "02"],
    ["Bonez & RAF", "KONZERT", "20:00", 21, "#1fa88a", "03"],
    ["Thirty Seconds", "KONZERT", "19:52", 21, "#d94a6a", "04"],
    ["AnnenMayKantereit", "KONZERT", "19:30", 26, "#c2452c", "05"],
    ["Elysium", "FESTIVAL", "22:00", 12, "#2ee6c0", "06"],
    ["Tollwood", "FESTIVAL", "18:00", 26, "#8fd14f", "07"],
    ["Mondscheinexpress", "FESTIVAL", "21:00", 25, "#c9d6ff", "08"],
    ["Isle of Summer", "FESTIVAL", "16:00", 44, "#ff3f6e", "09"],
    ["Zamanand", "FESTIVAL", "16:00", 18, "#f0b23f", "10"],
    ["Blitz", "RAVE", "23:59", 8, "#00e0d0", "11"],
    ["Rote Sonne", "RAVE", "12:00", 15, "#ffd45e", "12"],
    ["Silo West", "RAVE", "14:00", 32, "#ffb03f", "13"],
    ["CFU Open Air", "RAVE", "14:00", 24, "#4ee0b0", "14"],
    ["Daytime Rave", "RAVE", "17:00", 20, "#ff7a2f", "15"],
    ["Echonomist", "CLUB NIGHT", "22:00", 14, "#d63f5e", "16"],
    ["Blurred Vision", "CLUB NIGHT", "22:00", 11, "#2ee6ff", "17"],
    ["Legal × Blitz", "CLUB NIGHT", "23:00", 9, "#c2352a", "18"],
    ["Bahnwärter Thiel", "CLUB NIGHT", "22:00", 19, "#e8b53f", "19"],
    ["Unterwelt", "CLUB NIGHT", "22:00", 17, "#ffcf3d", "20"],
    ["Küchentisch", "HAUSPARTY", "21:00", 6, "#d1452e", "21"],
    ["3. Stock Links", "HAUSPARTY", "20:00", 4, "#ffd166", "22"],
    ["Boxenturm", "HAUSPARTY", "22:00", 5, "#e05a2b", "23"],
    ["Klingel 14", "HAUSPARTY", "22:00", 7, "#c2352a", "24"],
    ["Plattenabend", "HAUSPARTY", "20:00", 10, "#f0c93d", "25"],
    ["Vierter Stock", "HAUSPARTY", "21:00", 12, "#e0a53d", "26"],
    ["Zine Klub", "MEETUP", "19:00", 3, "#f2b33d", "27"],
    ["Kaffee & Karten", "MEETUP", "15:00", 8, "#8a5a3c", "28"],
    ["Nachtlinie", "MEETUP", "18:00", 13, "#4fc4a8", "29"],
    ["Sprechstunde", "MEETUP", "19:30", 16, "#f6d64a", "30"],
    ["Riso Abend", "MEETUP", "18:00", 22, "#ff4d8d", "31"],
    ["Lange Tafel", "MEETUP", "18:30", 27, "#d97b3f", "32"],
    ["Strobo", "RAVE", "01:00", 29, "#c8ff3d", "33"],
    ["Tunnelblick", "RAVE", "22:00", 23, "#ff2ea6", "34"],
    ["Spiegelsaal", "CLUB NIGHT", "23:00", 18, "#c9d6ff", "35"],
    ["Pegel", "CLUB NIGHT", "22:00", 15, "#ff5c1f", "36"],
  ].map((g) => ({
    name: g[0], kind: g[1], time: g[2], mins: g[3], colour: g[4],
    page: "explore/" + SLUG[+g[5] - 1] + "/index.html",
  }));





  /* The camera looks from 44 degrees of latitude. We spread the events
     across that band so that
     a few of them are in frame at any moment as the globe turns. */
  NIGHTS.forEach((g, i) => {
    const lat = 0.77 + ((i % 5) - 2) * 0.09;          // the band the frame sees
    const lon = (i / NIGHTS.length) * Math.PI * 2 + (i % 3) * 0.05;
    const target = [
      Math.cos(lon) * Math.cos(lat),
      Math.sin(lat),
      Math.sin(lon) * Math.cos(lat),
    ];
    let best = null, bestDot = -2;
    BUILDINGS.forEach((b) => {
      const s = dot(b.u, target);
      if (s > bestDot) { bestDot = s; best = b; }
    });
    g.building = best;
  });

  // ---------- projection ----------
  let angle = 0.4, dragTilt = 0.12;

  function project(p) {
    const rx = p[0];
    const rz = p[2];
    const ty = p[1] - CAM_Y;
    const tz = rz - CAM_Z;
    const y2 = ty * cosE - tz * sinE;
    const z2 = ty * sinE + tz * cosE;
    const s = FOCUS / -z2;
    return { x: CENTRE_X + rx * s, y: CENTRE_Y - y2 * s, d: -z2, s: s };
  }

  /* First longitude (Y axis), then latitude (X axis) */
  function rotate(v, cosA, sinA, cosT, sinT) {
    const x = v[0] * cosA - v[2] * sinA;
    const z = v[0] * sinA + v[2] * cosA;
    return [x, v[1] * cosT - z * sinT, v[1] * sinT + z * cosT];
  }

  // ---------- canvas ----------
  const ctx = stage.getContext("2d");
  let SCALE = 1, SHIFT_X = 0, SHIFT_Y = 0;

  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    stage.width = Math.round(r.width * dpr);
    stage.height = Math.round(r.height * dpr);
    // The design space is 1440x900; fill the frame (let it run past the edges)
    SCALE = Math.max(r.width / G, r.height / Y) * dpr;
    SHIFT_X = (stage.width - G * SCALE) / 2;
    SHIFT_Y = (stage.height - Y * SCALE) / 2;
  }
  resize();
  window.addEventListener("resize", resize);

  // The silhouette of the globe does not change as it turns: work it out once
  const LIMB = (function () {
    const e1 = unit(cross(VIEW, [0, 1, 0]));
    const e2 = cross(VIEW, e1);
    const centreDistance = (R * R) / DISTANCE;
    const radius = R * Math.sqrt(Math.max(0, 1 - (R * R) / (DISTANCE * DISTANCE)));
    const n = [];
    for (let i = 0; i < 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      n.push(project([
        VIEW[0] * centreDistance + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * radius,
        VIEW[1] * centreDistance + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * radius,
        VIEW[2] * centreDistance + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * radius,
      ]));
    }
    return n;
  })();

  // ---------- colour mixing ----------
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => {
    const x = rgb(a), y = rgb(b);
    return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  };

  /* Around an event, everything takes that night's colour: the event
     colours the neighbourhood
     brings the neighbourhood to life. Computed once, so the draw loop
     stays cheap. */
  const HALO_ANGLE = 0.12;
  BUILDINGS.forEach((b) => {
    b.faces = [ROOF[b.tone], SIDE_A[b.tone], SIDE_B[b.tone]];
  });
  NIGHTS.forEach((g) => {
    BUILDINGS.forEach((b) => {
      const s2 = dot(b.u, g.building.u);
      if (s2 < Math.cos(HALO_ANGLE)) return;
      const t = (1 - Math.acos(Math.min(1, s2)) / HALO_ANGLE) * 0.8;
      b.faces = [
        mix(b.faces[0], g.colour, t),
        mix(b.faces[1], g.colour, t * 0.7),
        mix(b.faces[2], g.colour, t * 0.5),
      ];
    });
  });

  /* The stain on the ground: graded rings under every event */
  function surfaceRing(u, angular, steps) {
    const ref = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = unit(cross(ref, u));
    const e2 = cross(u, e1);
    const n = [];
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      n.push(unit([
        u[0] * Math.cos(angular) + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * Math.sin(angular),
        u[1] * Math.cos(angular) + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * Math.sin(angular),
        u[2] * Math.cos(angular) + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * Math.sin(angular),
      ]));
    }
    return n;
  }

  const STAIN = [
    { a: 0.155, o: 0.09 }, { a: 0.105, o: 0.12 }, { a: 0.06, o: 0.18 },
  ];
  NIGHTS.forEach((g) => {
    g.stain = STAIN.map((l) => surfaceRing(g.building.u, l.a, 20));
  });

  const SHELL = [
    { g: 13, o: 0.09 }, { g: 7.4, o: 0.17 },
    { g: 3.8, o: 0.34 }, { g: 1.6, o: 0.92 },
  ];

  let hovered = null;

  // ---------- dragging (both axes inverted) ----------
  let speed = 0.11;
  let dragging = false, lastX = 0, lastY = 0, idleTime = 0;

  stage.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });

  stage.addEventListener("pointermove", (e) => {
    if (dragging) {
      angle -= (e.clientX - lastX) * 0.006;
      dragTilt += (e.clientY - lastY) * 0.005;
      dragTilt = Math.max(-0.62, Math.min(0.62, dragTilt));
      lastX = e.clientX; lastY = e.clientY;
      return;
    }
    // Are we over a beacon? (no DOM on a canvas, so a hit test by hand)
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) * (stage.width / r.width);
    const py = (e.clientY - r.top) * (stage.height / r.height);
    let hit = null, nearest = 16 * SCALE;
    beacons.forEach((b) => {
      if (!b.visible || b.visible < 0.4) return;
      const d = distanceToSegment(px, py, b.bottomE, b.topE);
      if (d < nearest) { nearest = d; hit = b.g; }
    });
    hovered = hit;
    stage.style.cursor = hit ? "pointer" : "grab";
  });

  const release = () => { if (dragging) { dragging = false; idleTime = 0; } };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("pointerleave", () => { hovered = null; });
  stage.addEventListener("click", () => {
    if (hovered) window.open(hovered.page, "_blank", "noopener");
  });

  function distanceToSegment(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    let t = lengthSq ? ((px - a.x) * dx + (py - a.y) * dy) / lengthSq : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  }

  // ---------- drawing ----------
  const BEACON_HEIGHT = 132;
  const beacons = NIGHTS.map((g) => ({ g: g, visible: 0, bottomE: null, topE: null }));
  let lastTime = performance.now();

  const E = (q) => ({ x: SHIFT_X + q.x * SCALE, y: SHIFT_Y + q.y * SCALE });

  function draw(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (!dragging) {
      idleTime += dt;
      if (idleTime > 2.5) angle -= speed * dt;
    }

    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const cosT = Math.cos(dragTilt), sinT = Math.sin(dragTilt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, stage.width, stage.height);
    ctx.setTransform(SCALE, 0, 0, SCALE, SHIFT_X, SHIFT_Y);

    // --- the ground of the globe ---
    ctx.beginPath();
    LIMB.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    ctx.fillStyle = "#191a1e";
    ctx.fill();
    ctx.strokeStyle = "#2e3238";
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- the event stains (under the buildings) ---
    NIGHTS.forEach((g) => {
      const ur = rotate(g.building.u, cosA, sinA, cosT, sinT);
      if (dot(ur, unit(subtract(CAMERA, [ur[0] * R, ur[1] * R, ur[2] * R]))) < 0.06) return;
      g.stain.forEach((ring, k) => {
        ctx.beginPath();
        ring.forEach((v, i) => {
          const w = rotate(v, cosA, sinA, cosT, sinT);
          const q = project([w[0] * (R + 0.6), w[1] * (R + 0.6), w[2] * (R + 0.6)]);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.globalAlpha = STAIN[k].o;
        ctx.fillStyle = g.colour;
        ctx.fill();
      });
    });
    ctx.globalAlpha = 1;

    // --- the buildings ---
    const list = [];
    BUILDINGS.forEach((b) => {
      const ur = rotate(b.u, cosA, sinA, cosT, sinT);
      const centre = [ur[0] * R, ur[1] * R, ur[2] * R];
      const facing = dot(ur, unit(subtract(CAMERA, centre)));
      if (facing < 0.02) return;
      const om = project(centre);
      if (om.x < -260 || om.x > G + 260 || om.y < -260 || om.y > Y + 260) return;
      // fade out at the horizon instead of cutting hard
      const fade = Math.min(1, (facing - 0.02) / 0.16);

      const dr = rotate(b.east, cosA, sinA, cosT, sinT);
      const kr = rotate(b.north, cosA, sinA, cosT, sinT);
      const k = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
        [0, b.h].forEach((yy) => {
          const rr = R + yy;
          k.push(project([
            ur[0] * rr + dr[0] * sx * b.g / 2 + kr[0] * sz * b.d / 2,
            ur[1] * rr + dr[1] * sx * b.g / 2 + kr[1] * sz * b.d / 2,
            ur[2] * rr + dr[2] * sx * b.g / 2 + kr[2] * sz * b.d / 2,
          ]));
        });
      });
      const T = [k[1], k[3], k[5], k[7]];
      const A = [k[0], k[2], k[4], k[6]];
      [
        { p: T, tone: b.faces[0] },
        { p: [A[0], A[1], T[1], T[0]], tone: b.faces[1] },
        { p: [A[2], A[3], T[3], T[2]], tone: b.faces[1] },
        { p: [A[1], A[2], T[2], T[1]], tone: b.faces[2] },
        { p: [A[3], A[0], T[0], T[3]], tone: b.faces[2] },
      ].forEach((f) => {
        let area = 0;
        for (let i = 0; i < 4; i++) {
          const a = f.p[i], c = f.p[(i + 1) % 4];
          area += a.x * c.y - c.x * a.y;
        }
        if (area >= 0) return;
        list.push({
          d: (f.p[0].d + f.p[1].d + f.p[2].d + f.p[3].d) / 4,
          p: f.p, tone: f.tone, fade: fade,
        });
      });
    });

    list.sort((a, b) => b.d - a.d);

    ctx.lineWidth = 0.7;
    ctx.lineJoin = "round";
    ctx.strokeStyle = OUTLINE;
    let lastAlpha = -1;
    list.forEach((f) => {
      if (f.fade !== lastAlpha) { ctx.globalAlpha = f.fade; lastAlpha = f.fade; }
      ctx.beginPath();
      ctx.moveTo(f.p[0].x, f.p[0].y);
      ctx.lineTo(f.p[1].x, f.p[1].y);
      ctx.lineTo(f.p[2].x, f.p[2].y);
      ctx.lineTo(f.p[3].x, f.p[3].y);
      ctx.closePath();
      ctx.fillStyle = f.tone;
      ctx.fill();
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // --- the beacons ---
    ctx.font = "10.5px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    beacons.forEach((b) => {
      const g = b.g, building = g.building;
      const ur = rotate(building.u, cosA, sinA, cosT, sinT);
      const base = [ur[0] * (R + building.h), ur[1] * (R + building.h), ur[2] * (R + building.h)];
      const topR = R + building.h + BEACON_HEIGHT;
      const bottom = project(base);
      const top = project([ur[0] * topR, ur[1] * topR, ur[2] * topR]);

      const faces = dot(ur, unit(subtract(CAMERA, base)));
      b.visible = Math.max(0, Math.min(1, (faces - 0.03) * 2.6));
      b.bottomE = E(bottom); b.topE = E(top);
      if (b.visible <= 0.01) return;

      const dx = top.x - bottom.x, dy = top.y - bottom.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length, ny = dx / length;

      const bright = hovered === g ? 1.35 : 1;
      SHELL.forEach((kb) => {
        const wa = kb.g * bottom.s, wu = kb.g * top.s;
        ctx.globalAlpha = Math.min(1, kb.o * b.visible * bright);
        ctx.fillStyle = g.colour;
        ctx.beginPath();
        ctx.moveTo(bottom.x - nx * wa, bottom.y - ny * wa);
        ctx.lineTo(bottom.x + nx * wa, bottom.y + ny * wa);
        ctx.lineTo(top.x + nx * wu, top.y + ny * wu);
        ctx.lineTo(top.x - nx * wu, top.y - ny * wu);
        ctx.closePath();
        ctx.fill();
      });

      ctx.globalAlpha = b.visible;
      ctx.fillStyle = g.colour;
      ctx.fillText(g.time, top.x, top.y - 12);
      ctx.globalAlpha = 1;
    });

    // --- the hover label ---
    if (hovered) {
      const b = beacons.find((x) => x.g === hovered);
      const u = unproject(b.topE);
      const x = u.x + 26, y = u.y - 40;
      ctx.textAlign = "left";
      ctx.strokeStyle = "#f0f0ee";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 6); ctx.lineTo(x - 4, y + 6);
      ctx.stroke();
      ctx.fillStyle = "#f0f0ee";
      ctx.font = "500 19px 'Inter Tight', sans-serif";
      ctx.fillText(hovered.name, x, y + 12);
      ctx.font = "10.5px 'JetBrains Mono', ui-monospace, monospace";
      ctx.globalAlpha = 0.72;
      ctx.fillText(hovered.kind + " · " + hovered.time, x, y + 32);
      ctx.fillText(hovered.mins + " MIN WALK", x, y + 50);
      ctx.globalAlpha = 1;
    }
  }

  /* The nights on the globe are readable from outside too: the maps page
     fills its
     "within walking distance" list from these real minutes. */
  window.AH_NIGHTS = NIGHTS;

  // From screen coordinates back to design coordinates
  const unproject = (q) => ({ x: (q.x - SHIFT_X) / SCALE, y: (q.y - SHIFT_Y) / SCALE });

  /* Draw only while this screen is in front. A timer, not rAF, because
     the preview panel reports the document as hidden and rAF never fires
     there — but a fixed 16ms interval also ticked all day on the other
     five screens. The timer stretches to 200ms while the globe is off
     screen and tightens back the moment it is on. */
  draw(performance.now());
  (function tick() {
    const active = document.body.dataset.screen === "3";
    if (active) draw(performance.now());
    setTimeout(tick, active ? 16 : 200);
  })();
})();
