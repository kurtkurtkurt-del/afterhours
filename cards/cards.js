/* afterhours — card collection.
   We do not draw the cards ourselves: the cards.js generator used by the
   strip on the landing page does the same job (CARDS.front = the front).
   Here we only hand it three nights.

   A click turns the card over: the back is that night's timeline. */

(function () {
  const field = document.getElementById("cc-cards");
  if (!field || !window.CARDS || !window.CARD_SAMPLES) return;

  CARD_SAMPLES.forEach((gece, i) => {
    const box = document.createElement("figure");
    box.className = "cc-card";

    const face = document.createElement("div");
    face.className = "cc-face";
    face.innerHTML = CARDS.front(gece, "k" + i);

    const backFace = document.createElement("div");
    backFace.className = "cc-face cc-back";
    backFace.innerHTML = CARDS.back(gece, "a" + i);

    const shape = document.createElement("button");
    shape.className = "cc-flip";
    shape.type = "button";
    shape.setAttribute("aria-label", "flip " + gece.t);
    shape.appendChild(face);
    shape.appendChild(backFace);
    shape.addEventListener("click", () => box.classList.toggle("flipped"));

    const sub = document.createElement("figcaption");
    sub.textContent = gece.city;

    box.appendChild(shape);
    box.appendChild(sub);
    field.appendChild(box);
  });
})();
