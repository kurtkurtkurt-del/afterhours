/* afterhours — the panel on the site.
   The same panel as in the app (app/src/app/panel, (tabs)/panel.tsx), with
   the same rules: admins and community managers get in (my_role, 42), the
   admin also gets people and roles, feedback, the log, app errors and the
   database. Every write is a function of the database (42_staff.sql to
   55_post_social.sql) with its own check, so this page cannot do more than
   the app — the protection is in the database, not here.  */

(function () {
  const CONFIG = window.AH_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const gate = $("adm-gate"), gateText = $("adm-gate-text"), gateLink = $("adm-gate-link");
  const panel = $("adm"), tabsBox = $("adm-tabs"), body = $("adm-body"), whoLine = $("adm-who");
  const signInForm = $("adm-intro"), signInNote = $("adm-intro-note");

  /* The numbered SQL files the app needs; kept equal to
     backend/tools/expected-sql.mjs by backend/test/setup.test.mjs. */
  const EXPECTED_SQL = [
    "00_migrations.sql",
    "01_schema.sql",
    "02_rls.sql",
    "03_seed_catalog.sql",
    "04_seed_events.sql",
    "05_seed_comments.sql",
    "06_views.sql",
    "07_friends.sql",
    "08_storage.sql",
    "09_jobs.sql",
    "11_world.sql",
    "12_profiles.sql",
    "13_feedback.sql",
    "14_export.sql",
    "15_ticketmaster.sql",
    "16_coverage.sql",
    "17_real_people.sql",
    "18_geo.sql",
    "19_checkins.sql",
    "20_djs.sql",
    "21_sound.sql",
    "22_hardening.sql",
    "23_checkin_open.sql",
    "24_photos.sql",
    "25_people.sql",
    "26_push.sql",
    "27_sparks.sql",
    "28_spark_waves.sql",
    "29_profile_more.sql",
    "30_spark_map.sql",
    "31_past_feed.sql",
    "32_rsvp.sql",
    "33_waves.sql",
    "34_spark_push.sql",
    "35_spark_people.sql",
    "36_person_cards.sql",
    "37_offline.sql",
    "38_profile_lists.sql",
    "39_spark_kinds.sql",
    "40_event_about.sql",
    "41_account_types.sql",
    "42_staff.sql",
    "43_event_submit.sql",
    "44_groups.sql",
    "45_posts.sql",
    "46_group_plans.sql",
    "47_group_nights.sql",
    "48_group_push.sql",
    "49_design_reads.sql",
    "50_blocks.sql",
    "51_safety.sql",
    "52_bans.sql",
    "53_trust.sql",
    "54_upkeep.sql",
    "55_post_social.sql",
  ];

  /* A tool, not the site: its words live here, in the three languages. */
  const W = {
    overview: ["overview", "übersicht", "genel"],
    nights: ["nights", "nächte", "geceler"],
    pending: ["sent in", "eingesandt", "gönderilenler"],
    reports: ["reports", "meldungen", "şikayetler"],
    posts: ["reported posts", "gemeldete posts", "şikayetli gönderiler"],
    djs: ["dj pages waiting", "wartende dj-seiten", "bekleyen dj sayfaları"],
    comments: ["comments", "kommentare", "yorumlar"],
    make: ["make", "anlegen", "oluştur"],
    people: ["people and roles", "leute und rollen", "kişiler ve roller"],
    feedback: ["feedback", "feedback", "geri bildirim"],
    log: ["the log", "protokoll", "kayıt defteri"],
    errors: ["app errors", "app-fehler", "uygulama hataları"],
    loading: ["…", "…", "…"],
    none: ["nothing here.", "nichts hier.", "burada bir şey yok."],
    save: ["save", "speichern", "kaydet"],
    saved: ["saved.", "gespeichert.", "kaydedildi."],
    remove: ["remove", "entfernen", "kaldır"],
    keep: ["keep", "behalten", "bırak"],
    ban: ["close the account", "konto sperren", "hesabı kapat"],
    unban: ["open it again", "wieder freigeben", "yeniden aç"],
    hide: ["hide", "verstecken", "gizle"],
    show: ["show", "zeigen", "göster"],
    ok: ["let it through", "freigeben", "onayla"],
    no: ["turn it down", "ablehnen", "reddet"],
    edit: ["edit", "bearbeiten", "düzenle"],
    del: ["delete", "löschen", "sil"],
    sure: ["sure?", "sicher?", "emin misin?"],
    newNight: ["new night", "neue nacht", "yeni gece"],
    newVenue: ["new venue", "neuer ort", "yeni mekan"],
    newDj: ["new dj", "neuer dj", "yeni dj"],
    title: ["title", "titel", "başlık"],
    city: ["city", "stadt", "şehir"],
    type: ["kind", "art", "tür"],
    venue: ["venue", "ort", "mekan"],
    date: ["date", "datum", "tarih"],
    time: ["time", "uhrzeit", "saat"],
    text: ["text", "text", "metin"],
    ticket: ["ticket link", "ticket-link", "bilet linki"],
    image: ["photo link", "foto-link", "fotoğraf linki"],
    published: ["published", "veröffentlicht", "yayında"],
    name: ["name", "name", "isim"],
    genre: ["genre", "genre", "tür"],
    sound: ["sound", "sound", "ses"],
    bio: ["bio", "bio", "biyografi"],
    lat: ["lat", "lat", "enlem"],
    lng: ["lng", "lng", "boylam"],
    search: ["search", "suchen", "ara"],
    role: ["role", "rolle", "rol"],
    all: ["all", "alle", "hepsi"],
    closed: ["closed", "gesperrt", "kapalı"],
    whyNote: ["a line the sender sees (optional)", "eine zeile für den absender (optional)", "gönderenin göreceği not (isteğe bağlı)"],
    whyBan: ["why? they see it (optional)", "warum? sie sehen es (optional)", "neden? görecek (isteğe bağlı)"],
    handled: ["done", "erledigt", "tamam"],
    open: ["open", "offen", "açık"],
    clear: ["clear all", "alle löschen", "hepsini temizle"],
    db: ["database", "datenbank", "veritabanı"],
    dbOk: ["up to date with the app", "auf dem stand der app", "uygulamayla güncel"],
    dbBehind: ["never pasted:", "nie eingefügt:", "hiç yapıştırılmamış:"],
    waiting: ["waiting in the panel", "warten im panel", "panelde bekleyen"],
    notStaff: ["this account is neither admin nor community manager.", "dieses konto ist weder admin noch community manager.", "bu hesap admin ya da topluluk yöneticisi değil."],
    you: ["signed in as", "angemeldet als", "giriş:"],
    remove_what: ["remove: comment hidden · message, spark, group deleted · profile cleared", "entfernen: kommentar versteckt · nachricht, spark, gruppe gelöscht · profil geleert", "kaldır: yorum gizlenir · mesaj, spark, grup silinir · profil temizlenir"],
    makeAdmin: ["make admin", "zum admin machen", "admin yap"],
    unmakeAdmin: ["take admin away", "admin entziehen", "adminliği al"],
    lastAdmin: ["the last admin stays an admin.", "der letzte admin bleibt admin.", "son admin admin kalır."],
  };
  const L = { en: 0, de: 1, tr: 2 };
  const w = (k) => (W[k] || [k])[L[AH.lang] ?? 0];

  /* ---------- small builders ---------- */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const button = (label, onClick, cls) => {
    const b = el("button", "adm2-btn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  };
  const rpc = (name, args) => AH.request("/rpc/" + name, { method: "POST", body: JSON.stringify(args || {}) });
  const why = (e) => String((e && e.message) || e).toLowerCase();
  const day = (iso) => (iso ? String(iso).slice(0, 16).replace("T", " ") : "");
  function say(text, bad) {
    const p = el("p", "adm2-said" + (bad ? " bad" : ""), text);
    body.prepend(p);
    setTimeout(() => p.remove(), 5000);
  }
  function field(label, input) {
    const box = el("label", "adm2-field");
    box.appendChild(el("span", "adm2-label", label));
    box.appendChild(input);
    return box;
  }
  function input(value, type) {
    const i = el("input", "adm2-input");
    i.type = type || "text";
    i.value = value == null ? "" : value;
    return i;
  }
  function select(options, value) {
    const s = el("select", "adm2-input");
    options.forEach(([v, label]) => {
      const o = el("option", null, label);
      o.value = v;
      if (v === value) o.selected = true;
      s.appendChild(o);
    });
    return s;
  }
  function card(title, meta, text) {
    const c = el("article", "adm2-card");
    if (meta) c.appendChild(el("p", "adm2-meta", meta));
    if (title) c.appendChild(el("p", "adm2-title", title));
    if (text) c.appendChild(el("p", "adm2-text", text));
    return c;
  }
  function row(...buttons) {
    const r = el("div", "adm2-row");
    buttons.filter(Boolean).forEach((b) => r.appendChild(b));
    return r;
  }
  function ask(text) { return window.prompt(text, "") ; }
  function list(promise, draw) {
    body.textContent = "";
    body.appendChild(el("p", "adm2-quiet", w("loading")));
    return promise
      .then((rows) => {
        body.textContent = "";
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) body.appendChild(el("p", "adm2-quiet", w("none")));
        rows.forEach((r) => body.appendChild(draw(r)));
      })
      .catch((e) => { body.textContent = ""; say(why(e), true); });
  }

  /* ---------- sections ---------- */

  let role = null;
  let lists = { cities: [], types: [] };

  const SECTIONS = [
    { id: "overview", staff: true, draw: drawOverview },
    { id: "nights", staff: true, draw: drawNights },
    { id: "pending", staff: true, draw: drawPending },
    { id: "reports", staff: true, draw: drawReports },
    { id: "posts", staff: true, draw: drawPosts },
    { id: "djs", staff: true, draw: drawDjs },
    { id: "comments", staff: true, draw: drawComments },
    { id: "make", staff: true, draw: drawMake },
    { id: "people", admin: true, draw: drawPeople },
    { id: "feedback", admin: true, draw: drawFeedback },
    { id: "log", admin: true, draw: drawLog },
    { id: "errors", admin: true, draw: drawErrors },
  ];

  function open(id) {
    const s = SECTIONS.find((x) => x.id === id) || SECTIONS[0];
    [...tabsBox.children].forEach((b) => b.classList.toggle("on", b.dataset.id === s.id));
    try { history.replaceState(null, "", "#" + s.id); } catch (_) {}
    s.draw();
  }

  function drawTabs() {
    tabsBox.textContent = "";
    SECTIONS.filter((s) => !s.admin || role === "admin").forEach((s) => {
      const b = button(w(s.id), () => open(s.id), "adm2-tab");
      b.dataset.id = s.id;
      tabsBox.appendChild(b);
    });
  }

  function drawOverview() {
    body.textContent = "";
    const grid = el("div", "adm2-grid");
    body.appendChild(grid);
    const cell = (label, n) => {
      const c = el("div", "adm2-cell");
      c.appendChild(el("p", "adm2-n", n == null ? "–" : String(n)));
      c.appendChild(el("p", "adm2-meta", label));
      grid.appendChild(c);
    };
    Promise.all([rpc("admin_overview").catch(() => ({})), rpc("staff_waiting").catch(() => null)]).then(([o, waiting]) => {
      cell(w("waiting"), waiting);
      [["people", o.people], ["new this week", o.people_week], ["sent in", o.pending], ["reported posts", o.reported],
       ["nights ahead", o.nights_ahead], ["made here", o.nights_staff], ["venues", o.venues], ["comments this week", o.comments_week]]
        .forEach(([k, n]) => cell(k, n));
      if (role === "admin") [["community managers", o.managers], ["djs", o.djs], ["feedback open", o.feedback_open]].forEach(([k, n]) => cell(k, n));
    });
    if (role === "admin") {
      const db = card(w("db"), null, "…");
      body.appendChild(db);
      rpc("migrations_applied").then((rows) => {
        const have = new Set((rows || []).map((r) => r.name));
        const missing = EXPECTED_SQL.filter((n) => !have.has(n));
        db.lastChild.textContent = missing.length ? w("dbBehind") + " " + missing.join(", ") : w("dbOk");
        if (missing.length) db.classList.add("bad");
      }).catch((e) => { db.lastChild.textContent = why(e); });
    }
  }

  function nightForm(n, done) {
    const f = el("form", "adm2-form");
    const title = input(n && n.title);
    const city = select(lists.cities.map((c) => [c.slug, c.name]), n ? n.city_slug : (lists.cities[0] || {}).slug);
    const type = select(lists.types.map((t) => [t.slug, t.name]), n ? n.type_slug : (lists.types[0] || {}).slug);
    const venue = select([["", "—"]], "");
    const starts = n && n.starts_at ? new Date(n.starts_at) : null;
    const pad = (x) => String(x).padStart(2, "0");
    const date = input(starts ? starts.getFullYear() + "-" + pad(starts.getMonth() + 1) + "-" + pad(starts.getDate()) : "", "date");
    const time = input(starts ? pad(starts.getHours()) + ":" + pad(starts.getMinutes()) : "23:00", "time");
    const text = el("textarea", "adm2-input"); text.value = (n && n.body) || ""; text.rows = 4;
    const ticket = input(n && n.ticket_url, "url");
    const image = input(n && n.image_url, "url");
    const pub = input("", "checkbox"); pub.checked = n ? n.is_published : true;
    const venues = () => AH.request("/venues?select=id,name,cities!inner(slug)&cities.slug=eq." + encodeURIComponent(city.value) + "&order=name&limit=300")
      .then((rows) => {
        venue.textContent = "";
        [["", "—"], ...(rows || []).map((v) => [v.id, v.name])].forEach(([v, l]) => {
          const o = el("option", null, l); o.value = v; if (n && v === n.venue_id) o.selected = true; venue.appendChild(o);
        });
      }).catch(() => {});
    city.addEventListener("change", venues);
    venues();
    [[w("title"), title], [w("city"), city], [w("type"), type], [w("venue"), venue], [w("date"), date], [w("time"), time],
     [w("text"), text], [w("ticket"), ticket], [w("image"), image], [w("published"), pub]].forEach(([l, i]) => f.appendChild(field(l, i)));
    f.appendChild(row(button(w("save"), () => {
      rpc("staff_event_save", {
        p_id: n ? n.id : null, p_title: title.value, p_city: city.value, p_type: type.value, p_venue: venue.value || null,
        p_date: date.value, p_time: time.value, p_body: text.value, p_ticket_url: ticket.value, p_image_url: image.value, p_published: pub.checked,
      }).then(() => { say(w("saved")); done(); }, (e) => say(why(e), true));
    }, "on")));
    return f;
  }

  function drawNights() {
    const fresh = () => drawNights();
    list(rpc("staff_events", { p_limit: 200 }), (n) => {
      const c = card(n.title, [day(n.starts_at), n.city_slug, n.type_slug, n.maker ? "@" + n.maker : null, n.is_published ? null : "hidden"].filter(Boolean).join(" · "));
      c.appendChild(row(
        button(w("edit"), () => { c.replaceWith(nightForm(n, fresh)); }),
        button(w("del"), () => { if (confirm(w("sure"))) rpc("staff_event_delete", { p_id: n.id }).then(fresh, (e) => say(why(e), true)); }, "bad"),
      ));
      return c;
    }).then(() => body.prepend(row(button(w("newNight"), () => body.prepend(nightForm(null, fresh)), "on"))));
  }

  function drawPending() {
    list(rpc("staff_pending"), (p) => {
      const c = card(p.title, [day(p.starts_at), p.city_slug, p.type_slug, p.venue_name, "@" + (p.handle || p.maker || "—")].filter(Boolean).join(" · "), p.body);
      if (p.ticket_url) { const a = el("a", "adm2-link", p.ticket_url); a.href = p.ticket_url; a.target = "_blank"; a.rel = "noopener"; c.appendChild(a); }
      c.appendChild(row(
        button(w("ok"), () => rpc("staff_review", { p_id: p.id, p_ok: true, p_note: null }).then(() => c.remove(), (e) => say(why(e), true)), "on"),
        button(w("no"), () => { const note = ask(w("whyNote")); if (note === null) return; rpc("staff_review", { p_id: p.id, p_ok: false, p_note: note || null }).then(() => c.remove(), (e) => say(why(e), true)); }, "bad"),
      ));
      return c;
    });
  }

  function drawReports() {
    list(rpc("staff_reports"), (r) => {
      const c = card(r.preview || "(gone)", [r.kind, "@" + (r.author || "—"), day(r.first_at), r.reports + "×"].join(" · "),
        r.reasons && r.reasons.length ? r.reasons.map((x) => "“" + x + "”").join("  ") : null);
      c.appendChild(el("p", "adm2-meta", w("remove_what")));
      const settle = (remove) => rpc("staff_report_settle", { p_kind: r.kind, p_target: r.target, p_remove: remove }).then(() => c.remove(), (e) => say(why(e), true));
      c.appendChild(row(
        button(w("remove"), () => settle(true), "bad"),
        button(w("keep"), () => settle(false)),
        button(w("ban"), () => { const note = ask(w("whyBan")); if (note === null) return; rpc("staff_ban_author", { p_kind: r.kind, p_target: r.target, p_reason: note || null }).then(() => c.remove(), (e) => say(why(e), true)); }, "bad"),
      ));
      return c;
    });
  }

  function drawPosts() {
    list(rpc("staff_posts_reported"), (p) => {
      const c = card(p.body || "📷", ["@" + (p.author || "—"), day(p.created_at), p.reports + "×", p.is_hidden ? "hidden" : null].filter(Boolean).join(" · "),
        p.reasons && p.reasons.length ? p.reasons.map((x) => "“" + x + "”").join("  ") : null);
      if (p.photo_path) {
        const img = el("img", "adm2-img");
        img.src = CONFIG.url.replace(/\/$/, "") + "/storage/v1/object/public/photos/" + p.photo_path;
        img.alt = "";
        c.prepend(img);
      }
      c.appendChild(row(
        button(w("hide"), () => rpc("staff_post_hide", { p_id: p.id, p_hidden: true }).then(() => c.remove(), (e) => say(why(e), true)), "bad"),
        button(w("keep"), () => rpc("staff_post_hide", { p_id: p.id, p_hidden: false }).then(() => c.remove(), (e) => say(why(e), true))),
      ));
      return c;
    });
  }

  function drawDjs() {
    list(rpc("staff_djs_waiting"), (d) => {
      const c = card(d.name, ["@" + (d.owner || "—"), d.genre, day(d.created_at)].filter(Boolean).join(" · "), d.bio);
      if (d.photo_url) { const img = el("img", "adm2-img"); img.src = d.photo_url; img.alt = ""; c.prepend(img); }
      c.appendChild(row(
        button(w("ok"), () => rpc("staff_dj_verify", { p_dj: d.id, p_ok: true }).then(() => c.remove(), (e) => say(why(e), true)), "on"),
        button(w("no"), () => rpc("staff_dj_verify", { p_dj: d.id, p_ok: false }).then(() => c.remove(), (e) => say(why(e), true)), "bad"),
      ));
      return c;
    });
  }

  function drawComments() {
    list(rpc("staff_comments", { p_limit: 100 }), (m) => {
      const c = card(m.body, ["@" + (m.author || "—"), m.night, day(m.created_at), m.is_hidden ? "hidden" : null].filter(Boolean).join(" · "));
      const b = button(m.is_hidden ? w("show") : w("hide"), () => {
        rpc("staff_comment_hide", { p_id: m.id, p_hidden: !m.is_hidden }).then(() => {
          m.is_hidden = !m.is_hidden;
          b.textContent = m.is_hidden ? w("show") : w("hide");
        }, (e) => say(why(e), true));
      }, m.is_hidden ? "" : "bad");
      c.appendChild(row(b));
      return c;
    });
  }

  function drawMake() {
    body.textContent = "";
    /* a venue */
    const v = el("form", "adm2-form");
    v.appendChild(el("p", "adm2-title", w("newVenue")));
    const vCity = select(lists.cities.map((c) => [c.slug, c.name]), (lists.cities[0] || {}).slug);
    const vName = input(""), vLat = input("", "number"), vLng = input("", "number");
    vLat.step = vLng.step = "any";
    [[w("city"), vCity], [w("name"), vName], [w("lat"), vLat], [w("lng"), vLng]].forEach(([l, i]) => v.appendChild(field(l, i)));
    v.appendChild(row(button(w("save"), () => rpc("staff_venue_save", {
      p_id: null, p_city: vCity.value, p_name: vName.value,
      p_lat: vLat.value === "" ? null : Number(vLat.value), p_lng: vLng.value === "" ? null : Number(vLng.value),
    }).then(() => { say(w("saved")); vName.value = ""; }, (e) => say(why(e), true)), "on")));
    body.appendChild(v);
    /* a dj */
    const d = el("form", "adm2-form");
    d.appendChild(el("p", "adm2-title", w("newDj")));
    const dName = input(""), dGenre = input("");
    const dSound = select([["techno", "techno"], ["house", "house"], ["rap", "rap"]], "techno");
    const dCity = select([["", "—"], ...lists.cities.map((c) => [c.slug, c.name])], "");
    const dBio = el("textarea", "adm2-input"); dBio.rows = 3;
    const dPhoto = input("", "url");
    [[w("name"), dName], [w("genre"), dGenre], [w("sound"), dSound], [w("city"), dCity], [w("bio"), dBio], [w("image"), dPhoto]].forEach(([l, i]) => d.appendChild(field(l, i)));
    d.appendChild(row(button(w("save"), () => rpc("staff_dj_save", {
      p_id: null, p_name: dName.value, p_genre: dGenre.value, p_sound: dSound.value, p_city: dCity.value || null, p_bio: dBio.value, p_photo: dPhoto.value,
    }).then(() => { say(w("saved")); dName.value = ""; }, (e) => say(why(e), true)), "on")));
    body.appendChild(d);
  }

  function drawPeople(q, filter) {
    q = q || ""; filter = filter || "";
    body.textContent = "";
    const top = el("div", "adm2-row");
    const search = input(q, "search"); search.placeholder = w("search");
    top.appendChild(search);
    body.appendChild(top);
    const chips = el("div", "adm2-row");
    body.appendChild(chips);
    const box = el("div");
    body.appendChild(box);
    let timer = null;
    search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => load(search.value, filter), 250); });
    rpc("admin_role_counts").then((n) => {
      [["", w("all"), n.all], ["dj", "dj", n.dj], ["community_manager", "cm", n.community_manager], ["admin", "admin", n.admin], ["new", "new", n.new], ["banned", w("closed"), n.banned]]
        .forEach(([id, label, k]) => {
          const b = button(label + (k == null ? "" : " " + k), () => { filter = id; [...chips.children].forEach((x) => x.classList.remove("on")); b.classList.add("on"); load(search.value, id); }, id === filter ? "on" : "");
          chips.appendChild(b);
        });
    }).catch(() => {});
    function load(query, f) {
      box.textContent = "";
      rpc("admin_people_by", { p_query: query, p_role: f }).then((rows) => {
        (rows || []).forEach((p) => {
          const c = card((p.display_name || p.handle || "—").toLowerCase(),
            [p.handle ? "@" + p.handle : null, p.role, p.banned ? w("closed") : null, p.nights + " nights", p.groups ? p.groups + " groups" : null].filter(Boolean).join(" · "));
          const pick = select([["user", "normal user"], ["dj", "dj"], ["community_manager", "community manager"], ["admin", "admin"]], p.role);
          pick.addEventListener("change", () => {
            const v = pick.value;
            const go = v === "admin" ? rpc("admin_set_admin", { p_user: p.id, p_on: true })
              : p.role === "admin" ? rpc("admin_set_admin", { p_user: p.id, p_on: false }).then((r) => (r === "ok" && v !== "user" ? rpc("admin_set_type", { p_user: p.id, p_type: v }) : r))
              : rpc("admin_set_type", { p_user: p.id, p_type: v });
            go.then((r) => {
              if (r && r !== "ok") { say(r === "last" ? w("lastAdmin") : String(r), true); pick.value = p.role; return; }
              p.role = v; say(w("saved"));
            }, (e) => { say(why(e), true); pick.value = p.role; });
          });
          c.appendChild(field(w("role"), pick));
          c.appendChild(row(p.banned
            ? button(w("unban"), () => rpc("staff_unban", { p_user: p.id }).then(() => load(search.value, filter), (e) => say(why(e), true)))
            : (p.role === "admin" || p.role === "community_manager") ? null
            : button(w("ban"), () => { const note = ask(w("whyBan")); if (note === null) return; rpc("staff_ban", { p_user: p.id, p_reason: note || null }).then(() => load(search.value, filter), (e) => say(why(e), true)); }, "bad")));
          box.appendChild(c);
        });
        if (!(rows || []).length) box.appendChild(el("p", "adm2-quiet", w("none")));
      }).catch((e) => say(why(e), true));
    }
    load(q, filter);
  }

  function drawFeedback() {
    list(rpc("feedback_list", { p_limit: 200 }), (f) => {
      const c = card(f.body, [f.kind, f.author ? "@" + f.author : null, f.contact, day(f.created_at), f.handled ? w("handled") : w("open")].filter(Boolean).join(" · "));
      const b = button(f.handled ? w("open") : w("handled"), () => {
        AH.request("/feedback?id=eq." + f.id, { method: "PATCH", body: JSON.stringify({ handled: !f.handled }) })
          .then(() => { f.handled = !f.handled; b.textContent = f.handled ? w("open") : w("handled"); }, (e) => say(why(e), true));
      });
      c.appendChild(row(b));
      return c;
    });
  }

  function drawLog() {
    list(rpc("admin_log", { p_limit: 200 }), (l) => card(l.action + " " + l.target + (l.note ? " · " + l.note : ""), "@" + l.who + " · " + day(l.at)));
  }

  function drawErrors() {
    list(rpc("admin_errors", { p_limit: 200 }), (e) => {
      const c = card((e.fatal ? "● " : "") + e.message, [day(e.at), e.platform, e.version, e.where_, e.who ? "@" + e.who : null].filter(Boolean).join(" · "));
      if (e.stack) { const pre = el("pre", "adm2-pre", e.stack.slice(0, 1500)); c.appendChild(pre); }
      return c;
    }).then(() => body.appendChild(row(button(w("clear"), () => {
      if (confirm(w("sure"))) rpc("admin_errors_clear").then(drawErrors, (e) => say(why(e), true));
    }, "bad"))));
  }

  /* ---------- the gate ---------- */

  gateText.textContent = AH.t("admin.checking");
  function showGate(text, wantsSignIn) {
    gate.hidden = false;
    panel.hidden = true;
    gateText.textContent = text;
    gateLink.hidden = !wantsSignIn;
    signInForm.hidden = !wantsSignIn;
  }
  signInForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("adm-email").value.trim();
    const password = $("adm-password").value;
    if (!email || !password) return;
    signInNote.textContent = AH.t("admin.signin.wait");
    AH.signInWithPassword(email, password)
      .then(() => { location.reload(); })
      .catch((h) => {
        signInNote.textContent = /invalid/i.test(h.message) ? AH.t("admin.signin.wrong") : AH.t("admin.signin.failed", { why: h.message });
      });
  });

  if (!(CONFIG.url && CONFIG.anonKey)) {
    showGate(AH.t("admin.gate.nobackend"), false);
    return;
  }
  AH.sessionReady
    .then(() => {
      if (!AH.signedIn()) { showGate(AH.t("admin.gate.signin"), true); return null; }
      return rpc("my_role");
    })
    .then((r) => {
      if (r === null || r === undefined) return;
      role = r;
      if (role !== "admin" && role !== "community_manager") { showGate(w("notStaff"), false); return; }
      gate.hidden = true;
      panel.hidden = false;
      const u = AH.session && AH.session.user;
      whoLine.textContent = w("you") + " " + ((u && u.email) || "") + " · " + role;
      return Promise.all([
        AH.request("/cities?select=slug,name&order=sort_order").catch(() => []),
        AH.request("/event_types?select=slug,name&order=sort_order").catch(() => []),
      ]).then(([c, t]) => {
        lists = { cities: c || [], types: t || [] };
        drawTabs();
        open((location.hash || "").slice(1));
      });
    })
    .catch((h) => showGate(AH.t("admin.gate.failed", { why: h.message }), false));
})();
