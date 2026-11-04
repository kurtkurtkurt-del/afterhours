/* afterhours — two pills at the top right of every page: "get the app" (App Store
   blue, to the store) over "get the web app" (red, to the PWA published by
   app/tools/publish-pwa.sh) (owner, 04.11.2026). Inside the header when the page
   has one (fixed, so always in view); on the pages without a header they float. */

(function () {
  const URL = "https://kurtkurtkurt-del.github.io/afterhours-pwa/";
  const STORE = "https://play.google.com/store/apps/details?id=app.afterhours.android";

  const css = `
.app-ctas { display: inline-flex; flex-direction: column; align-items: stretch; gap: 6px; margin-left: 28px; }
.app-ctas.floating { position: fixed; z-index: 11; top: 22px; right: 24px; margin: 0; }
.app-cta, .webapp-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px 9px 12px;
  border-radius: 999px; background: #d7261e; color: #fff;
  font-size: 14px; font-weight: 500; letter-spacing: -0.01em; line-height: 1;
  text-decoration: none; white-space: nowrap;
  transition: background 0.2s ease, transform 0.2s ease;
}
.webapp-cta:hover { background: #b51f18; transform: translateY(-1px); }
.app-cta { background: #0a84ff; }
.app-cta:hover { background: #0866c7; transform: translateY(-1px); }
.app-cta::before, .webapp-cta::before {
  content: ""; width: 7px; height: 7px; border-radius: 50%; background: #fff;
  animation: webapp-pulse 2.4s ease-in-out infinite;
}
.app-cta span, .webapp-cta span { font-size: 13px; }
@keyframes webapp-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .app-cta::before, .webapp-cta::before { animation: none; } }
@media (max-width: 720px) {
  /* On a phone the menu takes two rows; the pill sits right of the logo. */
  .header { position: fixed; }
  .app-ctas { position: absolute; top: 12px; right: 16px; margin: 0; gap: 4px; }
  .app-ctas.floating { position: fixed; top: 12px; right: 16px; }
  .app-cta, .webapp-cta { padding: 7px 11px 7px 10px; font-size: 12px; }
}`;

  function add() {
    if (document.querySelector(".webapp-cta")) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const box = document.createElement("span");
    box.className = "app-ctas";
    const app = document.createElement("a");
    app.className = "app-cta";
    app.href = STORE;
    app.target = "_blank";
    app.rel = "noopener";
    app.innerHTML = "get the app <span>↗</span>";
    const a = document.createElement("a");
    a.className = "webapp-cta";
    a.href = URL;
    a.innerHTML = "get the web app <span>↗</span>";
    box.appendChild(app);
    box.appendChild(a);
    const header = document.querySelector(".header");
    /* the header's right cell: the pills, then the language globe (i18n.js) */
    if (header) {
      let right = header.querySelector(".header-right");
      if (!right) { right = document.createElement("span"); right.className = "header-right"; header.appendChild(right); }
      right.insertBefore(box, right.querySelector(".lang-menu"));
    } else {
      box.classList.add("floating");
      document.body.appendChild(box);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
})();
