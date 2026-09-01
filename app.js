/* afterhours — the poster wall (placeholder content) */

// 20 posters: 2 columns x 10 rows.
const SHOWN = POSTERS.slice(0, 20);

const grid = document.getElementById("posters");
const info = document.getElementById("info");
const side = document.getElementById("side");
const fieldIndex = info.querySelector(".info-index");
const fieldKind = info.querySelector(".info-type");
const fieldTitle = info.querySelector(".info-title");
const fieldMeta = info.querySelector(".info-meta");
const fieldBody = info.querySelector(".info-body");

// A short delay so the text does not flicker while the pointer crosses
// the gap between two posters
let hideTimer;

/* The wall is twenty separate SVG documents, each parsing its own fonts —
   the heaviest thing on the page, and on a phone most of them start below
   the fold. Only the frames near the viewport load; scrolling brings the
   rest. The first rows load eagerly so the opening paint is instant. */
const EAGER = 6;
const lazyPosters = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target.querySelector("object, img");
        if (image && image.dataset.src) {
          if (image.tagName === "IMG") image.src = image.dataset.src;
          else image.data = image.dataset.src;
          delete image.dataset.src;
        }
        lazyPosters.unobserve(entry.target);
      });
    }, { rootMargin: "600px" })
  : null;

SHOWN.forEach((p, i) => {
  // The poster number comes from the record itself, not from its position
  const no = String(p.poster || i + 1).padStart(2, "0");

  // The frame: clickable, opens the event's own page in THIS tab.
  // A synced night has no folder; the shared shell reads its slug.
  // index.html is written out, as everywhere on this site: a bare
  // folder address only resolves on a server, not opened as a file.
  const box = document.createElement("a");
  box.className = "poster";
  box.href = p.image
    ? "explore/event/index.html?slug=" + encodeURIComponent(p.slug)
    : "explore/" + p.slug + "/index.html";
  /* An internal page: stay in this tab. Only the OUTWARD links
     (the ticket page, the store) may open a new one. */

  /* The image. A synced night is a photograph in an <img>, cropped to
     the frame; a drawn night stays an <object> (the SVG needs its own
     webfonts, which an <img> cannot fetch). */
  let image;
  let path;
  if (p.image) {
    image = document.createElement("img");
    image.alt = "";
    path = p.image;
  } else {
    image = document.createElement("object");
    image.type = "image/svg+xml";
    path = p.posterPath || "posters/" + no + ".svg";
  }
  image.className = "poster-image";
  /* A hand-picked cover may carry its own crop position (featured.js) */
  if (p.pos) image.style.objectPosition = p.pos;
  if (lazyPosters && i >= EAGER) {
    image.dataset.src = path;
    lazyPosters.observe(box);
  } else if (image.tagName === "IMG") {
    image.src = path;
  } else {
    image.data = path;
  }
  box.appendChild(image);
  box.addEventListener("mouseenter", () => {
    clearTimeout(hideTimer);
    fieldIndex.textContent = String(i + 1).padStart(2, "0") + " / " + SHOWN.length;
    fieldKind.textContent = p.kind;
    fieldTitle.textContent = p.title;
    fieldMeta.textContent = p.meta;
    fieldBody.textContent = p.body;
    side.classList.add("poster-hover");
  });

  // Leaving the poster takes the text away again
  box.addEventListener("mouseleave", () => {
    hideTimer = setTimeout(() => side.classList.remove("poster-hover"), 80);
  });
  grid.appendChild(box);
});

/* ---------- Moving between screens ----------
   Once the posters run out, a little more scrolling takes you to the next
   screen; scrolling back up returns you. The number of screens is read
   from the HTML, so adding a <section class="screen"> is enough. */

const screens = document.getElementById("screens");
const SCREEN_COUNT = screens.querySelectorAll(".screen").length;
const THRESHOLD = 240;        // extra scrolling needed before a screen changes (px)
let screen = 0;
let scrolled = 0;
let direction = 0;             // 1 down, -1 up
let moving = false;

function goToScreen(target) {
  if (target === screen || target < 0 || target >= SCREEN_COUNT) return;

  // You cannot pass the second screen without swiping a card; the deck jumps
  if (screen === 1 && target > screen && deck.querySelector(".card2")) {
    nudgeDeck();
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

    const atEnd = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 2;
    if (!down || !atEnd) {
      scrolled = 0;
      return;
    }
  }

  // If the direction changed, the scroll total resets
  if ((down ? 1 : -1) !== direction) {
    direction = down ? 1 : -1;
    scrolled = 0;
  }

  scrolled += Math.abs(e.deltaY);
  if (scrolled >= THRESHOLD) goToScreen(screen + (down ? 1 : -1));
}, { passive: true });

/* Touch has no wheel event: do the same move with a swipe */
const TOUCH_THRESHOLD = 70;   // px
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

  const gap = start - e.changedTouches[0].clientY;   // swiping up is positive
  if (Math.abs(gap) < TOUCH_THRESHOLD) return;

  const down = gap > 0;
  // On the first screen you only move on at the end of the poster list
  if (screen === 0 && (!down || !touchAtEnd)) return;

  goToScreen(screen + (down ? 1 : -1));
}, { passive: true });

/* ---------- The second screen: a deck of 2 cards ----------
   Pull it right and it is kept and gone. Pull too little and it returns. */

const deck = document.getElementById("deck2");
const phone = document.getElementById("phone");
const lastLine = document.getElementById("last-line");
const swipeHint = document.getElementById("swipe-hint");

// The small nudge the card gives when you try to pass without swiping
let jumpTimer;
function nudgeDeck() {
  const card = deck.querySelector(".card2");
  if (!card) return;
  card.classList.remove("jump");
  void card.offsetWidth;               // restart the animation
  card.classList.add("jump");
  clearTimeout(jumpTimer);
  jumpTimer = setTimeout(() => card.classList.remove("jump"), 520);
}
const PULL_THRESHOLD = 120;              // px

/* The demo card is the FIRST night on the wall — live, that is the top
   hand-picked cover; offline, the old drawn poster stands in. The phone
   mock inside speaks about the same night, so the demo never lies. */
const demoNight = (window.POSTERS || [])[0];

if (demoNight && demoNight.image) {
  const oldPoster = document.querySelector(".phone-poster");
  if (oldPoster) {
    const img = document.createElement("img");
    img.className = "phone-poster";
    img.src = demoNight.image;
    img.alt = "";
    oldPoster.replaceWith(img);
  }
  const phoneTitle = document.querySelector(".phone-title");
  if (phoneTitle) phoneTitle.textContent = demoNight.title;
  const phoneMeta = document.querySelector(".phone-meta");
  if (phoneMeta) phoneMeta.textContent = (demoNight.meta || "").toUpperCase();
}

(function buildDemoCard() {
  const card = document.createElement("div");
  card.className = "card2";

  let image;
  if (demoNight && demoNight.image) {
    image = document.createElement("img");
    image.src = demoNight.image;
    image.alt = "";
  } else {
    image = document.createElement("object");
    image.type = "image/svg+xml";
    image.data = "posters/01.svg";
  }
  card.appendChild(image);

  let startX = null;
  let dx = 0;

  card.addEventListener("pointerdown", (e) => {
    // Only the top card can be dragged
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

  function release() {
    if (startX === null) return;
    startX = null;
    card.classList.remove("dragging");
    card.classList.add("soft");

    if (dx > PULL_THRESHOLD) {
      // Kept: it flies off to the right
      card.style.transform = "translateX(120vw) rotate(18deg)";
      card.style.opacity = "0";
      // Drop it when the transition ends; if the transition never fires, the
      // timeout is the safety net
      let removed = false;
      const drop = () => {
        if (removed) return;
        removed = true;
        card.remove();
        // The deck is done: the phone screen opens
        if (!deck.querySelector(".card2")) {
          swipeHint.classList.add("hidden");
          phone.classList.add("open");
          // The phone holds for 1.6s, fades, and the closing line takes its place.
          // After 2s the text slides up and the phone returns beneath it.
          setTimeout(() => {
            phone.classList.remove("open");
            setTimeout(() => {
              lastLine.classList.add("open");
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

  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);

  deck.appendChild(card);
})();


/* ---------- Sound: short recordings from last night (3 cities) ---------- */

const soundSource = document.getElementById("sound-source");
const soundRows = [...document.querySelectorAll(".sound-row")];
let playingRow = null;

function stopPlaying() {
  soundRows.forEach((s) => {
    s.classList.remove("playing");
    s.querySelector(".sound-line span").style.width = "0%";
  });
}

soundRows.forEach((row) => {
  row.querySelector(".sound-button").addEventListener("click", () => {
    if (playingRow === row && !soundSource.paused) {
      soundSource.pause();
      return;
    }
    if (playingRow !== row) {
      stopPlaying();
      playingRow = row;
      soundSource.src = row.dataset.source;
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

soundSource.addEventListener("ended", stopPlaying);


/* ---------- The third screen: afterhours cards running along a strip ---------- */

const s3Rail = document.getElementById("s3-rail");

// One pair per night: front and back touching, then a gap.
// The list is printed twice; the counter keeps running so the SVG ids
  // never collide.
for (let again = 0; again < 2; again++) {
  CARDS.nights.forEach((night, i) => {
    const index = again * CARDS.nights.length + i;
    const pair = document.createElement("div");
    pair.className = "s3-pair";
    pair.innerHTML = CARDS.front(night, index) + CARDS.back(night, index);
    s3Rail.appendChild(pair);
  });
}

/* VENUES lives in venues.js — the landing page and maps both use it */


/* ---------- The sixth screen: the footer ----------
   The ground is always black. The clock is the visitor's own; the counter
   is worked out from the venues open at that moment. */

const clockField = document.getElementById("s6-clock");
const counterField = document.getElementById("s6-counter");


function updateFooter() {
  const now = new Date();
  const h = now.getHours();
  const min = now.getMinutes();

  clockField.textContent =
    String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0") + " · münchen";

  // The venues open right now (night hours are written past 24)
  const hour = h + min / 60;
  const open = VENUES.filter((m) => {
    const from = m.opensAt;
    const until = m.opensAt + m.hours;
    return (hour >= from && hour < until) || (hour + 24 >= from && hour + 24 < until);
  }).length;

  counterField.textContent = open
    ? open + (open === 1 ? " room open in münchen right now" : " rooms open in münchen right now")
    : "no rooms open yet — come back after dark";
}

updateFooter();
setInterval(updateFooter, 20000);

/* ---------- The honest city list, honestly derived ---------- */

/* The footer named six cities by hand while the coverage grew to
   ninety-odd; now the six brightest come from the database itself and
   the rest are counted, not promised. The hand-written list stays in
   the HTML as the offline answer. */
(function liveCityList() {
  const box = document.querySelector(".s6-cities");
  if (!box || !window.AH || !AH.request || AH.mode !== "live") return;
  AH.request("/rpc/city_counts", { method: "POST", body: "{}" })
    .then((rows) => {
      const full = (rows || []).filter((c) => Number(c.n) > 0)
        .sort((a, b) => Number(b.n) - Number(a.n));
      if (full.length < 4) return;         /* thin data: keep the old words */
      box.textContent = "";
      full.slice(0, 6).forEach((c) => {
        const li = document.createElement("li");
        li.className = "open";
        li.textContent = c.name;
        box.appendChild(li);
      });
      if (full.length > 6) {
        const li = document.createElement("li");
        li.textContent = "+ " + (full.length - 6) + " more cities";
        box.appendChild(li);
      }
    })
    .catch(() => {});
})();
