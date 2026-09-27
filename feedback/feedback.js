/* afterhours — the feedback page.
   One job: adding what was written to the feedback table. It does not
   ask you to sign in — opening an account just to report something broken
   would be absurd. Signed in, who you are is filled in automatically
   (author_id defaults to auth.uid()); signed out you may leave a way to
   reach you.

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
    el("fb-counter").textContent = n > 1700 ? AH.tn("feedback.left", 2000 - n) : "";
    if (status.textContent) say("");
  });

  /* --- sending --- */
  el("fb-send").onclick = function () {
    const words = text.value.trim();
    if (words.length < 10) {
      say(AH.t("feedback.short"), "error");
      text.focus();
      return;
    }
    if (!AH.request) {
      say(AH.t("feedback.off"), "error");
      return;
    }

    const body = { kind: kind, body: words };
    const contact = el("fb-contact").value.trim();
    if (contact && !AH.signedIn()) body.contact = contact;

    say(AH.t("feedback.sending"));
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
        say(AH.errorText(h, AH.t("feedback.failed")), "error");
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
      ? (email
          ? AH.t("feedback.contact.signed.as", { email: email })
          : AH.t("feedback.contact.signed"))
      : AH.t("feedback.contact.optional");
  }

  /* Not data-i18n in the markup: that is applied once the page has
     loaded, and would write over what render() said about the session. */
  el("fb-contact-note").textContent = AH.t("feedback.contact.optional");

  AH.sessionReady.then(render).catch(render);
  AH.onSessionChange(render);
})();
