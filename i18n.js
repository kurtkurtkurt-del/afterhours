/* afterhours — three languages: english, deutsch, türkçe.

   This is the first script on every page, in the <head>, and it is
   deliberately a plain blocking one:

     <script src="../i18n.js?v=NN"></script>

   It decides the language, writes it onto <html lang>, and pulls in the
   dictionaries (lang/en.js always — it is the fallback — plus the chosen
   one) before the body is parsed. So by the time any other script runs,
   AH.t() already answers in the right language, and nothing on the page
   has to wait for a fetch. Classic scripts only: the site is also opened
   straight from disk (file://), where modules and fetch() do not work.

   The order the language is decided in:
     1. ?lang=de in the address (also remembered)
     2. what was chosen before (localStorage "afterhours.lang")
     3. the browser's own languages
     4. english

   In the markup:
     data-i18n="key"                 → textContent
     data-i18n-html="key"            → innerHTML (for <br />, <span> …)
     data-i18n-attr="placeholder:key; aria-label:key2"
     data-lang-block="de"            → long pages written out per language;
                                       style.css shows the matching block
     data-lang-pick                  → an empty element that becomes the
                                       en / de / tr switch

   In scripts:
     AH.t("key", { name: "x" })      → "{name}" in the text is filled in
     AH.tn("key", 3, { … })          → picks key.one / key.other, {n} = 3
     AH.i18nApply(element)           → translate markup a script just built
     AH.setLang("tr")                → remember, tell the account, reload

   The words live in lang/src/*.json (all three languages side by side);
   python3 tools-lang.py builds lang/en.js, de.js, tr.js out of them and
   refuses to if a key is missing a language.                            */

(function () {
  var SUPPORTED = ["en", "de", "tr"];
  var NAMES = { en: "english", de: "deutsch", tr: "türkçe" };
  var KEY = "afterhours.lang";

  var AH = (window.AH = window.AH || {});
  var me = document.currentScript;
  var src = (me && me.getAttribute("src")) || "i18n.js";
  var root = src.replace(/i18n\.js.*$/, "");
  var version = (src.match(/\?v=\d+/) || [""])[0];

  function known(code) {
    code = String(code || "").toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(code) >= 0 ? code : null;
  }

  function remembered() {
    try { return known(localStorage.getItem(KEY)); } catch (_) { return null; }
  }

  function remember(code) {
    try { localStorage.setItem(KEY, code); } catch (_) {}
  }

  function fromAddress() {
    try { return known(new URLSearchParams(location.search).get("lang")); }
    catch (_) { return null; }
  }

  function fromBrowser() {
    var list = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < list.length; i++) {
      var code = known(list[i]);
      if (code) return code;
    }
    return null;
  }

  var asked = fromAddress();
  if (asked) remember(asked);
  var chosen = asked || remembered();
  var lang = chosen || fromBrowser() || "en";

  AH.lang = lang;
  AH.langs = SUPPORTED.slice();
  AH.langNames = NAMES;
  document.documentElement.lang = lang;

  /* The page is written in english. Until the words have been swapped
     the body stays hidden, so nobody watches it change language. */
  if (lang !== "en") document.documentElement.classList.add("i18n-wait");

  window.AH_LANG = window.AH_LANG || {};
  function pull(code) {
    document.write('<script src="' + root + "lang/" + code + ".js" + version + '"><\/script>');
  }
  pull("en");
  if (lang !== "en") pull(lang);

  /* ------------------------------------------------------------ words */

  function lookup(key) {
    var own = window.AH_LANG[lang];
    if (own && own[key] != null) return own[key];
    var en = window.AH_LANG.en;
    if (en && en[key] != null) return en[key];
    return undefined;
  }

  function fill(text, vars) {
    if (!vars || typeof text !== "string") return text;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return vars[name] == null ? whole : String(vars[name]);
    });
  }

  AH.t = function (key, vars) {
    var found = lookup(key);
    if (found === undefined) return key;
    return fill(found, vars);
  };

  AH.has = function (key) { return lookup(key) !== undefined; };

  /* One night, three nights. Turkish keeps the singular after a number,
     so its two forms are simply the same sentence. */
  AH.tn = function (key, n, vars) {
    var all = { n: n };
    for (var k in vars || {}) all[k] = vars[k];
    var form = Number(n) === 1 ? ".one" : ".other";
    var found = lookup(key + form);
    if (found === undefined) found = lookup(key + ".other");
    if (found === undefined) return key;
    return fill(found, all);
  };

  /* A synced night without a description of its own carries one stock
     sentence, written in english by the sync (sync-ticketmaster.mjs,
     bodyFor). It is ours, not data, so it is said in the page's language.
     Anything else is the organiser's text and stays as it came. */
  var SYNCED = /^A real night, straight off the listings for (.+?)\. What it turns into is decided at the door, same as always\.$/;
  AH.bodyText = function (body) {
    var found = SYNCED.exec(String(body || "").trim());
    return found ? AH.t("synced.body", { city: found[1] }) : body;
  };

  /* ----------------------------------------------------------- markup */

  function each(rootEl, selector, fn) {
    if (rootEl.matches && rootEl.matches(selector)) fn(rootEl);
    var list = rootEl.querySelectorAll(selector);
    for (var i = 0; i < list.length; i++) fn(list[i]);
  }

  function apply(rootEl) {
    rootEl = rootEl || document;

    each(rootEl, "[data-i18n]", function (el) {
      var found = lookup(el.getAttribute("data-i18n"));
      if (typeof found === "string") el.textContent = found;
    });

    each(rootEl, "[data-i18n-html]", function (el) {
      var found = lookup(el.getAttribute("data-i18n-html"));
      if (typeof found === "string") el.innerHTML = found;
    });

    each(rootEl, "[data-i18n-attr]", function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var at = pair.indexOf(":");
        if (at < 0) return;
        var name = pair.slice(0, at).trim();
        var found = lookup(pair.slice(at + 1).trim());
        if (name && typeof found === "string") el.setAttribute(name, found);
      });
    });

    each(rootEl, "[data-lang-pick]", buildPicker);
  }
  AH.i18nApply = apply;

  /* ------------------------------------------------------- the switch */

  function buildPicker(box) {
    if (box.dataset.langBuilt) return;
    box.dataset.langBuilt = "1";
    box.classList.add("lang");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", AH.t("lang.label"));

    SUPPORTED.forEach(function (code) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang-code";
      b.textContent = box.hasAttribute("data-lang-names") ? NAMES[code] : code;
      b.lang = code;
      b.title = NAMES[code];
      b.setAttribute("aria-label", NAMES[code]);
      b.setAttribute("aria-pressed", code === lang ? "true" : "false");
      b.addEventListener("click", function () { AH.setLang(code); });
      box.appendChild(b);
    });
  }

  function addToMenu() {
    var nav = document.querySelector(".header .header-links");
    if (!nav || nav.querySelector("[data-lang-pick]")) return;
    var box = document.createElement("span");
    box.setAttribute("data-lang-pick", "");
    nav.appendChild(box);
    buildPicker(box);
  }

  /* ------------------------------------------------------ the account */

  function userId() {
    return AH.session && AH.session.user && AH.session.user.id;
  }

  function canAsk() {
    return Boolean(AH.request && AH.signedIn && AH.signedIn() && AH.mode === "live" && userId());
  }

  function tellAccount(code) {
    if (!canAsk()) return Promise.resolve();
    return AH.request("/profile_settings?user_id=eq." + userId(), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ locale: code }),
    }).catch(function () {});
  }

  function reload() {
    /* A ?lang= left in the address would win over the new choice */
    try {
      var url = new URL(location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.delete("lang");
        location.replace(url.toString());
        return;
      }
    } catch (_) {}
    location.reload();
  }

  AH.setLang = function (code) {
    code = known(code);
    if (!code) return;
    remember(code);
    if (code === lang && !fromAddress()) return;

    var left = false;
    function go() { if (!left) { left = true; reload(); } }
    /* The account is told first, but a slow network must not hold the
       page: after 900 ms it changes anyway. */
    setTimeout(go, 900);
    tellAccount(code).then(go);
  };

  /* Somebody who signs in on a new device and has never chosen here gets
     the language their account remembers. A choice made on this device
     always wins over it. */
  function adoptFromAccount() {
    if (chosen || !canAsk()) return;
    AH.request("/profile_settings?user_id=eq." + userId() + "&select=locale")
      .then(function (rows) {
        var theirs = known(rows && rows[0] && rows[0].locale);
        if (!theirs) return;
        chosen = theirs;
        remember(theirs);
        if (theirs !== lang) reload();
      })
      .catch(function () {});
  }

  /* ------------------------------------------------------------ start */

  function show() {
    document.documentElement.classList.remove("i18n-wait");
  }

  function start() {
    try { apply(document); addToMenu(); } finally { show(); }

    var waits = [];
    if (AH.sessionReady) waits.push(AH.sessionReady);
    if (AH.ready) waits.push(AH.ready);
    if (waits.length) {
      Promise.all(waits).then(adoptFromAccount).catch(function () {});
      if (AH.onSessionChange) AH.onSessionChange(adoptFromAccount);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  /* Whatever happens, the page is never left hidden */
  setTimeout(show, 1500);
})();
