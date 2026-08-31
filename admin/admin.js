/* afterhours — the admin panel.
   Only useful to an account with is_admin. Anyone may open this page;
   the protection is not in the page but in the database
   (backend/sql/02_rls.sql). An admin
   who is not one can write nothing here, and cannot even see what is
   unpublished.  */

(function () {
  const CONFIG = window.AH_CONFIG || {};
  const gate = document.getElementById("adm-gate");
  const gateText = document.getElementById("adm-gate-text");
  const gateLink = document.getElementById("adm-gate-link");
  const panel = document.getElementById("adm");

  const $ = (id) => document.getElementById(id);
  const listArea = $("adm-list");
  const summary = $("adm-summary");
  const searchField = $("adm-search");
  const editor = $("adm-edit");
  const status = $("a-status");

  let events = [];
  let kinds = [];
  let cities = [];
  let venues = [];
  let counts = {};
  let chosen = null;

  const signInForm = document.getElementById("adm-intro");
  const signInNote = document.getElementById("adm-intro-note");

  function showGate(text, wantsSignIn) {
    gate.hidden = false;
    panel.hidden = true;
    gateText.textContent = text;
    gateLink.hidden = !wantsSignIn;
    signInForm.hidden = !wantsSignIn;
  }

  /* Signing in with a password: a way into the panel that does not run
     into the email quota. Nothing is stored here, it goes straight to
     Supabase. */
  signInForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("adm-email").value.trim();
    const password = document.getElementById("adm-password").value;
    if (!email || !password) return;
    signInNote.textContent = "signing in…";
    AH.signInWithPassword(email, password)
      .then(() => { location.reload(); })
      .catch((h) => {
        signInNote.textContent = /invalid/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message;
      });
  });

  /* --- start: identity first, then permission --- */

  if (!(CONFIG.url && CONFIG.anonKey)) {
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
      gate.hidden = true;
      panel.hidden = false;
      return start();
    })
    .catch((h) => showGate("couldn't check the account: " + h.message, false));

  /* --- the data --- */

  function start() {
    return Promise.all([
      AH.request("/event_types?order=sort_order"),
      AH.request("/cities?order=sort_order"),
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
    const add = (field, records, withEmpty) => {
      field.textContent = "";
      if (withEmpty) {
        const o = document.createElement("option");
        o.value = ""; o.textContent = "—";
        field.appendChild(o);
      }
      records.forEach((k) => {
        const o = document.createElement("option");
        o.value = k.id;
        o.textContent = k.name;
        field.appendChild(o);
      });
    };
    add($("a-type"), kinds, false);
    add($("a-city"), cities, false);
    add($("a-venue"), venues, true);
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
    const query = (searchField.value || "").trim().toLowerCase();
    const visible = events.filter(
      (e) => !query ||
        (e.title + " " + e.slug + " " + e.meta).toLowerCase().includes(query)
    );

    listArea.textContent = "";
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
      listArea.appendChild(li);
    });

    const flagged = events.filter((e) => warnings(e).length).length;
    summary.textContent =
      `${events.length} events · ${flagged} need attention` +
      (query ? ` · showing ${visible.length}` : "");
  }

  searchField.addEventListener("input", drawList);

  /* --- editing --- */

  /* "2026-09-11T18:30" in the browser's own time zone, which is what a
     datetime-local field both shows and gives back. */
  function localInputValue(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
           "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function select(e) {
    chosen = e;
    editor.hidden = false;
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
    /* datetime-local speaks LOCAL wall time. toISOString() hands back UTC,
       and the save path parses the field as local again — that mismatch
       shifted every date two hours earlier per open-and-save. Build the
       value from the local clock so the round trip is a no-op. */
    $("a-starts").value = e.starts_at ? localInputValue(new Date(e.starts_at)) : "";
    $("a-number").textContent = counts[e.id] ? counts[e.id] + " people" : "nobody yet";

    showPoster(e.poster_no);
    drawList();
  }

  function showPoster(no) {
    const box = $("a-poster-preview");
    box.textContent = "";
    $("a-poster-note").textContent = "";
    if (!no) { box.textContent = "—"; return; }
    const object = document.createElement("object");
    object.type = "image/svg+xml";
    object.data = "../posters/" + String(no).padStart(2, "0") + ".svg";
    box.appendChild(object);
  }

  $("adm-new").addEventListener("click", () => {
    chosen = null;
    editor.hidden = false;
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

    const request = chosen
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

    request
      .then((rows) => {
        if (!rows || !rows.length) throw new Error("nothing was written");
        return reload().then(() => {
          const fresh = events.find((e) => e.id === rows[0].id);
          if (fresh) select(fresh);
          /* select() clears the status; write the message AFTER it */
          status.textContent = "saved.";
        });
      })
      .catch((h) => { status.textContent = "couldn't save: " + h.message; });
  });

  $("a-delete").addEventListener("click", () => {
    if (!chosen) return;
    /* Deleting cannot be undone; say what is going first */
    if (!window.confirm('delete "' + chosen.title + '" and everything attached to it?')) return;
    status.textContent = "deleting…";
    AH.request("/events?id=eq." + chosen.id, { method: "DELETE" })
      .then(() => { chosen = null; editor.hidden = true; return reload(); })
      .catch((h) => { status.textContent = "couldn't delete: " + h.message; });
  });

  /* --- checking a poster ---
     A poster's frame sits 12px inside a 400x600 box. Archivo 900 titles
     can run past that frame (four did in the set of 36), so we measure
     the uploaded SVG and say so. */

  $("a-poster-file").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const note = $("a-poster-note");
    note.textContent = "checking…";

    file.text().then((text) => {
      const box = $("a-poster-preview");
      box.textContent = "";

      /* The upload is data, not code: an SVG can carry <script> and on*
         handlers, and this page runs with the admin's session. Parse it
         detached, strip anything that could run, and only then let it
         near the document. */
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const parsed = doc.documentElement;
      if (doc.querySelector("parsererror") || parsed.nodeName.toLowerCase() !== "svg") {
        note.textContent = "that file has no <svg> in it.";
        return;
      }
      doc.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
      doc.querySelectorAll("*").forEach((el) => {
        [...el.attributes].forEach((a) => {
          if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) {
            el.removeAttribute(a.name);
          }
        });
      });

      const wrapper = document.createElement("div");
      wrapper.className = "adm-poster-inner";
      wrapper.appendChild(document.importNode(parsed, true));
      box.appendChild(wrapper);

      /* getBBox only answers on a rendered element: measure the copy in
         the document, not the detached parse. */
      const svg = wrapper.querySelector("svg");

      const boxSize = (svg.getAttribute("viewBox") || "").split(/\s+/);
      const width = Number(boxSize[2]) || 400;
      const height = Number(boxSize[3]) || 600;

      const problems = [];
      if (Math.abs(width / height - 2 / 3) > 0.01) {
        problems.push(`viewBox ${width}×${height} — should be 2:3 (400×600)`);
      }

      /* Does the text run past the frame: x + width <= 388 */
      const limit = width - 12;
      svg.querySelectorAll("text").forEach((t) => {
        let k;
        try { k = t.getBBox(); } catch (_) { return; }
        if (k.x + k.width > limit + 0.5) {
          problems.push(`"${(t.textContent || "").slice(0, 18)}" runs ${Math.round(k.x + k.width - limit)}px past the frame`);
        }
        if (k.x < 12 - 0.5) {
          problems.push(`"${(t.textContent || "").slice(0, 18)}" starts left of the frame`);
        }
      });

      note.textContent = problems.length
        ? problems.join("  ·  ")
        : "looks fine: 2:3 and nothing crosses the frame.";
      note.className = "adm-poster-note" + (problems.length ? " bad" : " good");

      /* If nothing is wrong it can be uploaded. If something is, the
         button stays hidden: a broken poster must not reach the site. */
      uploadButton.hidden = Boolean(problems.length) || !chosen;
      pendingFile = problems.length ? null : file;
    });
  });

  /* --- uploading to the store --- */

  let pendingFile = null;
  const uploadButton = document.getElementById("a-poster-upload");

  uploadButton.addEventListener("click", () => {
    if (!pendingFile || !chosen) return;
    const note = $("a-poster-note");
    const name = chosen.slug + "-" + Date.now() + ".svg";
    note.textContent = "uploading…";
    note.className = "adm-poster-note";

    fetch(CONFIG.url.replace(/\/$/, "") + "/storage/v1/object/posters/" + name, {
      method: "POST",
      headers: {
        apikey: CONFIG.anonKey,
        Authorization: "Bearer " + AH.token,
        "Content-Type": "image/svg+xml",
        "x-upsert": "true",
      },
      body: pendingFile,
    })
      .then(async (c) => {
        if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
        /* Stamp the record's poster_path: from now on the site shows this
           file instead of posters/NN.svg. */
        return AH.request("/events?id=eq." + chosen.id, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ poster_path: name }),
        });
      })
      .then(() => {
        note.textContent = "uploaded. the site uses this file now.";
        note.className = "adm-poster-note good";
        uploadButton.hidden = true;
        pendingFile = null;
        return reload();
      })
      .catch((h) => {
        note.textContent = "couldn't upload: " + h.message;
        note.className = "adm-poster-note bad";
      });
  });

  /* --- moderating the comments --- */

  /* --- feedback ---
     Only the admin reads the feedback table; not even the writer can see
     their own (backend/sql/13_feedback.sql). So this is the ONLY place
     those messages can be seen. */

  const KINDS = { broken: "broken", idea: "idea", event: "event", other: "other" };

  function fetchFeedback() {
    return AH.request("/rpc/feedback_list", {
      method: "POST",
      body: JSON.stringify({ p_limit: 60 }),
    }).then(drawFeedback).catch(() => {});
  }

  function drawFeedback(rows) {
    const list = $("adm-feedback-list");
    const counter = $("adm-feedback-number");
    list.textContent = "";

    const open = (rows || []).filter((g) => !g.handled).length;
    counter.textContent = open ? "· " + open + " waiting" : "· all handled";

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
      kind.textContent = KINDS[g.kind] || g.kind;
      top.appendChild(kind);

      const who = document.createElement("span");
      who.className = "adm-feedback-who";
      /* A signed-in writer shows by handle, a signed-out one by the
         contact they left, and someone who gave neither as "anonymous". */
      who.textContent = g.author ? "@" + g.author : (g.contact || "anonymous");
      top.appendChild(who);

      const what = document.createElement("span");
      what.className = "adm-feedback-when";
      what.textContent = String(g.created_at || "").slice(0, 10);
      top.appendChild(what);

      const mark = document.createElement("button");
      mark.className = "adm-comment-action";
      mark.type = "button";
      mark.textContent = g.handled ? "reopen" : "handled";
      mark.addEventListener("click", () => {
        AH.request("/feedback?id=eq." + g.id, {
          method: "PATCH",
          body: JSON.stringify({ handled: !g.handled }),
        }).then(fetchFeedback);
      });
      top.appendChild(mark);

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
      .then((rows) => {
        /* The table only carries author_name on the sample rows; a real
           comment has author_id, and the list was calling every real
           person "member". The admin may read all profiles, so one
           request resolves the lot. */
        const ids = [...new Set((rows || []).map((y) => y.author_id).filter(Boolean))];
        if (!ids.length) return drawComments(rows);
        return AH.request("/profiles?id=in.(" + ids.join(",") + ")&select=id,handle,display_name")
          .then((people) => {
            const names = {};
            (people || []).forEach((p) => { names[p.id] = p.handle || p.display_name; });
            rows.forEach((y) => {
              if (!y.author_name && names[y.author_id]) y.author_name = names[y.author_id];
            });
            return drawComments(rows);
          })
          .catch(() => drawComments(rows));
      })
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
