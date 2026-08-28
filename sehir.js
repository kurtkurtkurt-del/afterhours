/* afterhours — donen sehir kuresi.
   Three.js yok: kendi izdusum matematigi, SVG'ye cizim.
   Bir atlasa yukaridan bakiyormus gibi: binalar kurenin uzerinde,
   sadece one bakan yarikure gorunur, cevirince arkasi one gelir. */

(function () {
  const sahne = document.getElementById("k4-sahne");
  if (!sahne) return;

  const NS = "http://www.w3.org/2000/svg";
  const G = 1440, Y = 900;
  const R = 540;                              // kure yaricapi
  const KAM_Y = 1150, KAM_Z = 1180;
  const UZAKLIK = Math.hypot(KAM_Y, KAM_Z);
  const EGIM = Math.atan2(KAM_Y, KAM_Z);
  const ODAK = 1520;
  const MERKEZ_X = G / 2, MERKEZ_Y = 392;

  const CATI = ["#4e535b", "#454a52", "#3c4149", "#565c65", "#3a3f47"];
  const YAN_A = ["#2c3036", "#272b31", "#22262b", "#31363d", "#212429"];
  const YAN_B = ["#1b1e22", "#181a1e", "#15171b", "#1f2227", "#141619"];
  const KONTUR = "#5c626b";

  let tohum = 20260828;
  const rnd = () => (tohum = (tohum * 1103515245 + 12345) % 2147483648) / 2147483648;

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
  const ADET = 900;

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
    if (Math.abs(yy) > 0.97) continue;      // kutupta yerel eksen tanimsiz
    if (kara < -0.35) continue;
    if (rnd() > 0.9) continue;

    const dogu = birim(capraz([0, 1, 0], u));
    const kuzey = capraz(u, dogu);

    BINALAR.push({
      u: u, dogu: dogu, kuzey: kuzey,
      g: 13 + rnd() * 10,
      d: 13 + rnd() * 10,
      h: 10 + rnd() * 34 + (kara > 1.2 ? 22 : 0),
      ton: Math.floor(rnd() * 5),
    });
  }

  // ---------- beacon'lar: renk o gecenin posterinden ----------
  const GECELER = [
    { ad: "A$AP Rocky",        tip: "KONZERT",    saat: "18:30", dk: 21, renk: "#ffd93d", sayfa: "events/01.html" },
    { ad: "Nick Cave",         tip: "KONZERT",    saat: "20:00", dk: 26, renk: "#e8d9b8", sayfa: "events/02.html" },
    { ad: "Bonez & RAF",       tip: "KONZERT",    saat: "20:00", dk: 21, renk: "#1fa88a", sayfa: "events/03.html" },
    { ad: "Thirty Seconds",    tip: "KONZERT",    saat: "19:52", dk: 21, renk: "#d94a6a", sayfa: "events/04.html" },
    { ad: "AnnenMayKantereit", tip: "KONZERT",    saat: "19:30", dk: 26, renk: "#c2452c", sayfa: "events/05.html" },
    { ad: "Elysium",           tip: "FESTIVAL",   saat: "22:00", dk: 12, renk: "#2ee6c0", sayfa: "events/06.html" },
    { ad: "Tollwood",          tip: "FESTIVAL",   saat: "18:00", dk: 26, renk: "#8fd14f", sayfa: "events/07.html" },
    { ad: "Mondscheinexpress", tip: "FESTIVAL",   saat: "21:00", dk: 25, renk: "#c9d6ff", sayfa: "events/08.html" },
    { ad: "Isle of Summer",    tip: "FESTIVAL",   saat: "16:00", dk: 44, renk: "#ff3f6e", sayfa: "events/09.html" },
    { ad: "Zamanand",          tip: "FESTIVAL",   saat: "16:00", dk: 18, renk: "#f0b23f", sayfa: "events/10.html" },
    { ad: "Blitz",             tip: "RAVE",       saat: "23:59", dk: 8,  renk: "#00e0d0", sayfa: "events/11.html" },
    { ad: "Rote Sonne",        tip: "RAVE",       saat: "12:00", dk: 15, renk: "#ffd45e", sayfa: "events/12.html" },
    { ad: "Silo West",         tip: "RAVE",       saat: "14:00", dk: 32, renk: "#ffb03f", sayfa: "events/13.html" },
    { ad: "CFU Open Air",      tip: "RAVE",       saat: "14:00", dk: 24, renk: "#4ee0b0", sayfa: "events/14.html" },
    { ad: "Echonomist",        tip: "CLUB NIGHT", saat: "22:00", dk: 14, renk: "#d63f5e", sayfa: "events/16.html" },
    { ad: "Blurred Vision",    tip: "CLUB NIGHT", saat: "22:00", dk: 11, renk: "#2ee6ff", sayfa: "events/17.html" },
    { ad: "Bahnwärter Thiel",  tip: "CLUB NIGHT", saat: "22:00", dk: 19, renk: "#e8b53f", sayfa: "events/19.html" },
    { ad: "Unterwelt",         tip: "CLUB NIGHT", saat: "22:00", dk: 17, renk: "#ffcf3d", sayfa: "events/20.html" },
    { ad: "Boxenturm",         tip: "HAUSPARTY",  saat: "22:00", dk: 5,  renk: "#e05a2b", sayfa: "events/23.html" },
    { ad: "Zine Klub",         tip: "MEETUP",     saat: "19:00", dk: 3,  renk: "#f2b33d", sayfa: "events/27.html" },
  ];



  GECELER.forEach((g, i) => {
    const yy = 1 - ((i + 0.5) / GECELER.length) * 1.7 - 0.15;
    const halka = Math.sqrt(Math.max(0.02, 1 - yy * yy));
    const t = i * 2.399963;
    const hedef = [Math.cos(t) * halka, yy, Math.sin(t) * halka];
    let en = null, enYakin = -2;
    BINALAR.forEach((b) => {
      const s = nokta(b.u, hedef);
      if (s > enYakin) { enYakin = s; en = b; }
    });
    g.bina = en;
  });

  // ---------- izdusum ----------
  let aci = 0.4, egim2 = 0.12;

  function yansit(p, cosA, sinA) {
    const rx = p[0] * cosA - p[2] * sinA;
    const rz = p[0] * sinA + p[2] * cosA;
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

  // ---------- katmanlar ----------
  const zeminKat = document.createElementNS(NS, "g");
  const binaKat = document.createElementNS(NS, "g");
  const beaconKat = document.createElementNS(NS, "g");
  const etiketKat = document.createElementNS(NS, "g");
  sahne.append(zeminKat, binaKat, beaconKat, etiketKat);

  // Kurenin silueti donusten etkilenmez: bir kez hesapla
  const kure = document.createElementNS(NS, "polygon");
  kure.setAttribute("fill", "#191a1e");
  kure.setAttribute("stroke", "#2e3238");
  kure.setAttribute("stroke-width", "1");
  zeminKat.appendChild(kure);
  (function limb() {
    const e1 = birim(capraz(BAKIS, [0, 1, 0]));
    const e2 = capraz(BAKIS, e1);
    const merkezMesafe = (R * R) / UZAKLIK;
    const yaricap = R * Math.sqrt(Math.max(0, 1 - (R * R) / (UZAKLIK * UZAKLIK)));
    const n = [];
    for (let i = 0; i < 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      const p = [
        BAKIS[0] * merkezMesafe + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * yaricap,
        BAKIS[1] * merkezMesafe + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * yaricap,
        BAKIS[2] * merkezMesafe + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * yaricap,
      ];
      const q = yansit(p, 1, 0);
      n.push(q.x.toFixed(1) + "," + q.y.toFixed(1));
    }
    kure.setAttribute("points", n.join(" "));
  })();

  const HAVUZ = 1500;
  const yuzler = [];
  for (let i = 0; i < HAVUZ; i++) {
    const p = document.createElementNS(NS, "polygon");
    p.setAttribute("stroke", KONTUR);
    p.setAttribute("stroke-width", "0.7");
    p.setAttribute("stroke-linejoin", "round");
    binaKat.appendChild(p);
    yuzler.push(p);
  }

  const KABUK = [
    { g: 13, o: 0.09 }, { g: 7.4, o: 0.17 },
    { g: 3.8, o: 0.34 }, { g: 1.6, o: 0.92 },
  ];

  let secili = null;

  const beaconlar = GECELER.map((g) => {
    const grup = document.createElementNS(NS, "g");
    grup.style.cursor = "pointer";
    const kabuklar = KABUK.map((k) => {
      const p = document.createElementNS(NS, "polygon");
      p.setAttribute("fill", g.renk);
      p.setAttribute("fill-opacity", k.o);
      grup.appendChild(p);
      return p;
    });
    const t = document.createElementNS(NS, "text");
    t.setAttribute("font-family", "JetBrains Mono, monospace");
    t.setAttribute("font-size", "10.5");
    t.setAttribute("letter-spacing", "1.6");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", g.renk);
    t.textContent = g.saat;
    grup.appendChild(t);

    grup.addEventListener("mouseenter", () => { secili = g; });
    grup.addEventListener("mouseleave", () => { if (secili === g) secili = null; });
    grup.addEventListener("click", () => window.open(g.sayfa, "_blank", "noopener"));

    beaconKat.appendChild(grup);
    return { g, grup, kabuklar, t };
  });

  // ---------- hover etiketi ----------
  const etiket = document.createElementNS(NS, "g");
  etiket.setAttribute("opacity", "0");
  const eCizgi = document.createElementNS(NS, "line");
  eCizgi.setAttribute("stroke", "#f0f0ee");
  eCizgi.setAttribute("stroke-width", "1");
  etiket.appendChild(eCizgi);
  const eSatir = [0, 1, 2].map((i) => {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("fill", "#f0f0ee");
    if (i === 0) { t.setAttribute("font-size", "19"); t.setAttribute("font-weight", "500"); }
    else {
      t.setAttribute("font-family", "JetBrains Mono, monospace");
      t.setAttribute("font-size", "10.5");
      t.setAttribute("letter-spacing", "1.4");
      t.setAttribute("opacity", "0.72");
    }
    etiket.appendChild(t);
    return t;
  });
  etiketKat.appendChild(etiket);

  // ---------- surukleme (yon ters) ----------
  let hiz = 0.11;
  let surukluyor = false, sonX = 0, sonY = 0, bosZaman = 0;

  sahne.addEventListener("pointerdown", (e) => {
    surukluyor = true; sonX = e.clientX; sonY = e.clientY;
    try { sahne.setPointerCapture(e.pointerId); } catch (_) {}
  });
  sahne.addEventListener("pointermove", (e) => {
    if (!surukluyor) return;
    aci -= (e.clientX - sonX) * 0.006;      // ters yon
    egim2 -= (e.clientY - sonY) * 0.005;    // dikey donus
    egim2 = Math.max(-0.62, Math.min(0.62, egim2));
    sonX = e.clientX;
    sonY = e.clientY;
  });
  const birak = () => { if (surukluyor) { surukluyor = false; bosZaman = 0; } };
  sahne.addEventListener("pointerup", birak);
  sahne.addEventListener("pointercancel", birak);

  // ---------- cizim ----------
  const BEACON_BOY = 132;
  let oncekiZaman = performance.now();

  function ciz(simdi) {
    const dt = Math.min(0.05, (simdi - oncekiZaman) / 1000);
    oncekiZaman = simdi;

    if (!surukluyor) {
      bosZaman += dt;
      if (bosZaman > 2.5) aci -= hiz * dt;
    }

    const cosA = Math.cos(aci), sinA = Math.sin(aci);
    const cosT = Math.cos(egim2), sinT = Math.sin(egim2);
    const liste = [];

    BINALAR.forEach((b) => {
      const ur = dondur(b.u, cosA, sinA, cosT, sinT);
      const merkez = [ur[0] * R, ur[1] * R, ur[2] * R];
      // arka yarikureyi at
      if (nokta(ur, birim(cikar(KAMERA, merkez))) < 0.06) return;

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
          ], 1, 0));
        });
      });
      // k: [taban0, tepe0, taban1, tepe1, taban2, tepe2, taban3, tepe3]
      const T = [k[1], k[3], k[5], k[7]];
      const A = [k[0], k[2], k[4], k[6]];
      const yuz = [
        { p: T, ton: CATI[b.ton] },
        { p: [A[0], A[1], T[1], T[0]], ton: YAN_A[b.ton] },
        { p: [A[2], A[3], T[3], T[2]], ton: YAN_A[b.ton] },
        { p: [A[1], A[2], T[2], T[1]], ton: YAN_B[b.ton] },
        { p: [A[3], A[0], T[0], T[3]], ton: YAN_B[b.ton] },
      ];
      yuz.forEach((f) => {
        let alan = 0;
        for (let i = 0; i < 4; i++) {
          const a = f.p[i], c = f.p[(i + 1) % 4];
          alan += a.x * c.y - c.x * a.y;
        }
        if (alan >= 0) return;
        liste.push({
          d: (f.p[0].d + f.p[1].d + f.p[2].d + f.p[3].d) / 4,
          ton: f.ton,
          nokta: f.p.map((q) => q.x.toFixed(1) + "," + q.y.toFixed(1)).join(" "),
        });
      });
    });

    liste.sort((a, b) => b.d - a.d);
    for (let i = 0; i < yuzler.length; i++) {
      const p = yuzler[i];
      if (i < liste.length) {
        p.setAttribute("points", liste[i].nokta);
        p.setAttribute("fill", liste[i].ton);
        p.setAttribute("visibility", "visible");
      } else if (p.getAttribute("visibility") !== "hidden") {
        p.setAttribute("visibility", "hidden");
      }
    }

    beaconlar.forEach(({ g, grup, kabuklar, t }) => {
      const b = g.bina;
      const ur = dondur(b.u, cosA, sinA, cosT, sinT);
      const taban = [ur[0] * (R + b.h), ur[1] * (R + b.h), ur[2] * (R + b.h)];
      const tepeR = R + b.h + BEACON_BOY;
      const alt = yansit(taban, 1, 0);
      const ust = yansit([ur[0] * tepeR, ur[1] * tepeR, ur[2] * tepeR], 1, 0);

      const yuz = nokta(ur, birim(cikar(KAMERA, taban)));
      const gorunur = Math.max(0, Math.min(1, (yuz - 0.05) * 2.6));
      grup.setAttribute("opacity", gorunur.toFixed(3));
      grup.style.pointerEvents = gorunur > 0.4 ? "auto" : "none";

      const dx = ust.x - alt.x, dy = ust.y - alt.y;
      const uz = Math.hypot(dx, dy) || 1;
      const nx = -dy / uz, ny = dx / uz;      // sutuna dik yon

      kabuklar.forEach((p, i) => {
        const w = KABUK[i].g;
        const wa = w * alt.s, wu = w * ust.s;
        p.setAttribute("points",
          (alt.x - nx * wa) + "," + (alt.y - ny * wa) + " " +
          (alt.x + nx * wa) + "," + (alt.y + ny * wa) + " " +
          (ust.x + nx * wu) + "," + (ust.y + ny * wu) + " " +
          (ust.x - nx * wu) + "," + (ust.y - ny * wu));
      });

      t.setAttribute("x", ust.x.toFixed(1));
      t.setAttribute("y", (ust.y - 12).toFixed(1));
      g._ust = ust;
    });

    if (secili) {
      const u = secili._ust;
      const x = u.x + 26, y = u.y - 40;
      eCizgi.setAttribute("x1", x - 14); eCizgi.setAttribute("y1", y + 6);
      eCizgi.setAttribute("x2", x - 4);  eCizgi.setAttribute("y2", y + 6);
      eSatir[0].setAttribute("x", x); eSatir[0].setAttribute("y", y + 12);
      eSatir[0].textContent = secili.ad;
      eSatir[1].setAttribute("x", x); eSatir[1].setAttribute("y", y + 32);
      eSatir[1].textContent = secili.tip + " · " + secili.saat;
      eSatir[2].setAttribute("x", x); eSatir[2].setAttribute("y", y + 50);
      eSatir[2].textContent = secili.dk + " MIN WALK";
      etiket.setAttribute("opacity", "1");
    } else {
      etiket.setAttribute("opacity", "0");
    }
  }

  /* rAF yerine zamanlayici: onizleme paneli belgeyi "gizli" saydigi icin
     rAF hic tetiklenmiyor. Bos yere calismasin diye sadece bu ekran
     onderken ciziyoruz. */
  ciz(performance.now());
  setInterval(() => {
    if (document.body.dataset.ekran === "3") ciz(performance.now());
  }, 16);
})();
