/* afterhours — ayar sayfasi.
   Butun is veritabanindaki fonksiyonlarda: profil profile_me()’den
   okunuyor, profil alanlari profile_setup() ile tek istekte yaziliyor,
   ucu de anahtar olan ayarlar dogrudan profile_settings’e yaziliyor
   (kural zaten yalniz kendi satirina izin veriyor).

   Girissizken ya da backend kapaliyken sayfa durust: form hic
   gorunmuyor, sebebi yaziyor.  */

(function () {
  const AH = (window.AH = window.AH || {});

  const disarida = document.getElementById("set-out");
  const icerde = document.getElementById("set-in");
  if (!disarida || !icerde) return;

  const el = (id) => document.getElementById(id);
  const handleAlan = el("set-handle");
  const handleDurum = el("set-handle-status");
  const adAlan = el("set-name");
  const bioAlan = el("set-bio");
  const sehirKutu = el("set-city");
  const durum = el("set-status");

  let profil = null;      /* profile_me()’den gelen satir */
  let sehir = null;       /* secili sehir slug’i */

  const cagir = (fn, govde) =>
    AH.request("/rpc/" + fn, { method: "POST", body: JSON.stringify(govde || {}) });

  const skaler = (c) => (Array.isArray(c) ? c[0] : c);

  function soyle(kutu, metin, tur) {
    kutu.textContent = metin || "";
    kutu.className = "account-status" + (tur ? " " + tur : "");
  }

  /* --- iki secenekli satirlar: secili olan koyu, digeri soluk --- */

  function secimKur(kutu, deger, yaz) {
    [...kutu.querySelectorAll("button")].forEach((d) => {
      d.classList.toggle("selected", d.dataset.deger === String(deger));
      d.onclick = () => {
        if (d.classList.contains("selected")) return;
        yaz(d.dataset.deger).then(() => secimKur(kutu, d.dataset.deger, yaz));
      };
    });
  }

  function ayarYaz(alan, deger) {
    const id = AH.session && AH.session.user && AH.session.user.id;
    const govde = {};
    govde[alan] = deger === "true" ? true : deger === "false" ? false : deger;
    return AH.request("/profile_settings?user_id=eq." + id, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(govde),
    })
      .then(() => soyle(durum, "saved.", "ok"))
      .catch((h) => soyle(durum, AH.errorText(h, "couldn't save that."), "hata"));
  }

  /* --- sehirler ---
     Elli dorde cikti; duz bir liste okunmuyordu. Ulkeye gore gruplayip
     kaydirilan bir kutuya aldik — explore’daki ulke→sehir sirasinin
     tek kutuya sigmis hali. Yalnizca gecesi olan sehirler geliyor. */

  function sehirleriKur(secili) {
    return cagir("city_counts")
      .then((liste) => {
        sehirKutu.textContent = "";
        sehir = secili;

        const gruplar = [];
        (liste || []).filter((c) => Number(c.n) > 0).forEach((c) => {
          const son = gruplar[gruplar.length - 1];
          if (son && son.country === c.country) son.sehirler.push(c);
          else gruplar.push({ country: c.country, sehirler: [c] });
        });

        const isaretle = () => [...sehirKutu.querySelectorAll("button")]
          .forEach((x) => x.classList.toggle("selected", x.dataset.deger === sehir));

        gruplar.forEach((g) => {
          const ad = document.createElement("p");
          ad.className = "set-country";
          ad.textContent = (g.country || "").toLowerCase();
          sehirKutu.appendChild(ad);

          const satir = document.createElement("div");
          satir.className = "set-choice";
          g.sehirler.forEach((c) => {
            const d = document.createElement("button");
            d.type = "button";
            d.dataset.deger = c.slug;
            d.textContent = c.name.toLowerCase();
            d.onclick = () => { sehir = c.slug; isaretle(); };
            satir.appendChild(d);
          });
          sehirKutu.appendChild(satir);
        });

        isaretle();

        /* Secili sehir listenin ortasindaysa kutu onu gostersin */
        const acik = sehirKutu.querySelector("button.selected");
        if (acik) sehirKutu.scrollTop = Math.max(0, acik.offsetTop - 40);
      })
      .catch(() => { sehirKutu.textContent = ""; });
  }

  /* --- handle: yazarken musait mi diye sor --- */

  const SOZ = {
    ok: "free.", yours: "this one is yours.", taken: "someone already has that one.",
    format: "lowercase letters, numbers and underscore. 3–20.", empty: "",
  };

  let bekleyen = null;
  handleAlan && handleAlan.addEventListener("input", () => {
    clearTimeout(bekleyen);
    const h = handleAlan.value.trim();
    if (!h) { soyle(handleDurum, ""); return; }
    bekleyen = setTimeout(() => {
      cagir("handle_status", { p_handle: h })
        .then((c) => soyle(handleDurum, SOZ[skaler(c)] || "",
          skaler(c) === "taken" || skaler(c) === "format" ? "error" : "ok"))
        .catch(() => soyle(handleDurum, ""));
    }, 300);
  });

  /* --- profilin dort alani: tek istekte --- */

  const YANIT = {
    ok: "saved.", taken: "someone already has that handle.",
    format: "that handle doesn't fit the format.", empty: "pick a handle first.",
    city: "that city isn't on the list.", signedout: "sign in again.",
  };

  el("set-save").onclick = function () {
    soyle(durum, "saving…");
    cagir("profile_setup", {
      p_handle: handleAlan.value.trim(),
      p_display_name: adAlan.value.trim(),
      p_city_slug: sehir,
      p_bio: bioAlan.value.trim(),
    })
      .then((c) => {
        const s = skaler(c);
        soyle(durum, YANIT[s] || String(s), s === "ok" ? "ok" : "error");
        if (s === "ok") yukle();
      })
      .catch((h) => soyle(durum, AH.errorText(h, "couldn't save that."), "hata"));
  };

  /* --- cikis --- */

  el("set-signout").onclick = function () {
    AH.dropSession();
    location.href = "../login/index.html";
  };

  /* --- hesabi silme: iki adim, ikincisinde kendi adini yazmak var --- */

  const silDurum = el("set-delete-status");
  el("set-delete").onclick = function () {
    el("set-confirm").hidden = false;
    el("set-confirm-field").focus();
  };

  el("set-confirm-button").onclick = function () {
    const yazilan = el("set-confirm-field").value.trim().toLowerCase();
    if (!profil || !profil.handle || yazilan !== profil.handle) {
      soyle(silDurum, "type your handle exactly.", "error");
      return;
    }
    soyle(silDurum, "deleting…");
    cagir("delete_account")
      .then(() => {
        AH.dropSession();
        location.href = "../index.html";
      })
      .catch((h) => soyle(silDurum, AH.errorText(h, "couldn't delete the account."), "hata"));
  };

  /* --- acilis --- */

  function doldur(p) {
    profil = p;
    handleAlan.value = p.handle || "";
    adAlan.value = p.display_name || "";
    bioAlan.value = p.bio || "";

    el("set-who").textContent = (AH.session && AH.session.user && AH.session.user.email)
      ? "you're in as " + AH.session.user.email : "you're in.";

    const gun = p.created_at ? String(p.created_at).slice(0, 10) : "";
    el("set-numbers").textContent =
      [p.kept_count + " kept", p.friend_count + " friends", p.comment_count + " comments"]
        .join(" · ") + (gun ? " · here since " + gun : "");

    secimKur(el("set-kept"), p.kept_visibility, (v) => ayarYaz("kept_visibility", v));
    secimKur(el("set-found"), p.discoverable, (v) => ayarYaz("discoverable", v));
    secimKur(el("set-mail"), p.notify_email, (v) => ayarYaz("notify_email", v));

    return sehirleriKur(p.city_slug);
  }

  function yukle() {
    return cagir("profile_me").then((r) => {
      const p = Array.isArray(r) ? r[0] : r;
      if (p) doldur(p);
      return p;
    });
  }

  function ekraniKur() {
    const AYAR = window.AH_CONFIG || {};
    if (!(AYAR.url && AYAR.anonKey)) {
      disarida.hidden = false;
      icerde.hidden = true;
      el("set-out-note").textContent = "this opens when the backend does.";
      disarida.querySelector(".page-button").hidden = true;
      return;
    }
    const girisli = Boolean(AH.signedIn && AH.signedIn());
    disarida.hidden = girisli;
    icerde.hidden = !girisli;
    if (girisli) {
      yukle().catch((h) => soyle(durum, AH.errorText(h, "couldn't load your profile."), "hata"));
    }
  }

  AH.sessionReady.then(ekraniKur);
  AH.onSessionChange(ekraniKur);
})();
