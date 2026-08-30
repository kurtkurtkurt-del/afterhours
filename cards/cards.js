/* afterhours — card collection.
   Kartlari kendimiz cizmiyoruz: ana sayfadaki seritte kullanilan
   cards.js ureteci ayni isi yapiyor (CARDS.on = on yuz).
   Burada sadece uc geceyi ona veriyoruz.

   Tiklayinca kart cevriliyor: arka yuz gecenin zaman cizelgesi. */

(function () {
  const alan = document.getElementById("cc-cards");
  if (!alan || !window.CARDS || !window.CARD_SAMPLES) return;

  CARD_SAMPLES.forEach((gece, i) => {
    const kutu = document.createElement("figure");
    kutu.className = "cc-card";

    const yuz = document.createElement("div");
    yuz.className = "cc-face";
    yuz.innerHTML = CARDS.on(gece, "k" + i);

    const arka = document.createElement("div");
    arka.className = "cc-face cc-back";
    arka.innerHTML = CARDS.arka(gece, "a" + i);

    const cevir = document.createElement("button");
    cevir.className = "cc-flip";
    cevir.type = "button";
    cevir.setAttribute("aria-label", "flip " + gece.t);
    cevir.appendChild(yuz);
    cevir.appendChild(arka);
    cevir.addEventListener("click", () => kutu.classList.toggle("flipped"));

    const alt = document.createElement("figcaption");
    alt.textContent = gece.city;

    kutu.appendChild(cevir);
    kutu.appendChild(alt);
    alan.appendChild(kutu);
  });
})();
