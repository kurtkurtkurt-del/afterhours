/* afterhours — sketch 02: strips scrolling sideways */

const strips = document.getElementById("strips");
const info = document.getElementById("info");
const yan = document.getElementById("side");
const fieldIndex = info.querySelector(".info-index");
const fieldKind = info.querySelector(".info-type");
const fieldTitle = info.querySelector(".info-title");
const fieldMeta = info.querySelector(".info-meta");
const fieldBody = info.querySelector(".info-body");

let hideTimer;

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

  const image = document.createElement("object");
  image.className = "poster-image";
  image.type = "image/svg+xml";
  image.data = "posters/" + no + ".svg";
  box.appendChild(image);

  box.addEventListener("mouseenter", () => {
    clearTimeout(hideTimer);
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
    const strip = box.closest(".strip");
    box.classList.remove("big");
    hideTimer = setTimeout(() => {
      strip.classList.remove("stopped");
      yan.classList.remove("poster-hover");
    }, 80);
  });

  return box;
}

for (let s = 0; s < SERIT_SAYISI; s++) {
  const strip = document.createElement("div");
  strip.className = "strip";

  const ray = document.createElement("div");
  ray.className = "rail";

  // The same list is printed twice, for a seamless loop
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < SERIT_UZUNLUGU; j++) {
      ray.appendChild(posterYap(s * SERIT_UZUNLUGU + j));
    }
  }

  strip.appendChild(ray);
  strips.appendChild(strip);
}
