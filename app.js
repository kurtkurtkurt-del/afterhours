/* afterhours — poster vitrini (yer tutucu icerik) */

// 20 poster: 2 sutun x 10 sira. Metinler simdilik lorem ipsum.
const GOSTERILEN = POSTERS.slice(0, 20);

const izgara = document.getElementById("posters");
const bilgi = document.getElementById("info");
const yan = document.getElementById("yan");
const alanIndex = bilgi.querySelector(".info-index");
const alanTur = bilgi.querySelector(".info-type");
const alanBaslik = bilgi.querySelector(".info-title");
const alanMeta = bilgi.querySelector(".info-meta");
const alanMetin = bilgi.querySelector(".info-body");

// Iki poster arasindaki bosluktan gecerken yazi yanip sonmesin diye kisa gecikme
let gizleZamani;

GOSTERILEN.forEach((p, i) => {
  const no = String(i + 1).padStart(2, "0");

  // Cerceve: tiklanabilir, kendi event sayfasini yeni sekmede acar
  const kutu = document.createElement("a");
  kutu.className = "poster";
  kutu.href = "events/" + no + ".html";
  kutu.target = "_blank";
  kutu.rel = "noopener";

  // Gorsel: ayri bir SVG dosyasi olarak yuklenir (gomulu degil)
  const gorsel = document.createElement("object");
  gorsel.className = "poster-gorsel";
  gorsel.type = "image/svg+xml";
  gorsel.data = "posters/" + no + ".svg";
  kutu.appendChild(gorsel);
  kutu.addEventListener("mouseenter", () => {
    clearTimeout(gizleZamani);
    alanIndex.textContent = String(i + 1).padStart(2, "0") + " / " + GOSTERILEN.length;
    alanTur.textContent = p.tur;
    alanBaslik.textContent = p.baslik;
    alanMeta.textContent = p.meta;
    alanMetin.textContent = p.metin;
    yan.classList.add("poster-uzerinde");
  });

  // Posterin ustunden cikinca yazi kaybolur
  kutu.addEventListener("mouseleave", () => {
    gizleZamani = setTimeout(() => yan.classList.remove("poster-uzerinde"), 80);
  });
  izgara.appendChild(kutu);
});

/* ---------- Ekran gecisi ----------
   Posterlerin sonuna gelindikten sonra biraz daha asagi kaydirinca
   sonraki ekrana gecilir; yukari kaydirinca geri donulur.
   Ekran sayisi HTML'den okunur, yeni <section class="ekran"> eklemek yeterli. */

const ekranlar = document.getElementById("ekranlar");
const EKRAN_SAYISI = ekranlar.querySelectorAll(".ekran").length;
const ESIK = 240;        // gecis icin gereken fazladan kaydirma miktari (px)
let ekran = 0;
let birikim = 0;
let yon = 0;             // 1 asagi, -1 yukari
let gecisSuruyor = false;

function ekranaGec(hedef) {
  if (hedef === ekran || hedef < 0 || hedef >= EKRAN_SAYISI) return;
  ekran = hedef;
  birikim = 0;
  gecisSuruyor = true;
  ekranlar.style.setProperty("--ekran", String(hedef));
  document.body.dataset.ekran = String(hedef);
  setTimeout(() => { gecisSuruyor = false; }, 760);
}

window.addEventListener("wheel", (e) => {
  if (gecisSuruyor) return;

  const asagi = e.deltaY > 0;

  // Ilk ekranda tekerlek once poster sutununu kaydirir
  if (ekran === 0) {
    const hedef = e.target instanceof Node ? e.target : null;
    if (!hedef || !izgara.contains(hedef)) izgara.scrollTop += e.deltaY;

    const sonda = izgara.scrollTop + izgara.clientHeight >= izgara.scrollHeight - 2;
    if (!asagi || !sonda) {
      birikim = 0;
      return;
    }
  }

  // Yon degistiyse birikim sifirlanir
  if ((asagi ? 1 : -1) !== yon) {
    yon = asagi ? 1 : -1;
    birikim = 0;
  }

  birikim += Math.abs(e.deltaY);
  if (birikim >= ESIK) ekranaGec(ekran + (asagi ? 1 : -1));
}, { passive: true });

/* Dokunmatikte tekerlek olayi yok: ayni gecisi parmak surtmesiyle yap */
const DOKUNUS_ESIGI = 70;   // px
let dokunusY = null;
let dokunusKartta = false;
let dokunusSonda = false;

window.addEventListener("touchstart", (e) => {
  dokunusY = e.touches[0].clientY;
  const h = e.target;
  dokunusKartta = !!(h && h.closest && h.closest(".kart2"));
  dokunusSonda = izgara.scrollTop + izgara.clientHeight >= izgara.scrollHeight - 4;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  const baslangic = dokunusY;
  dokunusY = null;
  if (baslangic === null || dokunusKartta || gecisSuruyor) return;

  const fark = baslangic - e.changedTouches[0].clientY;   // yukari surtme pozitif
  if (Math.abs(fark) < DOKUNUS_ESIGI) return;

  const asagi = fark > 0;
  // Ilk ekranda ancak poster listesinin sonundayken ilerlenir
  if (ekran === 0 && (!asagi || !dokunusSonda)) return;

  ekranaGec(ekran + (asagi ? 1 : -1));
}, { passive: true });

/* ---------- Ikinci ekran: 2 kartlik deste ----------
   Saga cekince begenilir ve kaybolur. Yeterince cekilmezse yerine doner. */

const deste = document.getElementById("deste2");
const telefon = document.getElementById("telefon");
const sonMesaj = document.getElementById("son-mesaj");
const kaydirIpucu = document.getElementById("kaydir-ipucu");
const DESTE_POSTERLERI = ["01"];         // tek poster: A$AP Rocky
const CEKME_ESIGI = 120;                 // px

DESTE_POSTERLERI.slice().reverse().forEach((no) => {
  const kart = document.createElement("div");
  kart.className = "kart2";

  const gorsel = document.createElement("object");
  gorsel.type = "image/svg+xml";
  gorsel.data = "posters/" + no + ".svg";
  kart.appendChild(gorsel);

  let baslangicX = null;
  let dx = 0;

  kart.addEventListener("pointerdown", (e) => {
    // Sadece en ustteki kart surukleneblir
    if (kart !== deste.lastElementChild) return;
    baslangicX = e.clientX;
    dx = 0;
    try { kart.setPointerCapture(e.pointerId); } catch (_) {}
    kart.classList.add("suruklenirken");
    kart.classList.remove("yumusak");
  });

  kart.addEventListener("pointermove", (e) => {
    if (baslangicX === null) return;
    dx = e.clientX - baslangicX;
    kart.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 26) + "deg)";
  });

  function birak() {
    if (baslangicX === null) return;
    baslangicX = null;
    kart.classList.remove("suruklenirken");
    kart.classList.add("yumusak");

    if (dx > CEKME_ESIGI) {
      // Begenildi: sagdan ucup gider
      kart.style.transform = "translateX(120vw) rotate(18deg)";
      kart.style.opacity = "0";
      // Gecis bitince sil; gecis hic tetiklenmezse zaman asimi yedegi devreye girer
      let silindi = false;
      const sil = () => {
        if (silindi) return;
        silindi = true;
        kart.remove();
        // Deste bitti: telefon ekrani acilir
        if (!deste.querySelector(".kart2")) {
          kaydirIpucu.classList.add("gizli");
          telefon.classList.add("acik");
          // Telefon 1.6 sn durur, kaybolur, yerine kapanis yazisi gelir
          setTimeout(() => {
            telefon.classList.remove("acik");
            setTimeout(() => sonMesaj.classList.add("acik"), 300);
          }, 1600);
        }
      };
      kart.addEventListener("transitionend", sil, { once: true });
      setTimeout(sil, 400);
    } else {
      kart.style.transform = "";
    }
  }

  kart.addEventListener("pointerup", birak);
  kart.addEventListener("pointercancel", birak);

  deste.appendChild(kart);
});


/* ---------- Ses: dun geceden kisa kayitlar (3 sehir) ---------- */

const sesKaynak = document.getElementById("ses-kaynak");
const sesSatirlari = [...document.querySelectorAll(".ses-satir")];
let calanSatir = null;

function calmaDurdur() {
  sesSatirlari.forEach((s) => {
    s.classList.remove("caliyor");
    s.querySelector(".ses-cizgi span").style.width = "0%";
  });
}

sesSatirlari.forEach((satir) => {
  satir.querySelector(".ses-dugme").addEventListener("click", () => {
    if (calanSatir === satir && !sesKaynak.paused) {
      sesKaynak.pause();
      return;
    }
    if (calanSatir !== satir) {
      calmaDurdur();
      calanSatir = satir;
      sesKaynak.src = satir.dataset.kaynak;
    }
    sesKaynak.play();
  });
});

sesKaynak.addEventListener("play", () => {
  if (calanSatir) calanSatir.classList.add("caliyor");
});

sesKaynak.addEventListener("pause", () => {
  if (calanSatir) calanSatir.classList.remove("caliyor");
});

sesKaynak.addEventListener("timeupdate", () => {
  if (!calanSatir || !sesKaynak.duration) return;
  calanSatir.querySelector(".ses-cizgi span").style.width =
    (sesKaynak.currentTime / sesKaynak.duration) * 100 + "%";
});

sesKaynak.addEventListener("ended", calmaDurdur);
