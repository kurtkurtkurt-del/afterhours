/* afterhours — the settings page.
   Butun is veritabanindaki fonksiyonlarda: profile profile_me()’den
   okunuyor, profile alanlari profile_setup() ile tek istekte yaziliyor,
   ucu de anahtar olan ayarlar dogrudan profile_settings’e yaziliyor
   (kural zaten yalniz kendi satirina izin veriyor).

   Girissizken ya da backend kapaliyken page durust: form hic
   gorunmuyor, sebebi yaziyor.  */

(function () {
  const AH = (window.AH = window.AH || {});

  const outside = document.getElementById("set-out");
  const inside = document.getElementById("set-in");
  if (!outside || !inside) return;

  const el = (id) => document.getElementById(id);
  const handleField = el("set-handle");
  const handleStatus = el("set-handle-status");
  const adAlan = el("set-name");
  const bioAlan = el("set-bio");
  const cityBox = el("set-city");
  const status = el("set-status");

  let profile = null;      /* the row from profile_me() */
  let city = null;       /* chosen city slug’i */

  const call = (fn, body) =>
    AH.request("/rpc/" + fn, { method: "POST", body: JSON.stringify(body || {}) });

  const scalar = (c) => (Array.isArray(c) ? c[0] : c);

  function say(box, text, kind) {
    box.textContent = text || "";
    box.className = "account-status" + (kind ? " " + kind : "");
  }

  /* --- two-option rows: the chosen one dark, the other faint --- */

  function buildChoice(box, value, yaz) {
    [...box.querySelectorAll("button")].forEach((d) => {
      d.classList.toggle("selected", d.dataset.value === String(value));
      d.onclick = () => {
        if (d.classList.contains("selected")) return;
        yaz(d.dataset.value).then(() => buildChoice(box, d.dataset.value, yaz));
      };
    });
  }

  function writeSetting(field, value) {
    const id = AH.session && AH.session.user && AH.session.user.id;
    const body = {};
    body[field] = value === "true" ? true : value === "false" ? false : value;
    return AH.request("/profile_settings?user_id=eq." + id, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    })
      .then(() => say(status, "saved.", "ok"))
      .catch((h) => say(status, AH.errorText(h, "couldn't save that."), "hata"));
  }

  /* --- cities ---
     Elli dorde cikti; duz bir list okunmuyordu. Ulkeye gore gruplayip
     kaydirilan bir kutuya aldik — explore’daki ulke→city sirasinin
     tek kutuya sigmis hali. Yalnizca gecesi olan cities geliyor. */

  function buildCities(chosen) {
    return call("city_counts")
      .then((list) => {
        cityBox.textContent = "";
        city = chosen;

        const groups = [];
        (list || []).filter((c) => Number(c.n) > 0).forEach((c) => {
          const last = groups[groups.length - 1];
          if (last && last.country === c.country) last.cities.push(c);
          else groups.push({ country: c.country, cities: [c] });
        });

        const mark = () => [...cityBox.querySelectorAll("button")]
          .forEach((x) => x.classList.toggle("selected", x.dataset.value === city));

        groups.forEach((g) => {
          const name = document.createElement("p");
          name.className = "set-country";
          name.textContent = (g.country || "").toLowerCase();
          cityBox.appendChild(name);

          const row = document.createElement("div");
          row.className = "set-choice";
          g.cities.forEach((c) => {
            const d = document.createElement("button");
            d.type = "button";
            d.dataset.value = c.slug;
            d.textContent = c.name.toLowerCase();
            d.onclick = () => { city = c.slug; mark(); };
            row.appendChild(d);
          });
          cityBox.appendChild(row);
        });

        mark();

        /* If the chosen city is mid-list, scroll the box to it */
        const open = cityBox.querySelector("button.selected");
        if (open) cityBox.scrollTop = Math.max(0, open.offsetTop - 40);
      })
      .catch(() => { cityBox.textContent = ""; });
  }

  /* --- the handle: ask whether it is free as you type --- */

  const SOZ = {
    ok: "free.", yours: "this one is yours.", taken: "someone already has that one.",
    format: "lowercase letters, numbers and underscore. 3–20.", empty: "",
  };

  let pending = null;
  handleField && handleField.addEventListener("input", () => {
    clearTimeout(pending);
    const h = handleField.value.trim();
    if (!h) { say(handleStatus, ""); return; }
    pending = setTimeout(() => {
      call("handle_status", { p_handle: h })
        .then((c) => say(handleStatus, SOZ[scalar(c)] || "",
          scalar(c) === "taken" || scalar(c) === "format" ? "error" : "ok"))
        .catch(() => say(handleStatus, ""));
    }, 300);
  });

  /* --- the four profile fields: in one request --- */

  const YANIT = {
    ok: "saved.", taken: "someone already has that handle.",
    format: "that handle doesn't fit the format.", empty: "pick a handle first.",
    city: "that city isn't on the list.", signedout: "sign in again.",
  };

  el("set-save").onclick = function () {
    say(status, "saving…");
    call("profile_setup", {
      p_handle: handleField.value.trim(),
      p_display_name: adAlan.value.trim(),
      p_city_slug: city,
      p_bio: bioAlan.value.trim(),
    })
      .then((c) => {
        const s = scalar(c);
        say(status, YANIT[s] || String(s), s === "ok" ? "ok" : "error");
        if (s === "ok") load();
      })
      .catch((h) => say(status, AH.errorText(h, "couldn't save that."), "hata"));
  };

  /* --- signing out --- */

  el("set-signout").onclick = function () {
    AH.dropSession();
    location.href = "../login/index.html";
  };

  /* --- deleting the account: two steps, the second asks you to type your own handle --- */

  const deleteStatus = el("set-delete-status");
  el("set-delete").onclick = function () {
    el("set-confirm").hidden = false;
    el("set-confirm-field").focus();
  };

  el("set-confirm-button").onclick = function () {
    const yazilan = el("set-confirm-field").value.trim().toLowerCase();
    if (!profile || !profile.handle || yazilan !== profile.handle) {
      say(deleteStatus, "type your handle exactly.", "error");
      return;
    }
    say(deleteStatus, "deleting…");
    call("delete_account")
      .then(() => {
        AH.dropSession();
        location.href = "../index.html";
      })
      .catch((h) => say(deleteStatus, AH.errorText(h, "couldn't delete the account."), "hata"));
  };

  /* --- start --- */

  function fill(p) {
    profile = p;
    handleField.value = p.handle || "";
    adAlan.value = p.display_name || "";
    bioAlan.value = p.bio || "";

    el("set-who").textContent = (AH.session && AH.session.user && AH.session.user.email)
      ? "you're in as " + AH.session.user.email : "you're in.";

    const gun = p.created_at ? String(p.created_at).slice(0, 10) : "";
    el("set-numbers").textContent =
      [p.kept_count + " kept", p.friend_count + " friends", p.comment_count + " comments"]
        .join(" · ") + (gun ? " · here since " + gun : "");

    buildChoice(el("set-kept"), p.kept_visibility, (v) => writeSetting("kept_visibility", v));
    buildChoice(el("set-found"), p.discoverable, (v) => writeSetting("discoverable", v));
    buildChoice(el("set-mail"), p.notify_email, (v) => writeSetting("notify_email", v));

    return buildCities(p.city_slug);
  }

  function load() {
    return call("profile_me").then((r) => {
      const p = Array.isArray(r) ? r[0] : r;
      if (p) fill(p);
      return p;
    });
  }

  function render() {
    const AYAR = window.AH_CONFIG || {};
    if (!(AYAR.url && AYAR.anonKey)) {
      outside.hidden = false;
      inside.hidden = true;
      el("set-out-note").textContent = "this opens when the backend does.";
      outside.querySelector(".page-button").hidden = true;
      return;
    }
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    outside.hidden = signedIn;
    inside.hidden = !signedIn;
    if (signedIn) {
      load().catch((h) => say(status, AH.errorText(h, "couldn't load your profile."), "hata"));
    }
  }

  AH.sessionReady.then(render);
  AH.onSessionChange(render);
})();
