/* afterhours — friends & more.
   Your handle, your friends and what you kept. All of it needs an
   account; signed out, the page shows only an invitation.

   These sections used to live on the sign-in page, where they did not
   belong. That page is now nothing but signing in.  */

(function () {
  const CONFIG = window.AH_CONFIG || {};
  const outside = document.getElementById("fr-out");
  const inside = document.getElementById("fr-in");

  const handleForm = document.getElementById("handle-form");
  const handleField = document.getElementById("handle-field");
  const handleStatus = document.getElementById("handle-status");

  const arkForm = document.getElementById("friend-form");
  const arkAlan = document.getElementById("friend-field");
  const arkDurum = document.getElementById("friend-status");
  const arkListe = document.getElementById("friend-list");
  const tutListe = document.getElementById("kept-list");
  const nrSection = document.querySelector(".nr-section");

  const CEVAP = {
    sent: "request sent.",
    accepted: "you're friends now.",
    notfound: "nobody here by that handle.",
    yourself: "that's you.",
  };

  function render() {
    const signedIn = Boolean(window.AH && AH.signedIn && AH.signedIn());
    outside.hidden = signedIn;
    inside.hidden = !signedIn;
    showFamiliarFaces(signedIn);
    if (signedIn) { loadHandle(); loadFriends(); loadKept(); }
  }

  /* --- the handle --- */

  function loadHandle() {
    AH.myProfile().then((p) => { if (p && p.handle) handleField.value = p.handle; });
  }

  handleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleStatus.textContent = "saving…";
    AH.setHandle(handleField.value)
      .then((rows) => {
        handleStatus.textContent = rows && rows.length
          ? "saved."
          : "couldn't save — try signing in again.";
      })
      .catch((h) => {
        handleStatus.textContent = /duplicate|unique/i.test(h.message)
          ? "someone already has that one."
          : AH.errorText(h, "couldn't save that handle.");
      });
  });

  /* --- the friends --- */

  function loadFriends() {
    AH.friends().then((list) => {
      arkListe.textContent = "";
      if (!list.length) {
        const empty = document.createElement("li");
        empty.className = "friend-empty";
        empty.textContent = "no friends yet.";
        arkListe.appendChild(empty);
        return;
      }
      list.forEach((a) => {
        const row = document.createElement("li");
        row.className = "friend-row";

        const name = document.createElement("span");
        name.className = "friend-name";
        name.textContent = a.handle || a.display_name || "someone";

        const status = document.createElement("span");
        status.className = "friend-status-label";
        status.textContent =
          a.status === "accepted" ? "friends"
          : a.direction === "incoming" ? "wants to be friends" : "waiting";

        row.appendChild(name);
        row.appendChild(status);

        if (a.status === "pending" && a.direction === "incoming") {
          const kabul = document.createElement("button");
          kabul.className = "friend-action";
          kabul.type = "button";
          kabul.textContent = "accept";
          kabul.addEventListener("click", () =>
            AH.friendAccept(a.other_id).then(loadFriends));
          row.appendChild(kabul);
        }

        const cikar = document.createElement("button");
        cikar.className = "friend-action delete";
        cikar.type = "button";
        cikar.textContent = a.status === "accepted" ? "remove" : "cancel";
        cikar.addEventListener("click", () =>
          AH.friendRemove(a.other_id).then(loadFriends));
        row.appendChild(cikar);

        arkListe.appendChild(row);
      });
    });
  }

  arkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const h = arkAlan.value.trim();
    if (!h) return;
    arkDurum.textContent = "…";
    AH.friendRequest(h)
      .then((c) => {
        arkDurum.textContent = CEVAP[c] || String(c);
        if (c === "sent" || c === "accepted") { arkAlan.value = ""; loadFriends(); }
      })
      .catch((h) => { arkDurum.textContent = AH.errorText(h, "couldn't send that request."); });
  });

  /* --- kept --- */

  function loadKept() {
    if (!AH.kept) return;
    AH.kept().then((list) => {
      tutListe.textContent = "";
      if (!list.length) {
        const empty = document.createElement("li");
        empty.className = "friend-empty";
        empty.textContent = "nothing kept yet. swipe a card right in explore.";
        tutListe.appendChild(empty);
        return;
      }
      list.forEach((e) => {
        const row = document.createElement("li");
        const a = document.createElement("a");
        a.className = "kept-row";
        a.href = "../explore/" + e.slug + "/index.html";

        const g = document.createElement("object");
        g.type = "image/svg+xml";
        g.data = e.posterPath ||
          "../posters/" + String(e.poster || 1).padStart(2, "0") + ".svg";
        a.appendChild(g);

        const text = document.createElement("div");
        const name = document.createElement("p");
        name.className = "kept-name";
        name.textContent = e.title;
        const meta = document.createElement("p");
        meta.className = "kept-meta";
        meta.textContent = e.meta;
        text.appendChild(name);
        text.appendChild(meta);
        a.appendChild(text);

        row.appendChild(a);
        tutListe.appendChild(row);
      });
    });
  }

  /* --- the people from nachtradar --- */

  /* The list is there to tell someone signed out "there are people you
     know here"; once signed in you see your own friends and it goes. */
  function showFamiliarFaces(signedIn) {
    if (nrSection) nrSection.hidden = signedIn;
  }

  /* The content is the same for everyone, because for now it is a fixed
     list. Names only; no photograph, no badge. */
  function drawNachtradar() {
    const box = document.getElementById("nr");
    const about = document.getElementById("nr-about");
    const data = window.NACHTRADAR;
    if (!box || !data) return;

    const everyone = [
      ...data.crew.map((k) => ({ ...k, crew: true })),
      ...data.pending.map((k) => ({ ...k, crew: false })),
    ];

    about.textContent = "hundreds of people are already on the app.";

    box.textContent = "";
    everyone.forEach((k) => {
      const card = document.createElement("div");
      card.className = "nr-person" + (k.crew ? " crew" : "");

      /* No photograph: an initial. As much as an account is its own mark. */
      const im = document.createElement("span");
      im.className = "nr-img";
      im.textContent = (k.name || "?").trim()[0].toUpperCase();
      card.appendChild(im);

      const text = document.createElement("div");
      text.className = "nr-text";

      const name = document.createElement("p");
      name.className = "nr-name";
      name.textContent = k.name;
      text.appendChild(name);

      const sub = document.createElement("p");
      sub.className = "nr-handle";
      sub.textContent = k.handle ? "@" + k.handle : "no handle";
      text.appendChild(sub);

      card.appendChild(text);
      box.appendChild(card);
    });
  }

  drawNachtradar();

  /* The token is held locally, so the decision can be made before the
     first paint: a signed-in visitor never sees the list flash by. */
  showFamiliarFaces(Boolean(window.AH && AH.signedIn && AH.signedIn()));

  /* --- start --- */

  if (!(CONFIG.url && CONFIG.anonKey)) {
    outside.hidden = false;
    outside.querySelector(".page-note").textContent =
      "this opens when the backend does.";
    return;
  }

  AH.sessionReady.then(render);
  AH.onSessionChange(render);
})();
