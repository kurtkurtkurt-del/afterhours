/* afterhours — ayar sayfasi.
   Butun is veritabanindaki fonksiyonlarda: profil profile_me()’den
   okunuyor, profil alanlari profile_setup() ile tek istekte yaziliyor,
   ucu de anahtar olan ayarlar dogrudan profile_settings’e yaziliyor
   (kural zaten yalniz kendi satirina izin veriyor).

   Girissizken ya da backend kapaliyken sayfa durust: form hic
   gorunmuyor, sebebi yaziyor.  */

(function () {
  const AH = (window.AH = window.AH || {});

  const disarida = document.getElementById("ay-disarida");
  const icerde = document.getElementById("ay-icerde");
  if (!disarida || !icerde) return;

  const el = (id) => document.getElementById(id);
  const handleAlan = el("ay-handle");
  const handleDurum = el("ay-handle-durum");
  const adAlan = el("ay-ad");
  const bioAlan = el("ay-bio");
  const sehirKutu = el("ay-sehir");
  const durum = el("ay-durum");

  let profil = null;      /* profile_me()’den gelen satir */
  let sehir = null;       /* secili sehir slug’i */

  const cagir = (fn, govde) =>
    AH.istek("/rpc/" + fn, { method: "POST", body: JSON.stringify(govde || {}) });

  const skaler = (c) => (Array.isArray(c) ? c[0] : c);

  function soyle(kutu, metin, tur) {
    kutu.textContent = metin || "";
    kutu.className = "hesap-durum" + (tur ? " " + tur : "");
  }

  /* --- iki secenekli satirlar: secili olan koyu, digeri soluk --- */

  function secimKur(kutu, deger, yaz) {
    [...kutu.querySelectorAll("button")].forEach((d) => {
      d.classList.toggle("secili", d.dataset.deger === String(deger));
      d.onclick = () => {
        if (d.classList.contains("secili")) return;
        yaz(d.dataset.deger).then(() => secimKur(kutu, d.dataset.deger, yaz));
      };
    });
  }

  function ayarYaz(alan, deger) {
    const id = AH.oturum && AH.oturum.kullanici && AH.oturum.kullanici.id;
    const govde = {};
    govde[alan] = deger === "true" ? true : deger === "false" ? false : deger;
    return AH.istek("/profile_settings?user_id=eq." + id, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(govde),
    })
      .then(() => soyle(durum, "saved.", "tamam"))
      .catch((h) => soyle(durum, AH.hataMetni(h, "couldn't save that."), "hata"));
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
          if (son && son.ulke === c.country) son.sehirler.push(c);
          else gruplar.push({ ulke: c.country, sehirler: [c] });
        });

        const isaretle = () => [...sehirKutu.querySelectorAll("button")]
          .forEach((x) => x.classList.toggle("secili", x.dataset.deger === sehir));

        gruplar.forEach((g) => {
          const ad = document.createElement("p");
          ad.className = "ay-ulke";
          ad.textContent = (g.ulke || "").toLowerCase();
          sehirKutu.appendChild(ad);

          const satir = document.createElement("div");
          satir.className = "ay-secim";
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
        const acik = sehirKutu.querySelector("button.secili");
        if (acik) sehirKutu.scrollTop = Math.max(0, acik.offsetTop - 40);
      })
      .catch(() => { sehirKutu.textContent = ""; });
  }

  /* --- handle: yazarken musait mi diye sor --- */

  const SOZ = {
    ok: "free.", senin: "this one is yours.", dolu: "someone already has that one.",
    bicim: "lowercase letters, numbers and underscore. 3–20.", bos: "",
  };

  let bekleyen = null;
  handleAlan && handleAlan.addEventListener("input", () => {
    clearTimeout(bekleyen);
    const h = handleAlan.value.trim();
    if (!h) { soyle(handleDurum, ""); return; }
    bekleyen = setTimeout(() => {
      cagir("handle_status", { p_handle: h })
        .then((c) => soyle(handleDurum, SOZ[skaler(c)] || "",
          skaler(c) === "dolu" || skaler(c) === "bicim" ? "hata" : "tamam"))
        .catch(() => soyle(handleDurum, ""));
    }, 300);
  });

  /* --- profilin dort alani: tek istekte --- */

  const YANIT = {
    ok: "saved.", dolu: "someone already has that handle.",
    bicim: "that handle doesn't fit the format.", bos: "pick a handle first.",
    sehir: "that city isn't on the list.", giris: "sign in again.",
  };

  el("ay-kaydet").onclick = function () {
    soyle(durum, "saving…");
    cagir("profile_setup", {
      p_handle: handleAlan.value.trim(),
      p_display_name: adAlan.value.trim(),
      p_city_slug: sehir,
      p_bio: bioAlan.value.trim(),
    })
      .then((c) => {
        const s = skaler(c);
        soyle(durum, YANIT[s] || String(s), s === "ok" ? "tamam" : "hata");
        if (s === "ok") yukle();
      })
      .catch((h) => soyle(durum, AH.hataMetni(h, "couldn't save that."), "hata"));
  };

  /* --- cikis --- */

  el("ay-cik").onclick = function () {
    AH.oturumuBirak();
    location.href = "../login/index.html";
  };

  /* --- hesabi silme: iki adim, ikincisinde kendi adini yazmak var --- */

  const silDurum = el("ay-sil-durum");
  el("ay-sil").onclick = function () {
    el("ay-onay").hidden = false;
    el("ay-onay-alan").focus();
  };

  el("ay-onay-dugme").onclick = function () {
    const yazilan = el("ay-onay-alan").value.trim().toLowerCase();
    if (!profil || !profil.handle || yazilan !== profil.handle) {
      soyle(silDurum, "type your handle exactly.", "hata");
      return;
    }
    soyle(silDurum, "deleting…");
    cagir("delete_account")
      .then(() => {
        AH.oturumuBirak();
        location.href = "../index.html";
      })
      .catch((h) => soyle(silDurum, AH.hataMetni(h, "couldn't delete the account."), "hata"));
  };

  /* --- acilis --- */

  function doldur(p) {
    profil = p;
    handleAlan.value = p.handle || "";
    adAlan.value = p.display_name || "";
    bioAlan.value = p.bio || "";

    el("ay-kim").textContent = (AH.oturum && AH.oturum.kullanici && AH.oturum.kullanici.email)
      ? "you're in as " + AH.oturum.kullanici.email : "you're in.";

    const gun = p.created_at ? String(p.created_at).slice(0, 10) : "";
    el("ay-sayilar").textContent =
      [p.kept_count + " kept", p.friend_count + " friends", p.comment_count + " comments"]
        .join(" · ") + (gun ? " · here since " + gun : "");

    secimKur(el("ay-kept"), p.kept_visibility, (v) => ayarYaz("kept_visibility", v));
    secimKur(el("ay-bulun"), p.discoverable, (v) => ayarYaz("discoverable", v));
    secimKur(el("ay-posta"), p.notify_email, (v) => ayarYaz("notify_email", v));

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
    const AYAR = window.AH_AYAR || {};
    if (!(AYAR.url && AYAR.anonKey)) {
      disarida.hidden = false;
      icerde.hidden = true;
      el("ay-disarida-not").textContent = "this opens when the backend does.";
      disarida.querySelector(".giris-dugme").hidden = true;
      return;
    }
    const girisli = Boolean(AH.girisliMi && AH.girisliMi());
    disarida.hidden = girisli;
    icerde.hidden = !girisli;
    if (girisli) {
      yukle().catch((h) => soyle(durum, AH.hataMetni(h, "couldn't load your profile."), "hata"));
    }
  }

  AH.oturumHazir.then(ekraniKur);
  AH.oturumDegisti(ekraniKur);
})();
