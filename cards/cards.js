/* afterhours — card collection.
   We do not draw the cards ourselves: the cards.js generator used by the
   strip on the landing page does the same job (CARDS.front = the front).
   Signed out, three sample nights explain what this is; signed in,
   session-state.js hands the same drawer your own cards from the app
   (my_cards, 19_checkins.sql).

   A click turns the card over: the back is that night's timeline. */

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

      const backFace = document.createElement("div");
      backFace.className = "cc-face cc-back";
      backFace.innerHTML = CARDS.back(night, "a" + i);

      const shape = document.createElement("button");
      shape.className = "cc-flip";
      shape.type = "button";
      shape.setAttribute("aria-label",
        window.AH && AH.t ? AH.t("cards.flip", { name: night.t }) : "flip " + night.t);
      shape.appendChild(face);
      shape.appendChild(backFace);
      shape.addEventListener("click", () => box.classList.toggle("flipped"));

      const sub = document.createElement("figcaption");
      sub.textContent = night.city;

      box.appendChild(shape);
      box.appendChild(sub);
      field.appendChild(box);
    });
  };

  if (window.CARD_SAMPLES) window.CC_DRAW(window.CARD_SAMPLES);
})();
