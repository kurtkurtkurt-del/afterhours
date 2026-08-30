/* afterhours — giris sayfasi.
   Tek is: e-posta al, baglanti istet, durumu say.
   Sifre alani yok; olmayacak da.  */

(function () {
  const form = document.getElementById("page-form");
  const field = document.getElementById("page-email");
  const sifreAlani = document.getElementById("page-password");
  const dugme = document.getElementById("page-button");
  const note = document.getElementById("page-note");
  const inside = document.getElementById("page-in");
  const who = document.getElementById("page-who");
  const cik = document.getElementById("page-signout");

  const AYAR = window.AH_CONFIG || {};
  const open = Boolean(AYAR.url && AYAR.anonKey);

  function say(text, kind) {
    note.textContent = text || "";
    note.className = "page-note" + (kind ? " " + kind : "");
  }

  /* Backend henuz baglanmadiysa durust ol: form calismaz, sebebi yazilir. */
  if (!open) {
    form.hidden = true;
    say("sign-in opens when the backend does. nothing to sign into yet.", "waiting");
    return;
  }

  function render() {
    const signedIn = window.AH && AH.signedIn();
    form.hidden = signedIn;
    inside.hidden = !signedIn;
    if (signedIn) {
      const k = AH.session && AH.session.user;
      who.textContent = k && k.email ? "you're in as " + k.email : "you're in.";
      say("");
    }
  }

  AH.sessionReady.then(render);
  AH.onSessionChange(render);

  /* Sifreyle giris. Sifresiz baglanti yolu duruyor (AH.requestLink) ama
     su an kullanilmiyor: Supabase'in dahili e-posta gondericisi saatte
     birkac postayla sinirli ve giris denemeleri ona takiliyordu. */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = field.value.trim();
    const password = sifreAlani.value;

    if (!email || email.indexOf("@") < 1) {
      say("that doesn't look like an email.", "hata");
      field.focus();
      return;
    }
    if (!password) {
      say("your password is missing.", "error");
      sifreAlani.focus();
      return;
    }

    dugme.disabled = true;
    say("signing in…");
    AH.signInWithPassword(email, password)
      .then(() => { sifreAlani.value = ""; render(); say("you're in.", "tamam"); })
      .catch((h) => {
        say(/invalid|credentials/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message, "hata");
      })
      .finally(() => { dugme.disabled = false; });
  });

  cik.addEventListener("click", () => {
    AH.signOut().then(() => { render(); say("signed out.", "ok"); });
  });

  /* Kullanici adi ve arkadaslar bir zamanlar buradaydi; friends&more
     sayfasina tasindilar (friends/friends.js). Kopyalari burada kaldi ve
     olmayan ogeleri arayip dosyayi ortasinda durduruyorlardi: row
     173'te TypeError, sonrasi hic calismiyordu. Silindi. */

})();
