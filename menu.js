/* afterhours — the menu, according to who is signed in.
   It does two things:
     · adds "admin panel" in the middle when an admin is signed in
     · replaces "login" on the right with "welcome <name> (:"
   Signed out, the menu is exactly what the markup says.

   Hiding the admin link is NOT a security measure. The authority comes
   from the database (backend/sql/02_rls.sql); this is only appearance.  */

(function () {
  const AH = (window.AH = window.AH || {});
  if (!AH.sessionReady) return;

  /* Pages sit at different depths (root, explore/, explore/<slug>/). We
     work the root out from the logo's own href, so the site keeps working
     when it is published inside a folder on GitHub Pages. */
  function rootPath() {
    const logo = document.querySelector(".header .logo");
    const href = (logo && logo.getAttribute("href")) || "index.html";
    return href.replace(/index\.html$/, "");
  }

  function addAdminLink() {
    const header = document.querySelector(".header");
    if (!header || document.querySelector(".header-admin")) return;

    const a = document.createElement("a");
    a.className = "header-admin";
    a.href = rootPath() + "admin/index.html";
    a.textContent = "admin panel";

    /* The middle of the menu: between the logo and the links */
    const nav = header.querySelector(".header-links");
    header.insertBefore(a, nav);
    header.classList.add("isadmin");
  }

  function removeAdminLink() {
    const a = document.querySelector(".header-admin");
    if (a) a.remove();
    const header = document.querySelector(".header");
    if (header) header.classList.remove("isadmin");
  }

  /* --- the "login" link on the right --- */

  const loginLink = () => document.querySelector('.header-links a[href*="login/"]');

  function greet(name) {
    const a = loginLink();
    if (!a) return;
    if (!a.dataset.wasText) a.dataset.wasText = a.textContent;
    a.textContent = "welcome " + name + " (:";
  }

  function unGreet() {
    const a = loginLink();
    if (a && a.dataset.wasText) {
      a.textContent = a.dataset.wasText;
      delete a.dataset.wasText;
    }
  }

  /* Name order: handle → first part of the display name → first part of
     the email. "ahmet.selcuk.kurt" does not sit well in a menu; the first
     piece is enough. */
  function nameFor(profile) {
    if (profile && profile.handle) return profile.handle;
    const raw =
      (profile && profile.display_name) ||
      (AH.session && AH.session.user && AH.session.user.email) ||
      "";
    const first = String(raw).split("@")[0].split(/[.\s_]/)[0];
    return first ? first.toLowerCase() : "you";
  }

  function refresh() {
    if (!(AH.signedIn && AH.signedIn() && AH.request)) {
      removeAdminLink();
      unGreet();
      return;
    }
    const id = AH.session && AH.session.user && AH.session.user.id;
    if (!id) { removeAdminLink(); unGreet(); return; }

    AH.request("/profiles?id=eq." + id + "&select=handle,display_name,is_admin")
      .then((rows) => {
        const profile = (rows && rows[0]) || null;
        greet(nameFor(profile));
        if (profile && profile.is_admin) addAdminLink(); else removeAdminLink();
      })
      .catch(() => {
        /* A 401 can mean the session was dropped in the meantime (data.js
           discards an invalid token). Greeting then would be wrong: it was
           writing "welcome you" at people who were signed out. */
        if (AH.signedIn && AH.signedIn()) greet(nameFor(null));
        else unGreet();
        removeAdminLink();
      });
  }

  /* AH.request is defined by data.js, and on some pages that loads AFTER
     this file. Rather than trusting script order, we look once every
     script has run. */
  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  whenReady(() => {
    AH.sessionReady.then(refresh);
    if (AH.onSessionChange) AH.onSessionChange(refresh);
  });
})();
