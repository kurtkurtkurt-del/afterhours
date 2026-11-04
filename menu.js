/* afterhours — the menu, according to who is signed in (design 4, 04.11.2026).
   The header is a title page: the word-mark, one line of five words (messages ·
   connect · flow · map · account), and on the account pages a third line with what
   the app keeps behind account. This file touches only that third line:
     · "sign in" becomes "welcome <name> (:" and points at your page
     · "sign out" is added at the end, and works
     · "admin panel" joins the line when an admin is signed in (on a page without
       the line, a line is made for it)
   Signed out, the menu is exactly what the markup says.

   Hiding the admin link is NOT a security measure. The authority comes
   from the database (backend/sql/02_rls.sql); this is only appearance.  */

(function () {
  const AH = (window.AH = window.AH || {});
  if (!AH.sessionReady) return;
  const t = (k, v) => (AH.t ? AH.t(k, v) : k);

  /* Pages sit at different depths (root, explore/, explore/<slug>/). We
     work the root out from the logo's own href, so the site keeps working
     when it is published inside a folder on GitHub Pages. */
  function rootPath() {
    const logo = document.querySelector(".header .logo");
    const href = (logo && logo.getAttribute("href")) || "index.html";
    return href.replace(/index\.html$/, "");
  }

  /* the third line: there on the account pages; made when the admin needs it */
  function subLine(make) {
    const header = document.querySelector(".header");
    if (!header) return null;
    let sub = header.querySelector(".header-sub");
    if (!sub && make) {
      sub = document.createElement("nav");
      sub.className = "header-sub";
      header.appendChild(sub);
    }
    return sub;
  }

  function addAdminLink() {
    if (document.querySelector(".header-admin")) return;
    const sub = subLine(true);
    if (!sub) return;
    const a = document.createElement("a");
    a.className = "header-admin";
    a.href = rootPath() + "admin/index.html";
    a.textContent = t("menu.admin");
    sub.appendChild(a);
    document.querySelector(".header").classList.add("isadmin");
  }

  function removeAdminLink() {
    const a = document.querySelector(".header-admin");
    if (a) a.remove();
    const header = document.querySelector(".header");
    if (header) header.classList.remove("isadmin");
    const sub = subLine(false);
    if (sub && !sub.children.length) sub.remove();
  }

  /* --- "sign in" ↔ "welcome <name> (:" and the sign-out word --- */

  const me = () => document.querySelector(".header-sub .header-me");

  function greet(name) {
    const a = me();
    if (!a) return;
    if (!a.dataset.wasText) { a.dataset.wasText = a.textContent; a.dataset.wasHref = a.getAttribute("href"); }
    a.textContent = t("menu.welcome", { name: name });
    a.href = rootPath() + "profile/index.html";
    if (!document.querySelector(".header-out")) {
      const out = document.createElement("a");
      out.className = "header-out";
      out.href = "#";
      out.textContent = t("nav.signout");
      out.addEventListener("click", (e) => {
        e.preventDefault();
        AH.signOut().then(() => { location.href = rootPath() + "login/index.html"; });
      });
      const sub = a.parentNode;
      const admin = sub.querySelector(".header-admin");
      sub.insertBefore(out, admin || null);
    }
  }

  function unGreet() {
    const a = me();
    if (a && a.dataset.wasText) {
      a.textContent = a.dataset.wasText;
      a.setAttribute("href", a.dataset.wasHref);
      delete a.dataset.wasText; delete a.dataset.wasHref;
    }
    const out = document.querySelector(".header-out");
    if (out) out.remove();
  }

  /* Name order: handle → first part of the display name → first part of
     the email. "first.middle.last" does not sit well in a menu; the first
     piece is enough. */
  function nameFor(profile) {
    if (profile && profile.handle) return profile.handle;
    const raw =
      (profile && profile.display_name) ||
      (AH.session && AH.session.user && AH.session.user.email) ||
      "";
    const first = String(raw).split("@")[0].split(/[.\s_]/)[0];
    return first ? first.toLowerCase() : t("menu.you");
  }

  /* The "last seen" a friend gets from profile_card() only moves when
     seen() is called, and nothing was calling it — the day shown was
     forever the registration day. This page-load stamp is enough (the
     value only ever leaves the database as a DAY), throttled so walking
     around the site is one request an hour, not one per page. */
  function stampSeen() {
    const KEY = "afterhours.seen";
    try {
      if (Date.now() - Number(localStorage.getItem(KEY) || 0) < 3600e3) return;
      localStorage.setItem(KEY, String(Date.now()));
    } catch (_) {}
    AH.request("/rpc/seen", { method: "POST", body: "{}" }).catch(() => {});
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
        stampSeen();
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
