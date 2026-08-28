/* afterhours — explore: saga/sola kaydirilan deste.
   Ustteki kart surukleniyor; esigi asinca ucup gidiyor ve altindaki
   one geliyor. Sagi begenmek, solu gecmek. */

(function () {
  const deste = document.getElementById("ex-deste");
  if (!deste) return;

  const ESIK = 120;              // px
  const GORUNEN = 3;             // ust uste duran kart sayisi
  let sira = 0;

  function kartYap(i) {
    const no = String(i + 1).padStart(2, "0");
    const kart = document.createElement("div");
    kart.className = "ex-kart";
    kart.dataset.no = String(i);

    const gorsel = document.createElement("object");
    gorsel.type = "image/svg+xml";
    gorsel.data = "../posters/" + no + ".svg";
    kart.appendChild(gorsel);

    let baslangicX = null, dx = 0;

    kart.addEventListener("pointerdown", (e) => {
      if (kart !== deste.lastElementChild) return;
      baslangicX = e.clientX;
      dx = 0;
      kart.classList.add("tutuluyor");
      kart.classList.remove("yumusak");
      try { kart.setPointerCapture(e.pointerId); } catch (_) {}
    });

    kart.addEventListener("pointermove", (e) => {
      if (baslangicX === null) return;
      dx = e.clientX - baslangicX;
      kart.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 24) + "deg)";
    });

    function birak() {
      if (baslangicX === null) return;
      baslangicX = null;
      kart.classList.remove("tutuluyor");
      kart.classList.add("yumusak");

      if (Math.abs(dx) > ESIK) {
        const yon = dx > 0 ? 1 : -1;
        kart.style.transform = "translateX(" + (yon * 120) + "vw) rotate(" + (yon * 22) + "deg)";
        kart.style.opacity = "0";
        let silindi = false;
        const sil = () => {
          if (silindi) return;
          silindi = true;
          kart.remove();
          doldur();
        };
        kart.addEventListener("transitionend", sil, { once: true });
        setTimeout(sil, 420);
      } else {
        kart.style.transform = "";
      }
    }

    kart.addEventListener("pointerup", birak);
    kart.addEventListener("pointercancel", birak);
    return kart;
  }

  /* Desteyi hep GORUNEN kart dolu tut: en arkaya ekleyip
     en ustteki (son cocuk) surukleniyor. */
  function doldur() {
    while (deste.children.length < GORUNEN && sira < POSTERS.length) {
      deste.insertBefore(kartYap(sira), deste.firstChild);
      sira++;
    }
    katmanla();
    document.getElementById("ex-bitti").classList.toggle("acik", deste.children.length === 0);
  }

  /* Arkadakiler biraz kucuk ve asagida dursun */
  function katmanla() {
    const n = deste.children.length;
    [...deste.children].forEach((k, i) => {
      const derinlik = n - 1 - i;          // 0 = en ustteki
      k.style.zIndex = String(i);
      if (derinlik > 0) {
        k.style.transform = "translateY(" + derinlik * 14 + "px) scale(" + (1 - derinlik * 0.045) + ")";
      }
    });
  }

  doldur();
})();
