/* afterhours — card collection.
   Kartlari kendimiz cizmiyoruz: ana sayfadaki seritte kullanilan
   kartlar.js ureteci ayni isi yapiyor (KARTLAR.on = on yuz).
   Burada sadece uc geceyi ona veriyoruz.

   Tiklayinca kart cevriliyor: arka yuz gecenin zaman cizelgesi. */

(function () {
  const alan = document.getElementById("kk-kartlar");
  if (!alan || !window.KARTLAR || !window.KART_ORNEKLERI) return;

  KART_ORNEKLERI.forEach((gece, i) => {
    const kutu = document.createElement("figure");
    kutu.className = "kk-kart";

    const yuz = document.createElement("div");
    yuz.className = "kk-yuz";
    yuz.innerHTML = KARTLAR.on(gece, "k" + i);

    const arka = document.createElement("div");
    arka.className = "kk-yuz kk-arka";
    arka.innerHTML = KARTLAR.arka(gece, "a" + i);

    const cevir = document.createElement("button");
    cevir.className = "kk-cevir";
    cevir.type = "button";
    cevir.setAttribute("aria-label", "flip " + gece.t);
    cevir.appendChild(yuz);
    cevir.appendChild(arka);
    cevir.addEventListener("click", () => kutu.classList.toggle("cevrik"));

    const alt = document.createElement("figcaption");
    alt.textContent = gece.sehir;

    kutu.appendChild(cevir);
    kutu.appendChild(alt);
    alan.appendChild(kutu);
  });
})();
