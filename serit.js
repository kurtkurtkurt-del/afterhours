/* afterhours — deneme 02: yatay kayan seritler */

const seritler = document.getElementById("seritler");
const bilgi = document.getElementById("info");
const yan = document.getElementById("yan");
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
  gorsel.className = "poster-gorsel";
  gorsel.type = "image/svg+xml";
  gorsel.data = "posters/" + no + ".svg";
  kutu.appendChild(gorsel);

  kutu.addEventListener("mouseenter", () => {
    clearTimeout(gizleZamani);
    kutu.closest(".serit").classList.add("duruyor");   // serit durur
    kutu.classList.add("buyuk");                        // poster hafif buyur
    alanIndex.textContent = no + " / " + POSTERS.length;
    alanTur.textContent = p.tur;
    alanBaslik.textContent = p.baslik;
    alanMeta.textContent = p.meta;
    alanMetin.textContent = p.metin;
    yan.classList.add("poster-uzerinde");
  });

  kutu.addEventListener("mouseleave", () => {
    const serit = kutu.closest(".serit");
    kutu.classList.remove("buyuk");
    gizleZamani = setTimeout(() => {
      serit.classList.remove("duruyor");
      yan.classList.remove("poster-uzerinde");
    }, 80);
  });

  return kutu;
}

for (let s = 0; s < SERIT_SAYISI; s++) {
  const serit = document.createElement("div");
  serit.className = "serit";

  const ray = document.createElement("div");
  ray.className = "ray";

  // Dikissiz dongu icin ayni dizi iki kez basilir
  for (let tekrar = 0; tekrar < 2; tekrar++) {
    for (let j = 0; j < SERIT_UZUNLUGU; j++) {
      ray.appendChild(posterYap(s * SERIT_UZUNLUGU + j));
    }
  }

  serit.appendChild(ray);
  seritler.appendChild(serit);
}
