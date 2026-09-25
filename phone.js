/* ---------- "preview." on the closed pages: a phone that shows the app ----------
   djs, yours and map live in the app only. The "preview." button opens a
   big phone in the middle of the page and plays a short scene inside it:
   real screenshots of the app, a finger that taps and drags, one line under
   the phone saying what is happening. At the end: the store badges.

   The screenshots live in phone/ (see SCENES below for the file names).
   They are portrait phone captures; the frame is 9:19.5, so a 1080×2340
   or similar shot fits without cropping. Finger positions are percentages
   of the screen (x from the left, y from the top) and are set per shot —
   adjust them when the screenshots change.

   Which scene plays comes from the page: djs / friends / maps. */

(() => {
  const button = document.querySelector(".map-preview");
  if (!button) return;

  // djs and friends mark the body; maps does not, so read the folder name
  const folder = location.pathname.split("/").filter(Boolean).slice(-2, -1)[0] || "";
  const page = ["djs", "friends", "maps"].find((c) => document.body.classList.contains(c) || folder === c);
  const CFG = (window.AH_CONFIG && AH_CONFIG.app) || {};
  const APP = CFG.android || "https://play.google.com/store/apps/details?id=app.afterhours.android";
  const IOS = CFG.ios || null;

  // shot: file in phone/ · say: the line under the phone · gesture: what
  // the finger does on this shot (tap / drag / none), positions in % ·
  // hold: how long the shot stays after the gesture (ms)
  const SCENES = {
    djs: [
      { shot: "djs-1.jpg", say: "who is playing: next up, later tonight, this week.", gesture: { type: "drag", from: [50, 78], to: [50, 58] }, hold: 1200 },
      { shot: "djs-1.jpg", say: "tap a name.", gesture: { type: "tap", at: [27, 37] }, hold: 700 },
      { shot: "djs-2.jpg", say: "their sets, their photos, their next night.", gesture: { type: "drag", from: [50, 80], to: [50, 56] }, hold: 2200 },
    ],
    friends: [
      { shot: "yours-1.jpg", say: "where your friends are going tonight.", gesture: { type: "drag", from: [80, 17], to: [34, 17] }, hold: 1200 },
      { shot: "yours-1.jpg", say: "me too.", gesture: { type: "tap", at: [18, 58] }, hold: 700 },
      { shot: "yours-2.jpg", say: "kept. you are on the list for that night.", gesture: { type: "none" }, hold: 2400 },
    ],
    maps: [
      { shot: "map-1.jpg", say: "the city, tonight. every square is a night.", gesture: { type: "drag", from: [64, 62], to: [44, 48] }, hold: 1100 },
      { shot: "map-1.jpg", say: "tap a square.", gesture: { type: "tap", at: [54, 51.5] }, hold: 700 },
      { shot: "map-2.jpg", say: "keep it for later, or open the night.", gesture: { type: "tap", at: [17.5, 83.5] }, hold: 900 },
      { shot: "map-3.jpg", say: "kept.", gesture: { type: "none" }, hold: 2000 },
    ],
  };
  const scene = SCENES[page];
  if (!scene) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((ok) => setTimeout(ok, reduced ? Math.min(ms, 600) : ms));

  // ---------- Build the overlay once ----------
  const root = document.createElement("div");
  root.className = "pv-overlay";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "a preview of the app");
  root.innerHTML = `
    <button class="pv-close" type="button" aria-label="close the preview">close</button>
    <div class="pv-stage">
      <div class="pv-frame">
        <div class="pv-screen">
          <img class="pv-shot" alt="" />
          <img class="pv-shot pv-shot-next" alt="" />
          <p class="pv-missing" hidden></p>
          <div class="pv-finger" hidden></div>
        </div>
      </div>
      <p class="pv-say" aria-live="polite"></p>
      <div class="pv-end" hidden>
        <div class="stores">
          <a class="store store-play" href="${APP}" target="_blank" rel="noopener"><span><small>get it on</small><b>google play</b></span></a>
          ${IOS ? `<a class="store store-ios" href="${IOS}" target="_blank" rel="noopener"><span><small>download on the</small><b>app store</b></span></a>` : `<span class="store store-ios soon" aria-disabled="true" title="soon"><span><small>soon on the</small><b>app store</b></span></span>`}
        </div>
        <button class="pv-again" type="button">watch again</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const shots = [root.querySelector(".pv-shot"), root.querySelector(".pv-shot-next")];
  const missing = root.querySelector(".pv-missing");
  const finger = root.querySelector(".pv-finger");
  const say = root.querySelector(".pv-say");
  const end = root.querySelector(".pv-end");
  let front = 0;          // which of the two <img> is in front
  let run = 0;            // bumps when the overlay closes, so an old scene stops

  // Two images so one shot fades over the other
  function showShot(file, id) {
    return new Promise((ok) => {
      const back = shots[1 - front];
      const src = "../phone/" + file;
      if (shots[front].getAttribute("src") === src) return ok();
      const done = () => {
        if (id !== run) return ok();
        back.classList.add("on");
        shots[front].classList.remove("on");
        front = 1 - front;
        ok();
      };
      back.onload = () => { missing.hidden = true; done(); };
      back.onerror = () => {
        // no screenshot yet: say which file is expected, on plain paper
        back.removeAttribute("src");
        missing.textContent = "phone/" + file;
        missing.hidden = false;
        shots[front].classList.remove("on");
        ok();
      };
      back.src = src;
    });
  }

  const place = (x, y) => {
    finger.style.left = x + "%";
    finger.style.top = y + "%";
  };

  async function gesture(g, id) {
    if (!g || g.type === "none") { finger.hidden = true; return; }
    finger.hidden = false;
    finger.classList.remove("down");
    if (g.type === "tap") {
      finger.style.transition = "none";
      place(g.at[0], g.at[1]);
      await wait(420);
      if (id !== run) return;
      finger.classList.add("down");
      await wait(260);
      finger.classList.remove("down");
      await wait(200);
    } else if (g.type === "drag") {
      finger.style.transition = "none";
      place(g.from[0], g.from[1]);
      await wait(380);
      if (id !== run) return;
      finger.classList.add("down");
      await wait(160);
      finger.style.transition = reduced ? "none" : "left 0.9s cubic-bezier(.4,0,.2,1), top 0.9s cubic-bezier(.4,0,.2,1)";
      place(g.to[0], g.to[1]);
      await wait(reduced ? 100 : 950);
      finger.classList.remove("down");
      await wait(220);
    }
  }

  async function play() {
    const id = ++run;
    end.hidden = true;
    finger.hidden = true;
    say.textContent = "";
    for (const step of scene) {
      if (id !== run) return;
      await showShot(step.shot, id);
      if (id !== run) return;
      say.textContent = step.say;
      await gesture(step.gesture, id);
      if (id !== run) return;
      await wait(step.hold);
    }
    if (id !== run) return;
    finger.hidden = true;
    say.textContent = "only in the app.";
    end.hidden = false;
  }

  // ---------- Open / close ----------
  let opener = null;
  function open() {
    opener = document.activeElement;
    root.hidden = false;
    document.body.classList.add("pv-open");
    // the frame slides up on the next frame
    setTimeout(() => root.classList.add("in"), 20);
    root.querySelector(".pv-close").focus();
    play();
  }
  function close() {
    run++;
    root.classList.remove("in");
    document.body.classList.remove("pv-open");
    setTimeout(() => {
      root.hidden = true;
      shots.forEach((s) => { s.classList.remove("on"); s.removeAttribute("src"); });
      missing.hidden = true;
      if (opener && opener.focus) opener.focus();
    }, reduced ? 0 : 320);
  }

  button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", open);
  root.querySelector(".pv-close").addEventListener("click", close);
  root.querySelector(".pv-again").addEventListener("click", play);
  root.addEventListener("click", (e) => { if (e.target === root) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !root.hidden) close(); });
})();
