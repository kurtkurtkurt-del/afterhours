/* afterhours — card collection.
   The cards are drawn by the shared generator (cards.js at the root, made from
   app/src/content/cardsgen.js): CARDS.front is the one face a card has.
   Signed out the page says what this is and shows nothing; signed in,
   session-state.js hands this drawer your own cards (my_cards, 19_checkins.sql). */

(function () {
  const field = document.getElementById("cc-cards");
  if (!field || !window.CARDS) return;

  window.CC_DRAW = function (nights) {
    field.textContent = "";
    nights.forEach((night, i) => {
      const box = document.createElement("figure");
      box.className = "cc-card";
      const face = document.createElement("div");
      face.className = "cc-face";
      face.innerHTML = CARDS.front(night, "k" + i);
      box.appendChild(face);
      const sub = document.createElement("figcaption");
      sub.textContent = String(night.city || "").toLowerCase();
      box.appendChild(sub);
      field.appendChild(box);
    });
  };
})();
