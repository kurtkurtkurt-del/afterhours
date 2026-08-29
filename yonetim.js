/* afterhours — yonetim baglantisi.
   Yonetici olarak girmisken menunun ortasina "admin panel" ekler.
   Baskasi icin hicbir sey yapmaz; zaten gorse de ise yaramaz, cunku
   yetkiyi veritabani veriyor (backend/sql/02_rls.sql).  */

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
    if (!baslik || document.querySelector(".header-yonetim")) return;

    const a = document.createElement("a");
    a.className = "header-yonetim";
    a.href = kokYolu() + "admin/index.html";
    a.textContent = "admin panel";

    /* Menunun ortasi: logo ile baglantilarin arasina giriyor */
    const nav = baslik.querySelector(".header-links");
    baslik.insertBefore(a, nav);
    baslik.classList.add("yonetici");
  }

  function kaldir() {
    const a = document.querySelector(".header-yonetim");
    if (a) a.remove();
    const baslik = document.querySelector(".header");
    if (baslik) baslik.classList.remove("yonetici");
  }

  function bak() {
    if (!(AH.girisliMi && AH.girisliMi() && AH.istek)) return kaldir();
    const id = AH.oturum && AH.oturum.kullanici && AH.oturum.kullanici.id;
    if (!id) return kaldir();

    AH.istek("/profiles?id=eq." + id + "&select=is_admin")
      .then((r) => { if (r && r[0] && r[0].is_admin) ekle(); else kaldir(); })
      .catch(() => kaldir());
  }

  /* AH.istek'i veri.js tanimliyor ve bazi sayfalarda o BIZDEN SONRA
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
