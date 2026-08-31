/* afterhours — a new password.
   Two states on one page. Signed out it asks for an email and sends the
   recovery link; the link lands back HERE with a token in the hash
   (session.js picks it up before this file runs), and the page flips to
   the second state: type the new password, done. Because the second
   state only needs a session, it also works as plain "change my
   password" for someone already signed in.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const request = el("rs-request");
  const set = el("rs-set");
  const done = el("rs-done");
  if (!request || !set) return;

  function say(box, text, kind) {
    box.textContent = text || "";
    box.className = "page-note" + (kind ? " " + kind : "");
  }

  const CONFIG = window.AH_CONFIG || {};
  if (!(CONFIG.url && CONFIG.anonKey)) {
    el("rs-form").hidden = true;
    say(el("rs-note"), "this opens when the backend does.", "waiting");
    return;
  }

  function render() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    request.hidden = signedIn;
    set.hidden = !signedIn;
  }

  el("rs-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = el("rs-email").value.trim();
    if (!email || email.indexOf("@") < 1) {
      say(el("rs-note"), "that doesn't look like an email.", "error");
      el("rs-email").focus();
      return;
    }
    el("rs-send").disabled = true;
    say(el("rs-note"), "sending…");
    AH.requestRecovery(email, location.origin + location.pathname)
      .then(() => {
        say(el("rs-note"),
          "sent. open the link in your inbox and you land back here.", "ok");
      })
      .catch((h) => {
        /* The built-in mailer allows only a few messages an hour. */
        say(el("rs-note"), /rate|429/i.test(String(h.message))
          ? "too many mails just went out. give it a few minutes."
          : AH.errorText(h, "couldn't send the link."), "error");
      })
      .finally(() => { el("rs-send").disabled = false; });
  });

  el("rs-set-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const password = el("rs-password").value;
    if (password.length < 8) {
      say(el("rs-set-note"), "eight characters or more, please.", "error");
      el("rs-password").focus();
      return;
    }
    el("rs-save").disabled = true;
    say(el("rs-set-note"), "setting…");
    AH.updatePassword(password)
      .then(() => {
        set.hidden = true;
        done.hidden = false;
      })
      .catch((h) => {
        el("rs-save").disabled = false;
        say(el("rs-set-note"),
          AH.errorText(h, "couldn't set it. try the link once more."), "error");
      });
  });

  AH.sessionReady.then(render);
  AH.onSessionChange(render);
})();
