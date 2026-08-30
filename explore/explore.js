/* afterhours — explore: saga/sola kaydirilan deck.
   Ustteki card surukleniyor; esigi asinca ucup gidiyor ve altindaki
   one geliyor. Sagi begenmek, solu gecmek. */

(function () {
  const deck = document.getElementById("ex-deck");
  if (!deck) return;

  const ESIK = 120;              // px
  const GORUNEN = 3;             // top uste duran card sayisi
  let index = 0;

  /* Destenin kaynagi. Soldaki tuslar bunu degistiriyor:
     global deck   → POSTERS (filtreli normal deck)
     friends liked → arkadaslarin saga attiklari
     i feel lucky  → ayni cards, karisik sirayla           */
  let CARDS = POSTERS;

  /* --- Saga swipedSlugs burada birikir --- */

  const kept = [];
  const box = document.querySelector(".ex-box");
  const boxButton = document.getElementById("ex-box-button");
  const boxList = document.getElementById("ex-box-list");
  const boxBody = document.getElementById("ex-box-body");
  const badge = document.getElementById("ex-badge");

  function tut(event) {
    if (kept.some((e) => e.slug === event.slug)) return;
    kept.push(event);
    if (!badge) return;
    badge.textContent = String(kept.length);
    badge.hidden = false;
    if (box) box.classList.add("taken");
    badge.classList.remove("up");
    void badge.offsetWidth;          /* animasyonu bastan baslat */
    badge.classList.add("up");
    if (boxList && !boxList.hidden) kutuyuYaz();
  }

  function kutuyuYaz() {
    if (!boxBody) return;
    boxBody.textContent = "";
    if (!kept.length) {
      const p = document.createElement("p");
      p.className = "ex-box-empty";
      p.textContent = "nothing kept yet. swipe a card right to keep it.";
      boxBody.appendChild(p);
      return;
    }
    /* En son kept ustte */
    kept.slice().reverse().forEach((e) => {
      const no = String(e.poster || CARDS.indexOf(e) + 1).padStart(2, "0");
      const yol = e.posterPath || "../posters/" + no + ".svg";
      const a = document.createElement("a");
      a.className = "ex-box-row";
      a.href = e.slug + "/index.html";
      const g = document.createElement("object");
      g.type = "image/svg+xml";
      g.data = yol;
      a.appendChild(g);
      const text = document.createElement("div");
      const name = document.createElement("p");
      name.className = "ex-box-name";
      name.textContent = e.title;
      const meta = document.createElement("p");
      meta.className = "ex-box-meta";
      meta.textContent = e.meta;
      text.appendChild(name);
      text.appendChild(meta);
      a.appendChild(text);
      boxBody.appendChild(a);
    });
  }

  function openBox(open) {
    if (!boxList || !boxButton) return;
    if (open) kutuyuYaz();
    boxList.hidden = !open;
    boxButton.setAttribute("aria-expanded", String(open));
  }

  if (boxButton) {
    boxButton.addEventListener("click", (e) => {
      e.stopPropagation();
      openBox(boxList.hidden);
    });
    /* Disariya tiklayinca ve Esc ile kapansin */
    document.addEventListener("click", (e) => {
      if (!boxList || boxList.hidden) return;
      if (!box.contains(e.target)) openBox(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") openBox(false);
    });
  }

  /* Karti verilen yone fly ve desteden dus. Hem surukleme
     hem klavye bunu kullanir. */
  function fly(card, direction) {
    if (card.dataset.uctu) return;
    card.dataset.uctu = "1";
    const atilan = CARDS[Number(card.dataset.no)];
    if (direction > 0) tut(atilan);
    /* Her iki direction de kaydediliyor: sag biriktirmek, sol "bir daha gosterme".
       Girisliyken veritabanina, degilse tarayiciya. */
    if (window.AH && AH.saveSwipe) AH.saveSwipe(atilan, direction);
    card.classList.remove("held");
    card.classList.add("soft");
    card.style.transform = "translateX(" + (direction * 120) + "vw) rotate(" + (direction * 22) + "deg)";
    card.style.opacity = "0";

    /* transitionend tek basina yetmiyor: kesintiye ugrayan gecislerde
       hic gelmiyor, bu yuzden zamanlayici yedegi var. */
    let silindi = false;
    const sil = () => {
      if (silindi) return;
      silindi = true;
      card.remove();
      fill();
    };
    card.addEventListener("transitionend", sil, { once: true });
    setTimeout(sil, 420);
  }

  /* Sol/sag ok tuslari da karti atar. Filtredeyken oklar
     secenek degistirmeli, o yuzden form ogelerinde karisma. */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const hedef = e.target;
    if (hedef && hedef.closest && hedef.closest("select, input, textarea, [contenteditable]")) return;
    const top = deck.lastElementChild;
    if (!top) return;
    e.preventDefault();
    fly(top, e.key === "ArrowRight" ? 1 : -1);
  });

  function makeCard(i) {
    /* Poster numarasi kaydin kendisinden geliyor; veritabani eksik bir
       list dondurdugunde posterler kaymasin diye siraya guvenmiyoruz. */
    const no = String(CARDS[i].poster || i + 1).padStart(2, "0");
    const yol = CARDS[i].posterPath || "../posters/" + no + ".svg";
    const card = document.createElement("div");
    card.className = "ex-card";
    card.dataset.no = String(i);

    const gorsel = document.createElement("object");
    gorsel.type = "image/svg+xml";
    gorsel.data = yol;
    card.appendChild(gorsel);

    /* Posterin altindaki info seridi: tur + mekan/tarih.
       Veri events-data.js'ten, poster ile hic celismesin diye. */
    const veri = CARDS[i];
    const info = document.createElement("div");
    info.className = "ex-info";
    const tur = document.createElement("p");
    tur.className = "ex-kind";
    tur.textContent = veri.kind;
    const meta = document.createElement("p");
    meta.className = "ex-meta";
    meta.textContent = veri.meta;
    info.appendChild(tur);
    info.appendChild(meta);
    card.appendChild(info);

    let startX = null, dx = 0;

    card.addEventListener("pointerdown", (e) => {
      if (card !== deck.lastElementChild) return;
      startX = e.clientX;
      dx = 0;
      card.classList.add("held");
      card.classList.remove("soft");
      try { card.setPointerCapture(e.pointerId); } catch (_) {}
    });

    card.addEventListener("pointermove", (e) => {
      if (startX === null) return;
      dx = e.clientX - startX;
      card.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 24) + "deg)";
    });

    function birak() {
      if (startX === null) return;
      startX = null;
      card.classList.remove("held");
      card.classList.add("soft");

      if (Math.abs(dx) > ESIK) {
        fly(card, dx > 0 ? 1 : -1);
      } else {
        card.style.transform = "";
      }
    }

    card.addEventListener("pointerup", birak);
    card.addEventListener("pointercancel", birak);
    return card;
  }

  /* --- Ustteki kartin yorumlari --- */

  const commentArea = document.getElementById("ex-comment-list");

  /* Basliga basinca yorum alani acilip kapanir; kapaninca
     sutun daralir ve deck ortaya dogru genisler. */
  const yorumDugme = document.getElementById("ex-comment-button");
  const area = document.querySelector(".ex-field");
  if (yorumDugme && area) {
    yorumDugme.addEventListener("click", () => {
      const kapali = area.classList.toggle("comment-closed");
      yorumDugme.setAttribute("aria-expanded", String(!kapali));
    });
  }

  function row(sinif, text) {
    const e = document.createElement("p");
    e.className = sinif;
    e.textContent = text;
    return e;
  }

  function konuYap(topic) {
    const k = document.createElement("div");
    k.className = "c-topic";
    const top = document.createElement("div");
    top.className = "c-top";
    top.appendChild(row("c-who", topic.who));
    top.appendChild(row("c-when", topic.when));
    k.appendChild(top);
    k.appendChild(row("c-text", topic.body));

    if (topic.replies && topic.replies.length) {
      const c = document.createElement("div");
      c.className = "c-replies";
      topic.replies.forEach((cev) => {
        const box = document.createElement("div");
        box.className = "c-reply";
        const u = document.createElement("div");
        u.className = "c-top";
        u.appendChild(row("c-who", cev.who));
        u.appendChild(row("c-when", cev.when));
        box.appendChild(u);
        box.appendChild(row("c-text", cev.body));
        c.appendChild(box);
      });
      k.appendChild(c);
    }
    return k;
  }

  function makeGroup(baslik, konular, eski) {
    const g = document.createElement("div");
    g.className = "c-group" + (eski ? " old" : "");
    g.appendChild(row("c-group-title", baslik));
    konular.forEach((topic) => g.appendChild(konuYap(topic)));
    return g;
  }

  /* Yorum yazma kutusu. Backend kapaliyken hic gorunmez (yazacak yer
     yok); acikken ama girissizken tek satirlik bir davet. */
  function writeArea(event) {
    const wrap = document.createElement("div");
    wrap.className = "c-write";
    if (!(window.AH && AH.commentsLive && AH.commentsLive())) return wrap;

    if (!AH.canComment()) {
      const d = document.createElement("a");
      d.className = "c-write-invite";
      d.href = "../login/index.html";
      d.textContent = "sign in to say something";
      wrap.appendChild(d);
      return wrap;
    }

    const box = document.createElement("textarea");
    box.className = "c-write-field";
    box.rows = 2;
    box.placeholder = "say something about this night";

    const button = document.createElement("button");
    button.className = "c-write-button";
    button.type = "button";
    button.textContent = "post";

    const status = document.createElement("p");
    status.className = "c-write-status";

    button.addEventListener("click", () => {
      const text = box.value.trim();
      if (!text) { box.focus(); return; }
      button.disabled = true;
      status.textContent = "posting…";
      AH.postComment(event, text)
        .then(() => { box.value = ""; status.textContent = ""; yorumlariBas(); })
        .catch((h) => { status.textContent = "couldn't post: " + h.message; })
        .finally(() => { button.disabled = false; });
    });

    wrap.appendChild(box);
    wrap.appendChild(button);
    wrap.appendChild(status);
    return wrap;
  }

  function yorumlariBas() {
    if (!commentArea) return;
    const top = deck.lastElementChild;

    /* Yorumlar canliyken veritabanindan, degilse comment-pools.js'ten gelir;
       ikisi de ayni bicimi dondurur, ekran ayni kalir. */
    const source = (event) =>
      window.AH && AH.comments
        ? AH.comments(event)
        : Promise.resolve(COMMENTS_FOR(event));

    const doldurYorum = () => {
      if (!top) {
        commentArea.textContent = "";
        commentArea.appendChild(row("c-none", "nothing left to talk about tonight."));
        commentArea.scrollTop = 0;
        commentArea.classList.remove("faded");
        return;
      }

      const event = CARDS[Number(top.dataset.no)];
      source(event).then(({ older, recent }) => {
        /* Another card may be on top by now; do not print a late answer */
        if (deck.lastElementChild !== top) return;
        commentArea.textContent = "";
        commentArea.appendChild(writeArea(event));
        if (recent.length) commentArea.appendChild(makeGroup("this week", recent, false));
        if (older.length) commentArea.appendChild(makeGroup("from earlier nights", older, true));
        if (!recent.length && !older.length) {
          commentArea.appendChild(row("c-none", "nobody has said anything yet."));
        }
        commentArea.scrollTop = 0;
        commentArea.classList.remove("faded");
      });
    };

    /* Kart degisince text da degissin: once soner, sonra yenisi gelir */
    if (commentArea.children.length) {
      commentArea.classList.add("faded");
      setTimeout(doldurYorum, 200);
    } else {
      doldurYorum();
    }
  }

  /* Desteyi hep GORUNEN card full tut: en arkaya ekleyip
     en ustteki (son cocuk) surukleniyor. */
  /* Daha once atilmis cards bir daha gelmesin. Girisliyken bu eleme
     zaten veritabaninda yapiliyor (deck fonksiyonu), burasi girissiz
     gezenler icin. */
  const atlanacak = new Set(
    window.AH && AH.swipedSlugs ? AH.swipedSlugs() : []
  );

  function fill() {
    while (deck.children.length < GORUNEN && index < CARDS.length) {
      if (atlanacak.has(CARDS[index].slug)) { index++; continue; }
      deck.insertBefore(makeCard(index), deck.firstChild);
      index++;
    }
    stack();
    document.getElementById("ex-done").classList.toggle("open", deck.children.length === 0);
    yorumlariBas();
  }

  /* Arkadakiler biraz kucuk ve asagida dursun */
  function stack() {
    const n = deck.children.length;
    [...deck.children].forEach((k, i) => {
      const derinlik = n - 1 - i;          // 0 = en ustteki
      k.style.zIndex = String(i);
      if (derinlik > 0) {
        k.style.transform = "translateY(" + derinlik * 14 + "px) scale(" + (1 - derinlik * 0.045) + ")";
      }
    });
  }

  /* --- Soldaki tuslar: desteyi yeniden dagit --- */

  /* Ayni cards, bastan. Kartlar soldan ucup gelir ve
     top uste dusler; en ustteki en son iner. */
  const BOS_MESAJ = {
    "global deck": "that's everyone for tonight.",
    "friends liked swipes": "no friends have kept anything yet.",
    "i feel lucky": "nowhere left to be sent tonight.",
  };

  /* Ustteki filtre: sehir ve tur. Canliyken sorgu veritabaninda
     yapiliyor, yerel modda elimizdeki listeden suzuluyor. */
  function applyFilter(list) {
    const f = (window.AH && AH.filter) || {};
    if (!f.kind) return list;
    const name = f.kind.replace(/-/g, " ");
    return list.filter((e) => (e.kind || "").toLowerCase() === name);
  }

  /* Modun card kaynagini getir. Hepsi ayni bicimde kayit dondurur. */
  function sourceFor(mode) {
    if (mode === "friends liked swipes") {
      return window.AH && AH.friendsKept
        ? AH.friendsKept()
        : Promise.resolve([]);
    }
    if (mode === "i feel lucky") {
      /* Rastgele bir sehre atla, sonra oranin destesini karistir.
         Filtre kendini de guncelliyor, boylece nereye dustugun
         ustteki secimlerden okunuyor. */
      const picked = window.AH && AH.randomCity ? AH.randomCity() : null;
      const source = picked && AH.mode === "live" && AH.events
        ? AH.events(null, picked.slug).catch(() => applyFilter(POSTERS))
        : Promise.resolve(applyFilter(POSTERS));

      return source.then((list) => {
        const k = list.slice();
        for (let i = k.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [k[i], k[j]] = [k[j], k[i]];
        }
        return k;
      });
    }

    const f = (window.AH && AH.filter) || {};
    if (window.AH && AH.mode === "live" && AH.events) {
      return AH.events(f.kind, f.city).catch(() => applyFilter(POSTERS));
    }
    return Promise.resolve(applyFilter(POSTERS));
  }

  function redeal(mode) {
    const done = document.getElementById("ex-done");
    if (done && mode) done.textContent = BOS_MESAJ[mode] || BOS_MESAJ["global deck"];

    return sourceFor(mode || "global deck").then((list) => {
      CARDS = list.length ? list : [];
      /* Bos deck: neden bos oldugunu soyle */
      if (!list.length && done && (mode || "global deck") === "global deck") {
        const f = (window.AH && AH.filter) || {};
        done.textContent = f.city
          ? "no nights in " + f.city + " yet."
          : "that's everyone for tonight.";
      }
      startDealing();
    });
  }

  function startDealing() {
    while (deck.firstChild) deck.removeChild(deck.firstChild);
    index = 0;
    fill();                       /* son hallerini stack() kurar */

    const cards = [...deck.children];
    cards.forEach((k) => {
      k.dataset.sonHal = k.style.transform || "";
      k.classList.remove("soft");
      k.style.transition = "none";
      k.style.transform = "translate(-46vw, -7vh) rotate(-17deg)";
      k.style.opacity = "0";
    });

    void deck.offsetWidth;         /* baslangic hali yazilsin */

    cards.forEach((k, i) => {
      const gecikme = i * 95;       /* DOM'da son cocuk en ustteki card */
      k.style.transition =
        "transform 0.52s cubic-bezier(0.2, 0.75, 0.25, 1) " + gecikme + "ms, " +
        "opacity 0.3s ease " + gecikme + "ms";
      k.style.transform = k.dataset.sonHal;
      k.style.opacity = "1";
    });

    /* Gecis yarida kalirsa cards gorunmez kalmasin: sure
       dolunca son hali elle yaz. Elde kept karta dokunma. */
    setTimeout(() => {
      cards.forEach((k) => {
        if (!k.isConnected || k.classList.contains("held")) return;
        k.style.transition = "";
        k.style.transform = k.dataset.sonHal;
        k.style.opacity = "1";
      });
    }, 95 * cards.length + 600);
  }

  /* Filtre degisince deck yeniden dagitilsin */
  window.AH = window.AH || {};
  AH.redeal = (mode) => redeal(mode || currentMode());

  function currentMode() {
    const d = document.querySelector(".ex-mode.selected");
    return d ? d.textContent.trim() : "global deck";
  }

  document.querySelectorAll(".ex-mode").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".ex-mode").forEach((d) => {
        d.classList.toggle("selected", d === button);
        if (d === button) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      redeal(button.textContent.trim());
    });
  });

  /* --- desteyi sifirla --- */

  const resetButton = document.getElementById("ex-reset");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (!window.AH || !AH.resetSwipes) return;
      /* Geri alinamaz: kept de gidiyor */
      if (!window.confirm(
        "reset the deck? everything you kept and everything you passed on is forgotten."
      )) return;

      resetButton.disabled = true;
      AH.resetSwipes().then(() => {
        /* Ekrandaki izleri de sil */
        kept.length = 0;
        if (badge) { badge.textContent = "0"; badge.hidden = true; }
        if (box) box.classList.remove("taken");
        if (boxList) openBox(false);
        atlanacak.clear();
        if (done) done.textContent = "that's everyone for tonight.";
        return redeal(currentMode());
      }).finally(() => { resetButton.disabled = false; });
    });
  }

  /* Onceki oturumdan kept geri gelsin (badge ve list). */
  if (window.AH && AH.kept) {
    AH.kept().then((list) => {
      list.slice().reverse().forEach(tut);
    });
  }

  fill();
})();
