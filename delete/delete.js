/* afterhours — delete an account from the web (F7, 20.10.2026).
   Play asks for a web address where an account can be deleted, and a person who
   signed up with Apple or Google has no password for the site. So the email is
   proven the way reset/ proves it: the recovery link lands back HERE signed in
   (session.js reads the token from the hash), and the page asks for the word
   "delete" before it calls delete_account (65). The files in the photo bucket go
   with the profile row on the server (82). Apple's token is not revoked from the
   web; the done screen says where to unlink it by hand.
   Since 111 the server deletes only for a sign-in from the last ten minutes, so a
   session that is older (or a stolen one) is sent the link first, the same way. */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const request = el("dl-request");
  const confirm = el("dl-confirm");
  const done = el("dl-done");
  if (!request || !confirm) return;

  function say(box, text, kind) {
    box.textContent = text || "";
    box.className = "page-note" + (kind ? " " + kind : "");
  }

  const CONFIG = window.AH_CONFIG || {};
  if (!(CONFIG.url && CONFIG.anonKey)) {
    el("dl-form").hidden = true;
    say(el("dl-note"), AH.t("reset.closed"), "waiting");
    return;
  }

  /* signed in, but long ago: the link again, with the address filled in */
  function askForLink() {
    request.hidden = false;
    confirm.hidden = true;
    const email = AH.session && AH.session.user && AH.session.user.email;
    if (email && !el("dl-email").value) el("dl-email").value = email;
    say(el("dl-note"), AH.t("del.fresh"), "waiting");
  }

  function render() {
    if (!done.hidden) return;
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    request.hidden = signedIn;
    confirm.hidden = !signedIn;
    const email = AH.session && AH.session.user && AH.session.user.email;
    el("dl-who").textContent = email ? AH.t("login.in.as", { email: email }) : "";
    if (signedIn) {
      AH.request("/rpc/signed_in_recently", { method: "POST", body: "{}" })
        .then((fresh) => { if (fresh !== true) askForLink(); })
        .catch(() => {});
    }
  }

  el("dl-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = el("dl-email").value.trim();
    if (!email || email.indexOf("@") < 1) {
      say(el("dl-note"), AH.t("login.bad.email"), "error");
      el("dl-email").focus();
      return;
    }
    el("dl-send").disabled = true;
    say(el("dl-note"), AH.t("reset.sending"));
    AH.requestRecovery(email, location.origin + location.pathname)
      .then(() => say(el("dl-note"), AH.t("del.sent"), "ok"))
      .catch((h) => say(el("dl-note"), /rate|429/i.test(String(h.message))
        ? AH.t("reset.rate")
        : AH.errorText(h, AH.t("reset.send.failed")), "error"))
      .finally(() => { el("dl-send").disabled = false; });
  });

  el("dl-confirm-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const word = el("dl-word").value.trim().toLowerCase();
    if (word !== AH.t("del.word").toLowerCase() && word !== "delete") {
      say(el("dl-confirm-note"), AH.t("del.word.wrong"), "error");
      el("dl-word").focus();
      return;
    }
    el("dl-go").disabled = true;
    say(el("dl-confirm-note"), AH.t("settings.delete.working"));
    AH.request("/rpc/delete_account", { method: "POST", body: "{}" })
      .then(() => {
        AH.dropSession();
        request.hidden = true;
        confirm.hidden = true;
        done.hidden = false;
      })
      .catch((h) => {
        el("dl-go").disabled = false;
        if (/sign in again first/i.test(String(h && h.message))) return askForLink();
        say(el("dl-confirm-note"), AH.errorText(h, AH.t("settings.delete.failed")), "error");
      });
  });

  AH.sessionReady.then(() => {
    render();
    if (AH.urlProblem && !AH.signedIn()) say(el("dl-note"), AH.authText(AH.urlProblem), "error");
  });
  AH.onSessionChange(render);
})();
