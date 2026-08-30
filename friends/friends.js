/* afterhours — friends & more.
   Kullanici adi, arkadaslar ve biriktirdiklerin. Hepsi giris ister;
   girissizken page sadece bir davet gosterir.

   Bu bolumler once giris sayfasindaydi; oraya ait degillerdi. Giris
   sayfasi artik yalnizca giris.  */

(function () {
  const AYAR = window.AH_CONFIG || {};
  const outside = document.getElementById("fr-out");
  const inside = document.getElementById("fr-in");

  const handleForm = document.getElementById("handle-form");
  const handleField = document.getElementById("handle-field");
  const handleStatus = document.getElementById("handle-status");

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

  function render() {
    const signedIn = Boolean(window.AH && AH.signedIn && AH.signedIn());
    outside.hidden = signedIn;
    inside.hidden = !signedIn;
    showFamiliarFaces(signedIn);
    if (signedIn) { loadHandle(); loadFriends(); loadKept(); }
  }

  /* --- kullanici adi --- */

  function loadHandle() {
    AH.myProfile().then((p) => { if (p && p.handle) handleField.value = p.handle; });
  }

  handleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleStatus.textContent = "saving…";
    AH.setHandle(handleField.value)
      .then((rows) => {
        handleStatus.textContent = rows && rows.length
          ? "saved."
          : "couldn't save — try signing in again.";
      })
      .catch((h) => {
        handleStatus.textContent = /duplicate|unique/i.test(h.message)
          ? "someone already has that one."
          : AH.errorText(h, "couldn't save that handle.");
      });
  });

  /* --- arkadaslar --- */

  function loadFriends() {
    AH.friends().then((list) => {
      arkListe.textContent = "";
      if (!list.length) {
        const empty = document.createElement("li");
        empty.className = "friend-empty";
        empty.textContent = "no friends yet.";
        arkListe.appendChild(empty);
        return;
      }
      list.forEach((a) => {
        const row = document.createElement("li");
        row.className = "friend-row";

        const name = document.createElement("span");
        name.className = "friend-name";
        name.textContent = a.handle || a.display_name || "someone";

        const status = document.createElement("span");
        status.className = "friend-status-label";
        status.textContent =
          a.status === "accepted" ? "friends"
          : a.yon === "gelen" ? "wants to be friends" : "waiting";

        row.appendChild(name);
        row.appendChild(status);

        if (a.status === "pending" && a.yon === "gelen") {
          const kabul = document.createElement("button");
          kabul.className = "friend-action";
          kabul.type = "button";
          kabul.textContent = "accept";
          kabul.addEventListener("click", () =>
            AH.friendAccept(a.other_id).then(loadFriends));
          row.appendChild(kabul);
        }

        const cikar = document.createElement("button");
        cikar.className = "friend-action delete";
        cikar.type = "button";
        cikar.textContent = a.status === "accepted" ? "remove" : "cancel";
        cikar.addEventListener("click", () =>
          AH.friendRemove(a.other_id).then(loadFriends));
        row.appendChild(cikar);

        arkListe.appendChild(row);
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
        if (c === "sent" || c === "accepted") { arkAlan.value = ""; loadFriends(); }
      })
      .catch((h) => { arkDurum.textContent = AH.errorText(h, "couldn't send that request."); });
  });

  /* --- kept --- */

  function loadKept() {
    if (!AH.kept) return;
    AH.kept().then((list) => {
      tutListe.textContent = "";
      if (!list.length) {
        const empty = document.createElement("li");
        empty.className = "friend-empty";
        empty.textContent = "nothing kept yet. swipe a card right in explore.";
        tutListe.appendChild(empty);
        return;
      }
      list.forEach((e) => {
        const row = document.createElement("li");
        const a = document.createElement("a");
        a.className = "kept-row";
        a.href = "../explore/" + e.slug + "/index.html";

        const g = document.createElement("object");
        g.type = "image/svg+xml";
        g.data = e.posterPath ||
          "../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";
        a.appendChild(g);

        const text = document.createElement("div");
        const name = document.createElement("p");
        name.className = "kept-name";
        name.textContent = e.title;
        const meta = document.createElement("p");
        meta.className = "kept-meta";
        meta.textContent = e.meta;
        text.appendChild(name);
        text.appendChild(meta);
        a.appendChild(text);

        row.appendChild(a);
        tutListe.appendChild(row);
      });
    });
  }

  /* --- nachtradar'dan gelenler --- */

  /* Liste girmemis birine "burada tanidiklarin var" demek icin var;
     girmis biri kendi arkadaslarini goruyor, o zaman kayboluyor. */
  function showFamiliarFaces(signedIn) {
    if (nrBolum) nrBolum.hidden = signedIn;
  }

  /* Icerik herkese ayni, cunku simdilik sabit bir list.
     Isimler; fotograf ya da badge yok. */
  function drawNachtradar() {
    const box = document.getElementById("nr");
    const aciklama = document.getElementById("nr-about");
    const veri = window.NACHTRADAR;
    if (!box || !veri) return;

    const hepsi = [
      ...veri.crew.map((k) => ({ ...k, crew: true })),
      ...veri.pending.map((k) => ({ ...k, crew: false })),
    ];

    aciklama.textContent = "hundreds of people are already on the app.";

    box.textContent = "";
    hepsi.forEach((k) => {
      const card = document.createElement("div");
      card.className = "nr-person" + (k.crew ? " crew" : "");

      /* Fotograf yok: bas harf. Hesabin kendi isareti kadar. */
      const im = document.createElement("span");
      im.className = "nr-img";
      im.textContent = (k.name || "?").trim()[0].toUpperCase();
      card.appendChild(im);

      const text = document.createElement("div");
      text.className = "nr-text";

      const name = document.createElement("p");
      name.className = "nr-name";
      name.textContent = k.name;
      text.appendChild(name);

      const sub = document.createElement("p");
      sub.className = "nr-handle";
      sub.textContent = k.handle ? "@" + k.handle : "no handle";
      text.appendChild(sub);

      card.appendChild(text);
      box.appendChild(card);
    });
  }

  drawNachtradar();

  /* Jeton yerelde duruyor: karari ilk boyamadan once verebiliyoruz,
     boylece girisliye list bir an gorunup kaybolmuyor. */
  showFamiliarFaces(Boolean(window.AH && AH.signedIn && AH.signedIn()));

  /* --- acilis --- */

  if (!(AYAR.url && AYAR.anonKey)) {
    outside.hidden = false;
    outside.querySelector(".page-note").textContent =
      "this opens when the backend does.";
    return;
  }

  AH.sessionReady.then(render);
  AH.onSessionChange(render);
})();
