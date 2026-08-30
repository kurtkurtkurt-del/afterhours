/* afterhours — deneme 02: yatay kayan seritler */

const seritler = document.getElementById("strips");
const bilgi = document.getElementById("info");
const yan = document.getElementById("side");
const alanIndex = bilgi.querySelector(".info-index");
const alanTur = bilgi.querySelector(".info-type");
const alanBaslik = bilgi.querySelector(".info-title");
const alanMeta = bilgi.querySelector(".info-meta");
const alanMetin = bilgi.querySelector(".info-body");

let gizleZamani;

// 36 poster, uc serite bolunur
const SERIT_SAYISI = 3;
const SERIT_UZUNLUGU = POSTERS.length / SERIT_SAYISI;

function posterYap(i) {
  const no = String(i + 1).padStart(2, "0");
  const p = POSTERS[i];

  const kutu = document.createElement("a");
  kutu.className = "poster";
  kutu.href = "events/" + no + ".html";
  kutu.target = "_blank";
  kutu.rel = "noopener";

  const gorsel = document.createElement("object");
  gorsel.className = "poster-image";
  gorsel.type = "image/svg+xml";
  gorsel.data = "posters/" + no + ".svg";
  kutu.appendChild(gorsel);

  kutu.addEventListener("mouseenter", () => {
    clearTimeout(gizleZamani);
    kutu.closest(".strip").classList.add("stopped");   // serit durur
    kutu.classList.add("big");                        // poster hafif buyur
    alanIndex.textContent = no + " / " + POSTERS.length;
    alanTur.textContent = p.tur;
    alanBaslik.textContent = p.baslik;
    alanMeta.textContent = p.meta;
    alanMetin.textContent = p.metin;
    yan.classList.add("poster-hover");
  });

  kutu.addEventListener("mouseleave", () => {
    const serit = kutu.closest(".strip");
    kutu.classList.remove("big");
    gizleZamani = setTimeout(() => {
      serit.classList.remove("stopped");
      yan.classList.remove("poster-hover");
    }, 80);
  });

  return kutu;
}

for (let s = 0; s < SERIT_SAYISI; s++) {
  const serit = document.createElement("div");
  serit.className = "strip";

  const ray = document.createElement("div");
  ray.className = "rail";

  // Dikissiz dongu icin ayni dizi iki kez basilir
  for (let tekrar = 0; tekrar < 2; tekrar++) {
    for (let j = 0; j < SERIT_UZUNLUGU; j++) {
      ray.appendChild(posterYap(s * SERIT_UZUNLUGU + j));
    }
  }

  serit.appendChild(ray);
  seritler.appendChild(serit);
}
