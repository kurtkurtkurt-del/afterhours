/* afterhours — event sayfasi (kontak baskisi).

   Otuz alti gece icin otuz alti sayfa yazmiyoruz: duzen tek, icerik
   etkinligin kendi verisinden (data.js / events-data.js) ve tur
   havuzlarindan (event-data.js) geliyor. Hangi parcanin hangi
   geceye dustugunu slug'dan uretilen seed seciyor, yani bir event
   her acilista ayni seyi gosteriyor ama iki event ayni gorunmuyor.

   Yeni bir gece eklemek: events-data.js'e (ya da veritabanina) bir
   row, explore/<slug>/index.html'e de bos kabuk. Gerisi buradan. */

(function () {
  const area = document.querySelector(".cs");
  if (!area) return;

  const V = window.EVENT_POOLS || {};

  /* --- seed: ayni slug hep ayni geceyi kurar --- */
  function tohumla(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    /* mulberry32 — globe.js'te de ayni sebeple: carpim 2^53'u asmasin */
    let t = h >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

  function shuffle(rnd, list) {
    const l = list.slice();
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  }

  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] ||
                           ["th", "st", "nd", "rd"][n % 100] || "th");

  /* --- meta tek row: "Olympiahalle · 11.09.26 · 18:30" --- */
  function parseMeta(meta) {
    const parça = String(meta || "").split("·").map((p) => p.trim()).filter(Boolean);
    const out = { venue: "", date: "", saat: "" };
    parça.forEach((p) => {
      if (!out.saat && /^\d{1,2}:\d{2}/.test(p)) out.saat = p;
      else if (!out.date && /\d{1,2}\.\d{1,2}/.test(p)) out.date = p;
      else if (!out.venue) out.venue = p;
      else if (!out.date) out.date = p;
    });
    if (!out.venue) out.venue = parça[0] || "";
    return out;
  }

  const GÜNLER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  function weekdayFor(tarih, rnd) {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(tarih || "");
    if (m) {
      const d = new Date(2000 + +m[3], +m[2] - 1, +m[1]);
      if (!isNaN(d)) return GÜNLER[d.getDay()];
    }
    return pick(rnd, ["friday", "saturday", "thursday"]);
  }

  /* --- kucuk yardimcilar --- */
  function el(etiket, sınıf, yazı) {
    const e = document.createElement(etiket);
    if (sınıf) e.className = sınıf;
    if (yazı != null) e.textContent = yazı;
    return e;
  }

  function factRow(dt, dd) {
    const box = document.createElement("div");
    box.appendChild(el("dt", null, dt));
    box.appendChild(el("dd", null, dd));
    return box;
  }

  /* --- sayfayi build --- */
  function build(e) {
    const rnd = tohumla(e.slug || "afterhours");
    const kind = e.kind || "Konzert";
    const m = parseMeta(e.meta);
    const day = weekdayFor(m.date, rnd);
    const posterPath = e.posterPath ||
      "../../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";

    /* kacinci edition, sen kacinci kez */
    const edition = 2 + Math.floor(rnd() * 11);
    const picked = Math.min(edition - 1, Math.floor(rnd() * 3));

    area.textContent = "";

    /* ---- sol ray ---- */
    const ray = el("aside", "cs-rail");
    const poster = document.createElement("object");
    poster.className = "cs-poster";
    poster.type = "image/svg+xml";
    poster.data = posterPath;
    ray.appendChild(poster);

    const facts = el("dl", "cs-facts");
    if (m.saat) facts.appendChild(factRow("doors", m.saat));
    (V.KUNYE[kind] || []).forEach(([a, b]) => facts.appendChild(factRow(a, b)));
    if (m.venue) facts.appendChild(factRow("room", m.venue.toLowerCase()));
    facts.appendChild(factRow("from", price(kind, rnd)));
    ray.appendChild(facts);
    area.appendChild(ray);

    /* ---- middle sutun ---- */
    const middle = el("div", "cs-field");

    const crumb = el("nav", "crumb");
    const geri = el("a", null, "explore");
    geri.href = "../index.html";
    crumb.appendChild(geri);
    crumb.appendChild(el("span", null, "/"));
    crumb.appendChild(el("span", null, (e.title || "").toLowerCase()));
    middle.appendChild(crumb);

    middle.appendChild(el("p", "cs-edition",
      "edition " + String(edition).padStart(2, "0") + " · your " + ordinal(picked + 1)));
    middle.appendChild(el("h1", "cs-title", e.title || ""));
    middle.appendChild(el("p", "cs-meta",
      [kind.toLowerCase(), m.date ? day + " " + m.date : day].join(" · ")));

    /* Ilk paragraf etkinligin kendi metni, sonrakiler tur havuzundan.
       Havuzdan gelen bir paragraf etkinligin kendi cumlesiyle ayni seyi
       soyluyorsa atlaniyor: iki kez "bring something" yaziyordu. */
    const pool = shuffle(rnd, V.METIN[kind] || []).filter((p) => !çakışır(p, e.body));
    [e.body, pool[0], pool[1]].filter(Boolean).forEach((p) =>
      middle.appendChild(el("p", "cs-text", p)));

    /* ---- kareler ---- */
    const section = el("section", "cs-section");
    section.appendChild(el("p", "cs-label", "the roll · five frames, one still blank"));

    const roles = V.ROL[kind] || [];
    const names = shuffle(rnd, V.AD[kind] || []);
    const times = buildTimes(m.saat, kind, rnd);
    const strip = el("ol", "cs-frames");

    for (let i = 0; i < 5; i++) {
      const frame = el("li", "cs-frame" + (i === 3 ? " empty" : ""));
      const shot = el("div", "cs-shot" + (i === 3 ? " empty" : ""));

      if (i === 3) {
        shot.textContent = "not shot yet";
      } else {
        /* Kare = posterin bir seridi. Dort frame, dort farkli bant. */
        const img = document.createElement("object");
        img.className = "cs-shot-img";
        img.type = "image/svg+xml";
        img.data = posterPath;
        img.style.setProperty("--shift", [0, 42, 83, 125][i > 3 ? 3 : i]);
        shot.appendChild(img);
      }

      frame.appendChild(shot);
      frame.appendChild(el("span", "cs-no", String(i + 1).padStart(2, "0")));
      frame.appendChild(el("p", "cs-role", roles[i] || ""));
      frame.appendChild(el("p", "cs-name",
        i === 3 ? "not announced" : (i === 2 ? e.title : names[i] || "—")));
      /* Bos karenin saati YOK: dolacagi an kapinin acildigi an.
         Sayi yazmak baska bir karenin saatini tekrar ediyordu. */
      frame.appendChild(el("p", "cs-clock",
        i === 3 ? "fills at the door" : times[i] || ""));
      strip.appendChild(frame);
    }

    section.appendChild(strip);
    section.appendChild(el("p", "cs-note",
      "An empty frame is not a gap. Nothing is announced until the doors are open."));
    middle.appendChild(section);

    /* ---- gittigin edisyonlar ---- */
    const past = el("section", "cs-section cs-section-past");
    past.appendChild(el("p", "cs-label", picked
      ? "editions you were at · " + picked + " of " + (edition - 1)
      : "your first one · " + (edition - 1) + " happened without you"));
    const box = el("div", "cs-past");
    past.appendChild(box);
    /* Hic gitmediysen box bos kalir; orayi bir cumle dolduruyor. */
    if (!picked) past.appendChild(el("p", "cs-note",
      "Keep this one and the collection starts here."));
    middle.appendChild(past);
    area.appendChild(middle);

    /* ---- sag sutun ---- */
    const right = el("aside", "cs-right");
    right.appendChild(el("p", "cs-label", "which friends are going"));

    const kimler = el("ul", "cs-who");
    const friends = shuffle(rnd, V.ARKADASLAR).slice(0, 5);
    const durumlar = V.DURUM;
    friends.forEach((name, i) => {
      const satır = el("li", durumlar[i] === "can't" ? "yok" : null);
      satır.appendChild(el("span", "cs-who-name", name));
      satır.appendChild(el("span", "cs-who-status", durumlar[i]));
      kimler.appendChild(satır);
    });
    right.appendChild(kimler);
    right.appendChild(el("p", "cs-tally", "3 going · 1 maybe · 1 out"));

    const [button, altYazı] = V.BILET[kind] || V.BILET["Konzert"];
    const bilet = el("a", "cs-ticket", button);
    bilet.href = "#";
    right.appendChild(bilet);
    right.appendChild(el("p", "cs-ticket-sub", altYazı));

    /* beforehours: arkadaslarin bu geceye, bu mekana, bu tarihe dair */
    const comments = el("section", "cs-comments");
    comments.appendChild(el("p", "cs-label", "beforehours · your friends"));

    const zamanlar = V.ZAMAN;
    shuffle(rnd, V.YORUM[kind] || []).slice(0, 4).forEach((y, i) => {
      comments.appendChild(buildComment(
        friends[i] || "someone", zamanlar[i + 1] || "today",
        fill(y.m, e, m, day),
        y.c ? { who: friends[(i + 2) % 5], when: zamanlar[i + 2] || "today",
                body: fill(y.c.m, e, m, day) } : null));
    });
    right.appendChild(comments);
    area.appendChild(right);

    /* ---- gecmis kartlari (cards.js ile) ---- */
    drawCards(box, e, m, kind, picked, edition, rnd, friends);
  }

  /* Iki text ayni nadir kelimeyi paylasiyorsa ayni seyi anlatiyorlardir.
     Kisa kelimeler (the, room, night) sayilmiyor. */
  const SIK = /^(the|and|that|with|this|there|their|which|about|after|before|until|people|night|nights|every|other|first|still|where|would)$/;

  function çakışır(a, b) {
    if (!a || !b) return false;
    const kelime = (y) => new Set(String(y).toLowerCase().match(/[a-zäöüß]{6,}/g) || []);
    const A = kelime(a), B = kelime(b);
    for (const k of A) if (!SIK.test(k) && B.has(k)) return true;
    return false;
  }

  function fill(yazı, e, m, day) {
    return String(yazı)
      .replace(/\{mekan\}/g, m.venue || "the room")
      .replace(/\{name\}/g, e.title || "this one")
      .replace(/\{gun\}/g, day);
  }

  function buildComment(who, when, text, reply) {
    const k = el("div", "c-topic");
    const üst = el("div", "c-top");
    üst.appendChild(el("span", "c-who", who));
    üst.appendChild(el("span", "c-when", when));
    k.appendChild(üst);
    k.appendChild(el("p", "c-text", text));
    if (reply) {
      const c = el("div", "c-replies");
      const box = el("div", "c-reply");
      const u = el("div", "c-top");
      u.appendChild(el("span", "c-who", reply.kim));
      u.appendChild(el("span", "c-when", reply.zaman));
      box.appendChild(u);
      box.appendChild(el("p", "c-text", reply.body));
      c.appendChild(box);
      k.appendChild(c);
    }
    return k;
  }

  const FIYAT = {
    "Konzert": [49, 89], "Festival": [59, 129], "Rave": [15, 28],
    "Club Night": [10, 18], "Hausparty": null, "Meetup": null,
  };

  function price(kind, rnd) {
    const a = FIYAT[kind];
    if (!a) return "free";
    return "€" + (a[0] + Math.floor(rnd() * (a[1] - a[0])));
  }

  /* Kapi saatinden yola cikip bes karenin saatini kuruyoruz. */
  function buildTimes(kapı, kind, rnd) {
    const m = /^(\d{1,2}):(\d{2})/.exec(kapı || "");
    let dk = m ? +m[1] * 60 + +m[2] : (kind === "Rave" || kind === "Club Night" ? 23 * 60 : 19 * 60);
    const aralık = kind === "Meetup" ? 45 : 60 + Math.floor(rnd() * 30);
    const out = [];
    for (let i = 0; i < 5; i++) {
      dk += i === 0 ? 15 : aralık;
      const s = Math.floor(dk / 60) % 24;
      out.push(String(s).padStart(2, "0") + ":" + String(dk % 60).padStart(2, "0"));
    }
    return out;
  }

  const METALLER = ["steel", "chrome", "gunmetal", "titanium", "nickel", "anthracite", "brass", "copper"];
  const MOTIFLER = ["rays", "oval", "diagonal", "orbit", "grid", "moon", "moire", "bands", "iso", "descend"];
  const SÖZLER = [
    "nobody in the front row sat down", "we lost each other by midnight",
    "the back room was better", "phones stayed in pockets",
    "side seats were the right call", "they said no encore. there was one",
    "we stayed until the lights came up", "the queue was the best part",
  ];

  function drawCards(box, e, m, kind, picked, edition, rnd, friends) {
    if (!window.CARDS || !picked) return;

    for (let i = 0; i < picked; i++) {
      const yıl = 26 - (i + 1) * 2;
      const gece = {
        city: "münchen",
        t: e.title, ty: (kind || "").toUpperCase(),
        v: (m.venue || "münchen").toUpperCase(),
        d: "1" + (2 + i) + ".0" + (5 + i) + "." + yıl,
        metal: pick(rnd, METALLER), motif: pick(rnd, MOTIFLER),
        in: "19:4" + i, out: "23:2" + i, dur: "3H 4" + i + "M",
        crew: friends.slice(0, 3).map((a) => a[0]),
        more: 3 + Math.floor(rnd() * 8), aud: "0:" + (20 + Math.floor(rnd() * 39)),
        msg: 8 + Math.floor(rnd() * 20), who: (friends[0] || "you").toUpperCase(),
        froze: "1" + (4 + i) + ".0" + (5 + i), no: "0" + (100 + Math.floor(rnd() * 800)),
        at1: "20:1" + i, at2: "22:3" + i,
        q1: [pick(rnd, SÖZLER), (friends[1] || "L")[0], "21:1" + i],
        q2: [pick(rnd, SÖZLER), (friends[2] || "M")[0], "23:0" + i],
      };

      const card = el("figure", "cs-past-card");
      const yüz = el("div", "cs-past-face");
      yüz.innerHTML = CARDS.front(gece, "g" + i);
      card.appendChild(yüz);
      card.appendChild(el("figcaption", null,
        "edition " + String(edition - 1 - i).padStart(2, "0") +
        " · " + (m.venue || "münchen").toLowerCase() + " · " + gece.d));
      box.appendChild(card);
    }
  }

  /* --- hangi event? adres cubugundaki klasor adi --- */
  function slugFromPath() {
    const p = location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
    return p[p.length - 1] || "";
  }

  /* data.js bu betigi data-sonra ile cagiriyor: POSTERS o an hazir. */
  const slug = slugFromPath();
  const e = (window.POSTERS || []).filter((x) => x.slug === slug)[0];
  if (e) build(e);
})();
