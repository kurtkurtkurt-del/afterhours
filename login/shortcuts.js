/* afterhours — the middle block on the account page.
   Girmemis birine "first time?" (kayit cagrisi), girmis birine
   "account settings." gorunuyor. Ikisi de sayfada duruyor, sadece
   biri gizleniyor.

   Neden login.js'in icinde degil: login.js friends sayfasinin
   ogelerini ariyor, bulamayinca ortasinda hata verip duruyor ve
   sonrasindaki hicbir sey calismiyor. Ayri dosya ondan etkilenmez.  */

(function () {
  const AH = (window.AH = window.AH || {});

  const outside = document.getElementById("sc-out");
  const inside = document.getElementById("sc-in");
  if (!outside || !inside || !AH.sessionReady) return;

  function refresh() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    outside.hidden = signedIn;
    inside.hidden = !signedIn;
  }

  AH.sessionReady.then(refresh);
  if (AH.onSessionChange) AH.onSessionChange(refresh);
})();
