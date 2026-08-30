/* afterhours — how the card collection changes with the session.
   Signed in, the page is empty: the "sign in" button and the sample cards
   both go. Both were there to explain to someone signed out what this is;
   someone signed in sees their own (still empty) collection.

   A separate file, because cards.js loads BEFORE session.js and AH does
   not exist there yet. This script comes last: the session has already
   been read from localStorage, so it makes the right call before the
   first paint.  */

(function () {
  const AH = window.AH;
  if (!AH) return;

  const button = document.querySelector(".cc-left .page-button");
  const cards = document.getElementById("cc-cards");

  function refresh() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    if (button) button.hidden = signedIn;
    if (cards) cards.hidden = signedIn;
  }

  refresh();                                   /* the token is local: known at once */
  if (AH.sessionReady) AH.sessionReady.then(refresh);
  if (AH.onSessionChange) AH.onSessionChange(refresh);
})();
