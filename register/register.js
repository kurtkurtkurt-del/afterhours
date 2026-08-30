/* afterhours — registration.
   Iki adim, tek page:
     1 · e-posta + password  → hesap acilir (auth), profile tetikleyiciyle gelir
     2 · handle (+ city) → profile_setup() kaydi BITMIS sayar

   Ikinci adim susleme degil: handle yoksa kimse seni bulamaz, arkadaslik
   kurulamaz. O yuzden "kayit handle secilene kadar bitmemistir" (bkz.
   backend/sql/12_profiles.sql, onboarded_at).

   Sayfa yarida birakilirsa da kayboluyor bir sey yok: signedIn ama
   handle'siz biri buraya donunce dogrudan ikinci adimi goruyor.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const steps = ["reg-1", "reg-2", "reg-3", "reg-mail", "reg-already"];
  const show = (id) => steps.forEach((a) => { el(a).hidden = a !== id; });

  const call = (fn, body) =>
    AH.request("/rpc/" + fn, { method: "POST", body: JSON.stringify(body || {}) });
  const scalar = (c) => (Array.isArray(c) ? c[0] : c);

  function say(box, text, cesit) {
    box.textContent = text || "";
    box.className = (box.id === "reg-note" ? "page-note" : "account-status") +
      (cesit ? " " + cesit : "");
  }

  let city = null;

  /* ---------------- 1 · the account ---------------- */

  el("reg-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const email = el("reg-email").value.trim();
    const password = el("reg-password").value;
    const note = el("reg-note");

    if (!email || email.indexOf("@") < 1) {
      say(note, "that doesn't look like an email.", "hata");
      el("reg-email").focus();
      return;
    }
    if (password.length < 8) {
      say(note, "eight characters or more, please.", "error");
      el("reg-password").focus();
      return;
    }

    el("reg-create").disabled = true;
    say(note, "opening it…");

    AH.signUp(email, password)
      .then((oturum) => {
        el("reg-create").disabled = false;
        if (!oturum) {
          /* Confirmation is on: no token came, they check their email first */
          el("reg-mail-note").textContent =
            "We sent a link to " + email + ". Open it and you land back here to " +
            "pick a handle — the account is note finished until you do.";
          show("reg-mail");
          return;
        }
        say(note, "");
        stepTwo();
      })
      .catch((h) => {
        el("reg-create").disabled = false;
        const m = String(h.message || "");
        say(note, /already registered|exists/i.test(m)
          ? "there is already an account with that email. sign in instead."
          : AH.errorText(h, "couldn't open the account."), "hata");
      });
  });

  /* ---------------- 2 · handle ---------------- */

  const SOZ = {
    ok: "free.", yours: "this one is yours.", taken: "someone already has that one.",
    format: "lowercase letters, numbers and underscore. 3–20.", empty: "",
  };

  let pending = null;
  el("reg-handle").addEventListener("input", function () {
    clearTimeout(pending);
    const h = this.value.trim();
    if (!h) { say(el("reg-handle-status"), ""); return; }
    pending = setTimeout(() => {
      call("handle_status", { p_handle: h })
        .then((c) => {
          const s = scalar(c);
          say(el("reg-handle-status"), SOZ[s] || "",
            s === "taken" || s === "format" ? "error" : "ok");
        })
        .catch(() => say(el("reg-handle-status"), ""));
    }, 300);
  });

  function buildCities() {
    const box = el("reg-city");
    return call("city_counts")
      .then((list) => {
        box.textContent = "";
        const groups = [];
        (list || []).filter((c) => Number(c.n) > 0).forEach((c) => {
          const last = groups[groups.length - 1];
          if (last && last.country === c.country) last.cities.push(c);
          else groups.push({ country: c.country, cities: [c] });
        });

        groups.forEach((g) => {
          const name = document.createElement("p");
          name.className = "set-country";
          name.textContent = (g.country || "").toLowerCase();
          box.appendChild(name);

          const row = document.createElement("div");
          row.className = "set-choice";
          g.cities.forEach((c) => {
            const d = document.createElement("button");
            d.type = "button";
            d.dataset.value = c.slug;
            d.textContent = c.name.toLowerCase();
            d.onclick = () => {
              city = c.slug;
              [...box.querySelectorAll("button")].forEach((x) =>
                x.classList.toggle("selected", x === d));
            };
            row.appendChild(d);
          });
          box.appendChild(row);
        });
      })
      .catch(() => { box.textContent = ""; });
  }

  const YANIT = {
    taken: "someone already has that handle.",
    format: "that handle doesn't fit the format.",
    empty: "pick a handle first.",
    city: "that city isn't on the list.",
    signedout: "sign in again — the session went away.",
  };

  el("reg-finish").onclick = function () {
    const h = el("reg-handle").value.trim();
    if (!h) {
      say(el("reg-status"), "pick a handle first.", "error");
      el("reg-handle").focus();
      return;
    }
    el("reg-finish").disabled = true;
    say(el("reg-status"), "finishing…");

    call("profile_setup", { p_handle: h, p_city_slug: city })
      .then((c) => {
        const s = scalar(c);
        el("reg-finish").disabled = false;
        if (s !== "ok") {
          say(el("reg-status"), YANIT[s] || String(s), "error");
          return;
        }
        el("reg-welcome").textContent =
          "You are @" + h.toLowerCase() + ". Your deck is waiting, and what you keep " +
          "from here on is yours to look back at.";
        show("reg-3");
      })
      .catch((h2) => {
        el("reg-finish").disabled = false;
        say(el("reg-status"), AH.errorText(h2, "couldn't finish the account."), "hata");
      });
  };

  function stepTwo() {
    show("reg-2");
    buildCities();
    el("reg-handle").focus();
  }

  /* ---------------- start ---------------- */

  function render() {
    const AYAR = window.AH_CONFIG || {};
    if (!(AYAR.url && AYAR.anonKey)) {
      show("reg-1");
      el("reg-form").hidden = true;
      say(el("reg-note"), "sign-up opens when the backend does.", "waiting");
      return;
    }

    if (!(AH.signedIn && AH.signedIn())) { show("reg-1"); return; }

    /* Signed in: is the registration finished? If not, go straight to step two. */
    call("profile_me")
      .then((r) => {
        const p = Array.isArray(r) ? r[0] : r;
        if (p && p.onboarded) {
          el("reg-already-note").textContent =
            "You are signed in as @" + (p.handle || "you") + ". Nothing to fill in twice.";
          show("reg-already");
        } else {
          stepTwo();
        }
      })
      .catch(() => stepTwo());
  }

  AH.sessionReady.then(render).catch(render);
})();
