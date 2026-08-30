/* afterhours — explore: saga/sola kaydirilan deste.
   Ustteki kart surukleniyor; esigi asinca ucup gidiyor ve altindaki
   one geliyor. Sagi begenmek, solu gecmek. */

(function () {
  const deste = document.getElementById("ex-deck");
  if (!deste) return;

  const ESIK = 120;              // px
  const GORUNEN = 3;             // ust uste duran kart sayisi
  let sira = 0;

  /* Destenin kaynagi. Soldaki tuslar bunu degistiriyor:
     global deck   → POSTERS (filtreli normal deste)
     friends liked → arkadaslarin saga attiklari
     i feel lucky  → ayni kartlar, karisik sirayla           */
  let CARDS = POSTERS;

  /* --- Saga swipedSlugs burada birikir --- */

  const tutulan = [];
  const kutu = document.querySelector(".ex-box");
  const kutuDugme = document.getElementById("ex-box-button");
  const kutuListe = document.getElementById("ex-box-list");
  const kutuIcerik = document.getElementById("ex-box-body");
  const rozet = document.getElementById("ex-badge");

  function tut(etkinlik) {
    if (tutulan.some((e) => e.slug === etkinlik.slug)) return;
    tutulan.push(etkinlik);
    if (!rozet) return;
    rozet.textContent = String(tutulan.length);
    rozet.hidden = false;
    if (kutu) kutu.classList.add("taken");
    rozet.classList.remove("up");
    void rozet.offsetWidth;          /* animasyonu bastan baslat */
    rozet.classList.add("up");
    if (kutuListe && !kutuListe.hidden) kutuyuYaz();
  }

  function kutuyuYaz() {
    if (!kutuIcerik) return;
    kutuIcerik.textContent = "";
    if (!tutulan.length) {
      const p = document.createElement("p");
      p.className = "ex-box-empty";
      p.textContent = "nothing kept yet. swipe a card right to keep it.";
      kutuIcerik.appendChild(p);
      return;
    }
    /* En son tutulan ustte */
    tutulan.slice().reverse().forEach((e) => {
      const no = String(e.poster || CARDS.indexOf(e) + 1).padStart(2, "0");
      const yol = e.posterPath || "../posters/" + no + ".svg";
      const a = document.createElement("a");
      a.className = "ex-box-row";
      a.href = e.slug + "/index.html";
      const g = document.createElement("object");
      g.type = "image/svg+xml";
      g.data = yol;
      a.appendChild(g);
      const yazi = document.createElement("div");
      const ad = document.createElement("p");
      ad.className = "ex-box-name";
      ad.textContent = e.title;
      const meta = document.createElement("p");
      meta.className = "ex-box-meta";
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
    const atilan = CARDS[Number(kart.dataset.no)];
    if (yon > 0) tut(atilan);
    /* Her iki yon de kaydediliyor: sag biriktirmek, sol "bir daha gosterme".
       Girisliyken veritabanina, degilse tarayiciya. */
    if (window.AH && AH.saveSwipe) AH.saveSwipe(atilan, yon);
    kart.classList.remove("held");
    kart.classList.add("soft");
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
    const no = String(CARDS[i].poster || i + 1).padStart(2, "0");
    const yol = CARDS[i].posterPath || "../posters/" + no + ".svg";
    const kart = document.createElement("div");
    kart.className = "ex-card";
    kart.dataset.no = String(i);

    const gorsel = document.createElement("object");
    gorsel.type = "image/svg+xml";
    gorsel.data = yol;
    kart.appendChild(gorsel);

    /* Posterin altindaki bilgi seridi: tur + mekan/tarih.
       Veri events-data.js'ten, poster ile hic celismesin diye. */
    const veri = CARDS[i];
    const bilgi = document.createElement("div");
    bilgi.className = "ex-info";
    const tur = document.createElement("p");
    tur.className = "ex-kind";
    tur.textContent = veri.kind;
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
      kart.classList.add("held");
      kart.classList.remove("soft");
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
      kart.classList.remove("held");
      kart.classList.add("soft");

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

  const yorumAlani = document.getElementById("ex-comment-list");

  /* Basliga basinca yorum alani acilip kapanir; kapaninca
     sutun daralir ve deste ortaya dogru genisler. */
  const yorumDugme = document.getElementById("ex-comment-button");
  const alan = document.querySelector(".ex-field");
  if (yorumDugme && alan) {
    yorumDugme.addEventListener("click", () => {
      const kapali = alan.classList.toggle("comment-closed");
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
    k.className = "c-topic";
    const ust = document.createElement("div");
    ust.className = "c-top";
    ust.appendChild(satir("c-who", konu.who));
    ust.appendChild(satir("c-when", konu.when));
    k.appendChild(ust);
    k.appendChild(satir("c-text", konu.body));

    if (konu.replies && konu.replies.length) {
      const c = document.createElement("div");
      c.className = "c-replies";
      konu.replies.forEach((cev) => {
        const kutu = document.createElement("div");
        kutu.className = "c-reply";
        const u = document.createElement("div");
        u.className = "c-top";
        u.appendChild(satir("c-who", cev.who));
        u.appendChild(satir("c-when", cev.when));
        kutu.appendChild(u);
        kutu.appendChild(satir("c-text", cev.body));
        c.appendChild(kutu);
      });
      k.appendChild(c);
    }
    return k;
  }

  function grupYap(baslik, konular, eski) {
    const g = document.createElement("div");
    g.className = "c-group" + (eski ? " old" : "");
    g.appendChild(satir("c-group-title", baslik));
    konular.forEach((konu) => g.appendChild(konuYap(konu)));
    return g;
  }

  /* Yorum yazma kutusu. Backend kapaliyken hic gorunmez (yazacak yer
     yok); acikken ama girissizken tek satirlik bir davet. */
  function yazmaAlani(etkinlik) {
    const sarmal = document.createElement("div");
    sarmal.className = "c-write";
    if (!(window.AH && AH.commentsLive && AH.commentsLive())) return sarmal;

    if (!AH.canComment()) {
      const d = document.createElement("a");
      d.className = "c-write-invite";
      d.href = "../login/index.html";
      d.textContent = "sign in to say something";
      sarmal.appendChild(d);
      return sarmal;
    }

    const kutu = document.createElement("textarea");
    kutu.className = "c-write-field";
    kutu.rows = 2;
    kutu.placeholder = "say something about this night";

    const dugme = document.createElement("button");
    dugme.className = "c-write-button";
    dugme.type = "button";
    dugme.textContent = "post";

    const durum = document.createElement("p");
    durum.className = "c-write-status";

    dugme.addEventListener("click", () => {
      const metin = kutu.value.trim();
      if (!metin) { kutu.focus(); return; }
      dugme.disabled = true;
      durum.textContent = "posting…";
      AH.postComment(etkinlik, metin)
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

    /* Yorumlar canliyken veritabanindan, degilse comment-pools.js'ten gelir;
       ikisi de ayni bicimi dondurur, ekran ayni kalir. */
    const kaynak = (etkinlik) =>
      window.AH && AH.comments
        ? AH.comments(etkinlik)
        : Promise.resolve(COMMENTS_FOR(etkinlik));

    const doldurYorum = () => {
      if (!ust) {
        yorumAlani.textContent = "";
        yorumAlani.appendChild(satir("c-none", "nothing left to talk about tonight."));
        yorumAlani.scrollTop = 0;
        yorumAlani.classList.remove("faded");
        return;
      }

      const etkinlik = CARDS[Number(ust.dataset.no)];
      kaynak(etkinlik).then(({ older, recent }) => {
        /* Another card may be on top by now; do not print a late answer */
        if (deste.lastElementChild !== ust) return;
        yorumAlani.textContent = "";
        yorumAlani.appendChild(yazmaAlani(etkinlik));
        if (recent.length) yorumAlani.appendChild(grupYap("this week", recent, false));
        if (older.length) yorumAlani.appendChild(grupYap("from earlier nights", older, true));
        if (!recent.length && !older.length) {
          yorumAlani.appendChild(satir("c-none", "nobody has said anything yet."));
        }
        yorumAlani.scrollTop = 0;
        yorumAlani.classList.remove("faded");
      });
    };

    /* Kart degisince yazi da degissin: once soner, sonra yenisi gelir */
    if (yorumAlani.children.length) {
      yorumAlani.classList.add("faded");
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
    window.AH && AH.swipedSlugs ? AH.swipedSlugs() : []
  );

  function doldur() {
    while (deste.children.length < GORUNEN && sira < CARDS.length) {
      if (atlanacak.has(CARDS[sira].slug)) { sira++; continue; }
      deste.insertBefore(kartYap(sira), deste.firstChild);
      sira++;
    }
    katmanla();
    document.getElementById("ex-done").classList.toggle("open", deste.children.length === 0);
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
    "i feel lucky": "nowhere left to be sent tonight.",
  };

  /* Ustteki filtre: sehir ve tur. Canliyken sorgu veritabaninda
     yapiliyor, yerel modda elimizdeki listeden suzuluyor. */
  function filtrele(liste) {
    const f = (window.AH && AH.filter) || {};
    if (!f.kind) return liste;
    const ad = f.kind.replace(/-/g, " ");
    return liste.filter((e) => (e.kind || "").toLowerCase() === ad);
  }

  /* Modun kart kaynagini getir. Hepsi ayni bicimde kayit dondurur. */
  function kaynakGetir(mod) {
    if (mod === "friends liked swipes") {
      return window.AH && AH.friendsKept
        ? AH.friendsKept()
        : Promise.resolve([]);
    }
    if (mod === "i feel lucky") {
      /* Rastgele bir sehre atla, sonra oranin destesini karistir.
         Filtre kendini de guncelliyor, boylece nereye dustugun
         ustteki secimlerden okunuyor. */
      const gidilen = window.AH && AH.randomCity ? AH.randomCity() : null;
      const kaynak = gidilen && AH.mode === "live" && AH.events
        ? AH.events(null, gidilen.slug).catch(() => filtrele(POSTERS))
        : Promise.resolve(filtrele(POSTERS));

      return kaynak.then((liste) => {
        const k = liste.slice();
        for (let i = k.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [k[i], k[j]] = [k[j], k[i]];
        }
        return k;
      });
    }

    const f = (window.AH && AH.filter) || {};
    if (window.AH && AH.mode === "live" && AH.events) {
      return AH.events(f.kind, f.city).catch(() => filtrele(POSTERS));
    }
    return Promise.resolve(filtrele(POSTERS));
  }

  function yenidenDagit(mod) {
    const bitti = document.getElementById("ex-done");
    if (bitti && mod) bitti.textContent = BOS_MESAJ[mod] || BOS_MESAJ["global deck"];

    return kaynakGetir(mod || "global deck").then((liste) => {
      CARDS = liste.length ? liste : [];
      /* Bos deste: neden bos oldugunu soyle */
      if (!liste.length && bitti && (mod || "global deck") === "global deck") {
        const f = (window.AH && AH.filter) || {};
        bitti.textContent = f.city
          ? "no nights in " + f.city + " yet."
          : "that's everyone for tonight.";
      }
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
      k.classList.remove("soft");
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
        if (!k.isConnected || k.classList.contains("held")) return;
        k.style.transition = "";
        k.style.transform = k.dataset.sonHal;
        k.style.opacity = "1";
      });
    }, 95 * kartlar.length + 600);
  }

  /* Filtre degisince deste yeniden dagitilsin */
  window.AH = window.AH || {};
  AH.desteyiYenile = (mod) => yenidenDagit(mod || secilenMod());

  function secilenMod() {
    const d = document.querySelector(".ex-mode.selected");
    return d ? d.textContent.trim() : "global deck";
  }

  document.querySelectorAll(".ex-mode").forEach((dugme) => {
    dugme.addEventListener("click", () => {
      document.querySelectorAll(".ex-mode").forEach((d) => {
        d.classList.toggle("selected", d === dugme);
        if (d === dugme) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      yenidenDagit(dugme.textContent.trim());
    });
  });

  /* --- desteyi sifirla --- */

  const sifirlaDugmesi = document.getElementById("ex-reset");
  if (sifirlaDugmesi) {
    sifirlaDugmesi.addEventListener("click", () => {
      if (!window.AH || !AH.resetSwipes) return;
      /* Geri alinamaz: kept de gidiyor */
      if (!window.confirm(
        "reset the deck? everything you kept and everything you passed on is forgotten."
      )) return;

      sifirlaDugmesi.disabled = true;
      AH.resetSwipes().then(() => {
        /* Ekrandaki izleri de sil */
        tutulan.length = 0;
        if (rozet) { rozet.textContent = "0"; rozet.hidden = true; }
        if (kutu) kutu.classList.remove("taken");
        if (kutuListe) kutuyuAc(false);
        atlanacak.clear();
        if (bitti) bitti.textContent = "that's everyone for tonight.";
        return yenidenDagit(secilenMod());
      }).finally(() => { sifirlaDugmesi.disabled = false; });
    });
  }

  /* Onceki oturumdan kept geri gelsin (rozet ve liste). */
  if (window.AH && AH.kept) {
    AH.kept().then((liste) => {
      liste.slice().reverse().forEach(tut);
    });
  }

  doldur();
})();
