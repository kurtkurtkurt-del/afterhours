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

  const AYAR = window.AH_CONFIG || {};
  const open = Boolean(AYAR.url && AYAR.anonKey);

  function report(text, kind) {
    note.textContent = text || "";
    note.className = "page-note" + (kind ? " " + kind : "");
  }

  /* If the backend is not connected yet, be honest: the form does not work
     and it says why. */
  if (!open) {
    form.hidden = true;
    report("sign-in opens when the backend does. nothing to sign into yet.", "waiting");
    return;
  }

  function render() {
    const signedIn = window.AH && AH.signedIn();
    form.hidden = signedIn;
    inside.hidden = !signedIn;
    if (signedIn) {
      const k = AH.session && AH.session.user;
      who.textContent = k && k.email ? "you're in as " + k.email : "you're in.";
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
      report("that doesn't look like an email.", "error");
      field.focus();
      return;
    }
    if (!password) {
      report("your password is missing.", "error");
      passwordField.focus();
      return;
    }

    submitButton.disabled = true;
    report("signing in…");
    AH.signInWithPassword(email, password)
      .then(() => { passwordField.value = ""; render(); report("you're in.", "ok"); })
      .catch((h) => {
        report(/invalid|credentials/i.test(h.message)
          ? "wrong email or password."
          : "couldn't sign in: " + h.message, "error");
      })
      .finally(() => { submitButton.disabled = false; });
  });

  signOutButton.addEventListener("click", () => {
    AH.signOut().then(() => { render(); report("signed out.", "ok"); });
  });

  /* The handle and the friends used to live here; they moved to the
     friends&more page (friends/friends.js). Copies were left behind, went
     looking for elements that were not there, and stopped the file
     halfway: a TypeError on line 173, and nothing after it ever ran.
     Removed. */

})();
