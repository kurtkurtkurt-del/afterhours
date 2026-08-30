/* afterhours — kayit.
   Iki adim, tek sayfa:
     1 · e-posta + sifre  → hesap acilir (auth), profil tetikleyiciyle gelir
     2 · handle (+ sehir) → profile_setup() kaydi BITMIS sayar

   Ikinci adim susleme degil: handle yoksa kimse seni bulamaz, arkadaslik
   kurulamaz. O yuzden "kayit handle secilene kadar bitmemistir" (bkz.
   backend/sql/12_profiles.sql, onboarded_at).

   Sayfa yarida birakilirsa da kayboluyor bir sey yok: girisli ama
   handle'siz biri buraya donunce dogrudan ikinci adimi goruyor.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const adimlar = ["reg-1", "reg-2", "reg-3", "reg-posta", "reg-zaten"];
  const goster = (id) => adimlar.forEach((a) => { el(a).hidden = a !== id; });

  const cagir = (fn, govde) =>
    AH.istek("/rpc/" + fn, { method: "POST", body: JSON.stringify(govde || {}) });
  const skaler = (c) => (Array.isArray(c) ? c[0] : c);

  function soyle(kutu, yazi, cesit) {
    kutu.textContent = yazi || "";
    kutu.className = (kutu.id === "reg-note" ? "page-note" : "account-status") +
      (cesit ? " " + cesit : "");
  }

  let sehir = null;

  /* ---------------- 1 · hesap ---------------- */

  el("reg-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const eposta = el("reg-eposta").value.trim();
    const sifre = el("reg-sifre").value;
    const not = el("reg-note");

    if (!eposta || eposta.indexOf("@") < 1) {
      soyle(not, "that doesn't look like an email.", "hata");
      el("reg-eposta").focus();
      return;
    }
    if (sifre.length < 8) {
      soyle(not, "eight characters or more, please.", "error");
      el("reg-sifre").focus();
      return;
    }

    el("reg-ac").disabled = true;
    soyle(not, "opening it…");

    AH.kayitOl(eposta, sifre)
      .then((oturum) => {
        el("reg-ac").disabled = false;
        if (!oturum) {
          /* Dogrulama acik: jeton gelmedi, once postasina bakacak */
          el("reg-posta-note").textContent =
            "We sent a link to " + eposta + ". Open it and you land back here to " +
            "pick a handle — the account is not finished until you do.";
          goster("reg-posta");
          return;
        }
        soyle(not, "");
        ikinciAdim();
      })
      .catch((h) => {
        el("reg-ac").disabled = false;
        const m = String(h.message || "");
        soyle(not, /already registered|exists/i.test(m)
          ? "there is already an account with that email. sign in instead."
          : AH.hataMetni(h, "couldn't open the account."), "hata");
      });
  });

  /* ---------------- 2 · handle ---------------- */

  const SOZ = {
    ok: "free.", senin: "this one is yours.", dolu: "someone already has that one.",
    bicim: "lowercase letters, numbers and underscore. 3–20.", bos: "",
  };

  let bekleyen = null;
  el("reg-handle").addEventListener("input", function () {
    clearTimeout(bekleyen);
    const h = this.value.trim();
    if (!h) { soyle(el("reg-handle-status"), ""); return; }
    bekleyen = setTimeout(() => {
      cagir("handle_status", { p_handle: h })
        .then((c) => {
          const s = skaler(c);
          soyle(el("reg-handle-status"), SOZ[s] || "",
            s === "taken" || s === "bicim" ? "error" : "ok");
        })
        .catch(() => soyle(el("reg-handle-status"), ""));
    }, 300);
  });

  function sehirleriKur() {
    const kutu = el("reg-city");
    return cagir("city_counts")
      .then((liste) => {
        kutu.textContent = "";
        const gruplar = [];
        (liste || []).filter((c) => Number(c.n) > 0).forEach((c) => {
          const son = gruplar[gruplar.length - 1];
          if (son && son.ulke === c.country) son.sehirler.push(c);
          else gruplar.push({ ulke: c.country, sehirler: [c] });
        });

        gruplar.forEach((g) => {
          const ad = document.createElement("p");
          ad.className = "set-country";
          ad.textContent = (g.ulke || "").toLowerCase();
          kutu.appendChild(ad);

          const satir = document.createElement("div");
          satir.className = "set-choice";
          g.sehirler.forEach((c) => {
            const d = document.createElement("button");
            d.type = "button";
            d.dataset.deger = c.slug;
            d.textContent = c.name.toLowerCase();
            d.onclick = () => {
              sehir = c.slug;
              [...kutu.querySelectorAll("button")].forEach((x) =>
                x.classList.toggle("selected", x === d));
            };
            satir.appendChild(d);
          });
          kutu.appendChild(satir);
        });
      })
      .catch(() => { kutu.textContent = ""; });
  }

  const YANIT = {
    dolu: "someone already has that handle.",
    bicim: "that handle doesn't fit the format.",
    bos: "pick a handle first.",
    sehir: "that city isn't on the list.",
    giris: "sign in again — the session went away.",
  };

  el("reg-bitir").onclick = function () {
    const h = el("reg-handle").value.trim();
    if (!h) {
      soyle(el("reg-status"), "pick a handle first.", "error");
      el("reg-handle").focus();
      return;
    }
    el("reg-bitir").disabled = true;
    soyle(el("reg-status"), "finishing…");

    cagir("profile_setup", { p_handle: h, p_city_slug: sehir })
      .then((c) => {
        const s = skaler(c);
        el("reg-bitir").disabled = false;
        if (s !== "ok") {
          soyle(el("reg-status"), YANIT[s] || String(s), "error");
          return;
        }
        el("reg-hosgeldin").textContent =
          "You are @" + h.toLowerCase() + ". Your deck is waiting, and what you keep " +
          "from here on is yours to look back at.";
        goster("reg-3");
      })
      .catch((h2) => {
        el("reg-bitir").disabled = false;
        soyle(el("reg-status"), AH.hataMetni(h2, "couldn't finish the account."), "hata");
      });
  };

  function ikinciAdim() {
    goster("reg-2");
    sehirleriKur();
    el("reg-handle").focus();
  }

  /* ---------------- acilis ---------------- */

  function ekraniKur() {
    const AYAR = window.AH_AYAR || {};
    if (!(AYAR.url && AYAR.anonKey)) {
      goster("reg-1");
      el("reg-form").hidden = true;
      soyle(el("reg-note"), "sign-up opens when the backend does.", "waiting");
      return;
    }

    if (!(AH.girisliMi && AH.girisliMi())) { goster("reg-1"); return; }

    /* Girisli: kaydi bitmis mi? Bitmemisse dogrudan ikinci adim. */
    cagir("profile_me")
      .then((r) => {
        const p = Array.isArray(r) ? r[0] : r;
        if (p && p.onboarded) {
          el("reg-zaten-note").textContent =
            "You are signed in as @" + (p.handle || "you") + ". Nothing to fill in twice.";
          goster("reg-zaten");
        } else {
          ikinciAdim();
        }
      })
      .catch(() => ikinciAdim());
  }

  AH.oturumHazir.then(ekraniKur).catch(ekraniKur);
})();
