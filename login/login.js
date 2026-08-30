/* afterhours — giris sayfasi.
   Tek is: e-posta al, baglanti istet, durumu soyle.
   Sifre alani yok; olmayacak da.  */

(function () {
  const form = document.getElementById("page-form");
  const alan = document.getElementById("page-email");
  const sifreAlani = document.getElementById("page-password");
  const dugme = document.getElementById("page-button");
  const not = document.getElementById("page-note");
  const icerde = document.getElementById("page-in");
  const kim = document.getElementById("page-who");
  const cik = document.getElementById("page-signout");

  const AYAR = window.AH_CONFIG || {};
  const acik = Boolean(AYAR.url && AYAR.anonKey);

  function soyle(metin, tur) {
    not.textContent = metin || "";
    not.className = "page-note" + (tur ? " " + tur : "");
  }

  /* Backend henuz baglanmadiysa durust ol: form calismaz, sebebi yazilir. */
  if (!acik) {
    form.hidden = true;
    soyle("sign-in opens when the backend does. nothing to sign into yet.", "waiting");
    return;
  }

  function ekraniKur() {
    const girisli = window.AH && AH.signedIn();
    form.hidden = girisli;
    icerde.hidden = !girisli;
    if (girisli) {
      const k = AH.session && AH.session.user;
      kim.textContent = k && k.email ? "you're in as " + k.email : "you're in.";
      soyle("");
    }
  }

  AH.sessionReady.then(ekraniKur);
  AH.onSessionChange(ekraniKur);

  /* Sifreyle giris. Sifresiz baglanti yolu duruyor (AH.requestLink) ama
     su an kullanilmiyor: Supabase'in dahili e-posta gondericisi saatte
     birkac postayla sinirli ve giris denemeleri ona takiliyordu. */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const eposta = alan.value.trim();
    const sifre = sifreAlani.value;

    if (!eposta || eposta.indexOf("@") < 1) {
      soyle("that doesn't look like an email.", "hata");
      alan.focus();
      return;
    }
    if (!sifre) {
      soyle("your password is missing.", "error");
      sifreAlani.focus();
      return;
    }

    dugme.disabled = true;
    soyle("signing in…");
    AH.signInWithPassword(eposta, sifre)
      .then(() => { sifreAlani.value = ""; ekraniKur(); soyle("you're in.", "tamam"); })
      .catch((h) => {
        soyle(/invalid|credentials/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message, "hata");
      })
      .finally(() => { dugme.disabled = false; });
  });

  cik.addEventListener("click", () => {
    AH.signOut().then(() => { ekraniKur(); soyle("signed out.", "ok"); });
  });

  /* Kullanici adi ve arkadaslar bir zamanlar buradaydi; friends&more
     sayfasina tasindilar (friends/friends.js). Kopyalari burada kaldi ve
     olmayan ogeleri arayip dosyayi ortasinda durduruyorlardi: satir
     173'te TypeError, sonrasi hic calismiyordu. Silindi. */

})();
