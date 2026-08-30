/* afterhours — sketch 02: strips scrolling sideways */

const seritler = document.getElementById("strips");
const info = document.getElementById("info");
const yan = document.getElementById("side");
const fieldIndex = info.querySelector(".info-index");
const fieldKind = info.querySelector(".info-type");
const fieldTitle = info.querySelector(".info-title");
const fieldMeta = info.querySelector(".info-meta");
const fieldBody = info.querySelector(".info-body");

let gizleZamani;

// 36 posters, split across three strips
const SERIT_SAYISI = 3;
const SERIT_UZUNLUGU = POSTERS.length / SERIT_SAYISI;

function posterYap(i) {
  const no = String(i + 1).padStart(2, "0");
  const p = POSTERS[i];

  const box = document.createElement("a");
  box.className = "poster";
  box.href = "events/" + no + ".html";
  box.target = "_blank";
  box.rel = "noopener";

  const gorsel = document.createElement("object");
  gorsel.className = "poster-image";
  gorsel.type = "image/svg+xml";
  gorsel.data = "posters/" + no + ".svg";
  box.appendChild(gorsel);

  box.addEventListener("mouseenter", () => {
    clearTimeout(gizleZamani);
    box.closest(".strip").classList.add("stopped");   // the strip halts
    box.classList.add("big");                        // the poster grows a little
    fieldIndex.textContent = no + " / " + POSTERS.length;
    fieldKind.textContent = p.kind;
    fieldTitle.textContent = p.title;
    fieldMeta.textContent = p.meta;
    fieldBody.textContent = p.body;
    yan.classList.add("poster-hover");
  });

  box.addEventListener("mouseleave", () => {
    const serit = box.closest(".strip");
    box.classList.remove("big");
    gizleZamani = setTimeout(() => {
      serit.classList.remove("stopped");
      yan.classList.remove("poster-hover");
    }, 80);
  });

  return box;
}

for (let s = 0; s < SERIT_SAYISI; s++) {
  const serit = document.createElement("div");
  serit.className = "strip";

  const ray = document.createElement("div");
  ray.className = "rail";

  // The same list is printed twice, for a seamless loop
  for (let tekrar = 0; tekrar < 2; tekrar++) {
    for (let j = 0; j < SERIT_UZUNLUGU; j++) {
      ray.appendChild(posterYap(s * SERIT_UZUNLUGU + j));
    }
  }

  serit.appendChild(ray);
  seritler.appendChild(serit);
}
