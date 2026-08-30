/* afterhours — poster vitrini (yer tutucu icerik) */

// 20 poster: 2 sutun x 10 index. Metinler simdilik lorem ipsum.
const GOSTERILEN = POSTERS.slice(0, 20);

const grid = document.getElementById("posters");
const info = document.getElementById("info");
const side = document.getElementById("side");
const alanIndex = info.querySelector(".info-index");
const alanTur = info.querySelector(".info-type");
const alanBaslik = info.querySelector(".info-title");
const alanMeta = info.querySelector(".info-meta");
const alanMetin = info.querySelector(".info-body");

// A short delay so the text does not flicker while the pointer crosses
// the gap between two posters
let hideTimer;

GOSTERILEN.forEach((p, i) => {
  // The poster number comes from the record itself, not from its position
  const no = String(p.poster || i + 1).padStart(2, "0");

  // The frame: clickable, opens the event's own page in a new tab
  const box = document.createElement("a");
  box.className = "poster";
  box.href = "explore/" + p.slug + "/index.html";
  box.target = "_blank";
  box.rel = "noopener";

  // The image: loaded as a separate SVG file, not embedded
  const image = document.createElement("object");
  image.className = "poster-image";
  image.type = "image/svg+xml";
  image.data = p.posterPath || "posters/" + no + ".svg";
  box.appendChild(image);
  box.addEventListener("mouseenter", () => {
    clearTimeout(hideTimer);
    alanIndex.textContent = String(i + 1).padStart(2, "0") + " / " + GOSTERILEN.length;
    alanTur.textContent = p.kind;
    alanBaslik.textContent = p.title;
    alanMeta.textContent = p.meta;
    alanMetin.textContent = p.body;
    side.classList.add("poster-hover");
  });

  // Leaving the poster takes the text away again
  box.addEventListener("mouseleave", () => {
    hideTimer = setTimeout(() => side.classList.remove("poster-hover"), 80);
  });
  grid.appendChild(box);
});

/* ---------- Ekran gecisi ----------
   Once the posters run out, a little more scrolling
   sonraki ekrana gecilir; yukari kaydirinca geri donulur.
   Ekran sayisi HTML'den okunur, yeni <section class="screen"> eklemek yeterli. */

const screens = document.getElementById("screens");
const SCREEN_COUNT = screens.querySelectorAll(".screen").length;
const THRESHOLD = 240;        // extra scrolling needed before a screen changes (px)
let screen = 0;
let scrolled = 0;
let direction = 0;             // 1 down, -1 yukari
let moving = false;

function goToScreen(target) {
  if (target === screen || target < 0 || target >= SCREEN_COUNT) return;

  // Kart kaydirilmadan ikinci ekrandan ileri gecilemez; deck zipar
  if (screen === 1 && target > screen && deck.querySelector(".card2")) {
    destiZiplat();
    return;
  }
  screen = target;
  scrolled = 0;
  moving = true;
  screens.style.setProperty("--screen", String(target));
  document.body.dataset.screen = String(target);
  setTimeout(() => { moving = false; }, 760);
}

window.addEventListener("wheel", (e) => {
  if (moving) return;

  const down = e.deltaY > 0;

  // On the first screen the wheel scrolls the poster column first
  if (screen === 0) {
    const target = e.target instanceof Node ? e.target : null;
    if (!target || !grid.contains(target)) grid.scrollTop += e.deltaY;

    const sonda = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 2;
    if (!down || !sonda) {
      scrolled = 0;
      return;
    }
  }

  // Yon degistiyse scrolled sifirlanir
  if ((down ? 1 : -1) !== direction) {
    direction = down ? 1 : -1;
    scrolled = 0;
  }

  scrolled += Math.abs(e.deltaY);
  if (scrolled >= THRESHOLD) goToScreen(screen + (down ? 1 : -1));
}, { passive: true });

/* Touch has no wheel event: do the same move with a swipe */
const DOKUNUS_ESIGI = 70;   // px
let touchY = null;
let touchOnCard = false;
let touchAtEnd = false;

window.addEventListener("touchstart", (e) => {
  touchY = e.touches[0].clientY;
  const h = e.target;
  touchOnCard = !!(h && h.closest && h.closest(".card2"));
  touchAtEnd = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  const start = touchY;
  touchY = null;
  if (start === null || touchOnCard || moving) return;

  const gap = start - e.changedTouches[0].clientY;   // yukari surtme pozitif
  if (Math.abs(gap) < DOKUNUS_ESIGI) return;

  const down = gap > 0;
  // Ilk ekranda ancak poster listesinin sonundayken ilerlenir
  if (screen === 0 && (!down || !touchAtEnd)) return;

  goToScreen(screen + (down ? 1 : -1));
}, { passive: true });

/* ---------- Ikinci screen: 2 kartlik deck ----------
   Saga cekince begenilir ve kaybolur. Yeterince cekilmezse yerine doner. */

const deck = document.getElementById("deck2");
const phone = document.getElementById("phone");
const sonMesaj = document.getElementById("last-line");
const kaydirIpucu = document.getElementById("swipe-hint");

// Kaydirmadan gecilmeye calisilinca kartin verdigi kucuk tepki
let jumpTimer;
function destiZiplat() {
  const card = deck.querySelector(".card2");
  if (!card) return;
  card.classList.remove("jump");
  void card.offsetWidth;               // animasyonu bastan baslat
  card.classList.add("jump");
  clearTimeout(jumpTimer);
  jumpTimer = setTimeout(() => card.classList.remove("jump"), 520);
}
const DECK_POSTERS = ["01"];         // a single poster: A$AP Rocky
const CEKME_ESIGI = 120;                 // px

DECK_POSTERS.slice().reverse().forEach((no) => {
  const card = document.createElement("div");
  card.className = "card2";

  const image = document.createElement("object");
  image.type = "image/svg+xml";
  image.data = "posters/" + no + ".svg";
  card.appendChild(image);

  let startX = null;
  let dx = 0;

  card.addEventListener("pointerdown", (e) => {
    // Sadece en ustteki card surukleneblir
    if (card !== deck.lastElementChild) return;
    startX = e.clientX;
    dx = 0;
    try { card.setPointerCapture(e.pointerId); } catch (_) {}
    card.classList.add("dragging");
    card.classList.remove("soft");
  });

  card.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    dx = e.clientX - startX;
    card.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 26) + "deg)";
  });

  function birak() {
    if (startX === null) return;
    startX = null;
    card.classList.remove("dragging");
    card.classList.add("soft");

    if (dx > CEKME_ESIGI) {
      // Kept: it flies off to the right
      card.style.transform = "translateX(120vw) rotate(18deg)";
      card.style.opacity = "0";
      // Drop it when the transition ends; if the transition never fires, the
      // timeout is the safety net
      let silindi = false;
      const drop = () => {
        if (silindi) return;
        silindi = true;
        card.remove();
        // Deste bitti: phone ekrani acilir
        if (!deck.querySelector(".card2")) {
          kaydirIpucu.classList.add("hidden");
          phone.classList.add("open");
          // Telefon 1.6 sn durur, kaybolur, yerine kapanis yazisi gelir.
          // After 2s the text slides up and the phone returns beneath it.
          setTimeout(() => {
            phone.classList.remove("open");
            setTimeout(() => {
              sonMesaj.classList.add("open");
              setTimeout(() => {
                deck.classList.add("last-state");
                phone.classList.add("open");
              }, 2000);
            }, 300);
          }, 1600);
        }
      };
      card.addEventListener("transitionend", drop, { once: true });
      setTimeout(drop, 400);
    } else {
      card.style.transform = "";
    }
  }

  card.addEventListener("pointerup", birak);
  card.addEventListener("pointercancel", birak);

  deck.appendChild(card);
});


/* ---------- Sound: short recordings from last night (3 cities) ---------- */

const soundSource = document.getElementById("sound-source");
const sesSatirlari = [...document.querySelectorAll(".sound-row")];
let playingRow = null;

function calmaDurdur() {
  sesSatirlari.forEach((s) => {
    s.classList.remove("playing");
    s.querySelector(".sound-line span").style.width = "0%";
  });
}

sesSatirlari.forEach((row) => {
  row.querySelector(".sound-button").addEventListener("click", () => {
    if (playingRow === row && !soundSource.paused) {
      soundSource.pause();
      return;
    }
    if (playingRow !== row) {
      calmaDurdur();
      playingRow = row;
      soundSource.src = row.dataset.kaynak;
    }
    soundSource.play();
  });
});

soundSource.addEventListener("play", () => {
  if (playingRow) playingRow.classList.add("playing");
});

soundSource.addEventListener("pause", () => {
  if (playingRow) playingRow.classList.remove("playing");
});

soundSource.addEventListener("timeupdate", () => {
  if (!playingRow || !soundSource.duration) return;
  playingRow.querySelector(".sound-line span").style.width =
    (soundSource.currentTime / soundSource.duration) * 100 + "%";
});

soundSource.addEventListener("ended", calmaDurdur);


/* ---------- Ucuncu screen: seritte akan afterhours kartlari ---------- */

const k3Ray = document.getElementById("s3-rail");

// One pair per night: front and back touching, then a gap.
// The list is printed twice; the counter keeps running so the SVG ids
  // never collide.
for (let again = 0; again < 2; again++) {
  CARDS.nights.forEach((night, i) => {
    const index = again * CARDS.nights.length + i;
    const pair = document.createElement("div");
    pair.className = "s3-pair";
    pair.innerHTML = CARDS.front(night, index) + CARDS.back(night, index);
    k3Ray.appendChild(pair);
  });
}

/* VENUES lives in venues.js — the landing page and maps both use it */


/* ---------- Altinci screen: footer ----------
   The ground is always black. The clock is the visitor's own; the counter
   is worked out from the venues open at that moment. */

const k6Saat = document.getElementById("s6-clock");
const k6Sayac = document.getElementById("s6-counter");

document.body.dataset.footerTone = "dark";   // the menu and the sound bar invert

function k6Guncelle() {
  const now = new Date();
  const s = now.getHours();
  const d = now.getMinutes();

  k6Saat.textContent =
    String(s).padStart(2, "0") + ":" + String(d).padStart(2, "0") + " · münchen";

  // The venues open right now (night hours are written past 24)
  const hour = s + d / 60;
  const open = VENUES.filter((m) => {
    const bas = m.opensAt;
    const son = m.opensAt + m.hours;
    return (hour >= bas && hour < son) || (hour + 24 >= bas && hour + 24 < son);
  }).length;

  k6Sayac.textContent = open
    ? open + (open === 1 ? " room open in münchen right now" : " rooms open in münchen right now")
    : "no rooms open yet — come back after dark";
}

k6Guncelle();
setInterval(k6Guncelle, 20000);
