/* afterhours — maps sayfasi.
   Kureyi ana sayfadaki sehir.js ciziyor; burada sadece yanindaki
   "yurume mesafesinde" listesini gercek veriden dolduruyoruz.
   Ana sayfada bu liste elle yazilmisti; burada etkinliklerden geliyor. */

(function () {
  const liste = document.getElementById("harita-yakin");
  const alt = document.getElementById("harita-alt");
  if (!liste) return;

  /* Yurume dakikalari kurenin kendi verisinde: sehir.js her geceyi
     `dk` alaniyla tutuyor ve beacon'a gelince ayni sayiyi gosteriyor.
     Liste de oradan gelsin ki iki yer birbirini yalanlamasin. */
  const geceler = window.AH_GECELER || [];
  if (!geceler.length) return;

  const yakin = geceler.slice().sort((a, b) => a.dk - b.dk).slice(0, 7);

  liste.textContent = "";
  yakin.forEach((g) => {
    const li = document.createElement("li");

    const ad = document.createElement("span");
    ad.textContent = g.ad;

    const tur = document.createElement("em");
    tur.textContent = (g.tip || "").toLowerCase();

    const sure = document.createElement("b");
    sure.textContent = g.dk + " min";

    li.appendChild(ad);
    li.appendChild(tur);
    li.appendChild(sure);
    liste.appendChild(li);
  });

  alt.textContent = geceler.length + " nights on the globe · spin to find the rest";
})();
