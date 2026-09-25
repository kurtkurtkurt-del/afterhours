/* ---------- The radio on the "who is playing" screen ----------
   One second after the screen comes into view the walnut knob turns by
   itself, finds two channels one after the other through a little static,
   plays each for a few seconds, then stops and gives the heading back.
   While a channel plays, the heading shows artist and song, the line under
   it the channel.

   It runs once per visit. Leaving the screen, hiding the tab or taking
   hold of the knob cuts it off; if it was cut off before the end it starts
   again the next time the screen comes into view.

   Browsers only allow sound after the visitor has clicked or tapped
   something on the page. Without that the knob and the text still run,
   silently. Tracks: the app's, Free Music Archive, CC BY 4.0 (app/CREDITS.md). */

(() => {
  const host = document.getElementById("knob");
  const title = document.querySelector(".sd-title");
  const sub = document.querySelector(".sd-sub");
  if (!host || !title || !sub) return;

  const CHANNELS = [
    { artist: "tommaso croce", song: "summertime forever", freq: 94.2, src: "app/sound/house/04.m4a", from: 14 },
    { artist: "ketsa", song: "who dat", freq: 101.7, src: "app/sound/rap/01.m4a", from: 8 },
  ];
  const START_DELAY = 1000;   // after the screen arrives (ms)
  const TUNE = 1900;          // one sweep between channels (ms)
  const LISTEN = 3600;        // how long each channel plays (ms)
  const TURN = -2.3;          // how far the knob goes per channel (rad, clockwise)
  const FREQ_START = 87.6;

  const original = { title: title.innerHTML, sub: sub.innerHTML };
  let done = false;
  let run = 0;                // bumps on every abort, so stale timers stop
  let running = false;
  let statics = null;         // { ctx, gain }
  let players = [];

  const onScreen = () => document.body.dataset.screen === "3";
  const wait = (ms, id) => new Promise((ok, no) => setTimeout(() => (id === run ? ok() : no()), ms));

  // A tween on a timer (not rAF: the preview panel never fires rAF)
  function tween(ms, id, step) {
    return new Promise((ok, no) => {
      const t0 = performance.now();
      const tick = () => {
        if (id !== run) return no();
        const t = Math.min(1, (performance.now() - t0) / ms);
        step(t);
        if (t < 1) setTimeout(tick, 16); else ok();
      };
      tick();
    });
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function setText(t, s) {
    title.classList.add("swap");
    sub.classList.add("swap");
    setTimeout(() => {
      title.innerHTML = t;
      sub.innerHTML = s;
      title.classList.remove("swap");
      sub.classList.remove("swap");
    }, 160);
  }
  const freqText = (f) => "fm " + f.toFixed(1);

  // ---------- Sound ----------
  function startStatic() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2200;
      band.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(band).connect(gain).connect(ctx.destination);
      src.start();
      ctx.resume().catch(() => {});
      statics = { ctx, gain };
    } catch (err) { statics = null; }
  }
  function staticLevel(v) {
    if (statics) statics.gain.gain.setTargetAtTime(v, statics.ctx.currentTime, 0.04);
  }
  function stopStatic() {
    if (!statics) return;
    const s = statics;
    statics = null;
    s.gain.gain.setTargetAtTime(0, s.ctx.currentTime, 0.05);
    setTimeout(() => s.ctx.close().catch(() => {}), 300);
  }

  function player(ch) {
    const a = new Audio(ch.src);
    a.preload = "auto";
    a.volume = 0;
    players.push(a);
    return a;
  }
  function fadeTo(a, v, ms) {
    const from = a.volume, t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / ms);
      try { a.volume = from + (v - from) * t; } catch (err) { /* iOS: fixed volume */ }
      if (t < 1) setTimeout(tick, 16);
      else if (v === 0) a.pause();
    };
    tick();
  }
  function stopSound() {
    players.forEach((a) => fadeTo(a, 0, 250));
    players = [];
    stopStatic();
  }

  // ---------- The sequence ----------
  async function play() {
    if (done || running || !host.knob) return;
    running = true;
    const id = ++run;
    try {
      await wait(START_DELAY, id);

      // the background music steps aside while the radio talks
      if (window.ambient) window.ambient.duck(true);

      const audios = CHANNELS.map(player);
      startStatic();
      let freq = FREQ_START;
      let current = null;

      for (let i = 0; i < CHANNELS.length; i++) {
        const ch = CHANNELS[i];
        const a0 = host.knob.angle, f0 = freq;

        // sweep: static up, the last channel fades under it
        staticLevel(0.07);
        if (current) {
          fadeTo(current, 0, 400);
          setText(original.title, freqText(freq));   // between stations: no name
        }
        await tween(TUNE, id, (t) => {
          const e = ease(t);
          // a small search wobble before it settles
          const wobble = Math.sin(t * Math.PI * 3) * 0.06 * (1 - t);
          host.knob.turnTo(a0 + TURN * e + wobble);
          freq = f0 + (ch.freq - f0) * e;
          sub.textContent = freqText(freq);
        });

        // locked on
        staticLevel(0);
        const a = audios[i];
        try { a.currentTime = ch.from; } catch (err) { /* not loaded yet */ }
        a.play().catch(() => { /* no click yet: silent */ });
        fadeTo(a, 1, 350);
        current = a;
        setText(ch.artist + "<br />" + ch.song + ".", freqText(ch.freq));
        await wait(LISTEN, id);
      }

      if (current) fadeTo(current, 0, 800);
      stopStatic();
      await wait(800, id);
      setText(original.title, original.sub);
      if (window.ambient) window.ambient.duck(false);
      done = true;
    } catch (err) {
      // cut off: stopped by abort()
    } finally {
      if (run === id) running = false;
    }
  }

  function abort() {
    if (!running) return;
    run++;
    running = false;
    stopSound();
    setText(original.title, original.sub);
    if (window.ambient) window.ambient.duck(false);
  }

  // ---------- Triggers ----------
  new MutationObserver(() => {
    if (onScreen()) play();
    else abort();
  }).observe(document.body, { attributes: true, attributeFilter: ["data-screen"] });

  document.addEventListener("visibilitychange", () => { if (document.hidden) abort(); });
  host.addEventListener("knobgrab", () => { if (running) { abort(); done = true; } });

  const begin = () => { if (onScreen()) play(); };
  if (host.knob) begin(); else host.addEventListener("knobready", begin, { once: true });
})();
