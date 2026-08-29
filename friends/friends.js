/* afterhours — friends & more.
   Kullanici adi, arkadaslar ve biriktirdiklerin. Hepsi giris ister;
   girissizken sayfa sadece bir davet gosterir.

   Bu bolumler once giris sayfasindaydi; oraya ait degillerdi. Giris
   sayfasi artik yalnizca giris.  */

(function () {
  const AYAR = window.AH_AYAR || {};
  const disarida = document.getElementById("ark-disarida");
  const icerde = document.getElementById("ark-icerde");

  const handleForm = document.getElementById("handle-form");
  const handleAlan = document.getElementById("handle-alan");
  const handleDurum = document.getElementById("handle-durum");

  const arkForm = document.getElementById("arkadas-form");
  const arkAlan = document.getElementById("arkadas-alan");
  const arkDurum = document.getElementById("arkadas-durum");
  const arkListe = document.getElementById("arkadas-liste");
  const tutListe = document.getElementById("tutulan-liste");

  const CEVAP = {
    gonderildi: "request sent.",
    kabul: "you're friends now.",
    bulunamadi: "nobody here by that handle.",
    kendine: "that's you.",
  };

  function ekraniKur() {
    const girisli = Boolean(window.AH && AH.girisliMi && AH.girisliMi());
    disarida.hidden = girisli;
    icerde.hidden = !girisli;
    if (girisli) { handleYukle(); arkadaslariYukle(); tutulanlariYukle(); }
  }

  /* --- kullanici adi --- */

  function handleYukle() {
    AH.profilim().then((p) => { if (p && p.handle) handleAlan.value = p.handle; });
  }

  handleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleDurum.textContent = "saving…";
    AH.handleAyarla(handleAlan.value)
      .then((satirlar) => {
        handleDurum.textContent = satirlar && satirlar.length
          ? "saved."
          : "couldn't save — try signing in again.";
      })
      .catch((h) => {
        handleDurum.textContent = /duplicate|unique/i.test(h.message)
          ? "someone already has that one."
          : "couldn't save: " + h.message;
      });
  });

  /* --- arkadaslar --- */

  function arkadaslariYukle() {
    AH.arkadaslar().then((liste) => {
      arkListe.textContent = "";
      if (!liste.length) {
        const bos = document.createElement("li");
        bos.className = "arkadas-bos";
        bos.textContent = "no friends yet.";
        arkListe.appendChild(bos);
        return;
      }
      liste.forEach((a) => {
        const satir = document.createElement("li");
        satir.className = "arkadas-satir";

        const ad = document.createElement("span");
        ad.className = "arkadas-ad";
        ad.textContent = a.handle || a.display_name || "someone";

        const durum = document.createElement("span");
        durum.className = "arkadas-durum-etiket";
        durum.textContent =
          a.status === "accepted" ? "friends"
          : a.yon === "gelen" ? "wants to be friends" : "waiting";

        satir.appendChild(ad);
        satir.appendChild(durum);

        if (a.status === "pending" && a.yon === "gelen") {
          const kabul = document.createElement("button");
          kabul.className = "arkadas-islem";
          kabul.type = "button";
          kabul.textContent = "accept";
          kabul.addEventListener("click", () =>
            AH.arkadasKabul(a.other_id).then(arkadaslariYukle));
          satir.appendChild(kabul);
        }

        const cikar = document.createElement("button");
        cikar.className = "arkadas-islem sil";
        cikar.type = "button";
        cikar.textContent = a.status === "accepted" ? "remove" : "cancel";
        cikar.addEventListener("click", () =>
          AH.arkadasCikar(a.other_id).then(arkadaslariYukle));
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
    AH.arkadasIste(h)
      .then((c) => {
        arkDurum.textContent = CEVAP[c] || String(c);
        if (c === "gonderildi" || c === "kabul") { arkAlan.value = ""; arkadaslariYukle(); }
      })
      .catch((h) => { arkDurum.textContent = "couldn't do that: " + h.message; });
  });

  /* --- biriktirilenler --- */

  function tutulanlariYukle() {
    if (!AH.biriktirilenler) return;
    AH.biriktirilenler().then((liste) => {
      tutListe.textContent = "";
      if (!liste.length) {
        const bos = document.createElement("li");
        bos.className = "arkadas-bos";
        bos.textContent = "nothing kept yet. swipe a card right in explore.";
        tutListe.appendChild(bos);
        return;
      }
      liste.forEach((e) => {
        const satir = document.createElement("li");
        const a = document.createElement("a");
        a.className = "tutulan-satir";
        a.href = "../explore/" + e.slug + "/index.html";

        const g = document.createElement("object");
        g.type = "image/svg+xml";
        g.data = e.posterYolu ||
          "../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";
        a.appendChild(g);

        const yazi = document.createElement("div");
        const ad = document.createElement("p");
        ad.className = "tutulan-ad";
        ad.textContent = e.baslik;
        const meta = document.createElement("p");
        meta.className = "tutulan-meta";
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

  /* Girise bagli degil: nachtradar listesi herkese ayni gorunuyor,
     cunku simdilik sabit. Isimler; fotograf ya da rozet yok. */
  function nachtradarCiz() {
    const kutu = document.getElementById("nr");
    const aciklama = document.getElementById("nr-aciklama");
    const veri = window.NACHTRADAR;
    if (!kutu || !veri) return;

    const hepsi = [
      ...veri.crew.map((k) => ({ ...k, crew: true })),
      ...veri.bekleyen.map((k) => ({ ...k, crew: false })),
    ];

    /* "hundreds" uygulamanin tamami icin; ekranda duran 61 kisi onun
       bir parcasi. Ikisini birlikte yaziyoruz ki cumle ekrandakiyle
       celismesin. */
    aciklama.textContent =
      "hundreds of people are already on the app · " +
      hepsi.length + " of them here, " + veri.crew.length + " already crew";

    kutu.textContent = "";
    hepsi.forEach((k) => {
      const kart = document.createElement("div");
      kart.className = "nr-kisi" + (k.crew ? " crew" : "");

      /* Fotograf yok: bas harf. Hesabin kendi isareti kadar. */
      const im = document.createElement("span");
      im.className = "nr-im";
      im.textContent = (k.ad || "?").trim()[0].toUpperCase();
      kart.appendChild(im);

      const yazi = document.createElement("div");
      yazi.className = "nr-yazi";

      const ad = document.createElement("p");
      ad.className = "nr-ad";
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

  /* --- acilis --- */

  if (!(AYAR.url && AYAR.anonKey)) {
    disarida.hidden = false;
    disarida.querySelector(".giris-not").textContent =
      "this opens when the backend does.";
    return;
  }

  AH.oturumHazir.then(ekraniKur);
  AH.oturumDegisti(ekraniKur);
})();
