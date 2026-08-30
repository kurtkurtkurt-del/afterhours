/* afterhours — yonetim paneli.
   Sadece is_admin olan hesap ise yarar. Bu sayfayi herkes acabilir;
   koruma sayfada degil veritabaninda (backend/sql/02_rls.sql). Yonetici
   olmayan biri buraya gelse hicbir sey yazamaz, yayinda olmayani bile
   goremez.  */

(function () {
  const AYAR = window.AH_AYAR || {};
  const kapi = document.getElementById("adm-gate");
  const kapiYazi = document.getElementById("adm-gate-text");
  const kapiLink = document.getElementById("adm-gate-link");
  const panel = document.getElementById("adm");

  const $ = (id) => document.getElementById(id);
  const listeAlan = $("adm-list");
  const ozet = $("adm-summary");
  const araAlan = $("adm-search");
  const duzen = $("adm-edit");
  const durum = $("a-status");

  let etkinlikler = [];
  let turler = [];
  let sehirler = [];
  let mekanlar = [];
  let sayilar = {};
  let secili = null;

  const girisForm = document.getElementById("adm-intro");
  const girisNot = document.getElementById("adm-intro-note");

  function kapiyiGoster(metin, girisIster) {
    kapi.hidden = false;
    panel.hidden = true;
    kapiYazi.textContent = metin;
    kapiLink.hidden = !girisIster;
    girisForm.hidden = !girisIster;
  }

  /* Sifreyle giris: e-posta kotasina takilmadan yonetime girebilmek icin.
     Sifre burada tutulmuyor, dogrudan Supabase'e gidiyor. */
  girisForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const eposta = document.getElementById("adm-eposta").value.trim();
    const sifre = document.getElementById("adm-sifre").value;
    if (!eposta || !sifre) return;
    girisNot.textContent = "signing in…";
    AH.sifreyleGir(eposta, sifre)
      .then(() => { location.reload(); })
      .catch((h) => {
        girisNot.textContent = /invalid/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message;
      });
  });

  /* --- acilis: once kimlik, sonra yetki --- */

  if (!(AYAR.url && AYAR.anonKey)) {
    kapiyiGoster("no backend configured. fill in config.js first.", false);
    return;
  }

  AH.oturumHazir
    .then(() => {
      if (!AH.girisliMi()) {
        kapiyiGoster("sign in with the admin account to continue.", true);
        return null;
      }
      const id = AH.oturum.kullanici && AH.oturum.kullanici.id;
      return AH.istek("/profiles?id=eq." + id).then((r) => (r && r[0]) || null);
    })
    .then((profil) => {
      if (!profil) return;
      if (!profil.is_admin) {
        kapiyiGoster("this account isn't an admin. nothing to do here.", false);
        return;
      }
      kapi.hidden = true;
      panel.hidden = false;
      return baslat();
    })
    .catch((h) => kapiyiGoster("couldn't check the account: " + h.message, false));

  /* --- veri --- */

  function baslat() {
    return Promise.all([
      AH.istek("/event_types?order=sira"),
      AH.istek("/cities?order=sira"),
      AH.istek("/venues?order=name"),
      yenile(),
      yorumlariGetir(),
      geriGetir(),
    ]).then(([t, s, m]) => {
      turler = t; sehirler = s; mekanlar = m;
      secenekleriDoldur();
    });
  }

  function yenile() {
    return Promise.all([
      AH.istek("/events?order=poster_no"),
      AH.istek("/rpc/keep_counts", { method: "POST", body: "{}" }).catch(() => []),
    ]).then(([e, k]) => {
      etkinlikler = e;
      sayilar = {};
      (k || []).forEach((r) => { sayilar[r.event_id] = Number(r.n); });
      listeyiCiz();
    });
  }

  function secenekleriDoldur() {
    const koy = (alan, kayitlar, bosMu) => {
      alan.textContent = "";
      if (bosMu) {
        const o = document.createElement("option");
        o.value = ""; o.textContent = "—";
        alan.appendChild(o);
      }
      kayitlar.forEach((k) => {
        const o = document.createElement("option");
        o.value = k.id;
        o.textContent = k.name;
        alan.appendChild(o);
      });
    };
    koy($("a-type"), turler, false);
    koy($("a-city"), sehirler, false);
    koy($("a-venue"), mekanlar, true);
  }

  /* --- liste --- */

  function uyarilar(e) {
    const u = [];
    if (!e.is_published) u.push("unpublished");
    if (e.starts_at_estimated) u.push("date?");
    if (!e.venue_id) u.push("no venue");
    if (!e.poster_no) u.push("no poster");
    return u;
  }

  function listeyiCiz() {
    const arama = (araAlan.value || "").trim().toLowerCase();
    const gosterilecek = etkinlikler.filter(
      (e) => !arama ||
        (e.title + " " + e.slug + " " + e.meta).toLowerCase().includes(arama)
    );

    listeAlan.textContent = "";
    gosterilecek.forEach((e) => {
      const li = document.createElement("li");
      li.className = "adm-row" + (secili && secili.id === e.id ? " selected" : "");

      const no = document.createElement("span");
      no.className = "adm-no";
      no.textContent = String(e.poster_no || "–").padStart(2, "0");

      const ad = document.createElement("span");
      ad.className = "adm-name";
      ad.textContent = e.title;

      li.appendChild(no);
      li.appendChild(ad);

      uyarilar(e).forEach((u) => {
        const rozet = document.createElement("span");
        rozet.className = "adm-badge" + (u === "unpublished" ? " quiet" : "");
        rozet.textContent = u;
        li.appendChild(rozet);
      });

      li.addEventListener("click", () => sec(e));
      listeAlan.appendChild(li);
    });

    const sorunlu = etkinlikler.filter((e) => uyarilar(e).length).length;
    ozet.textContent =
      `${etkinlikler.length} events · ${sorunlu} need attention` +
      (arama ? ` · showing ${gosterilecek.length}` : "");
  }

  araAlan.addEventListener("input", listeyiCiz);

  /* --- duzenleme --- */

  function sec(e) {
    secili = e;
    duzen.hidden = false;
    durum.textContent = "";

    $("a-title").value = e.title || "";
    $("a-slug").value = e.slug || "";
    $("a-meta").value = e.meta || "";
    $("a-body").value = e.body || "";
    $("a-poster").value = e.poster_no || "";
    $("a-type").value = e.type_id || "";
    $("a-city").value = e.city_id || "";
    $("a-venue").value = e.venue_id || "";
    $("a-published").checked = Boolean(e.is_published);
    $("a-estimated").checked = Boolean(e.starts_at_estimated);
    /* datetime-local saniye ve zaman dilimi istemiyor */
    $("a-starts").value = e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 16) : "";
    $("a-number").textContent = sayilar[e.id] ? sayilar[e.id] + " people" : "nobody yet";

    posteriGoster(e.poster_no);
    listeyiCiz();
  }

  function posteriGoster(no) {
    const kutu = $("a-poster-onizleme");
    kutu.textContent = "";
    $("a-poster-note").textContent = "";
    if (!no) { kutu.textContent = "—"; return; }
    const nesne = document.createElement("object");
    nesne.type = "image/svg+xml";
    nesne.data = "../posters/" + String(no).padStart(2, "0") + ".svg";
    kutu.appendChild(nesne);
  }

  $("adm-new").addEventListener("click", () => {
    secili = null;
    duzen.hidden = false;
    durum.textContent = "";
    ["a-title", "a-slug", "a-meta", "a-body", "a-poster", "a-starts"].forEach((i) => ($(i).value = ""));
    $("a-published").checked = true;
    $("a-estimated").checked = false;
    $("a-venue").value = "";
    $("a-number").textContent = "—";
    posteriGoster(null);
    $("a-title").focus();
  });

  function formdanOku() {
    const g = {
      title: $("a-title").value.trim(),
      slug: $("a-slug").value.trim(),
      meta: $("a-meta").value.trim(),
      body: $("a-body").value.trim(),
      poster_no: $("a-poster").value ? Number($("a-poster").value) : null,
      type_id: $("a-type").value || null,
      city_id: $("a-city").value || null,
      venue_id: $("a-venue").value || null,
      is_published: $("a-published").checked,
      starts_at_estimated: $("a-estimated").checked,
      starts_at: $("a-starts").value ? new Date($("a-starts").value).toISOString() : null,
    };
    return g;
  }

  $("a-save").addEventListener("click", () => {
    const g = formdanOku();
    if (!g.title || !g.slug || !g.meta) {
      durum.textContent = "title, slug and meta are required.";
      return;
    }
    durum.textContent = "saving…";

    const istek = secili
      ? AH.istek("/events?id=eq." + secili.id, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(g),
        })
      : AH.istek("/events", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(g),
        });

    istek
      .then((satirlar) => {
        if (!satirlar || !satirlar.length) throw new Error("nothing was written");
        return yenile().then(() => {
          const yeni = etkinlikler.find((e) => e.id === satirlar[0].id);
          if (yeni) sec(yeni);
          /* sec() durumu temizliyor; mesaji ondan SONRA yaz */
          durum.textContent = "saved.";
        });
      })
      .catch((h) => { durum.textContent = "couldn't save: " + h.message; });
  });

  $("a-delete").addEventListener("click", () => {
    if (!secili) return;
    /* Silmek geri alinamaz; once ne silindigini soyle */
    if (!window.confirm('delete "' + secili.title + '" and everything attached to it?')) return;
    durum.textContent = "deleting…";
    AH.istek("/events?id=eq." + secili.id, { method: "DELETE" })
      .then(() => { secili = null; duzen.hidden = true; return yenile(); })
      .catch((h) => { durum.textContent = "couldn't delete: " + h.message; });
  });

  /* --- poster kontrolu ---
     Posterlerin cercevesi 12px icerde ve 400x600 kutuda. Archivo 900
     basliklar bu cerceveyi tasabiliyor (36'lik sette dordu tasmisti),
     o yuzden yuklenen SVG'yi olcup soyluyoruz. */

  $("a-poster-dosya").addEventListener("change", (olay) => {
    const dosya = olay.target.files && olay.target.files[0];
    if (!dosya) return;
    const not = $("a-poster-note");
    not.textContent = "checking…";

    dosya.text().then((metin) => {
      const kutu = $("a-poster-onizleme");
      kutu.textContent = "";
      const sarmal = document.createElement("div");
      sarmal.className = "adm-poster-inner";
      sarmal.innerHTML = metin;
      kutu.appendChild(sarmal);

      const svg = sarmal.querySelector("svg");
      if (!svg) { not.textContent = "that file has no <svg> in it."; return; }

      const kutuOlcu = (svg.getAttribute("viewBox") || "").split(/\s+/);
      const genislik = Number(kutuOlcu[2]) || 400;
      const yukseklik = Number(kutuOlcu[3]) || 600;

      const sorunlar = [];
      if (Math.abs(genislik / yukseklik - 2 / 3) > 0.01) {
        sorunlar.push(`viewBox ${genislik}×${yukseklik} — should be 2:3 (400×600)`);
      }

      /* Yazilar cerceveyi tasiyor mu: x + width <= 388 */
      const sinir = genislik - 12;
      svg.querySelectorAll("text").forEach((t) => {
        let k;
        try { k = t.getBBox(); } catch (_) { return; }
        if (k.x + k.width > sinir + 0.5) {
          sorunlar.push(`"${(t.textContent || "").slice(0, 18)}" runs ${Math.round(k.x + k.width - sinir)}px past the frame`);
        }
        if (k.x < 12 - 0.5) {
          sorunlar.push(`"${(t.textContent || "").slice(0, 18)}" starts left of the frame`);
        }
      });

      not.textContent = sorunlar.length
        ? sorunlar.join("  ·  ")
        : "looks fine: 2:3 and nothing crosses the frame.";
      not.className = "adm-poster-note" + (sorunlar.length ? " bad" : " good");

      /* Sorun yoksa yuklenebilir. Sorunluysa yukleme dugmesi hic
         gorunmuyor: bozuk poster siteye gitmesin. */
      yukleDugmesi.hidden = Boolean(sorunlar.length) || !secili;
      bekleyenDosya = sorunlar.length ? null : dosya;
    });
  });

  /* --- depoya yukleme --- */

  let bekleyenDosya = null;
  const yukleDugmesi = document.getElementById("a-poster-upload");

  yukleDugmesi.addEventListener("click", () => {
    if (!bekleyenDosya || !secili) return;
    const not = $("a-poster-note");
    const ad = secili.slug + "-" + Date.now() + ".svg";
    not.textContent = "uploading…";
    not.className = "adm-poster-note";

    fetch(AYAR.url.replace(/\/$/, "") + "/storage/v1/object/posters/" + ad, {
      method: "POST",
      headers: {
        apikey: AYAR.anonKey,
        Authorization: "Bearer " + AH.jeton,
        "Content-Type": "image/svg+xml",
        "x-upsert": "true",
      },
      body: bekleyenDosya,
    })
      .then(async (c) => {
        if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
        /* Kaydin poster_path'ini isaretle: site bundan sonra bu dosyayi
           gosterir, posters/NN.svg yerine. */
        return AH.istek("/events?id=eq." + secili.id, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ poster_path: ad }),
        });
      })
      .then(() => {
        not.textContent = "uploaded. the site uses this file now.";
        not.className = "adm-poster-note good";
        yukleDugmesi.hidden = true;
        bekleyenDosya = null;
        return yenile();
      })
      .catch((h) => {
        not.textContent = "couldn't upload: " + h.message;
        not.className = "adm-poster-note bad";
      });
  });

  /* --- yorum denetimi --- */

  /* --- geri bildirim ---
     feedback tablosunu yalniz yonetici okuyor; yazan kendi yazdigini
     bile goremiyor (backend/sql/13_feedback.sql). Yani burasi o
     mesajlarin gorulebildigi TEK yer. */

  const TUR = { broken: "broken", idea: "idea", event: "event", other: "other" };

  function geriGetir() {
    return AH.istek("/rpc/feedback_list", {
      method: "POST",
      body: JSON.stringify({ p_limit: 60 }),
    }).then(geriCiz).catch(() => {});
  }

  function geriCiz(satirlar) {
    const liste = $("adm-feedback-list");
    const sayac = $("adm-feedback-number");
    liste.textContent = "";

    const acik = (satirlar || []).filter((g) => !g.handled).length;
    sayac.textContent = acik ? "· " + acik + " waiting" : "· all handled";

    if (!satirlar || !satirlar.length) {
      const bos = document.createElement("li");
      bos.className = "adm-feedback-empty";
      bos.textContent = "nothing yet.";
      liste.appendChild(bos);
      return;
    }

    satirlar.forEach((g) => {
      const li = document.createElement("li");
      li.className = "adm-feedback-row" + (g.handled ? " done" : "");

      const ust = document.createElement("div");
      ust.className = "adm-feedback-top";

      const tur = document.createElement("span");
      tur.className = "adm-feedback-kind";
      tur.textContent = TUR[g.kind] || g.kind;
      ust.appendChild(tur);

      const kim = document.createElement("span");
      kim.className = "adm-feedback-who";
      /* Girisli yazan handle ile, girissiz biraktigi iletisimle,
         hicbirini vermeyen "anonymous" olarak gorunuyor. */
      kim.textContent = g.author ? "@" + g.author : (g.contact || "anonymous");
      ust.appendChild(kim);

      const ne = document.createElement("span");
      ne.className = "adm-feedback-when";
      ne.textContent = String(g.created_at || "").slice(0, 10);
      ust.appendChild(ne);

      const isaret = document.createElement("button");
      isaret.className = "adm-comment-action";
      isaret.type = "button";
      isaret.textContent = g.handled ? "reopen" : "handled";
      isaret.addEventListener("click", () => {
        AH.istek("/feedback?id=eq." + g.id, {
          method: "PATCH",
          body: JSON.stringify({ handled: !g.handled }),
        }).then(geriGetir);
      });
      ust.appendChild(isaret);

      const metin = document.createElement("p");
      metin.className = "adm-feedback-text";
      metin.textContent = g.body;

      li.appendChild(ust);
      li.appendChild(metin);
      liste.appendChild(li);
    });
  }

  function yorumlariGetir() {
    return AH.istek("/comments?order=created_at.desc&limit=30")
      .then(yorumlariCiz)
      .catch(() => {});
  }

  function yorumlariCiz(satirlar) {
    const liste = $("adm-comment-list");
    liste.textContent = "";
    (satirlar || []).forEach((y) => {
      const li = document.createElement("li");
      li.className = "adm-comment" + (y.is_hidden ? " hidden" : "");

      const kim = document.createElement("span");
      kim.className = "adm-comment-who";
      kim.textContent = y.author_name || "member";

      const metin = document.createElement("span");
      metin.className = "adm-comment-text";
      metin.textContent = y.body;

      const gizle = document.createElement("button");
      gizle.className = "adm-comment-action";
      gizle.type = "button";
      gizle.textContent = y.is_hidden ? "show" : "hide";
      gizle.addEventListener("click", () => {
        AH.istek("/comments?id=eq." + y.id, {
          method: "PATCH",
          body: JSON.stringify({ is_hidden: !y.is_hidden }),
        }).then(yorumlariGetir);
      });

      li.appendChild(kim);
      li.appendChild(metin);
      li.appendChild(gizle);
      liste.appendChild(li);
    });
  }
})();
