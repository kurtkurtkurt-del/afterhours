/* afterhours — giris sayfasi.
   Tek is: e-posta al, baglanti istet, durumu soyle.
   Sifre alani yok; olmayacak da.  */

(function () {
  const form = document.getElementById("giris-form");
  const alan = document.getElementById("giris-eposta");
  const dugme = document.getElementById("giris-dugme");
  const not = document.getElementById("giris-not");
  const icerde = document.getElementById("giris-icerde");
  const kim = document.getElementById("giris-kim");
  const cik = document.getElementById("giris-cik");

  const AYAR = window.AH_AYAR || {};
  const acik = Boolean(AYAR.url && AYAR.anonKey);

  function soyle(metin, tur) {
    not.textContent = metin || "";
    not.className = "giris-not" + (tur ? " " + tur : "");
  }

  /* Backend henuz baglanmadiysa durust ol: form calismaz, sebebi yazilir. */
  if (!acik) {
    form.hidden = true;
    soyle("login opens when the backend does. nothing to sign into yet.", "bekliyor");
    return;
  }

  function ekraniKur() {
    const girisli = window.AH && AH.girisliMi();
    form.hidden = girisli;
    icerde.hidden = !girisli;
    if (girisli) {
      const k = AH.oturum && AH.oturum.kullanici;
      kim.textContent = k && k.email ? "you're in as " + k.email : "you're in.";
      soyle("");
    }
  }

  AH.oturumHazir.then(ekraniKur);
  AH.oturumDegisti(ekraniKur);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const eposta = alan.value.trim();
    if (!eposta || eposta.indexOf("@") < 1) {
      soyle("that doesn't look like an email.", "hata");
      alan.focus();
      return;
    }
    dugme.disabled = true;
    soyle("sending…");
    AH.girisIste(eposta)
      .then(() => soyle("check your mail. the link brings you back here.", "tamam"))
      .catch((h) => soyle("couldn't send it: " + h.message, "hata"))
      .finally(() => { dugme.disabled = false; });
  });

  cik.addEventListener("click", () => {
    AH.cikis().then(() => { ekraniKur(); soyle("signed out.", "tamam"); });
  });

  /* --------------------------- kullanici adi --------------------------- */

  const handleForm = document.getElementById("handle-form");
  const handleAlan = document.getElementById("handle-alan");
  const handleDurum = document.getElementById("handle-durum");

  function handleYukle() {
    AH.profilim().then((p) => { if (p && p.handle) handleAlan.value = p.handle; });
  }

  handleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleDurum.textContent = "saving…";
    AH.handleAyarla(handleAlan.value)
      .then((satirlar) => {
        /* Bos donus = hicbir satir guncellenmedi (ornegin oturum baska
           bir kullaniciya ait). "kaydedildi" demek yanlis olurdu. */
        handleDurum.textContent = satirlar && satirlar.length
          ? "saved."
          : "couldn't save — try signing in again.";
      })
      .catch((h) => {
        /* Ayni ad baskasindaysa veritabani benzersizlik hatasi doner */
        handleDurum.textContent = /duplicate|unique/i.test(h.message)
          ? "someone already has that one."
          : "couldn't save: " + h.message;
      });
  });

  /* ------------------------------ arkadaslar ---------------------------- */

  const arkForm = document.getElementById("arkadas-form");
  const arkAlan = document.getElementById("arkadas-alan");
  const arkDurum = document.getElementById("arkadas-durum");
  const arkListe = document.getElementById("arkadas-liste");

  const CEVAP = {
    gonderildi: "request sent.",
    kabul: "you're friends now.",
    bulunamadi: "nobody here by that handle.",
    kendine: "that's you.",
  };

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

        /* Gelen bekleyen istek: kabul edilebilir */
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

  AH.oturumHazir.then(() => {
    if (AH.girisliMi()) { handleYukle(); arkadaslariYukle(); }
  });
})();
