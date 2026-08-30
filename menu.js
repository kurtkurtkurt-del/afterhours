/* afterhours — menunun oturuma gore hali.
   Iki is yapiyor:
     · yonetici girmisse ortaya "admin panel" ekler
     · girisliyken sagdaki "login" yerine "welcome <ad> (:" yazar
   Girissizken menu bugunku haliyle birebir ayni kalir.

   Yonetim baglantisini gizlemek bir guvenlik onlemi DEGIL; yetkiyi
   veritabani veriyor (backend/sql/02_rls.sql). Bu sadece gorunum.  */

(function () {
  const AH = (window.AH = window.AH || {});
  if (!AH.oturumHazir) return;

  /* Sayfalar farkli derinliklerde (kok, explore/, explore/<slug>/).
     Menudeki logonun adresinden kok yolunu cikariyoruz — boylece site
     GitHub Pages'te alt klasorde yayinlansa da dogru kalir. */
  function kokYolu() {
    const logo = document.querySelector(".header .logo");
    const yol = (logo && logo.getAttribute("href")) || "index.html";
    return yol.replace(/index\.html$/, "");
  }

  function ekle() {
    const baslik = document.querySelector(".header");
    if (!baslik || document.querySelector(".header-admin")) return;

    const a = document.createElement("a");
    a.className = "header-admin";
    a.href = kokYolu() + "admin/index.html";
    a.textContent = "admin panel";

    /* Menunun ortasi: logo ile baglantilarin arasina giriyor */
    const nav = baslik.querySelector(".header-links");
    baslik.insertBefore(a, nav);
    baslik.classList.add("isadmin");
  }

  function kaldir() {
    const a = document.querySelector(".header-admin");
    if (a) a.remove();
    const baslik = document.querySelector(".header");
    if (baslik) baslik.classList.remove("isadmin");
  }

  /* --- sagdaki "login" baglantisi --- */

  function girisBaglantisi() {
    return document.querySelector('.header-links a[href*="login/"]');
  }

  function selamla(ad) {
    const a = girisBaglantisi();
    if (!a) return;
    if (!a.dataset.eskiMetin) a.dataset.eskiMetin = a.textContent;
    a.textContent = "welcome " + ad + " (:";
  }

  function selamiKaldir() {
    const a = girisBaglantisi();
    if (a && a.dataset.eskiMetin) {
      a.textContent = a.dataset.eskiMetin;
      delete a.dataset.eskiMetin;
    }
  }

  /* Ad sirasi: kullanici adi → gorunen adin ilk parcasi → e-postanin
     basi. "ahmet.selcuk.kurt" menude iyi durmuyor, ilk parcasi yeter. */
  function adBul(profil) {
    if (profil && profil.handle) return profil.handle;
    const ham =
      (profil && profil.display_name) ||
      (AH.oturum && AH.oturum.kullanici && AH.oturum.kullanici.email) ||
      "";
    const bas = String(ham).split("@")[0].split(/[.\s_]/)[0];
    return bas ? bas.toLowerCase() : "you";
  }

  function bak() {
    if (!(AH.girisliMi && AH.girisliMi() && AH.istek)) {
      kaldir();
      selamiKaldir();
      return;
    }
    const id = AH.oturum && AH.oturum.kullanici && AH.oturum.kullanici.id;
    if (!id) { kaldir(); selamiKaldir(); return; }

    AH.istek("/profiles?id=eq." + id + "&select=handle,display_name,is_admin")
      .then((r) => {
        const profil = (r && r[0]) || null;
        selamla(adBul(profil));
        if (profil && profil.is_admin) ekle(); else kaldir();
      })
      .catch(() => {
        /* Istek 401 ile dondugunde oturum bu arada dusurulmus olabilir
           (data.js gecersiz jetonu birakiyor). O zaman selamlamak yanlis:
           girissiz birine "welcome you" yaziyordu. */
        if (AH.girisliMi && AH.girisliMi()) selamla(adBul(null));
        else selamiKaldir();
        kaldir();
      });
  }

  /* AH.istek'i data.js tanimliyor ve bazi sayfalarda o BIZDEN SONRA
     yukleniyor. Betik siralamasina guvenmek yerine butun betikler
     calistiktan sonra bakiyoruz. */
  function hazirOlunca(f) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", f, { once: true });
    } else {
      f();
    }
  }

  hazirOlunca(() => {
    AH.oturumHazir.then(bak);
    if (AH.oturumDegisti) AH.oturumDegisti(bak);
  });
})();
