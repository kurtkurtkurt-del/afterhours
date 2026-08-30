/* afterhours — yonetim paneli.
   Sadece is_admin olan hesap ise yarar. Bu sayfayi herkes acabilir;
   koruma sayfada degil veritabaninda (backend/sql/02_rls.sql). Yonetici
   olmayan biri buraya gelse hicbir sey yazamaz, yayinda olmayani bile
   goremez.  */

(function () {
  const AYAR = window.AH_CONFIG || {};
  const kapi = document.getElementById("adm-gate");
  const kapiYazi = document.getElementById("adm-gate-text");
  const kapiLink = document.getElementById("adm-gate-link");
  const panel = document.getElementById("adm");

  const $ = (id) => document.getElementById(id);
  const listeAlan = $("adm-list");
  const ozet = $("adm-summary");
  const araAlan = $("adm-search");
  const duzen = $("adm-edit");
  const status = $("a-status");

  let events = [];
  let kinds = [];
  let cities = [];
  let venues = [];
  let counts = {};
  let chosen = null;

  const girisForm = document.getElementById("adm-intro");
  const girisNot = document.getElementById("adm-intro-note");

  function showGate(text, girisIster) {
    kapi.hidden = false;
    panel.hidden = true;
    kapiYazi.textContent = text;
    kapiLink.hidden = !girisIster;
    girisForm.hidden = !girisIster;
  }

  /* Sifreyle giris: e-posta kotasina takilmadan yonetime girebilmek icin.
     Sifre burada tutulmuyor, dogrudan Supabase'e gidiyor. */
  girisForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("adm-email").value.trim();
    const password = document.getElementById("adm-password").value;
    if (!email || !password) return;
    girisNot.textContent = "signing in…";
    AH.signInWithPassword(email, password)
      .then(() => { location.reload(); })
      .catch((h) => {
        girisNot.textContent = /invalid/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message;
      });
  });

  /* --- acilis: once kimlik, sonra yetki --- */

  if (!(AYAR.url && AYAR.anonKey)) {
    showGate("no backend configured. fill in config.js first.", false);
    return;
  }

  AH.sessionReady
    .then(() => {
      if (!AH.signedIn()) {
        showGate("sign in with the admin account to continue.", true);
        return null;
      }
      const id = AH.session.user && AH.session.user.id;
      return AH.request("/profiles?id=eq." + id).then((r) => (r && r[0]) || null);
    })
    .then((profile) => {
      if (!profile) return;
      if (!profile.is_admin) {
        showGate("this account isn't an admin. nothing to do here.", false);
        return;
      }
      kapi.hidden = true;
      panel.hidden = false;
      return start();
    })
    .catch((h) => showGate("couldn't check the account: " + h.message, false));

  /* --- veri --- */

  function start() {
    return Promise.all([
      AH.request("/event_types?order=sira"),
      AH.request("/cities?order=sira"),
      AH.request("/venues?order=name"),
      reload(),
      comments(),
      fetchFeedback(),
    ]).then(([t, s, m]) => {
      kinds = t; cities = s; venues = m;
      fillOptions();
    });
  }

  function reload() {
    return Promise.all([
      AH.request("/events?order=poster_no"),
      AH.request("/rpc/keep_counts", { method: "POST", body: "{}" }).catch(() => []),
    ]).then(([e, k]) => {
      events = e;
      counts = {};
      (k || []).forEach((r) => { counts[r.event_id] = Number(r.n); });
      drawList();
    });
  }

  function fillOptions() {
    const koy = (field, kayitlar, bosMu) => {
      field.textContent = "";
      if (bosMu) {
        const o = document.createElement("option");
        o.value = ""; o.textContent = "—";
        field.appendChild(o);
      }
      kayitlar.forEach((k) => {
        const o = document.createElement("option");
        o.value = k.id;
        o.textContent = k.name;
        field.appendChild(o);
      });
    };
    koy($("a-type"), kinds, false);
    koy($("a-city"), cities, false);
    koy($("a-venue"), venues, true);
  }

  /* --- list --- */

  function warnings(e) {
    const u = [];
    if (!e.is_published) u.push("unpublished");
    if (e.starts_at_estimated) u.push("date?");
    if (!e.venue_id) u.push("no venue");
    if (!e.poster_no) u.push("no poster");
    return u;
  }

  function drawList() {
    const query = (araAlan.value || "").trim().toLowerCase();
    const visible = events.filter(
      (e) => !query ||
        (e.title + " " + e.slug + " " + e.meta).toLowerCase().includes(query)
    );

    listeAlan.textContent = "";
    visible.forEach((e) => {
      const li = document.createElement("li");
      li.className = "adm-row" + (chosen && chosen.id === e.id ? " selected" : "");

      const no = document.createElement("span");
      no.className = "adm-no";
      no.textContent = String(e.poster_no || "–").padStart(2, "0");

      const name = document.createElement("span");
      name.className = "adm-name";
      name.textContent = e.title;

      li.appendChild(no);
      li.appendChild(name);

      warnings(e).forEach((u) => {
        const badge = document.createElement("span");
        badge.className = "adm-badge" + (u === "unpublished" ? " quiet" : "");
        badge.textContent = u;
        li.appendChild(badge);
      });

      li.addEventListener("click", () => select(e));
      listeAlan.appendChild(li);
    });

    const sorunlu = events.filter((e) => warnings(e).length).length;
    ozet.textContent =
      `${events.length} events · ${sorunlu} need attention` +
      (query ? ` · showing ${visible.length}` : "");
  }

  araAlan.addEventListener("input", drawList);

  /* --- duzenleme --- */

  function select(e) {
    chosen = e;
    duzen.hidden = false;
    status.textContent = "";

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
    $("a-number").textContent = counts[e.id] ? counts[e.id] + " people" : "nobody yet";

    showPoster(e.poster_no);
    drawList();
  }

  function showPoster(no) {
    const box = $("a-poster-preview");
    box.textContent = "";
    $("a-poster-note").textContent = "";
    if (!no) { box.textContent = "—"; return; }
    const nesne = document.createElement("object");
    nesne.type = "image/svg+xml";
    nesne.data = "../posters/" + String(no).padStart(2, "0") + ".svg";
    box.appendChild(nesne);
  }

  $("adm-new").addEventListener("click", () => {
    chosen = null;
    duzen.hidden = false;
    status.textContent = "";
    ["a-title", "a-slug", "a-meta", "a-body", "a-poster", "a-starts"].forEach((i) => ($(i).value = ""));
    $("a-published").checked = true;
    $("a-estimated").checked = false;
    $("a-venue").value = "";
    $("a-number").textContent = "—";
    showPoster(null);
    $("a-title").focus();
  });

  function readForm() {
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
    const g = readForm();
    if (!g.title || !g.slug || !g.meta) {
      status.textContent = "title, slug and meta are required.";
      return;
    }
    status.textContent = "saving…";

    const istek = chosen
      ? AH.request("/events?id=eq." + chosen.id, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(g),
        })
      : AH.request("/events", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(g),
        });

    istek
      .then((rows) => {
        if (!rows || !rows.length) throw new Error("nothing was written");
        return reload().then(() => {
          const yeni = events.find((e) => e.id === rows[0].id);
          if (yeni) select(yeni);
          /* select() durumu temizliyor; mesaji ondan SONRA yaz */
          status.textContent = "saved.";
        });
      })
      .catch((h) => { status.textContent = "couldn't save: " + h.message; });
  });

  $("a-delete").addEventListener("click", () => {
    if (!chosen) return;
    /* Silmek geri alinamaz; once ne silindigini say */
    if (!window.confirm('delete "' + chosen.title + '" and everything attached to it?')) return;
    status.textContent = "deleting…";
    AH.request("/events?id=eq." + chosen.id, { method: "DELETE" })
      .then(() => { chosen = null; duzen.hidden = true; return reload(); })
      .catch((h) => { status.textContent = "couldn't delete: " + h.message; });
  });

  /* --- poster kontrolu ---
     Posterlerin cercevesi 12px inside ve 400x600 kutuda. Archivo 900
     basliklar bu cerceveyi tasabiliyor (36'lik sette dordu tasmisti),
     o yuzden yuklenen SVG'yi olcup soyluyoruz. */

  $("a-poster-file").addEventListener("change", (olay) => {
    const dosya = olay.target.files && olay.target.files[0];
    if (!dosya) return;
    const note = $("a-poster-note");
    note.textContent = "checking…";

    dosya.text().then((text) => {
      const box = $("a-poster-preview");
      box.textContent = "";
      const sarmal = document.createElement("div");
      sarmal.className = "adm-poster-inner";
      sarmal.innerHTML = text;
      box.appendChild(sarmal);

      const svg = sarmal.querySelector("svg");
      if (!svg) { note.textContent = "that file has no <svg> in it."; return; }

      const kutuOlcu = (svg.getAttribute("viewBox") || "").split(/\s+/);
      const genislik = Number(kutuOlcu[2]) || 400;
      const yukseklik = Number(kutuOlcu[3]) || 600;

      const problems = [];
      if (Math.abs(genislik / yukseklik - 2 / 3) > 0.01) {
        problems.push(`viewBox ${genislik}×${yukseklik} — should be 2:3 (400×600)`);
      }

      /* Yazilar cerceveyi tasiyor mu: x + width <= 388 */
      const sinir = genislik - 12;
      svg.querySelectorAll("text").forEach((t) => {
        let k;
        try { k = t.getBBox(); } catch (_) { return; }
        if (k.x + k.width > sinir + 0.5) {
          problems.push(`"${(t.textContent || "").slice(0, 18)}" runs ${Math.round(k.x + k.width - sinir)}px past the frame`);
        }
        if (k.x < 12 - 0.5) {
          problems.push(`"${(t.textContent || "").slice(0, 18)}" starts left of the frame`);
        }
      });

      note.textContent = problems.length
        ? problems.join("  ·  ")
        : "looks fine: 2:3 and nothing crosses the frame.";
      note.className = "adm-poster-note" + (problems.length ? " bad" : " good");

      /* Sorun yoksa yuklenebilir. Sorunluysa yukleme dugmesi hic
         gorunmuyor: bozuk poster siteye gitmesin. */
      yukleDugmesi.hidden = Boolean(problems.length) || !chosen;
      bekleyenDosya = problems.length ? null : dosya;
    });
  });

  /* --- depoya yukleme --- */

  let bekleyenDosya = null;
  const yukleDugmesi = document.getElementById("a-poster-upload");

  yukleDugmesi.addEventListener("click", () => {
    if (!bekleyenDosya || !chosen) return;
    const note = $("a-poster-note");
    const name = chosen.slug + "-" + Date.now() + ".svg";
    note.textContent = "uploading…";
    note.className = "adm-poster-note";

    fetch(AYAR.url.replace(/\/$/, "") + "/storage/v1/object/posters/" + name, {
      method: "POST",
      headers: {
        apikey: AYAR.anonKey,
        Authorization: "Bearer " + AH.token,
        "Content-Type": "image/svg+xml",
        "x-upsert": "true",
      },
      body: bekleyenDosya,
    })
      .then(async (c) => {
        if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
        /* Kaydin poster_path'ini mark: site bundan sonra bu dosyayi
           gosterir, posters/NN.svg yerine. */
        return AH.request("/events?id=eq." + chosen.id, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ poster_path: name }),
        });
      })
      .then(() => {
        note.textContent = "uploaded. the site uses this file now.";
        note.className = "adm-poster-note good";
        yukleDugmesi.hidden = true;
        bekleyenDosya = null;
        return reload();
      })
      .catch((h) => {
        note.textContent = "couldn't upload: " + h.message;
        note.className = "adm-poster-note bad";
      });
  });

  /* --- yorum denetimi --- */

  /* --- geri bildirim ---
     feedback tablosunu yalniz yonetici okuyor; yazan kendi yazdigini
     bile goremiyor (backend/sql/13_feedback.sql). Yani burasi o
     mesajlarin gorulebildigi TEK yer. */

  const TUR = { broken: "broken", idea: "idea", event: "event", other: "other" };

  function fetchFeedback() {
    return AH.request("/rpc/feedback_list", {
      method: "POST",
      body: JSON.stringify({ p_limit: 60 }),
    }).then(drawFeedback).catch(() => {});
  }

  function drawFeedback(rows) {
    const list = $("adm-feedback-list");
    const sayac = $("adm-feedback-number");
    list.textContent = "";

    const open = (rows || []).filter((g) => !g.handled).length;
    sayac.textContent = open ? "· " + open + " waiting" : "· all handled";

    if (!rows || !rows.length) {
      const empty = document.createElement("li");
      empty.className = "adm-feedback-empty";
      empty.textContent = "nothing yet.";
      list.appendChild(empty);
      return;
    }

    rows.forEach((g) => {
      const li = document.createElement("li");
      li.className = "adm-feedback-row" + (g.handled ? " done" : "");

      const top = document.createElement("div");
      top.className = "adm-feedback-top";

      const kind = document.createElement("span");
      kind.className = "adm-feedback-kind";
      kind.textContent = TUR[g.kind] || g.kind;
      top.appendChild(kind);

      const who = document.createElement("span");
      who.className = "adm-feedback-who";
      /* Girisli yazan handle ile, girissiz biraktigi iletisimle,
         hicbirini vermeyen "anonymous" olarak gorunuyor. */
      who.textContent = g.author ? "@" + g.author : (g.contact || "anonymous");
      top.appendChild(who);

      const ne = document.createElement("span");
      ne.className = "adm-feedback-when";
      ne.textContent = String(g.created_at || "").slice(0, 10);
      top.appendChild(ne);

      const isaret = document.createElement("button");
      isaret.className = "adm-comment-action";
      isaret.type = "button";
      isaret.textContent = g.handled ? "reopen" : "handled";
      isaret.addEventListener("click", () => {
        AH.request("/feedback?id=eq." + g.id, {
          method: "PATCH",
          body: JSON.stringify({ handled: !g.handled }),
        }).then(fetchFeedback);
      });
      top.appendChild(isaret);

      const text = document.createElement("p");
      text.className = "adm-feedback-text";
      text.textContent = g.body;

      li.appendChild(top);
      li.appendChild(text);
      list.appendChild(li);
    });
  }

  function comments() {
    return AH.request("/comments?order=created_at.desc&limit=30")
      .then(drawComments)
      .catch(() => {});
  }

  function drawComments(rows) {
    const list = $("adm-comment-list");
    list.textContent = "";
    (rows || []).forEach((y) => {
      const li = document.createElement("li");
      li.className = "adm-comment" + (y.is_hidden ? " hidden" : "");

      const who = document.createElement("span");
      who.className = "adm-comment-who";
      who.textContent = y.author_name || "member";

      const text = document.createElement("span");
      text.className = "adm-comment-text";
      text.textContent = y.body;

      const hide = document.createElement("button");
      hide.className = "adm-comment-action";
      hide.type = "button";
      hide.textContent = y.is_hidden ? "show" : "hide";
      hide.addEventListener("click", () => {
        AH.request("/comments?id=eq." + y.id, {
          method: "PATCH",
          body: JSON.stringify({ is_hidden: !y.is_hidden }),
        }).then(comments);
      });

      li.appendChild(who);
      li.appendChild(text);
      li.appendChild(hide);
      list.appendChild(li);
    });
  }
})();
