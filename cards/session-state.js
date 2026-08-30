/* afterhours — how the card collection changes with the session.
   Girisliysen page empty: "sign in" dugmesi de, ornek cards da
   gitmis oluyor. Ikisi de girmemis birine ne oldugunu anlatmak icin
   duruyordu; girmis biri kendi (henuz empty) koleksiyonunu goruyor.

   Ayri dosya, cunku cards.js session.js'ten ONCE yukleniyor ve orada
   AH heniz yok. Bu betik en sonda: oturum localStorage'dan zaten
   okunmus oluyor, yani ilk boyamadan once dogru karari veriyor.  */

(function () {
  const AH = window.AH;
  if (!AH) return;

  const dugme = document.querySelector(".cc-left .page-button");
  const cards = document.getElementById("cc-cards");

  function refresh() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    if (dugme) dugme.hidden = signedIn;
    if (cards) cards.hidden = signedIn;
  }

  refresh();                                   /* the token is local: known at once */
  if (AH.sessionReady) AH.sessionReady.then(refresh);
  if (AH.onSessionChange) AH.onSessionChange(refresh);
})();
