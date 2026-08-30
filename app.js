/* afterhours — poster vitrini (yer tutucu icerik) */

// 20 poster: 2 sutun x 10 sira. Metinler simdilik lorem ipsum.
const GOSTERILEN = POSTERS.slice(0, 20);

const izgara = document.getElementById("posters");
const bilgi = document.getElementById("info");
const yan = document.getElementById("side");
const alanIndex = bilgi.querySelector(".info-index");
const alanTur = bilgi.querySelector(".info-type");
const alanBaslik = bilgi.querySelector(".info-title");
const alanMeta = bilgi.querySelector(".info-meta");
const alanMetin = bilgi.querySelector(".info-body");

// Iki poster arasindaki bosluktan gecerken yazi yanip sonmesin diye kisa gecikme
let gizleZamani;

GOSTERILEN.forEach((p, i) => {
  // Poster numarasi kaydin kendisinde; siraya bagli degil
  const no = String(p.poster || i + 1).padStart(2, "0");

  // Cerceve: tiklanabilir, kendi event sayfasini yeni sekmede acar
  const kutu = document.createElement("a");
  kutu.className = "poster";
  kutu.href = "explore/" + p.slug + "/index.html";
  kutu.target = "_blank";
  kutu.rel = "noopener";

  // Gorsel: ayri bir SVG dosyasi olarak yuklenir (gomulu degil)
  const gorsel = document.createElement("object");
  gorsel.className = "poster-image";
  gorsel.type = "image/svg+xml";
  gorsel.data = p.posterPath || "posters/" + no + ".svg";
  kutu.appendChild(gorsel);
  kutu.addEventListener("mouseenter", () => {
    clearTimeout(gizleZamani);
    alanIndex.textContent = String(i + 1).padStart(2, "0") + " / " + GOSTERILEN.length;
    alanTur.textContent = p.kind;
    alanBaslik.textContent = p.title;
    alanMeta.textContent = p.meta;
    alanMetin.textContent = p.body;
    yan.classList.add("poster-hover");
  });

  // Posterin ustunden cikinca yazi kaybolur
  kutu.addEventListener("mouseleave", () => {
    gizleZamani = setTimeout(() => yan.classList.remove("poster-hover"), 80);
  });
  izgara.appendChild(kutu);
});

/* ---------- Ekran gecisi ----------
   Posterlerin sonuna gelindikten sonra biraz daha asagi kaydirinca
   sonraki ekrana gecilir; yukari kaydirinca geri donulur.
   Ekran sayisi HTML'den okunur, yeni <section class="screen"> eklemek yeterli. */

const ekranlar = document.getElementById("screens");
const EKRAN_SAYISI = ekranlar.querySelectorAll(".screen").length;
const ESIK = 240;        // gecis icin gereken fazladan kaydirma miktari (px)
let ekran = 0;
let birikim = 0;
let yon = 0;             // 1 asagi, -1 yukari
let gecisSuruyor = false;

function ekranaGec(hedef) {
  if (hedef === ekran || hedef < 0 || hedef >= EKRAN_SAYISI) return;

  // Kart kaydirilmadan ikinci ekrandan ileri gecilemez; deste zipar
  if (ekran === 1 && hedef > ekran && deste.querySelector(".card2")) {
    destiZiplat();
    return;
  }
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
  dokunusKartta = !!(h && h.closest && h.closest(".card2"));
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

const deste = document.getElementById("deck2");
const telefon = document.getElementById("phone");
const sonMesaj = document.getElementById("last-line");
const kaydirIpucu = document.getElementById("swipe-hint");

// Kaydirmadan gecilmeye calisilinca kartin verdigi kucuk tepki
let ziplamaZamani;
function destiZiplat() {
  const kart = deste.querySelector(".card2");
  if (!kart) return;
  kart.classList.remove("jump");
  void kart.offsetWidth;               // animasyonu bastan baslat
  kart.classList.add("jump");
  clearTimeout(ziplamaZamani);
  ziplamaZamani = setTimeout(() => kart.classList.remove("jump"), 520);
}
const DESTE_POSTERLERI = ["01"];         // tek poster: A$AP Rocky
const CEKME_ESIGI = 120;                 // px

DESTE_POSTERLERI.slice().reverse().forEach((no) => {
  const kart = document.createElement("div");
  kart.className = "card2";

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
    kart.classList.add("dragging");
    kart.classList.remove("soft");
  });

  kart.addEventListener("pointermove", (e) => {
    if (baslangicX === null) return;
    dx = e.clientX - baslangicX;
    kart.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 26) + "deg)";
  });

  function birak() {
    if (baslangicX === null) return;
    baslangicX = null;
    kart.classList.remove("dragging");
    kart.classList.add("soft");

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
        if (!deste.querySelector(".card2")) {
          kaydirIpucu.classList.add("hidden");
          telefon.classList.add("open");
          // Telefon 1.6 sn durur, kaybolur, yerine kapanis yazisi gelir.
          // Yazi 2 sn sonra yukari kayar ve telefon altinda geri gelir.
          setTimeout(() => {
            telefon.classList.remove("open");
            setTimeout(() => {
              sonMesaj.classList.add("open");
              setTimeout(() => {
                deste.classList.add("last-state");
                telefon.classList.add("open");
              }, 2000);
            }, 300);
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

const sesKaynak = document.getElementById("sound-source");
const sesSatirlari = [...document.querySelectorAll(".sound-row")];
let calanSatir = null;

function calmaDurdur() {
  sesSatirlari.forEach((s) => {
    s.classList.remove("playing");
    s.querySelector(".sound-line span").style.width = "0%";
  });
}

sesSatirlari.forEach((satir) => {
  satir.querySelector(".sound-button").addEventListener("click", () => {
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
  if (calanSatir) calanSatir.classList.add("playing");
});

sesKaynak.addEventListener("pause", () => {
  if (calanSatir) calanSatir.classList.remove("playing");
});

sesKaynak.addEventListener("timeupdate", () => {
  if (!calanSatir || !sesKaynak.duration) return;
  calanSatir.querySelector(".sound-line span").style.width =
    (sesKaynak.currentTime / sesKaynak.duration) * 100 + "%";
});

sesKaynak.addEventListener("ended", calmaDurdur);


/* ---------- Ucuncu ekran: seritte akan afterhours kartlari ---------- */

const k3Ray = document.getElementById("s3-rail");

// Her gece bir cift: on yuz + arka yuz bitisik, sonra bosluk.
// Dizi iki kez basilir; SVG id'leri cakismasin diye sayac devam eder.
for (let tekrar = 0; tekrar < 2; tekrar++) {
  CARDS.gece.forEach((gece, i) => {
    const sira = tekrar * CARDS.gece.length + i;
    const cift = document.createElement("div");
    cift.className = "s3-pair";
    cift.innerHTML = CARDS.on(gece, sira) + CARDS.arka(gece, sira);
    k3Ray.appendChild(cift);
  });
}

/* VENUES venues.js'te — hem ana sayfa hem maps kullaniyor */


/* ---------- Altinci ekran: footer ----------
   Zemin her zaman siyah. Saat kullanicinin kendi saati; sayac o an
   acik olan mekanlardan hesaplanir. */

const k6Saat = document.getElementById("s6-clock");
const k6Sayac = document.getElementById("s6-counter");

document.body.dataset.footerTon = "koyu";   // menu ve ses bari tersine doner

function k6Guncelle() {
  const simdi = new Date();
  const s = simdi.getHours();
  const d = simdi.getMinutes();

  k6Saat.textContent =
    String(s).padStart(2, "0") + ":" + String(d).padStart(2, "0") + " · münchen";

  // Su an acik olan mekanlar (gece saatleri 24'u asarak yazildi)
  const saat = s + d / 60;
  const acik = VENUES.filter((m) => {
    const bas = m.saat;
    const son = m.saat + m.sure;
    return (saat >= bas && saat < son) || (saat + 24 >= bas && saat + 24 < son);
  }).length;

  k6Sayac.textContent = acik
    ? acik + (acik === 1 ? " room open in münchen right now" : " rooms open in münchen right now")
    : "no rooms open yet — come back after dark";
}

k6Guncelle();
setInterval(k6Guncelle, 20000);
