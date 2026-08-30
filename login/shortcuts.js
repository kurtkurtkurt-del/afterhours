/* afterhours — hesap sayfasindaki ortadaki blok.
   Girmemis birine "first time?" (kayit cagrisi), girmis birine
   "account settings." gorunuyor. Ikisi de sayfada duruyor, sadece
   biri gizleniyor.

   Neden login.js'in icinde degil: login.js friends sayfasinin
   ogelerini ariyor, bulamayinca ortasinda hata verip duruyor ve
   sonrasindaki hicbir sey calismiyor. Ayri dosya ondan etkilenmez.  */

(function () {
  const AH = (window.AH = window.AH || {});

  const disarida = document.getElementById("sc-out");
  const icerde = document.getElementById("sc-in");
  if (!disarida || !icerde || !AH.oturumHazir) return;

  function bak() {
    const girisli = Boolean(AH.girisliMi && AH.girisliMi());
    disarida.hidden = girisli;
    icerde.hidden = !girisli;
  }

  AH.oturumHazir.then(bak);
  if (AH.oturumDegisti) AH.oturumDegisti(bak);
})();
