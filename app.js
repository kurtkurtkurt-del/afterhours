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
  kutu.href = "explore/" + p.slug + "/";
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

  // Kart kaydirilmadan ikinci ekrandan ileri gecilemez; deste zipar
  if (ekran === 1 && hedef > ekran && deste.querySelector(".kart2")) {
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

// Kaydirmadan gecilmeye calisilinca kartin verdigi kucuk tepki
let ziplamaZamani;
function destiZiplat() {
  const kart = deste.querySelector(".kart2");
  if (!kart) return;
  kart.classList.remove("zipla");
  void kart.offsetWidth;               // animasyonu bastan baslat
  kart.classList.add("zipla");
  clearTimeout(ziplamaZamani);
  ziplamaZamani = setTimeout(() => kart.classList.remove("zipla"), 520);
}
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
          // Telefon 1.6 sn durur, kaybolur, yerine kapanis yazisi gelir.
          // Yazi 2 sn sonra yukari kayar ve telefon altinda geri gelir.
          setTimeout(() => {
            telefon.classList.remove("acik");
            setTimeout(() => {
              sonMesaj.classList.add("acik");
              setTimeout(() => {
                deste.classList.add("son-hal");
                telefon.classList.add("acik");
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


/* ---------- Ucuncu ekran: seritte akan afterhours kartlari ---------- */

const k3Ray = document.getElementById("k3-ray");

// Her gece bir cift: on yuz + arka yuz bitisik, sonra bosluk.
// Dizi iki kez basilir; SVG id'leri cakismasin diye sayac devam eder.
for (let tekrar = 0; tekrar < 2; tekrar++) {
  KARTLAR.gece.forEach((gece, i) => {
    const sira = tekrar * KARTLAR.gece.length + i;
    const cift = document.createElement("div");
    cift.className = "k3-cift";
    cift.innerHTML = KARTLAR.on(gece, sira) + KARTLAR.arka(gece, sira);
    k3Ray.appendChild(cift);
  });
}

/* ---------- Mekan saatleri ----------
   Footer'daki "kac oda acik" sayaci bunu kullanir. */

const MEKANLAR = [
  { ad: "OLYMPIAHALLE",      x: 512, y: 236, saat: 18.5, sure: 4 },
  { ad: "OLYMPIAPARK",       x: 556, y: 288, saat: 19.5, sure: 4 },
  { ad: "ZENITH",            x: 946, y: 196, saat: 25.0, sure: 5 },
  { ad: "TONHALLE",          x: 902, y: 236, saat: 22.0, sure: 6 },
  { ad: "SCHWABING",         x: 760, y: 300, saat: 21.0, sure: 4 },
  { ad: "MAXVORSTADT",       x: 664, y: 396, saat: 22.2, sure: 8 },
  { ad: "NEUHAUSEN",         x: 556, y: 430, saat: 21.5, sure: 5 },
  { ad: "P1",                x: 792, y: 404, saat: 23.0, sure: 6 },
  { ad: "PIMPERNEL",         x: 748, y: 444, saat: 22.0, sure: 6 },
  { ad: "MUSEUMSINSEL 1",    x: 828, y: 478, saat: 24.0, sure: 7 },
  { ad: "HAIDHAUSEN",        x: 892, y: 494, saat: 20.0, sure: 4 },
  { ad: "WESTEND",           x: 596, y: 552, saat: 19.0, sure: 3 },
  { ad: "MILLA",             x: 726, y: 556, saat: 22.0, sure: 5 },
  { ad: "GLOCKENBACH",       x: 764, y: 578, saat: 19.0, sure: 4 },
  { ad: "SCHLACHTHOF",       x: 704, y: 614, saat: 18.0, sure: 4 },
  { ad: "BAHNWÄRTER THIEL",  x: 668, y: 662, saat: 21.1, sure: 6 },
  { ad: "SUNNY RED",         x: 636, y: 690, saat: 22.6, sure: 6 },
  { ad: "ALTE UTTING",       x: 700, y: 706, saat: 18.5, sure: 4 },
  { ad: "GIESING",           x: 812, y: 682, saat: 20.0, sure: 4 },
  { ad: "RIEM",              x: 1128, y: 512, saat: 20.0, sure: 8 },
];

/* ---------- Altinci ekran: footer ----------
   Zemin her zaman siyah. Saat kullanicinin kendi saati; sayac o an
   acik olan mekanlardan hesaplanir. */

const k6Saat = document.getElementById("k6-saat");
const k6Sayac = document.getElementById("k6-sayac");

document.body.dataset.footerTon = "koyu";   // menu ve ses bari tersine doner

function k6Guncelle() {
  const simdi = new Date();
  const s = simdi.getHours();
  const d = simdi.getMinutes();

  k6Saat.textContent =
    String(s).padStart(2, "0") + ":" + String(d).padStart(2, "0") + " · münchen";

  // Su an acik olan mekanlar (gece saatleri 24'u asarak yazildi)
  const saat = s + d / 60;
  const acik = MEKANLAR.filter((m) => {
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
