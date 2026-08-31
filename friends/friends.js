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

  const friendForm = document.getElementById("friend-form");
  const friendField = document.getElementById("friend-field");
  const friendStatus = document.getElementById("friend-status");
  const friendList = document.getElementById("friend-list");
  const keptList = document.getElementById("kept-list");
  const nrSection = document.querySelector(".nr-section");

  const REQUEST_WORDS = {
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

  /* What profile_setup() answers, in this page's words. */
  const HANDLE_WORDS = {
    ok: "saved.",
    taken: "someone already has that one.",
    format: "3–20 characters: lowercase letters, digits, underscore.",
    empty: "write a handle first.",
    signedout: "sign in again — the session went away.",
  };

  handleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleStatus.textContent = "saving…";
    AH.setHandle(handleField.value)
      .then((s) => {
        handleStatus.textContent = HANDLE_WORDS[s] || "couldn't save that handle.";
      })
      .catch((h) => {
        handleStatus.textContent = AH.errorText(h, "couldn't save that handle.");
      });
  });

  /* --- the friends --- */

  function loadFriends() {
    AH.friends().then((list) => {
      friendList.textContent = "";
      if (!list.length) {
        const empty = document.createElement("li");
        empty.className = "friend-empty";
        empty.textContent = "no friends yet.";
        friendList.appendChild(empty);
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
          const accept = document.createElement("button");
          accept.className = "friend-action";
          accept.type = "button";
          accept.textContent = "accept";
          accept.addEventListener("click", () =>
            AH.friendAccept(a.other_id).then(loadFriends));
          row.appendChild(accept);
        }

        const remove = document.createElement("button");
        remove.className = "friend-action delete";
        remove.type = "button";
        remove.textContent = a.status === "accepted" ? "remove" : "cancel";
        remove.addEventListener("click", () =>
          AH.friendRemove(a.other_id).then(loadFriends));
        row.appendChild(remove);

        friendList.appendChild(row);
      });
    });
  }

  friendForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const h = friendField.value.trim();
    if (!h) return;
    friendStatus.textContent = "…";
    AH.friendRequest(h)
      .then((c) => {
        friendStatus.textContent = REQUEST_WORDS[c] || String(c);
        if (c === "sent" || c === "accepted") { friendField.value = ""; loadFriends(); }
      })
      .catch((h) => { friendStatus.textContent = AH.errorText(h, "couldn't send that request."); });
  });

  /* --- kept --- */

  function loadKept() {
    if (!AH.kept) return;
    AH.kept().then((list) => {
      keptList.textContent = "";
      if (!list.length) {
        const empty = document.createElement("li");
        empty.className = "friend-empty";
        empty.textContent = "nothing kept yet. swipe a card right in explore.";
        keptList.appendChild(empty);
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
        keptList.appendChild(row);
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
