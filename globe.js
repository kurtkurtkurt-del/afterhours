/* afterhours — donen sehir kuresi.
   Three.js yok: kendi izdusum matematigi, SVG'ye cizim.
   Bir atlasa yukaridan bakiyormus gibi: binalar kurenin uzerinde,
   sadece one bakan yarikure gorunur, cevirince arkasi one gelir. */

(function () {
  const sahne = document.getElementById("s4-stage");
  if (!sahne) return;

  const NS = "http://www.w3.org/2000/svg";
  const G = 1440, Y = 900;
  const R = 540;                              // kure yaricapi
  const KAM_Y = 1150, KAM_Z = 1180;
  const UZAKLIK = Math.hypot(KAM_Y, KAM_Z);
  const EGIM = Math.atan2(KAM_Y, KAM_Z);
  const ODAK = 2300;
  const MERKEZ_X = G / 2, MERKEZ_Y = 1000;

  const CATI = ["#4e535b", "#454a52", "#3c4149", "#565c65", "#3a3f47"];
  const YAN_A = ["#2c3036", "#272b31", "#22262b", "#31363d", "#212429"];
  const YAN_B = ["#1b1e22", "#181a1e", "#15171b", "#1f2227", "#141619"];
  const KONTUR = "#5c626b";

  /* Onceki LCG carpimi 2^53'u asip hassasiyet kaybediyordu; uretec bozulunca
     kurede duzenli bosluklar olusuyordu. mulberry32 32 bitte guvenli. */
  let tohum = 20260828 >>> 0;
  function rnd() {
    tohum = (tohum + 0x6D2B79F5) >>> 0;
    let t = tohum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const cosE = Math.cos(EGIM), sinE = Math.sin(EGIM);

  // ---------- vektor yardimcilari ----------
  const cikar = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const capraz = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const nokta = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const birim = (a) => { const u = Math.hypot(a[0], a[1], a[2]); return [a[0] / u, a[1] / u, a[2] / u]; };

  const KAMERA = [0, KAM_Y, KAM_Z];
  const BAKIS = birim(KAMERA);

  // ---------- kure uzerine binalar (fibonacci dagilimi) ----------
  const BINALAR = [];
  const ADET = 4200;

  for (let i = 0; i < ADET; i++) {
    const yy = 1 - (i / (ADET - 1)) * 2;
    const halka = Math.sqrt(Math.max(0, 1 - yy * yy));
    const aci = i * 2.399963;
    const u = [Math.cos(aci) * halka, yy, Math.sin(aci) * halka];

    // Kitalar: bosluklu bolgeler olussun diye birkac dalga
    const kara =
      Math.sin(u[0] * 3.1 + 0.6) +
      Math.cos(u[2] * 2.7 - 1.1) +
      Math.sin((u[1] + u[0]) * 2.2);
    if (rnd() > 0.93) continue;

    // Kutupta [0,1,0] ile capraz sifir cikar; orada baska bir referans kullan
    const ref = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const dogu = birim(capraz(ref, u));
    const kuzey = capraz(u, dogu);

    BINALAR.push({
      u: u, dogu: dogu, kuzey: kuzey,
      g: 11 + rnd() * 8,
      d: 11 + rnd() * 8,
      h: 5 + rnd() * 20 + (kara > 1.2 ? 16 : 0),
      ton: Math.floor(rnd() * 5),
    });
  }

  // ---------- beacon'lar: renk o gecenin posterinden ----------
  const SLUG = ["asap-rocky", "nick-cave", "bonez-mc-raf-camora", "thirty-seconds-to-mars", "annenmaykantereit", "elysium", "tollwood", "mondscheinexpress", "isle-of-summer", "zamanand", "blitz", "rote-sonne-bahnwarter", "silo-west", "cfu-open-air", "daytime-rave", "echonomist", "10-years-blurred-vision", "legal-blitz", "bahnwarter-techno-nacht", "unterwelt", "kuchentisch", "3-stock-links", "boxenturm", "klingel-14", "plattenabend", "vierter-stock", "zine-klub", "kaffee-karten", "nachtlinie", "sprechstunde", "riso-abend", "lange-tafel", "strobo", "tunnelblick", "spiegelsaal", "pegel"];

  const GECELER = [
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
    ad: g[0], tip: g[1], saat: g[2], dk: g[3], renk: g[4],
    sayfa: "explore/" + SLUG[+g[5] - 1] + "/index.html",
  }));





  /* Kamera 44 derece enlemden bakiyor. Etkinlikleri o kusaga yayiyoruz ki
     kure donerken her an birkaci kadrajda olsun. */
  GECELER.forEach((g, i) => {
    const enlem = 0.77 + ((i % 5) - 2) * 0.09;          // kadrajin gordugu kusak
    const boylam = (i / GECELER.length) * Math.PI * 2 + (i % 3) * 0.05;
    const hedef = [
      Math.cos(boylam) * Math.cos(enlem),
      Math.sin(enlem),
      Math.sin(boylam) * Math.cos(enlem),
    ];
    let en = null, enYakin = -2;
    BINALAR.forEach((b) => {
      const s = nokta(b.u, hedef);
      if (s > enYakin) { enYakin = s; en = b; }
    });
    g.bina = en;
  });

  // ---------- izdusum ----------
  let aci = 0.4, egim2 = 0.12;

  function yansit(p) {
    const rx = p[0];
    const rz = p[2];
    const ty = p[1] - KAM_Y;
    const tz = rz - KAM_Z;
    const y2 = ty * cosE - tz * sinE;
    const z2 = ty * sinE + tz * cosE;
    const s = ODAK / -z2;
    return { x: MERKEZ_X + rx * s, y: MERKEZ_Y - y2 * s, d: -z2, s: s };
  }

  /* Once boylam (Y ekseni), sonra enlem (X ekseni) donusu */
  function dondur(v, cosA, sinA, cosT, sinT) {
    const x = v[0] * cosA - v[2] * sinA;
    const z = v[0] * sinA + v[2] * cosA;
    return [x, v[1] * cosT - z * sinT, v[1] * sinT + z * cosT];
  }

  // ---------- canvas ----------
  const ctx = sahne.getContext("2d");
  let OLCEK = 1, KAY_X = 0, KAY_Y = 0;

  function boyutla() {
    const r = sahne.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    sahne.width = Math.round(r.width * dpr);
    sahne.height = Math.round(r.height * dpr);
    // Tasarim alani 1440x900; kadraji doldur (kenarlardan tassin)
    OLCEK = Math.max(r.width / G, r.height / Y) * dpr;
    KAY_X = (sahne.width - G * OLCEK) / 2;
    KAY_Y = (sahne.height - Y * OLCEK) / 2;
  }
  boyutla();
  window.addEventListener("resize", boyutla);

  // Kurenin silueti donusten etkilenmez: bir kez hesapla
  const LIMB = (function () {
    const e1 = birim(capraz(BAKIS, [0, 1, 0]));
    const e2 = capraz(BAKIS, e1);
    const merkezMesafe = (R * R) / UZAKLIK;
    const yaricap = R * Math.sqrt(Math.max(0, 1 - (R * R) / (UZAKLIK * UZAKLIK)));
    const n = [];
    for (let i = 0; i < 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      n.push(yansit([
        BAKIS[0] * merkezMesafe + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * yaricap,
        BAKIS[1] * merkezMesafe + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * yaricap,
        BAKIS[2] * merkezMesafe + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * yaricap,
      ]));
    }
    return n;
  })();

  // ---------- renk karistirma ----------
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const onalti = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const karistir = (a, b, t) => {
    const x = rgb(a), y = rgb(b);
    return onalti([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  };

  /* Etkinligin cevresi o gecenin rengine boyanir: etkinlik mahalleyi
     canlandiriyor. Bir kez hesaplanir, cizim dongusu ucuz kalir. */
  const HALO_ACI = 0.12;
  BINALAR.forEach((b) => {
    b.yuz = [CATI[b.ton], YAN_A[b.ton], YAN_B[b.ton]];
  });
  GECELER.forEach((g) => {
    BINALAR.forEach((b) => {
      const s2 = nokta(b.u, g.bina.u);
      if (s2 < Math.cos(HALO_ACI)) return;
      const t = (1 - Math.acos(Math.min(1, s2)) / HALO_ACI) * 0.8;
      b.yuz = [
        karistir(b.yuz[0], g.renk, t),
        karistir(b.yuz[1], g.renk, t * 0.7),
        karistir(b.yuz[2], g.renk, t * 0.5),
      ];
    });
  });

  /* Zemin lekesi: her etkinligin altinda kademeli halkalar */
  function yuzeyHalka(u, acisal, adim) {
    const ref = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = birim(capraz(ref, u));
    const e2 = capraz(u, e1);
    const n = [];
    for (let i = 0; i < adim; i++) {
      const t = (i / adim) * Math.PI * 2;
      n.push(birim([
        u[0] * Math.cos(acisal) + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * Math.sin(acisal),
        u[1] * Math.cos(acisal) + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * Math.sin(acisal),
        u[2] * Math.cos(acisal) + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * Math.sin(acisal),
      ]));
    }
    return n;
  }

  const LEKE = [
    { a: 0.155, o: 0.09 }, { a: 0.105, o: 0.12 }, { a: 0.06, o: 0.18 },
  ];
  GECELER.forEach((g) => {
    g.leke = LEKE.map((l) => yuzeyHalka(g.bina.u, l.a, 20));
  });

  const KABUK = [
    { g: 13, o: 0.09 }, { g: 7.4, o: 0.17 },
    { g: 3.8, o: 0.34 }, { g: 1.6, o: 0.92 },
  ];

  let secili = null;

  // ---------- surukleme (iki eksen de ters) ----------
  let hiz = 0.11;
  let surukluyor = false, sonX = 0, sonY = 0, bosZaman = 0;

  sahne.addEventListener("pointerdown", (e) => {
    surukluyor = true; sonX = e.clientX; sonY = e.clientY;
    try { sahne.setPointerCapture(e.pointerId); } catch (_) {}
  });

  sahne.addEventListener("pointermove", (e) => {
    if (surukluyor) {
      aci -= (e.clientX - sonX) * 0.006;
      egim2 += (e.clientY - sonY) * 0.005;
      egim2 = Math.max(-0.62, Math.min(0.62, egim2));
      sonX = e.clientX; sonY = e.clientY;
      return;
    }
    // Beacon uzerinde miyiz? (canvas'ta DOM yok, elle vurus testi)
    const r = sahne.getBoundingClientRect();
    const px = (e.clientX - r.left) * (sahne.width / r.width);
    const py = (e.clientY - r.top) * (sahne.height / r.height);
    let en = null, enYakin = 16 * OLCEK;
    beaconlar.forEach((b) => {
      if (!b.gorunur || b.gorunur < 0.4) return;
      const d = mesafeSegmente(px, py, b.altE, b.ustE);
      if (d < enYakin) { enYakin = d; en = b.g; }
    });
    secili = en;
    sahne.style.cursor = en ? "pointer" : "grab";
  });

  const birak = () => { if (surukluyor) { surukluyor = false; bosZaman = 0; } };
  sahne.addEventListener("pointerup", birak);
  sahne.addEventListener("pointercancel", birak);
  sahne.addEventListener("pointerleave", () => { secili = null; });
  sahne.addEventListener("click", () => {
    if (secili) window.open(secili.sayfa, "_blank", "noopener");
  });

  function mesafeSegmente(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const uz = dx * dx + dy * dy;
    let t = uz ? ((px - a.x) * dx + (py - a.y) * dy) / uz : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  }

  // ---------- cizim ----------
  const BEACON_BOY = 132;
  const beaconlar = GECELER.map((g) => ({ g: g, gorunur: 0, altE: null, ustE: null }));
  let oncekiZaman = performance.now();

  const E = (q) => ({ x: KAY_X + q.x * OLCEK, y: KAY_Y + q.y * OLCEK });

  function ciz(simdi) {
    const dt = Math.min(0.05, (simdi - oncekiZaman) / 1000);
    oncekiZaman = simdi;

    if (!surukluyor) {
      bosZaman += dt;
      if (bosZaman > 2.5) aci -= hiz * dt;
    }

    const cosA = Math.cos(aci), sinA = Math.sin(aci);
    const cosT = Math.cos(egim2), sinT = Math.sin(egim2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, sahne.width, sahne.height);
    ctx.setTransform(OLCEK, 0, 0, OLCEK, KAY_X, KAY_Y);

    // --- kure zemini ---
    ctx.beginPath();
    LIMB.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    ctx.fillStyle = "#191a1e";
    ctx.fill();
    ctx.strokeStyle = "#2e3238";
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- etkinlik lekeleri (binalarin altinda) ---
    GECELER.forEach((g) => {
      const ur = dondur(g.bina.u, cosA, sinA, cosT, sinT);
      if (nokta(ur, birim(cikar(KAMERA, [ur[0] * R, ur[1] * R, ur[2] * R]))) < 0.06) return;
      g.leke.forEach((halka, k) => {
        ctx.beginPath();
        halka.forEach((v, i) => {
          const w = dondur(v, cosA, sinA, cosT, sinT);
          const q = yansit([w[0] * (R + 0.6), w[1] * (R + 0.6), w[2] * (R + 0.6)]);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.globalAlpha = LEKE[k].o;
        ctx.fillStyle = g.renk;
        ctx.fill();
      });
    });
    ctx.globalAlpha = 1;

    // --- binalar ---
    const liste = [];
    BINALAR.forEach((b) => {
      const ur = dondur(b.u, cosA, sinA, cosT, sinT);
      const merkez = [ur[0] * R, ur[1] * R, ur[2] * R];
      const bakis = nokta(ur, birim(cikar(KAMERA, merkez)));
      if (bakis < 0.02) return;
      const om = yansit(merkez);
      if (om.x < -260 || om.x > G + 260 || om.y < -260 || om.y > Y + 260) return;
      // ufukta sert kesme yerine sonumleme
      const solma = Math.min(1, (bakis - 0.02) / 0.16);

      const dr = dondur(b.dogu, cosA, sinA, cosT, sinT);
      const kr = dondur(b.kuzey, cosA, sinA, cosT, sinT);
      const k = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
        [0, b.h].forEach((yy) => {
          const rr = R + yy;
          k.push(yansit([
            ur[0] * rr + dr[0] * sx * b.g / 2 + kr[0] * sz * b.d / 2,
            ur[1] * rr + dr[1] * sx * b.g / 2 + kr[1] * sz * b.d / 2,
            ur[2] * rr + dr[2] * sx * b.g / 2 + kr[2] * sz * b.d / 2,
          ]));
        });
      });
      const T = [k[1], k[3], k[5], k[7]];
      const A = [k[0], k[2], k[4], k[6]];
      [
        { p: T, ton: b.yuz[0] },
        { p: [A[0], A[1], T[1], T[0]], ton: b.yuz[1] },
        { p: [A[2], A[3], T[3], T[2]], ton: b.yuz[1] },
        { p: [A[1], A[2], T[2], T[1]], ton: b.yuz[2] },
        { p: [A[3], A[0], T[0], T[3]], ton: b.yuz[2] },
      ].forEach((f) => {
        let alan = 0;
        for (let i = 0; i < 4; i++) {
          const a = f.p[i], c = f.p[(i + 1) % 4];
          alan += a.x * c.y - c.x * a.y;
        }
        if (alan >= 0) return;
        liste.push({
          d: (f.p[0].d + f.p[1].d + f.p[2].d + f.p[3].d) / 4,
          p: f.p, ton: f.ton, solma: solma,
        });
      });
    });

    liste.sort((a, b) => b.d - a.d);

    ctx.lineWidth = 0.7;
    ctx.lineJoin = "round";
    ctx.strokeStyle = KONTUR;
    let sonAlfa = -1;
    liste.forEach((f) => {
      if (f.solma !== sonAlfa) { ctx.globalAlpha = f.solma; sonAlfa = f.solma; }
      ctx.beginPath();
      ctx.moveTo(f.p[0].x, f.p[0].y);
      ctx.lineTo(f.p[1].x, f.p[1].y);
      ctx.lineTo(f.p[2].x, f.p[2].y);
      ctx.lineTo(f.p[3].x, f.p[3].y);
      ctx.closePath();
      ctx.fillStyle = f.ton;
      ctx.fill();
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // --- beacon'lar ---
    ctx.font = "10.5px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    beaconlar.forEach((b) => {
      const g = b.g, bina = g.bina;
      const ur = dondur(bina.u, cosA, sinA, cosT, sinT);
      const taban = [ur[0] * (R + bina.h), ur[1] * (R + bina.h), ur[2] * (R + bina.h)];
      const tepeR = R + bina.h + BEACON_BOY;
      const alt = yansit(taban);
      const ust = yansit([ur[0] * tepeR, ur[1] * tepeR, ur[2] * tepeR]);

      const yuz = nokta(ur, birim(cikar(KAMERA, taban)));
      b.gorunur = Math.max(0, Math.min(1, (yuz - 0.03) * 2.6));
      b.altE = E(alt); b.ustE = E(ust);
      if (b.gorunur <= 0.01) return;

      const dx = ust.x - alt.x, dy = ust.y - alt.y;
      const uz = Math.hypot(dx, dy) || 1;
      const nx = -dy / uz, ny = dx / uz;

      const parlak = secili === g ? 1.35 : 1;
      KABUK.forEach((kb) => {
        const wa = kb.g * alt.s, wu = kb.g * ust.s;
        ctx.globalAlpha = Math.min(1, kb.o * b.gorunur * parlak);
        ctx.fillStyle = g.renk;
        ctx.beginPath();
        ctx.moveTo(alt.x - nx * wa, alt.y - ny * wa);
        ctx.lineTo(alt.x + nx * wa, alt.y + ny * wa);
        ctx.lineTo(ust.x + nx * wu, ust.y + ny * wu);
        ctx.lineTo(ust.x - nx * wu, ust.y - ny * wu);
        ctx.closePath();
        ctx.fill();
      });

      ctx.globalAlpha = b.gorunur;
      ctx.fillStyle = g.renk;
      ctx.fillText(g.saat, ust.x, ust.y - 12);
      ctx.globalAlpha = 1;
    });

    // --- hover etiketi ---
    if (secili) {
      const b = beaconlar.find((x) => x.g === secili);
      const u = yansitTers(b.ustE);
      const x = u.x + 26, y = u.y - 40;
      ctx.textAlign = "left";
      ctx.strokeStyle = "#f0f0ee";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 6); ctx.lineTo(x - 4, y + 6);
      ctx.stroke();
      ctx.fillStyle = "#f0f0ee";
      ctx.font = "500 19px 'Inter Tight', sans-serif";
      ctx.fillText(secili.ad, x, y + 12);
      ctx.font = "10.5px 'JetBrains Mono', ui-monospace, monospace";
      ctx.globalAlpha = 0.72;
      ctx.fillText(secili.tip + " · " + secili.saat, x, y + 32);
      ctx.fillText(secili.dk + " MIN WALK", x, y + 50);
      ctx.globalAlpha = 1;
    }
  }

  /* Kuredeki geceler disaridan da okunabilsin: maps sayfasi yanindaki
     "yurume mesafesinde" listesini bu gercek dakikalardan doldurur. */
  window.AH_GECELER = GECELER;

  // Ekran koordinatindan tasarim koordinatina geri
  const yansitTers = (q) => ({ x: (q.x - KAY_X) / OLCEK, y: (q.y - KAY_Y) / OLCEK });

  /* Sadece bu ekran ondeyken ciz. rAF onizleme panelinde hic tetiklenmiyor
     (panel belgeyi "hidden" sayiyor), o yuzden zamanlayici kullaniyoruz. */
  ciz(performance.now());
  setInterval(() => {
    if (document.body.dataset.ekran === "3") ciz(performance.now());
  }, 16);
})();
