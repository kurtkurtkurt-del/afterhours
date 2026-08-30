/* afterhours — friends & more.
   Kullanici adi, arkadaslar ve biriktirdiklerin. Hepsi giris ister;
   girissizken sayfa sadece bir davet gosterir.

   Bu bolumler once giris sayfasindaydi; oraya ait degillerdi. Giris
   sayfasi artik yalnizca giris.  */

(function () {
  const AYAR = window.AH_CONFIG || {};
  const disarida = document.getElementById("fr-out");
  const icerde = document.getElementById("fr-in");

  const handleForm = document.getElementById("handle-form");
  const handleAlan = document.getElementById("handle-field");
  const handleDurum = document.getElementById("handle-status");

  const arkForm = document.getElementById("friend-form");
  const arkAlan = document.getElementById("friend-field");
  const arkDurum = document.getElementById("friend-status");
  const arkListe = document.getElementById("friend-list");
  const tutListe = document.getElementById("kept-list");
  const nrBolum = document.querySelector(".nr-section");

  const CEVAP = {
    sent: "request sent.",
    accepted: "you're friends now.",
    notfound: "nobody here by that handle.",
    yourself: "that's you.",
  };

  function ekraniKur() {
    const girisli = Boolean(window.AH && AH.signedIn && AH.signedIn());
    disarida.hidden = girisli;
    icerde.hidden = !girisli;
    tanidiklar(girisli);
    if (girisli) { handleYukle(); arkadaslariYukle(); tutulanlariYukle(); }
  }

  /* --- kullanici adi --- */

  function handleYukle() {
    AH.myProfile().then((p) => { if (p && p.handle) handleAlan.value = p.handle; });
  }

  handleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleDurum.textContent = "saving…";
    AH.setHandle(handleAlan.value)
      .then((satirlar) => {
        handleDurum.textContent = satirlar && satirlar.length
          ? "saved."
          : "couldn't save — try signing in again.";
      })
      .catch((h) => {
        handleDurum.textContent = /duplicate|unique/i.test(h.message)
          ? "someone already has that one."
          : AH.errorText(h, "couldn't save that handle.");
      });
  });

  /* --- arkadaslar --- */

  function arkadaslariYukle() {
    AH.friends().then((liste) => {
      arkListe.textContent = "";
      if (!liste.length) {
        const bos = document.createElement("li");
        bos.className = "friend-empty";
        bos.textContent = "no friends yet.";
        arkListe.appendChild(bos);
        return;
      }
      liste.forEach((a) => {
        const satir = document.createElement("li");
        satir.className = "friend-row";

        const ad = document.createElement("span");
        ad.className = "friend-name";
        ad.textContent = a.handle || a.display_name || "someone";

        const durum = document.createElement("span");
        durum.className = "friend-status-label";
        durum.textContent =
          a.status === "accepted" ? "friends"
          : a.yon === "gelen" ? "wants to be friends" : "waiting";

        satir.appendChild(ad);
        satir.appendChild(durum);

        if (a.status === "pending" && a.yon === "gelen") {
          const kabul = document.createElement("button");
          kabul.className = "friend-action";
          kabul.type = "button";
          kabul.textContent = "accept";
          kabul.addEventListener("click", () =>
            AH.friendAccept(a.other_id).then(arkadaslariYukle));
          satir.appendChild(kabul);
        }

        const cikar = document.createElement("button");
        cikar.className = "friend-action delete";
        cikar.type = "button";
        cikar.textContent = a.status === "accepted" ? "remove" : "cancel";
        cikar.addEventListener("click", () =>
          AH.friendRemove(a.other_id).then(arkadaslariYukle));
        satir.appendChild(cikar);

        arkListe.appendChild(satir);
      });
    });
  }

  arkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const h = arkAlan.value.trim();
    if (!h) return;
    arkDurum.textContent = "…";
    AH.friendRequest(h)
      .then((c) => {
        arkDurum.textContent = CEVAP[c] || String(c);
        if (c === "sent" || c === "accepted") { arkAlan.value = ""; arkadaslariYukle(); }
      })
      .catch((h) => { arkDurum.textContent = AH.errorText(h, "couldn't send that request."); });
  });

  /* --- kept --- */

  function tutulanlariYukle() {
    if (!AH.kept) return;
    AH.kept().then((liste) => {
      tutListe.textContent = "";
      if (!liste.length) {
        const bos = document.createElement("li");
        bos.className = "friend-empty";
        bos.textContent = "nothing kept yet. swipe a card right in explore.";
        tutListe.appendChild(bos);
        return;
      }
      liste.forEach((e) => {
        const satir = document.createElement("li");
        const a = document.createElement("a");
        a.className = "kept-row";
        a.href = "../explore/" + e.slug + "/index.html";

        const g = document.createElement("object");
        g.type = "image/svg+xml";
        g.data = e.posterPath ||
          "../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";
        a.appendChild(g);

        const yazi = document.createElement("div");
        const ad = document.createElement("p");
        ad.className = "kept-name";
        ad.textContent = e.title;
        const meta = document.createElement("p");
        meta.className = "kept-meta";
        meta.textContent = e.meta;
        yazi.appendChild(ad);
        yazi.appendChild(meta);
        a.appendChild(yazi);

        satir.appendChild(a);
        tutListe.appendChild(satir);
      });
    });
  }

  /* --- nachtradar'dan gelenler --- */

  /* Liste girmemis birine "burada tanidiklarin var" demek icin var;
     girmis biri kendi arkadaslarini goruyor, o zaman kayboluyor. */
  function tanidiklar(girisli) {
    if (nrBolum) nrBolum.hidden = girisli;
  }

  /* Icerik herkese ayni, cunku simdilik sabit bir liste.
     Isimler; fotograf ya da rozet yok. */
  function nachtradarCiz() {
    const kutu = document.getElementById("nr");
    const aciklama = document.getElementById("nr-about");
    const veri = window.NACHTRADAR;
    if (!kutu || !veri) return;

    const hepsi = [
      ...veri.crew.map((k) => ({ ...k, crew: true })),
      ...veri.bekleyen.map((k) => ({ ...k, crew: false })),
    ];

    aciklama.textContent = "hundreds of people are already on the app.";

    kutu.textContent = "";
    hepsi.forEach((k) => {
      const kart = document.createElement("div");
      kart.className = "nr-person" + (k.crew ? " crew" : "");

      /* Fotograf yok: bas harf. Hesabin kendi isareti kadar. */
      const im = document.createElement("span");
      im.className = "nr-img";
      im.textContent = (k.ad || "?").trim()[0].toUpperCase();
      kart.appendChild(im);

      const yazi = document.createElement("div");
      yazi.className = "nr-text";

      const ad = document.createElement("p");
      ad.className = "nr-name";
      ad.textContent = k.ad;
      yazi.appendChild(ad);

      const alt = document.createElement("p");
      alt.className = "nr-handle";
      alt.textContent = k.handle ? "@" + k.handle : "no handle";
      yazi.appendChild(alt);

      kart.appendChild(yazi);
      kutu.appendChild(kart);
    });
  }

  nachtradarCiz();

  /* Jeton yerelde duruyor: karari ilk boyamadan once verebiliyoruz,
     boylece girisliye liste bir an gorunup kaybolmuyor. */
  tanidiklar(Boolean(window.AH && AH.signedIn && AH.signedIn()));

  /* --- acilis --- */

  if (!(AYAR.url && AYAR.anonKey)) {
    disarida.hidden = false;
    disarida.querySelector(".page-note").textContent =
      "this opens when the backend does.";
    return;
  }

  AH.sessionReady.then(ekraniKur);
  AH.onSessionChange(ekraniKur);
})();
