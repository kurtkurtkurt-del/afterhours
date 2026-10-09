/* afterhours — "get the web app": a red pill at the top right of every page,
   to the PWA (app/, published by app/tools/publish-pwa.sh). Inside the menu
   when the page has one (the menu is fixed, so it is always in view); on the
   pages without a menu it floats in the corner on its own. */

(function () {
  const URL = "https://kurtkurtkurt-del.github.io/afterhours-pwa/";

  const css = `
.webapp-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px 9px 12px; margin-left: 28px;
  border-radius: 999px; background: #d7261e; color: #fff;
  font-size: 14px; font-weight: 500; letter-spacing: -0.01em; line-height: 1;
  text-decoration: none; white-space: nowrap;
  transition: background 0.2s ease, transform 0.2s ease;
}
.webapp-cta:hover { background: #b51f18; transform: translateY(-1px); }
.webapp-cta::before {
  content: ""; width: 7px; height: 7px; border-radius: 50%; background: #fff;
  animation: webapp-pulse 2.4s ease-in-out infinite;
}
.webapp-cta span { font-size: 13px; }
.webapp-cta.floating { position: fixed; z-index: 11; top: 22px; right: 24px; margin: 0; }
@keyframes webapp-pulse { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .webapp-cta::before { animation: none; } }
@media (max-width: 720px) {
  /* On a phone the menu takes two rows; the pill sits right of the logo. */
  .header { position: fixed; }
  .webapp-cta { position: absolute; top: 12px; right: 16px; margin: 0; padding: 7px 11px 7px 10px; font-size: 12px; }
  .webapp-cta.floating { position: fixed; top: 12px; right: 16px; }
}`;

  function add() {
    if (document.querySelector(".webapp-cta")) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const a = document.createElement("a");
    a.className = "webapp-cta";
    a.href = URL;
    a.innerHTML = "get the web app <span>↗</span>";
    const header = document.querySelector(".header");
    if (header) header.appendChild(a);
    else {
      a.classList.add("floating");
      document.body.appendChild(a);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
})();
