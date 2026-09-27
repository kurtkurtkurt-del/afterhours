/* afterhours — the sign-in page.
   One job: take an email and a password, sign in, and say what
   happened.  */

(function () {
  const form = document.getElementById("page-form");
  const field = document.getElementById("page-email");
  const passwordField = document.getElementById("page-password");
  const submitButton = document.getElementById("page-button");
  const note = document.getElementById("page-note");
  const inside = document.getElementById("page-in");
  const who = document.getElementById("page-who");
  const signOutButton = document.getElementById("page-signout");

  const CONFIG = window.AH_CONFIG || {};
  const open = Boolean(CONFIG.url && CONFIG.anonKey);

  function report(text, kind) {
    note.textContent = text || "";
    note.className = "page-note" + (kind ? " " + kind : "");
  }

  /* If the backend is not connected yet, be honest: the form does not work
     and it says why. */
  if (!open) {
    form.hidden = true;
    report(AH.t("login.closed"), "waiting");
    return;
  }

  function render() {
    const signedIn = window.AH && AH.signedIn();
    form.hidden = signedIn;
    inside.hidden = !signedIn;
    if (signedIn) {
      const k = AH.session && AH.session.user;
      who.textContent = k && k.email ? AH.t("login.in.as", { email: k.email }) : AH.t("login.in");
      report("");
    }
  }

  AH.sessionReady.then(render);
  AH.onSessionChange(render);

  /* Signing in with a password. The password-less link route is still
     there (AH.requestLink) but is not in use: the built-in Supabase mailer
     is limited to a few messages an hour, and sign-in attempts kept
     running into it. */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = field.value.trim();
    const password = passwordField.value;

    if (!email || email.indexOf("@") < 1) {
      report(AH.t("login.bad.email"), "error");
      field.focus();
      return;
    }
    if (!password) {
      report(AH.t("login.no.password"), "error");
      passwordField.focus();
      return;
    }

    submitButton.disabled = true;
    report(AH.t("login.working"));
    AH.signInWithPassword(email, password)
      .then(() => { passwordField.value = ""; render(); report(AH.t("login.in"), "ok"); })
      .catch((h) => {
        report(/invalid|credentials/i.test(h.message)
          ? AH.t("login.wrong")
          : AH.t("login.failed", { why: AH.authText(h) }), "error");
      })
      .finally(() => { submitButton.disabled = false; });
  });

  signOutButton.addEventListener("click", () => {
    AH.signOut().then(() => { render(); report(AH.t("login.out"), "ok"); });
  });

  /* The handle and the friends used to live here; they moved to the
     friends&more page (since closed on the web). Copies were left behind, went
     looking for elements that were not there, and stopped the file
     halfway: a TypeError on line 173, and nothing after it ever ran.
     Removed. */

})();
