/* afterhours — explore: the deck you swipe left and right.
   The top card is the one you drag; past the threshold it flies off and
   the one below comes forward. Right is keep, left is pass. */

(function () {
  const deck = document.getElementById("ex-deck");
  if (!deck) return;

  const THRESHOLD = 120;              // px
  const VISIBLE = 3;             // how many cards sit on the pile
  let index = 0;

  /* Where the deck comes from. The buttons on the left change it:
     global deck   → POSTERS (the normal deck, filtered)
     friends liked → what your friends swiped right
     i feel lucky  → the same cards, in a shuffled order    */
  let CARDS = POSTERS;

  /* --- what you swipe right piles up here --- */

  const kept = [];
  const box = document.querySelector(".ex-box");
  const boxButton = document.getElementById("ex-box-button");
  const boxList = document.getElementById("ex-box-list");
  const boxBody = document.getElementById("ex-box-body");
  const badge = document.getElementById("ex-badge");

  function keep(event) {
    if (kept.some((e) => e.slug === event.slug)) return;
    kept.push(event);
    if (!badge) return;
    badge.textContent = String(kept.length);
    badge.hidden = false;
    if (box) box.classList.add("taken");
    badge.classList.remove("up");
    void badge.offsetWidth;          /* restart the animation */
    badge.classList.add("up");
    if (boxList && !boxList.hidden) drawBox();
  }

  function drawBox() {
    if (!boxBody) return;
    boxBody.textContent = "";
    if (!kept.length) {
      const p = document.createElement("p");
      p.className = "ex-box-empty";
      p.textContent = "nothing kept yet. swipe a card right to keep it.";
      boxBody.appendChild(p);
      return;
    }
    /* The most recently kept on top */
    kept.slice().reverse().forEach((e) => {
      const no = String(e.poster || CARDS.indexOf(e) + 1).padStart(2, "0");
      const path = e.posterPath || "../posters/" + no + ".svg";
      const a = document.createElement("a");
      a.className = "ex-box-row";
      a.href = e.slug + "/index.html";
      const g = document.createElement("object");
      g.type = "image/svg+xml";
      g.data = path;
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
    if (open) drawBox();
    boxList.hidden = !open;
    boxButton.setAttribute("aria-expanded", String(open));
  }

  if (boxButton) {
    boxButton.addEventListener("click", (e) => {
      e.stopPropagation();
      openBox(boxList.hidden);
    });
    /* Close it on a click outside, and on Esc */
    document.addEventListener("click", (e) => {
      if (!boxList || boxList.hidden) return;
      if (!box.contains(e.target)) openBox(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") openBox(false);
    });
  }

  /* Fly the card off in the given direction and drop it from the deck.
     Used both by dragging and by the keyboard. */
  function fly(card, direction) {
    if (card.dataset.flew) return;
    card.dataset.flew = "1";
    const swiped = CARDS[Number(card.dataset.no)];
    if (direction > 0) keep(swiped);
    /* Both directions are recorded: right means keep, left means do not
       show it again. To the database when signed in, to the browser if not. */
    if (window.AH && AH.saveSwipe) AH.saveSwipe(swiped, direction);
    card.classList.remove("held");
    card.classList.add("soft");
    card.style.transform = "translateX(" + (direction * 120) + "vw) rotate(" + (direction * 22) + "deg)";
    card.style.opacity = "0";

    /* transitionend on its own is not enough: it never fires on an
       interrupted transition, so there is a timer as a backstop. */
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      card.remove();
      fill();
    };
    card.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 420);
  }

  /* The left/right arrow keys swipe too. Inside a form control the
     arrows must keep their own meaning, so those are left alone. */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (target && target.closest && target.closest("select, input, textarea, [contenteditable]")) return;
    const top = deck.lastElementChild;
    if (!top) return;
    e.preventDefault();
    fly(top, e.key === "ArrowRight" ? 1 : -1);
  });

  function makeCard(i) {
    /* The poster number comes from the record itself; we do not trust the
       position, so that a short list from the database cannot shift them. */
    const no = String(CARDS[i].poster || i + 1).padStart(2, "0");
    const path = CARDS[i].posterPath || "../posters/" + no + ".svg";
    const card = document.createElement("div");
    card.className = "ex-card";
    card.dataset.no = String(i);

    const image = document.createElement("object");
    image.type = "image/svg+xml";
    image.data = path;
    card.appendChild(image);

    /* The info strip under the poster: kind + venue/date. The data comes
       from events-data.js, so it can never contradict the poster. */
    const data = CARDS[i];
    const info = document.createElement("div");
    info.className = "ex-info";
    const kind = document.createElement("p");
    kind.className = "ex-kind";
    kind.textContent = data.kind;
    const meta = document.createElement("p");
    meta.className = "ex-meta";
    meta.textContent = data.meta;
    info.appendChild(kind);
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

    function release() {
      if (startX === null) return;
      startX = null;
      card.classList.remove("held");
      card.classList.add("soft");

      if (Math.abs(dx) > THRESHOLD) {
        fly(card, dx > 0 ? 1 : -1);
      } else {
        card.style.transform = "";
      }
    }

    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
    return card;
  }

  /* --- the comments on the top card --- */

  const commentArea = document.getElementById("ex-comment-list");

  /* Pressing the heading opens and closes the comment area; on close the
     column narrows and the deck widens towards the middle. */
  const commentButton = document.getElementById("ex-comment-button");
  const area = document.querySelector(".ex-field");
  if (commentButton && area) {
    commentButton.addEventListener("click", () => {
      const closed = area.classList.toggle("comment-closed");
      commentButton.setAttribute("aria-expanded", String(!closed));
    });
  }

  function row(cls, text) {
    const e = document.createElement("p");
    e.className = cls;
    e.textContent = text;
    return e;
  }

  function makeTopic(topic) {
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

  function makeGroup(title, topics, old) {
    const g = document.createElement("div");
    g.className = "c-group" + (old ? " old" : "");
    g.appendChild(row("c-group-title", title));
    topics.forEach((topic) => g.appendChild(makeTopic(topic)));
    return g;
  }

  /* The box you write a comment in. With the backend off it never shows
     (there is nowhere to write to); on, but signed out, it is a one-line
     invitation. */
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
    box.maxLength = 2000;              /* the database refuses more anyway */
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
        .then(() => { box.value = ""; status.textContent = ""; printComments(); })
        .catch((h) => { status.textContent = "couldn't post: " + h.message; })
        .finally(() => { button.disabled = false; });
    });

    wrap.appendChild(box);
    wrap.appendChild(button);
    wrap.appendChild(status);
    return wrap;
  }

  function printComments() {
    if (!commentArea) return;
    const top = deck.lastElementChild;

    /* Live, the comments come from the database; otherwise from the pool.
       Both return the same shape, so the screen stays the same. */
    const source = (event) =>
      window.AH && AH.comments
        ? AH.comments(event)
        : Promise.resolve(COMMENTS_FOR(event));

    const fillComments = () => {
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

    /* When the card changes so does the text: it fades, then the new one arrives */
    if (commentArea.children.length) {
      commentArea.classList.add("faded");
      setTimeout(fillComments, 200);
    } else {
      fillComments();
    }
  }

  /* Keep VISIBLE cards on the deck at all times: new ones go at the back,
     and the top one (the last child) is what gets dragged. */
  /* A card already swiped must not come back. When signed in, the database
     does that filtering already (the deck function); this is for people
     looking around signed out. */
  const skip = new Set(
    window.AH && AH.swipedSlugs ? AH.swipedSlugs() : []
  );

  function fill() {
    while (deck.children.length < VISIBLE && index < CARDS.length) {
      if (skip.has(CARDS[index].slug)) { index++; continue; }
      deck.insertBefore(makeCard(index), deck.firstChild);
      index++;
    }
    stack();
    document.getElementById("ex-done").classList.toggle("open", deck.children.length === 0);
    printComments();
  }

  /* The ones behind sit a little smaller and a little lower */
  function stack() {
    const n = deck.children.length;
    [...deck.children].forEach((k, i) => {
      const depth = n - 1 - i;          // 0 = the top one
      k.style.zIndex = String(i);
      if (depth > 0) {
        k.style.transform = "translateY(" + depth * 14 + "px) scale(" + (1 - depth * 0.045) + ")";
      }
    });
  }

  /* --- the buttons on the left: deal the deck again --- */

  /* The same cards, from the start. They fly in from the left and
     land on the pile; the top card comes down last. */
  const EMPTY_MESSAGE = {
    "global deck": "that's everyone for tonight.",
    "friends liked swipes": "no friends have kept anything yet.",
    "i feel lucky": "nowhere left to be sent tonight.",
  };

  /* The filter at the top: city and kind. Live, the filtering happens
     in the database query; in local mode the list we hold is sifted. */
  function applyFilter(list) {
    const f = (window.AH && AH.filter) || {};
    if (!f.kind) return list;
    const name = f.kind.replace(/-/g, " ");
    return list.filter((e) => (e.kind || "").toLowerCase() === name);
  }

  /* Fetch the card source for the mode. They all return the same shape. */
  function sourceFor(mode) {
    if (mode === "friends liked swipes") {
      return window.AH && AH.friendsKept
        ? AH.friendsKept()
        : Promise.resolve([]);
    }
    if (mode === "i feel lucky") {
      /* Jump to a random city, then shuffle that city's deck. The
         filter updates itself too, so where you landed can be read off
         the choices above the deck. */
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
    if (done && mode) done.textContent = EMPTY_MESSAGE[mode] || EMPTY_MESSAGE["global deck"];

    return sourceFor(mode || "global deck").then((list) => {
      CARDS = list.length ? list : [];
      /* An empty deck: say why it is empty */
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
    fill();                       /* stack() puts them in their final places */

    const cards = [...deck.children];
    cards.forEach((k) => {
      k.dataset.lastState = k.style.transform || "";
      k.classList.remove("soft");
      k.style.transition = "none";
      k.style.transform = "translate(-46vw, -7vh) rotate(-17deg)";
      k.style.opacity = "0";
    });

    void deck.offsetWidth;         /* let the starting state be written */

    cards.forEach((k, i) => {
      const delay = i * 95;       /* in the DOM the last child is the top card */
      k.style.transition =
        "transform 0.52s cubic-bezier(0.2, 0.75, 0.25, 1) " + delay + "ms, " +
        "opacity 0.3s ease " + delay + "ms";
      k.style.transform = k.dataset.lastState;
      k.style.opacity = "1";
    });

    /* If a transition is cut short the cards must not stay invisible:
       when the time is up, write the final state by hand. A card being
       held is left alone. */
    setTimeout(() => {
      cards.forEach((k) => {
        if (!k.isConnected || k.classList.contains("held")) return;
        k.style.transition = "";
        k.style.transform = k.dataset.lastState;
        k.style.opacity = "1";
      });
    }, 95 * cards.length + 600);
  }

  /* When the filter changes, deal the deck again */
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

  /* --- reset the deck --- */

  const resetButton = document.getElementById("ex-reset");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (!window.AH || !AH.resetSwipes) return;
      /* Cannot be undone: the kept ones go too */
      if (!window.confirm(
        "reset the deck? everything you kept and everything you passed on is forgotten."
      )) return;

      resetButton.disabled = true;
      AH.resetSwipes().then(() => {
        /* Clear the traces on screen too; redeal writes the empty-deck
           message itself, so nothing else touches it here. */
        kept.length = 0;
        if (badge) { badge.textContent = "0"; badge.hidden = true; }
        if (box) box.classList.remove("taken");
        if (boxList) openBox(false);
        skip.clear();
        return redeal(currentMode());
      }).catch((err) => {
        console.warn("[afterhours] couldn't redeal after the reset:", err);
      }).finally(() => { resetButton.disabled = false; });
    });
  }

  /* Bring back what was kept in an earlier session (badge and list). */
  if (window.AH && AH.kept) {
    AH.kept().then((list) => {
      list.slice().reverse().forEach(keep);
    });
  }

  fill();
})();
