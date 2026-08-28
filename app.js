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

/* ---------- Dorduncu ekran: cizilmis Munih + gecenin saati ----------
   Harita iki kez cizilir: arkada soluk sehir, telefonun penceresinde net
   hali. Ikisi de bolume gore ayni yerde durur; ondeki kopya pencerenin
   olculerine gore kirpilir. Saat 18:00'den 06:00'a doner, mekanlar
   kendi saatleri gelince yanar. */

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

const SEMTLER = [
  ["SCHWABING", 742, 268], ["MAXVORSTADT", 596, 372], ["NEUHAUSEN", 470, 412],
  ["HAIDHAUSEN", 920, 462], ["GIESING", 838, 712], ["SENDLING", 620, 636],
  ["WESTEND", 528, 566], ["OLYMPIAPARK", 470, 262], ["RIEM", 1150, 480],
];

function haritaCiz() {
  const yollar = `
    <g fill="none" stroke="#000" stroke-width="1.6" opacity="0.5">
      <path d="M760 214 C 986 214, 1104 336, 1104 470
               C 1104 610, 962 730, 760 730
               C 560 730, 418 610, 418 470
               C 418 336, 536 214, 760 214 Z"/>
    </g>
    <g fill="none" stroke="#000" stroke-width="1.2" opacity="0.42">
      <ellipse cx="770" cy="462" rx="86" ry="70"/>
    </g>
    <g fill="none" stroke="#000" stroke-width="1" opacity="0.3">
      <path d="M770 462 L770 120"/><path d="M770 462 L1180 300"/>
      <path d="M770 462 L1240 520"/><path d="M770 462 L1040 800"/>
      <path d="M770 462 L640 860"/><path d="M770 462 L300 640"/>
      <path d="M770 462 L250 380"/><path d="M770 462 L470 140"/>
    </g>
    <g fill="none" stroke="#000" stroke-width="1.6" opacity="0.34" stroke-dasharray="9 7">
      <path d="M330 462 L1230 462"/>
    </g>`;

  const isar = `
    <path d="M900 40 C 862 180, 826 268, 838 372
             C 848 466, 806 520, 800 606
             C 795 690, 826 782, 812 900"
          fill="none" stroke="#000" stroke-width="7" opacity="0.32" stroke-linecap="round"/>`;

  const etiketler = SEMTLER.map(([ad, x, y]) =>
    `<text x="${x}" y="${y}" font-family="JetBrains Mono, monospace" font-size="11"
           letter-spacing="2.4" fill="#000" opacity="0.42">${ad}</text>`).join("");

  const noktalar = MEKANLAR.map((m, i) =>
    `<g class="k4-nokta" data-no="${i}">
       <circle class="k4-halka" cx="${m.x}" cy="${m.y}" r="13" fill="none"
               stroke="#000" stroke-width="1.4" opacity="0"/>
       <circle class="k4-cekirdek" cx="${m.x}" cy="${m.y}" r="3.5" fill="#000" opacity="0.22"/>
     </g>`).join("");

  return `<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
    ${yollar}${isar}${etiketler}${noktalar}
  </svg>`;
}

const k4Arka = document.getElementById("k4-arka");
const k4On = document.getElementById("k4-on");
const k4Pencere = document.getElementById("t4-pencere");
const k4Saat = document.getElementById("t4-saat");
const ekran4 = document.querySelector(".ekran4");

k4Arka.innerHTML = haritaCiz();
k4On.innerHTML = haritaCiz();

// Ondeki kopyayi telefonun penceresine kirp
function k4Kirp() {
  const p = k4Pencere.getBoundingClientRect();
  const b = ekran4.getBoundingClientRect();
  k4On.style.clipPath =
    "inset(" + (p.top - b.top) + "px " + (b.right - p.right) + "px " +
    (b.bottom - p.bottom) + "px " + (p.left - b.left) + "px)";
}
k4Kirp();
window.addEventListener("resize", k4Kirp);

// Gece saati: 18:00 -> 06:00, 24 saniyede bir tur
const K4_BASLANGIC = 18;
const K4_UZUNLUK = 12;      // saat
const K4_TUR = 24000;       // ms

const k4Gruplar = [k4Arka, k4On].map((k) => [...k.querySelectorAll(".k4-nokta")]);

function k4Guncelle() {
  const oran = (Date.now() % K4_TUR) / K4_TUR;
  const saat = K4_BASLANGIC + oran * K4_UZUNLUK;

  const s = Math.floor(saat) % 24;
  const d = Math.floor((saat % 1) * 60);
  k4Saat.textContent =
    String(s).padStart(2, "0") + ":" + String(d).padStart(2, "0");

  MEKANLAR.forEach((m, i) => {
    const acik = saat >= m.saat;
    const bitti = saat >= m.saat + m.sure;
    const yeni = acik && !bitti;
    k4Gruplar.forEach((grup) => {
      const g = grup[i];
      g.querySelector(".k4-cekirdek").setAttribute("r", yeni ? 6 : 3.5);
      g.querySelector(".k4-cekirdek").setAttribute("opacity", yeni ? 1 : (bitti ? 0.3 : 0.18));
      g.querySelector(".k4-halka").setAttribute("opacity", yeni ? 0.45 : 0);
    });
  });
}

k4Guncelle();
setInterval(k4Guncelle, 60);
