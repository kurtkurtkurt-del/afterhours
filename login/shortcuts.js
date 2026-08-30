/* afterhours — the middle block on the account page.
   Girmemis birine "first time?" (kayit cagrisi), girmis birine
   "account settings." shows. Both sit in the page, one is simply hidden.

   Why it is not inside login.js: login.js used to look for elements
   belonging to the friends page, threw halfway when it could not find
   them, and
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
