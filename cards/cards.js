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

    const yuz = document.createElement("div");
    yuz.className = "cc-face";
    yuz.innerHTML = CARDS.front(gece, "k" + i);

    const arka = document.createElement("div");
    arka.className = "cc-face cc-back";
    arka.innerHTML = CARDS.back(gece, "a" + i);

    const shape = document.createElement("button");
    shape.className = "cc-flip";
    shape.type = "button";
    shape.setAttribute("aria-label", "flip " + gece.t);
    shape.appendChild(yuz);
    shape.appendChild(arka);
    shape.addEventListener("click", () => box.classList.toggle("flipped"));

    const sub = document.createElement("figcaption");
    sub.textContent = gece.city;

    box.appendChild(shape);
    box.appendChild(sub);
    field.appendChild(box);
  });
})();
