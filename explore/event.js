/* afterhours — etkinlik sayfasi (kontak baskisi).

   Otuz alti gece icin otuz alti sayfa yazmiyoruz: duzen tek, icerik
   etkinligin kendi verisinden (data.js / events-data.js) ve tur
   havuzlarindan (event-data.js) geliyor. Hangi parcanin hangi
   geceye dustugunu slug'dan uretilen tohum seciyor, yani bir etkinlik
   her acilista ayni seyi gosteriyor ama iki etkinlik ayni gorunmuyor.

   Yeni bir gece eklemek: events-data.js'e (ya da veritabanina) bir
   satir, explore/<slug>/index.html'e de bos kabuk. Gerisi buradan. */

(function () {
  const alan = document.querySelector(".cs");
  if (!alan) return;

  const V = window.EVENT_POOLS || {};

  /* --- tohum: ayni slug hep ayni geceyi kurar --- */
  function tohumla(yazi) {
    let h = 2166136261;
    for (let i = 0; i < yazi.length; i++) {
      h ^= yazi.charCodeAt(i);
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

  const seç = (rnd, liste) => liste[Math.floor(rnd() * liste.length)];

  function karıştır(rnd, liste) {
    const l = liste.slice();
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  }

  const sıra = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] ||
                           ["th", "st", "nd", "rd"][n % 100] || "th");

  /* --- meta tek satir: "Olympiahalle · 11.09.26 · 18:30" --- */
  function metayıAç(meta) {
    const parça = String(meta || "").split("·").map((p) => p.trim()).filter(Boolean);
    const çıktı = { venue: "", date: "", saat: "" };
    parça.forEach((p) => {
      if (!çıktı.saat && /^\d{1,2}:\d{2}/.test(p)) çıktı.saat = p;
      else if (!çıktı.date && /\d{1,2}\.\d{1,2}/.test(p)) çıktı.date = p;
      else if (!çıktı.venue) çıktı.venue = p;
      else if (!çıktı.date) çıktı.date = p;
    });
    if (!çıktı.venue) çıktı.venue = parça[0] || "";
    return çıktı;
  }

  const GÜNLER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  function günBul(tarih, rnd) {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(tarih || "");
    if (m) {
      const d = new Date(2000 + +m[3], +m[2] - 1, +m[1]);
      if (!isNaN(d)) return GÜNLER[d.getDay()];
    }
    return seç(rnd, ["friday", "saturday", "thursday"]);
  }

  /* --- kucuk yardimcilar --- */
  function el(etiket, sınıf, yazı) {
    const e = document.createElement(etiket);
    if (sınıf) e.className = sınıf;
    if (yazı != null) e.textContent = yazı;
    return e;
  }

  function kunyeSatırı(dt, dd) {
    const kutu = document.createElement("div");
    kutu.appendChild(el("dt", null, dt));
    kutu.appendChild(el("dd", null, dd));
    return kutu;
  }

  /* --- sayfayi kur --- */
  function kur(e) {
    const rnd = tohumla(e.slug || "afterhours");
    const tür = e.kind || "Konzert";
    const m = metayıAç(e.meta);
    const gün = günBul(m.date, rnd);
    const posterPath = e.posterPath ||
      "../../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";

    /* kacinci edisyon, sen kacinci kez */
    const edisyon = 2 + Math.floor(rnd() * 11);
    const gidilen = Math.min(edisyon - 1, Math.floor(rnd() * 3));

    alan.textContent = "";

    /* ---- sol ray ---- */
    const ray = el("aside", "cs-rail");
    const poster = document.createElement("object");
    poster.className = "cs-poster";
    poster.type = "image/svg+xml";
    poster.data = posterPath;
    ray.appendChild(poster);

    const künye = el("dl", "cs-facts");
    if (m.saat) künye.appendChild(kunyeSatırı("doors", m.saat));
    (V.KUNYE[tür] || []).forEach(([a, b]) => künye.appendChild(kunyeSatırı(a, b)));
    if (m.venue) künye.appendChild(kunyeSatırı("room", m.venue.toLowerCase()));
    künye.appendChild(kunyeSatırı("from", fiyat(tür, rnd)));
    ray.appendChild(künye);
    alan.appendChild(ray);

    /* ---- orta sutun ---- */
    const orta = el("div", "cs-field");

    const kırıntı = el("nav", "crumb");
    const geri = el("a", null, "explore");
    geri.href = "../index.html";
    kırıntı.appendChild(geri);
    kırıntı.appendChild(el("span", null, "/"));
    kırıntı.appendChild(el("span", null, (e.title || "").toLowerCase()));
    orta.appendChild(kırıntı);

    orta.appendChild(el("p", "cs-edition",
      "edition " + String(edisyon).padStart(2, "0") + " · your " + sıra(gidilen + 1)));
    orta.appendChild(el("h1", "cs-title", e.title || ""));
    orta.appendChild(el("p", "cs-meta",
      [tür.toLowerCase(), m.date ? gün + " " + m.date : gün].join(" · ")));

    /* Ilk paragraf etkinligin kendi metni, sonrakiler tur havuzundan.
       Havuzdan gelen bir paragraf etkinligin kendi cumlesiyle ayni seyi
       soyluyorsa atlaniyor: iki kez "bring something" yaziyordu. */
    const havuz = karıştır(rnd, V.METIN[tür] || []).filter((p) => !çakışır(p, e.body));
    [e.body, havuz[0], havuz[1]].filter(Boolean).forEach((p) =>
      orta.appendChild(el("p", "cs-text", p)));

    /* ---- kareler ---- */
    const bölüm = el("section", "cs-section");
    bölüm.appendChild(el("p", "cs-label", "the roll · five frames, one still blank"));

    const roller = V.ROL[tür] || [];
    const adlar = karıştır(rnd, V.AD[tür] || []);
    const saatler = saatleriKur(m.saat, tür, rnd);
    const şerit = el("ol", "cs-frames");

    for (let i = 0; i < 5; i++) {
      const kare = el("li", "cs-frame" + (i === 3 ? " empty" : ""));
      const poz = el("div", "cs-shot" + (i === 3 ? " empty" : ""));

      if (i === 3) {
        poz.textContent = "not shot yet";
      } else {
        /* Kare = posterin bir seridi. Dort kare, dort farkli bant. */
        const im = document.createElement("object");
        im.className = "cs-shot-img";
        im.type = "image/svg+xml";
        im.data = posterPath;
        im.style.setProperty("--shift", [0, 42, 83, 125][i > 3 ? 3 : i]);
        poz.appendChild(im);
      }

      kare.appendChild(poz);
      kare.appendChild(el("span", "cs-no", String(i + 1).padStart(2, "0")));
      kare.appendChild(el("p", "cs-role", roller[i] || ""));
      kare.appendChild(el("p", "cs-name",
        i === 3 ? "not announced" : (i === 2 ? e.title : adlar[i] || "—")));
      /* Bos karenin saati YOK: dolacagi an kapinin acildigi an.
         Sayi yazmak baska bir karenin saatini tekrar ediyordu. */
      kare.appendChild(el("p", "cs-clock",
        i === 3 ? "fills at the door" : saatler[i] || ""));
      şerit.appendChild(kare);
    }

    bölüm.appendChild(şerit);
    bölüm.appendChild(el("p", "cs-note",
      "An empty frame is not a gap. Nothing is announced until the doors are open."));
    orta.appendChild(bölüm);

    /* ---- gittigin edisyonlar ---- */
    const geçmiş = el("section", "cs-section cs-section-past");
    geçmiş.appendChild(el("p", "cs-label", gidilen
      ? "editions you were at · " + gidilen + " of " + (edisyon - 1)
      : "your first one · " + (edisyon - 1) + " happened without you"));
    const kutu = el("div", "cs-past");
    geçmiş.appendChild(kutu);
    /* Hic gitmediysen kutu bos kalir; orayi bir cumle dolduruyor. */
    if (!gidilen) geçmiş.appendChild(el("p", "cs-note",
      "Keep this one and the collection starts here."));
    orta.appendChild(geçmiş);
    alan.appendChild(orta);

    /* ---- sag sutun ---- */
    const sağ = el("aside", "cs-right");
    sağ.appendChild(el("p", "cs-label", "which friends are going"));

    const kimler = el("ul", "cs-who");
    const arkadaşlar = karıştır(rnd, V.ARKADASLAR).slice(0, 5);
    const durumlar = V.DURUM;
    arkadaşlar.forEach((ad, i) => {
      const satır = el("li", durumlar[i] === "can't" ? "yok" : null);
      satır.appendChild(el("span", "cs-who-name", ad));
      satır.appendChild(el("span", "cs-who-status", durumlar[i]));
      kimler.appendChild(satır);
    });
    sağ.appendChild(kimler);
    sağ.appendChild(el("p", "cs-tally", "3 going · 1 maybe · 1 out"));

    const [dugme, altYazı] = V.BILET[tür] || V.BILET["Konzert"];
    const bilet = el("a", "cs-ticket", dugme);
    bilet.href = "#";
    sağ.appendChild(bilet);
    sağ.appendChild(el("p", "cs-ticket-sub", altYazı));

    /* beforehours: arkadaslarin bu geceye, bu mekana, bu tarihe dair */
    const yorumlar = el("section", "cs-comments");
    yorumlar.appendChild(el("p", "cs-label", "beforehours · your friends"));

    const zamanlar = V.ZAMAN;
    karıştır(rnd, V.YORUM[tür] || []).slice(0, 4).forEach((y, i) => {
      yorumlar.appendChild(yorumKur(
        arkadaşlar[i] || "someone", zamanlar[i + 1] || "today",
        doldur(y.m, e, m, gün),
        y.c ? { kim: arkadaşlar[(i + 2) % 5], zaman: zamanlar[i + 2] || "today",
                body: doldur(y.c.m, e, m, gün) } : null));
    });
    sağ.appendChild(yorumlar);
    alan.appendChild(sağ);

    /* ---- gecmis kartlari (cards.js ile) ---- */
    kartlarıÇiz(kutu, e, m, tür, gidilen, edisyon, rnd, arkadaşlar);
  }

  /* Iki metin ayni nadir kelimeyi paylasiyorsa ayni seyi anlatiyorlardir.
     Kisa kelimeler (the, room, night) sayilmiyor. */
  const SIK = /^(the|and|that|with|this|there|their|which|about|after|before|until|people|night|nights|every|other|first|still|where|would)$/;

  function çakışır(a, b) {
    if (!a || !b) return false;
    const kelime = (y) => new Set(String(y).toLowerCase().match(/[a-zäöüß]{6,}/g) || []);
    const A = kelime(a), B = kelime(b);
    for (const k of A) if (!SIK.test(k) && B.has(k)) return true;
    return false;
  }

  function doldur(yazı, e, m, gün) {
    return String(yazı)
      .replace(/\{mekan\}/g, m.venue || "the room")
      .replace(/\{ad\}/g, e.title || "this one")
      .replace(/\{gun\}/g, gün);
  }

  function yorumKur(kim, zaman, metin, cevap) {
    const k = el("div", "c-topic");
    const üst = el("div", "c-top");
    üst.appendChild(el("span", "c-who", kim));
    üst.appendChild(el("span", "c-when", zaman));
    k.appendChild(üst);
    k.appendChild(el("p", "c-text", metin));
    if (cevap) {
      const c = el("div", "c-replies");
      const kutu = el("div", "c-reply");
      const u = el("div", "c-top");
      u.appendChild(el("span", "c-who", cevap.kim));
      u.appendChild(el("span", "c-when", cevap.zaman));
      kutu.appendChild(u);
      kutu.appendChild(el("p", "c-text", cevap.body));
      c.appendChild(kutu);
      k.appendChild(c);
    }
    return k;
  }

  const FIYAT = {
    "Konzert": [49, 89], "Festival": [59, 129], "Rave": [15, 28],
    "Club Night": [10, 18], "Hausparty": null, "Meetup": null,
  };

  function fiyat(tür, rnd) {
    const a = FIYAT[tür];
    if (!a) return "free";
    return "€" + (a[0] + Math.floor(rnd() * (a[1] - a[0])));
  }

  /* Kapi saatinden yola cikip bes karenin saatini kuruyoruz. */
  function saatleriKur(kapı, tür, rnd) {
    const m = /^(\d{1,2}):(\d{2})/.exec(kapı || "");
    let dk = m ? +m[1] * 60 + +m[2] : (tür === "Rave" || tür === "Club Night" ? 23 * 60 : 19 * 60);
    const aralık = tür === "Meetup" ? 45 : 60 + Math.floor(rnd() * 30);
    const çıktı = [];
    for (let i = 0; i < 5; i++) {
      dk += i === 0 ? 15 : aralık;
      const s = Math.floor(dk / 60) % 24;
      çıktı.push(String(s).padStart(2, "0") + ":" + String(dk % 60).padStart(2, "0"));
    }
    return çıktı;
  }

  const METALLER = ["steel", "chrome", "gunmetal", "titanium", "nickel", "anthracite", "brass", "copper"];
  const MOTIFLER = ["rays", "oval", "diagonal", "orbit", "grid", "moon", "moire", "bands", "iso", "descend"];
  const SÖZLER = [
    "nobody in the front row sat down", "we lost each other by midnight",
    "the back room was better", "phones stayed in pockets",
    "side seats were the right call", "they said no encore. there was one",
    "we stayed until the lights came up", "the queue was the best part",
  ];

  function kartlarıÇiz(kutu, e, m, tür, gidilen, edisyon, rnd, arkadaşlar) {
    if (!window.CARDS || !gidilen) return;

    for (let i = 0; i < gidilen; i++) {
      const yıl = 26 - (i + 1) * 2;
      const gece = {
        city: "münchen",
        t: e.title, ty: (tür || "").toUpperCase(),
        v: (m.venue || "münchen").toUpperCase(),
        d: "1" + (2 + i) + ".0" + (5 + i) + "." + yıl,
        metal: seç(rnd, METALLER), motif: seç(rnd, MOTIFLER),
        in: "19:4" + i, out: "23:2" + i, dur: "3H 4" + i + "M",
        crew: arkadaşlar.slice(0, 3).map((a) => a[0]),
        more: 3 + Math.floor(rnd() * 8), aud: "0:" + (20 + Math.floor(rnd() * 39)),
        msg: 8 + Math.floor(rnd() * 20), who: (arkadaşlar[0] || "you").toUpperCase(),
        froze: "1" + (4 + i) + ".0" + (5 + i), no: "0" + (100 + Math.floor(rnd() * 800)),
        at1: "20:1" + i, at2: "22:3" + i,
        q1: [seç(rnd, SÖZLER), (arkadaşlar[1] || "L")[0], "21:1" + i],
        q2: [seç(rnd, SÖZLER), (arkadaşlar[2] || "M")[0], "23:0" + i],
      };

      const kart = el("figure", "cs-past-card");
      const yüz = el("div", "cs-past-face");
      yüz.innerHTML = CARDS.front(gece, "g" + i);
      kart.appendChild(yüz);
      kart.appendChild(el("figcaption", null,
        "edition " + String(edisyon - 1 - i).padStart(2, "0") +
        " · " + (m.venue || "münchen").toLowerCase() + " · " + gece.d));
      kutu.appendChild(kart);
    }
  }

  /* --- hangi etkinlik? adres cubugundaki klasor adi --- */
  function slugBul() {
    const p = location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
    return p[p.length - 1] || "";
  }

  /* data.js bu betigi data-sonra ile cagiriyor: POSTERS o an hazir. */
  const slug = slugBul();
  const e = (window.POSTERS || []).filter((x) => x.slug === slug)[0];
  if (e) kur(e);
})();
