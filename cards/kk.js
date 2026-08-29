/* afterhours — card collection'in oturuma gore hali.
   Girisliysen sayfa bos: "sign in" dugmesi de, ornek kartlar da
   gitmis oluyor. Ikisi de girmemis birine ne oldugunu anlatmak icin
   duruyordu; girmis biri kendi (henuz bos) koleksiyonunu goruyor.

   Ayri dosya, cunku cards.js oturum.js'ten ONCE yukleniyor ve orada
   AH heniz yok. Bu betik en sonda: oturum localStorage'dan zaten
   okunmus oluyor, yani ilk boyamadan once dogru karari veriyor.  */

(function () {
  const AH = window.AH;
  if (!AH) return;

  const dugme = document.querySelector(".kk-sol .giris-dugme");
  const kartlar = document.getElementById("kk-kartlar");

  function bak() {
    const girisli = Boolean(AH.girisliMi && AH.girisliMi());
    if (dugme) dugme.hidden = girisli;
    if (kartlar) kartlar.hidden = girisli;
  }

  bak();                                   /* jeton yerelde: hemen bilinir */
  if (AH.oturumHazir) AH.oturumHazir.then(bak);
  if (AH.oturumDegisti) AH.oturumDegisti(bak);
})();
