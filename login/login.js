/* afterhours — giris sayfasi.
   Tek is: e-posta al, baglanti istet, durumu soyle.
   Sifre alani yok; olmayacak da.  */

(function () {
  const form = document.getElementById("giris-form");
  const alan = document.getElementById("giris-eposta");
  const sifreAlani = document.getElementById("giris-sifre");
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
    soyle("sign-in opens when the backend does. nothing to sign into yet.", "bekliyor");
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

  /* Sifreyle giris. Sifresiz baglanti yolu duruyor (AH.girisIste) ama
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
      soyle("your password is missing.", "hata");
      sifreAlani.focus();
      return;
    }

    dugme.disabled = true;
    soyle("signing in…");
    AH.sifreyleGir(eposta, sifre)
      .then(() => { sifreAlani.value = ""; ekraniKur(); soyle("you're in.", "tamam"); })
      .catch((h) => {
        soyle(/invalid|credentials/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message, "hata");
      })
      .finally(() => { dugme.disabled = false; });
  });

  cik.addEventListener("click", () => {
    AH.cikis().then(() => { ekraniKur(); soyle("signed out.", "tamam"); });
  });

  /* Kullanici adi ve arkadaslar bir zamanlar buradaydi; friends&more
     sayfasina tasindilar (friends/friends.js). Kopyalari burada kaldi ve
     olmayan ogeleri arayip dosyayi ortasinda durduruyorlardi: satir
     173'te TypeError, sonrasi hic calismiyordu. Silindi. */

})();
