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

  const adimlar = ["kt-1", "kt-2", "kt-3", "kt-posta", "kt-zaten"];
  const goster = (id) => adimlar.forEach((a) => { el(a).hidden = a !== id; });

  const cagir = (fn, govde) =>
    AH.istek("/rpc/" + fn, { method: "POST", body: JSON.stringify(govde || {}) });
  const skaler = (c) => (Array.isArray(c) ? c[0] : c);

  function soyle(kutu, yazi, cesit) {
    kutu.textContent = yazi || "";
    kutu.className = (kutu.id === "kt-not" ? "giris-not" : "hesap-durum") +
      (cesit ? " " + cesit : "");
  }

  let sehir = null;

  /* ---------------- 1 · hesap ---------------- */

  el("kt-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const eposta = el("kt-eposta").value.trim();
    const sifre = el("kt-sifre").value;
    const not = el("kt-not");

    if (!eposta || eposta.indexOf("@") < 1) {
      soyle(not, "that doesn't look like an email.", "hata");
      el("kt-eposta").focus();
      return;
    }
    if (sifre.length < 8) {
      soyle(not, "eight characters or more, please.", "hata");
      el("kt-sifre").focus();
      return;
    }

    el("kt-ac").disabled = true;
    soyle(not, "opening it…");

    AH.kayitOl(eposta, sifre)
      .then((oturum) => {
        el("kt-ac").disabled = false;
        if (!oturum) {
          /* Dogrulama acik: jeton gelmedi, once postasina bakacak */
          el("kt-posta-not").textContent =
            "We sent a link to " + eposta + ". Open it and you land back here to " +
            "pick a handle — the account is not finished until you do.";
          goster("kt-posta");
          return;
        }
        soyle(not, "");
        ikinciAdim();
      })
      .catch((h) => {
        el("kt-ac").disabled = false;
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
  el("kt-handle").addEventListener("input", function () {
    clearTimeout(bekleyen);
    const h = this.value.trim();
    if (!h) { soyle(el("kt-handle-durum"), ""); return; }
    bekleyen = setTimeout(() => {
      cagir("handle_status", { p_handle: h })
        .then((c) => {
          const s = skaler(c);
          soyle(el("kt-handle-durum"), SOZ[s] || "",
            s === "dolu" || s === "bicim" ? "hata" : "tamam");
        })
        .catch(() => soyle(el("kt-handle-durum"), ""));
    }, 300);
  });

  function sehirleriKur() {
    const kutu = el("kt-sehir");
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
          ad.className = "ay-ulke";
          ad.textContent = (g.ulke || "").toLowerCase();
          kutu.appendChild(ad);

          const satir = document.createElement("div");
          satir.className = "ay-secim";
          g.sehirler.forEach((c) => {
            const d = document.createElement("button");
            d.type = "button";
            d.dataset.deger = c.slug;
            d.textContent = c.name.toLowerCase();
            d.onclick = () => {
              sehir = c.slug;
              [...kutu.querySelectorAll("button")].forEach((x) =>
                x.classList.toggle("secili", x === d));
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

  el("kt-bitir").onclick = function () {
    const h = el("kt-handle").value.trim();
    if (!h) {
      soyle(el("kt-durum"), "pick a handle first.", "hata");
      el("kt-handle").focus();
      return;
    }
    el("kt-bitir").disabled = true;
    soyle(el("kt-durum"), "finishing…");

    cagir("profile_setup", { p_handle: h, p_city_slug: sehir })
      .then((c) => {
        const s = skaler(c);
        el("kt-bitir").disabled = false;
        if (s !== "ok") {
          soyle(el("kt-durum"), YANIT[s] || String(s), "hata");
          return;
        }
        el("kt-hosgeldin").textContent =
          "You are @" + h.toLowerCase() + ". Your deck is waiting, and what you keep " +
          "from here on is yours to look back at.";
        goster("kt-3");
      })
      .catch((h2) => {
        el("kt-bitir").disabled = false;
        soyle(el("kt-durum"), AH.hataMetni(h2, "couldn't finish the account."), "hata");
      });
  };

  function ikinciAdim() {
    goster("kt-2");
    sehirleriKur();
    el("kt-handle").focus();
  }

  /* ---------------- acilis ---------------- */

  function ekraniKur() {
    const AYAR = window.AH_AYAR || {};
    if (!(AYAR.url && AYAR.anonKey)) {
      goster("kt-1");
      el("kt-form").hidden = true;
      soyle(el("kt-not"), "sign-up opens when the backend does.", "bekliyor");
      return;
    }

    if (!(AH.girisliMi && AH.girisliMi())) { goster("kt-1"); return; }

    /* Girisli: kaydi bitmis mi? Bitmemisse dogrudan ikinci adim. */
    cagir("profile_me")
      .then((r) => {
        const p = Array.isArray(r) ? r[0] : r;
        if (p && p.onboarded) {
          el("kt-zaten-not").textContent =
            "You are signed in as @" + (p.handle || "you") + ". Nothing to fill in twice.";
          goster("kt-zaten");
        } else {
          ikinciAdim();
        }
      })
      .catch(() => ikinciAdim());
  }

  AH.oturumHazir.then(ekraniKur).catch(ekraniKur);
})();
