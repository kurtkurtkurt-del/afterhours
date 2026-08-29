/* afterhours — explore: saga/sola kaydirilan deste.
   Ustteki kart surukleniyor; esigi asinca ucup gidiyor ve altindaki
   one geliyor. Sagi begenmek, solu gecmek. */

/* Filtre: select'in genisligi normalde EN UZUN secenege gore olusuyor,
   o yuzden ok isareti yazidan kopuk duruyordu. Secili metni olcup
   genisligi ona esitliyoruz. */
(function () {
  const secler = document.querySelectorAll(".ex-sec select");
  if (!secler.length) return;

  const olcer = document.createElement("span");
  olcer.style.cssText =
    "position:absolute;visibility:hidden;white-space:pre;top:0;left:0";
  document.body.appendChild(olcer);

  function boyutla(sec) {
    const stil = getComputedStyle(sec);
    olcer.style.font = stil.font;
    olcer.style.letterSpacing = stil.letterSpacing;
    olcer.textContent = sec.options[sec.selectedIndex].text;
    sec.style.width = Math.ceil(olcer.getBoundingClientRect().width) + 20 + "px";
  }

  function hepsi() { secler.forEach(boyutla); }

  secler.forEach((s) => s.addEventListener("change", () => boyutla(s)));
  hepsi();

  /* Webfont gec geldiginde ilk olcum yedek fontla yapiliyor ve
     genislik bir karakter eksik kaliyor. Font hazir diyene kadar
     tekrar olc; hazir olunca dongu kendiliginden biter. */
  /* Pane/pencere once dar acilirsa mobil font boyutuyla olculuyor;
     genislik degisince tekrar olc. */
  window.addEventListener("resize", hepsi);

  let deneme = 0;
  (function fontuBekle() {
    const hazir = document.fonts && document.fonts.check('400 15px "Inter Tight"');
    hepsi();
    if (!hazir && deneme++ < 20) setTimeout(fontuBekle, 150);
  })();
})();

(function () {
  const deste = document.getElementById("ex-deste");
  if (!deste) return;

  const ESIK = 120;              // px
  const GORUNEN = 3;             // ust uste duran kart sayisi
  let sira = 0;

  /* Destenin kaynagi. Soldaki tuslar bunu degistiriyor:
     global deck   → POSTERS (filtreli normal deste)
     friends liked → arkadaslarin saga attiklari
     i feel lucky  → ayni kartlar, karisik sirayla           */
  let KARTLAR = POSTERS;

  /* --- Saga atilanlar burada birikir --- */

  const tutulan = [];
  const kutu = document.querySelector(".ex-kutu");
  const kutuDugme = document.getElementById("ex-kutu-dugme");
  const kutuListe = document.getElementById("ex-kutu-liste");
  const kutuIcerik = document.getElementById("ex-kutu-icerik");
  const rozet = document.getElementById("ex-rozet");

  function tut(etkinlik) {
    if (tutulan.some((e) => e.slug === etkinlik.slug)) return;
    tutulan.push(etkinlik);
    if (!rozet) return;
    rozet.textContent = String(tutulan.length);
    rozet.hidden = false;
    if (kutu) kutu.classList.add("dolu");
    rozet.classList.remove("artti");
    void rozet.offsetWidth;          /* animasyonu bastan baslat */
    rozet.classList.add("artti");
    if (kutuListe && !kutuListe.hidden) kutuyuYaz();
  }

  function kutuyuYaz() {
    if (!kutuIcerik) return;
    kutuIcerik.textContent = "";
    if (!tutulan.length) {
      const p = document.createElement("p");
      p.className = "ex-kutu-bos";
      p.textContent = "nothing kept yet. swipe a card right to keep it.";
      kutuIcerik.appendChild(p);
      return;
    }
    /* En son tutulan ustte */
    tutulan.slice().reverse().forEach((e) => {
      const no = String(e.poster || KARTLAR.indexOf(e) + 1).padStart(2, "0");
      const yol = e.posterYolu || "../posters/" + no + ".svg";
      const a = document.createElement("a");
      a.className = "ex-kutu-satir";
      a.href = e.slug + "/index.html";
      const g = document.createElement("object");
      g.type = "image/svg+xml";
      g.data = yol;
      a.appendChild(g);
      const yazi = document.createElement("div");
      const ad = document.createElement("p");
      ad.className = "ex-kutu-ad";
      ad.textContent = e.baslik;
      const meta = document.createElement("p");
      meta.className = "ex-kutu-meta";
      meta.textContent = e.meta;
      yazi.appendChild(ad);
      yazi.appendChild(meta);
      a.appendChild(yazi);
      kutuIcerik.appendChild(a);
    });
  }

  function kutuyuAc(ac) {
    if (!kutuListe || !kutuDugme) return;
    if (ac) kutuyuYaz();
    kutuListe.hidden = !ac;
    kutuDugme.setAttribute("aria-expanded", String(ac));
  }

  if (kutuDugme) {
    kutuDugme.addEventListener("click", (e) => {
      e.stopPropagation();
      kutuyuAc(kutuListe.hidden);
    });
    /* Disariya tiklayinca ve Esc ile kapansin */
    document.addEventListener("click", (e) => {
      if (!kutuListe || kutuListe.hidden) return;
      if (!kutu.contains(e.target)) kutuyuAc(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") kutuyuAc(false);
    });
  }

  /* Karti verilen yone ucur ve desteden dus. Hem surukleme
     hem klavye bunu kullanir. */
  function ucur(kart, yon) {
    if (kart.dataset.uctu) return;
    kart.dataset.uctu = "1";
    const atilan = KARTLAR[Number(kart.dataset.no)];
    if (yon > 0) tut(atilan);
    /* Her iki yon de kaydediliyor: sag biriktirmek, sol "bir daha gosterme".
       Girisliyken veritabanina, degilse tarayiciya. */
    if (window.AH && AH.atisKaydet) AH.atisKaydet(atilan, yon);
    kart.classList.remove("tutuluyor");
    kart.classList.add("yumusak");
    kart.style.transform = "translateX(" + (yon * 120) + "vw) rotate(" + (yon * 22) + "deg)";
    kart.style.opacity = "0";

    /* transitionend tek basina yetmiyor: kesintiye ugrayan gecislerde
       hic gelmiyor, bu yuzden zamanlayici yedegi var. */
    let silindi = false;
    const sil = () => {
      if (silindi) return;
      silindi = true;
      kart.remove();
      doldur();
    };
    kart.addEventListener("transitionend", sil, { once: true });
    setTimeout(sil, 420);
  }

  /* Sol/sag ok tuslari da karti atar. Filtredeyken oklar
     secenek degistirmeli, o yuzden form ogelerinde karisma. */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const hedef = e.target;
    if (hedef && hedef.closest && hedef.closest("select, input, textarea, [contenteditable]")) return;
    const ust = deste.lastElementChild;
    if (!ust) return;
    e.preventDefault();
    ucur(ust, e.key === "ArrowRight" ? 1 : -1);
  });

  function kartYap(i) {
    /* Poster numarasi kaydin kendisinden geliyor; veritabani eksik bir
       liste dondurdugunde posterler kaymasin diye siraya guvenmiyoruz. */
    const no = String(KARTLAR[i].poster || i + 1).padStart(2, "0");
    const yol = KARTLAR[i].posterYolu || "../posters/" + no + ".svg";
    const kart = document.createElement("div");
    kart.className = "ex-kart";
    kart.dataset.no = String(i);

    const gorsel = document.createElement("object");
    gorsel.type = "image/svg+xml";
    gorsel.data = yol;
    kart.appendChild(gorsel);

    /* Posterin altindaki bilgi seridi: tur + mekan/tarih.
       Veri events-data.js'ten, poster ile hic celismesin diye. */
    const veri = KARTLAR[i];
    const bilgi = document.createElement("div");
    bilgi.className = "ex-bilgi";
    const tur = document.createElement("p");
    tur.className = "ex-tur";
    tur.textContent = veri.tur;
    const meta = document.createElement("p");
    meta.className = "ex-meta";
    meta.textContent = veri.meta;
    bilgi.appendChild(tur);
    bilgi.appendChild(meta);
    kart.appendChild(bilgi);

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
        ucur(kart, dx > 0 ? 1 : -1);
      } else {
        kart.style.transform = "";
      }
    }

    kart.addEventListener("pointerup", birak);
    kart.addEventListener("pointercancel", birak);
    return kart;
  }

  /* --- Ustteki kartin yorumlari --- */

  const yorumAlani = document.getElementById("ex-yorum-liste");

  /* Basliga basinca yorum alani acilip kapanir; kapaninca
     sutun daralir ve deste ortaya dogru genisler. */
  const yorumDugme = document.getElementById("ex-yorum-dugme");
  const alan = document.querySelector(".ex-alan");
  if (yorumDugme && alan) {
    yorumDugme.addEventListener("click", () => {
      const kapali = alan.classList.toggle("yorum-kapali");
      yorumDugme.setAttribute("aria-expanded", String(!kapali));
    });
  }

  function satir(sinif, metin) {
    const e = document.createElement("p");
    e.className = sinif;
    e.textContent = metin;
    return e;
  }

  function konuYap(konu) {
    const k = document.createElement("div");
    k.className = "y-konu";
    const ust = document.createElement("div");
    ust.className = "y-ust";
    ust.appendChild(satir("y-kim", konu.kim));
    ust.appendChild(satir("y-zaman", konu.zaman));
    k.appendChild(ust);
    k.appendChild(satir("y-metin", konu.metin));

    if (konu.cevaplar && konu.cevaplar.length) {
      const c = document.createElement("div");
      c.className = "y-cevaplar";
      konu.cevaplar.forEach((cev) => {
        const kutu = document.createElement("div");
        kutu.className = "y-cevap";
        const u = document.createElement("div");
        u.className = "y-ust";
        u.appendChild(satir("y-kim", cev.kim));
        u.appendChild(satir("y-zaman", cev.zaman));
        kutu.appendChild(u);
        kutu.appendChild(satir("y-metin", cev.metin));
        c.appendChild(kutu);
      });
      k.appendChild(c);
    }
    return k;
  }

  function grupYap(baslik, konular, eski) {
    const g = document.createElement("div");
    g.className = "y-grup" + (eski ? " eski" : "");
    g.appendChild(satir("y-grup-baslik", baslik));
    konular.forEach((konu) => g.appendChild(konuYap(konu)));
    return g;
  }

  /* Yorum yazma kutusu. Backend kapaliyken hic gorunmez (yazacak yer
     yok); acikken ama girissizken tek satirlik bir davet. */
  function yazmaAlani(etkinlik) {
    const sarmal = document.createElement("div");
    sarmal.className = "y-yaz";
    if (!(window.AH && AH.yorumBackendAcik && AH.yorumBackendAcik())) return sarmal;

    if (!AH.yorumYazilabilir()) {
      const d = document.createElement("a");
      d.className = "y-yaz-davet";
      d.href = "../login/index.html";
      d.textContent = "sign in to say something";
      sarmal.appendChild(d);
      return sarmal;
    }

    const kutu = document.createElement("textarea");
    kutu.className = "y-yaz-alan";
    kutu.rows = 2;
    kutu.placeholder = "say something about this night";

    const dugme = document.createElement("button");
    dugme.className = "y-yaz-dugme";
    dugme.type = "button";
    dugme.textContent = "post";

    const durum = document.createElement("p");
    durum.className = "y-yaz-durum";

    dugme.addEventListener("click", () => {
      const metin = kutu.value.trim();
      if (!metin) { kutu.focus(); return; }
      dugme.disabled = true;
      durum.textContent = "posting…";
      AH.yorumYaz(etkinlik, metin)
        .then(() => { kutu.value = ""; durum.textContent = ""; yorumlariBas(); })
        .catch((h) => { durum.textContent = "couldn't post: " + h.message; })
        .finally(() => { dugme.disabled = false; });
    });

    sarmal.appendChild(kutu);
    sarmal.appendChild(dugme);
    sarmal.appendChild(durum);
    return sarmal;
  }

  function yorumlariBas() {
    if (!yorumAlani) return;
    const ust = deste.lastElementChild;

    /* Yorumlar canliyken veritabanindan, degilse yorumlar.js'ten gelir;
       ikisi de ayni bicimi dondurur, ekran ayni kalir. */
    const kaynak = (etkinlik) =>
      window.AH && AH.yorumlariGetir
        ? AH.yorumlariGetir(etkinlik)
        : Promise.resolve(YORUMLARI_GETIR(etkinlik));

    const doldurYorum = () => {
      if (!ust) {
        yorumAlani.textContent = "";
        yorumAlani.appendChild(satir("y-yok", "nothing left to talk about tonight."));
        yorumAlani.scrollTop = 0;
        yorumAlani.classList.remove("solgun");
        return;
      }

      const etkinlik = KARTLAR[Number(ust.dataset.no)];
      kaynak(etkinlik).then(({ eski, yeni }) => {
        /* Bu arada baska bir kart ustte olabilir; gec gelen cevabi basma */
        if (deste.lastElementChild !== ust) return;
        yorumAlani.textContent = "";
        yorumAlani.appendChild(yazmaAlani(etkinlik));
        if (yeni.length) yorumAlani.appendChild(grupYap("this week", yeni, false));
        if (eski.length) yorumAlani.appendChild(grupYap("from earlier nights", eski, true));
        if (!yeni.length && !eski.length) {
          yorumAlani.appendChild(satir("y-yok", "nobody has said anything yet."));
        }
        yorumAlani.scrollTop = 0;
        yorumAlani.classList.remove("solgun");
      });
    };

    /* Kart degisince yazi da degissin: once soner, sonra yenisi gelir */
    if (yorumAlani.children.length) {
      yorumAlani.classList.add("solgun");
      setTimeout(doldurYorum, 200);
    } else {
      doldurYorum();
    }
  }

  /* Desteyi hep GORUNEN kart dolu tut: en arkaya ekleyip
     en ustteki (son cocuk) surukleniyor. */
  /* Daha once atilmis kartlar bir daha gelmesin. Girisliyken bu eleme
     zaten veritabaninda yapiliyor (deck fonksiyonu), burasi girissiz
     gezenler icin. */
  const atlanacak = new Set(
    window.AH && AH.atilanlar ? AH.atilanlar() : []
  );

  function doldur() {
    while (deste.children.length < GORUNEN && sira < KARTLAR.length) {
      if (atlanacak.has(KARTLAR[sira].slug)) { sira++; continue; }
      deste.insertBefore(kartYap(sira), deste.firstChild);
      sira++;
    }
    katmanla();
    document.getElementById("ex-bitti").classList.toggle("acik", deste.children.length === 0);
    yorumlariBas();
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

  /* --- Soldaki tuslar: desteyi yeniden dagit --- */

  /* Ayni kartlar, bastan. Kartlar soldan ucup gelir ve
     ust uste dusler; en ustteki en son iner. */
  const BOS_MESAJ = {
    "global deck": "that's everyone for tonight.",
    "friends liked swipes": "no friends have kept anything yet.",
    "i feel lucky": "that's everyone for tonight.",
  };

  /* Modun kart kaynagini getir. Hepsi ayni bicimde kayit dondurur. */
  function kaynakGetir(mod) {
    if (mod === "friends liked swipes") {
      return window.AH && AH.arkadasBegenileri
        ? AH.arkadasBegenileri()
        : Promise.resolve([]);
    }
    if (mod === "i feel lucky") {
      const k = POSTERS.slice();
      for (let i = k.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [k[i], k[j]] = [k[j], k[i]];
      }
      return Promise.resolve(k);
    }
    return Promise.resolve(POSTERS);
  }

  function yenidenDagit(mod) {
    const bitti = document.getElementById("ex-bitti");
    if (bitti && mod) bitti.textContent = BOS_MESAJ[mod] || BOS_MESAJ["global deck"];

    return kaynakGetir(mod || "global deck").then((liste) => {
      KARTLAR = liste.length ? liste : [];
      dagitmayaBasla();
    });
  }

  function dagitmayaBasla() {
    while (deste.firstChild) deste.removeChild(deste.firstChild);
    sira = 0;
    doldur();                       /* son hallerini katmanla() kurar */

    const kartlar = [...deste.children];
    kartlar.forEach((k) => {
      k.dataset.sonHal = k.style.transform || "";
      k.classList.remove("yumusak");
      k.style.transition = "none";
      k.style.transform = "translate(-46vw, -7vh) rotate(-17deg)";
      k.style.opacity = "0";
    });

    void deste.offsetWidth;         /* baslangic hali yazilsin */

    kartlar.forEach((k, i) => {
      const gecikme = i * 95;       /* DOM'da son cocuk en ustteki kart */
      k.style.transition =
        "transform 0.52s cubic-bezier(0.2, 0.75, 0.25, 1) " + gecikme + "ms, " +
        "opacity 0.3s ease " + gecikme + "ms";
      k.style.transform = k.dataset.sonHal;
      k.style.opacity = "1";
    });

    /* Gecis yarida kalirsa kartlar gorunmez kalmasin: sure
       dolunca son hali elle yaz. Elde tutulan karta dokunma. */
    setTimeout(() => {
      kartlar.forEach((k) => {
        if (!k.isConnected || k.classList.contains("tutuluyor")) return;
        k.style.transition = "";
        k.style.transform = k.dataset.sonHal;
        k.style.opacity = "1";
      });
    }, 95 * kartlar.length + 600);
  }

  document.querySelectorAll(".ex-mod").forEach((dugme) => {
    dugme.addEventListener("click", () => {
      document.querySelectorAll(".ex-mod").forEach((d) => {
        d.classList.toggle("secili", d === dugme);
        if (d === dugme) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      yenidenDagit(dugme.textContent.trim());
    });
  });

  /* Onceki oturumdan biriktirilenler geri gelsin (rozet ve liste). */
  if (window.AH && AH.biriktirilenler) {
    AH.biriktirilenler().then((liste) => {
      liste.slice().reverse().forEach(tut);
    });
  }

  doldur();
})();
