/* afterhours — the feedback page.
   Tek is: yazilani feedback tablosuna eklemek. Giris istemiyor —
   opening an account just to report something broken would be absurd.
   Girisliyken who oldugun kendiliginden yaziliyor (author_id
   defaults to auth.uid()); signed out you may leave a way to reach
   satiri birakiyorsun.

   Nobody but the admin can read any of it back: this is an inbox, not a
   conversation (backend/sql/13_feedback.sql).  */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const form = el("fb-form");
  const text = el("fb-text");
  const status = el("fb-status");
  if (!form || !text) return;

  let kind = "broken";

  function say(text, kind) {
    status.textContent = text || "";
    status.className = "account-status" + (kind ? " " + kind : "");
  }

  /* --- choosing a subject --- */
  const kindBox = el("fb-kind");
  [...kindBox.querySelectorAll("button")].forEach((d) => {
    d.onclick = () => {
      kind = d.dataset.value;
      [...kindBox.querySelectorAll("button")].forEach((x) =>
        x.classList.toggle("selected", x === d));
    };
  });
  kindBox.querySelector("button").classList.add("selected");

  /* --- the counter: it appears as you near the limit --- */
  text.addEventListener("input", () => {
    const n = text.value.trim().length;
    el("fb-counter").textContent = n > 1700 ? (2000 - n) + " characters left" : "";
    if (status.textContent) say("");
  });

  /* --- sending --- */
  el("fb-send").onclick = function () {
    const text = text.value.trim();
    if (text.length < 10) {
      say("a few more words, so it can be acted on.", "error");
      text.focus();
      return;
    }
    if (!AH.request) {
      say("this opens when the backend does.", "error");
      return;
    }

    const body = { kind: kind, body: text };
    const iletisim = el("fb-contact").value.trim();
    if (iletisim && !AH.signedIn()) body.contact = iletisim;

    say("sending…");
    el("fb-send").disabled = true;

    AH.request("/feedback", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(body),
    })
      .then(() => {
        form.hidden = true;
        el("fb-thanks").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((h) => {
        el("fb-send").disabled = false;
        say(AH.errorText(h, "couldn't send it. the words are still here."), "error");
      });
  };

  el("fb-again").onclick = function () {
    text.value = "";
    el("fb-counter").textContent = "";
    el("fb-send").disabled = false;
    say("");
    el("fb-thanks").hidden = true;
    form.hidden = false;
    text.focus();
  };

  /* --- signed in, we do not ask for a contact line --- */
  function render() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    const email = AH.session && AH.session.user && AH.session.user.email;
    el("fb-contact").hidden = signedIn;
    el("fb-contact-note").textContent = signedIn
      ? "You are signed in" + (email ? " as " + email : "") +
        ", so we already know where to find you."
      : "Optional. Leave it out and the message still gets read — there just will " +
        "note be an answer.";
  }

  AH.sessionReady.then(render).catch(render);
  AH.onSessionChange(render);
})();
