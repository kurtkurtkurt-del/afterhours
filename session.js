/* afterhours — the session.
   We talk straight to Supabase Auth's REST endpoint. No SDK, because the
   site's rule is zero dependencies.

   Two ways in are wired up: a password (what the site actually uses) and
   a link sent by email (AH.requestLink, kept because it needs no password
   at all — it is unused for now because the built-in mailer is rate
   limited).

   Everything that leaves the site and comes back (Google, Apple, a mail
   link) comes back with a one-time ?code= that only this browser can
   trade for a session: PKCE. A token arriving in the address bar as
   #access_token=... is never taken — a link like that can sign anyone
   into somebody else's account (audit M-12). The session lives in
   sessionStorage, so it ends with the tab.

   With config.js empty this whole file quietly does nothing.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const CONFIG = window.AH_CONFIG || {};

  /* Same development switch as data.js: on localhost only, and only from
     localStorage — never from the address bar, where a link could send
     sign-ins somewhere else (audit L-7). */
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    let override = null;
    try { override = localStorage.getItem("afterhours.backend"); } catch (_) {}
    if (override && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(override)) {
      CONFIG.url = override; CONFIG.anonKey = CONFIG.anonKey || "local";
    }
  }

  const enabled = Boolean(CONFIG.url && CONFIG.anonKey);
  const KEY = "afterhours.session";
  const OLD_KEY = "afterhours.oturum";        /* before the code spoke English */
  const FLOW_KEY = "afterhours.pkce";          /* the verifier of a sign-in on its way */
  /* where a password-reset mail's session may live (sessionFromUrl below) */
  const RECOVERY_PAGES = /\/(reset|delete)\/(index\.html)?$/;

  const listeners = [];
  AH.onSessionChange = (fn) => {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  };
  const announce = () =>
    listeners.forEach((fn) => { try { fn(AH.session); } catch (e) { console.warn(e); } });

  /* The session sits in sessionStorage: it goes when the tab closes, and
     a new tab starts signed out. Until 28.10.2026 it sat in localStorage;
     a session found there is moved over once and wiped, so nobody is
     signed out by the change and nothing stays behind. */
  function read() {
    try {
      const kept = sessionStorage.getItem(KEY);
      if (kept) return JSON.parse(kept);
      const old = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      localStorage.removeItem(KEY);
      localStorage.removeItem(OLD_KEY);
      if (old) sessionStorage.setItem(KEY, old);
      return JSON.parse(old || "null");
    } catch (_) { return null; }
  }
  /* A session that came from a reset mail's token_hash only lives on
     reset/ and delete/: the link may have been made for somebody else's
     account, so it must not follow the person around the site. */
  function readHere() {
    const session = read();
    if (session && session.recovery && !RECOVERY_PAGES.test(location.pathname)) {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      return null;
    }
    return session;
  }
  function write(session) {
    try {
      if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
      else sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      localStorage.removeItem(OLD_KEY);
    } catch (_) {}
    AH.session = session;
    AH.token = session && session.access_token;
    announce();
  }

  AH.session = readHere();
  AH.token = AH.session && AH.session.access_token;

  function auth(path, options = {}) {
    if (!enabled) return Promise.reject(new Error("backend is off"));
    return fetch(CONFIG.url.replace(/\/$/, "") + "/auth/v1" + path, {
      ...options,
      headers: {
        apikey: CONFIG.anonKey,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }).then(async (res) => {
      const body = res.status === 204 ? null : await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body && (body.msg || body.error_description || body.message)) || res.status);
      }
      return body;
    });
  }
  AH.auth = auth;

  /* What Supabase Auth says arrives in english ("Invalid login
     credentials"). The ones we know get a sentence in the chosen
     language; anything else is shown as the server wrote it. The Error
     objects themselves keep the english text — other code matches on it. */
  const AUTH_WORDS = [
    [/invalid login credentials|invalid_credentials|invalid_grant/i, "session.auth.credentials"],
    [/email not confirmed/i, "session.auth.unconfirmed"],
    [/already registered|already exists|already been registered/i, "session.auth.registered"],
    [/password should be|password is too short|weak password/i, "session.auth.weak"],
    [/should be different from the old password/i, "session.auth.same"],
    [/email rate limit/i, "session.auth.rate"],
    [/for security purposes|rate limit|too many requests|^429$/i, "session.auth.wait"],
    [/signups? not allowed|signups? (is|are) disabled/i, "session.auth.closed"],
    [/unable to validate email|invalid format|email address .* is invalid/i, "session.auth.email"],
    [/jwt|token is expired|session (not found|expired)|refresh token/i, "session.auth.expired"],
    [/^sign in first$/i, "session.auth.signin"],
    [/^no token came back$/i, "session.auth.notoken"],
    [/^no sign-in started here$|flow state|code verifier|code challenge|otp_expired|link is invalid|has expired/i,
      "session.auth.link"],
    [/failed to fetch|networkerror|load failed|backend is off/i, "session.auth.offline"],
  ];
  AH.authText = function (error) {
    const raw = String((error && error.message) || error || "");
    for (let i = 0; i < AUTH_WORDS.length; i++) {
      const key = AUTH_WORDS[i][1];
      if (AUTH_WORDS[i][0].test(raw) && AH.t && AH.has && AH.has(key)) return AH.t(key);
    }
    return raw;
  };

  /* Store the token that came back. expires_in is in seconds.
     `fresh` means a new token arrived from the address bar — the stored
     user may then belong to SOMEBODY ELSE and has to be dropped. */
  function storeToken(answer, fresh, recovery) {
    if (!answer || !answer.access_token) return null;
    const session = {
      access_token: answer.access_token,
      refresh_token: answer.refresh_token,
      expiresAt: Date.now() + (answer.expires_in || 3600) * 1000,
      user: answer.user || (!fresh && AH.session && AH.session.user) || null,
    };
    if (recovery || (!fresh && AH.session && AH.session.recovery)) session.recovery = true;
    write(session);
    return session;
  }

  /* --- PKCE: the half of a sign-in that stays in this browser ---
     Before leaving for Google or sending a mail, a random verifier is kept
     here and only its hash goes to Supabase. What comes back is a ?code=
     that is worth nothing without the verifier. The verifier waits in
     localStorage (a mail link opens in a NEW tab, which has its own
     sessionStorage), bound to the page it must come back to, for a
     limited time, and is used once. One flow at a time: starting another
     replaces it. That stored flow is our `state` — a code that arrives
     with no flow started here is dropped without a request. */
  const b64url = (bytes) =>
    btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  function startFlow(back, minutes) {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const keep = (challenge, method) => {
      try {
        localStorage.setItem(FLOW_KEY, JSON.stringify({
          verifier,
          page: new URL(back, location.href).pathname,
          until: Date.now() + minutes * 60000,
        }));
      } catch (_) {}
      return { code_challenge: challenge, code_challenge_method: method };
    };
    /* crypto.subtle only exists on https and localhost; plain is what
       Supabase's own client falls back to elsewhere (a phone on the LAN) */
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(keep(verifier, "plain"));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
      .then((hash) => keep(b64url(hash), "s256"));
  }

  function takeFlow() {
    let flow = null;
    try {
      flow = JSON.parse(localStorage.getItem(FLOW_KEY) || "null");
      localStorage.removeItem(FLOW_KEY);
    } catch (_) {}
    if (flow && flow.page !== location.pathname) {
      /* a code on another page: leave the flow for the page it belongs to */
      try { localStorage.setItem(FLOW_KEY, JSON.stringify(flow)); } catch (_) {}
      return null;
    }
    if (!flow || !flow.verifier || !(flow.until > Date.now())) return null;
    return flow;
  }

  /* --- what the pages use --- */

  /* GoTrue takes the return address from ?redirect_to= only (a field in
     the body is ignored and the mail goes to the Site URL). */
  AH.requestLink = function (email) {
    const back = location.origin + location.pathname;
    return startFlow(back, 60).then((pkce) => auth("/otp?redirect_to=" + encodeURIComponent(back), {
      method: "POST",
      body: JSON.stringify({ email, create_user: true, ...pkce }),
    }));
  };

  /* The "forgot password" road (reset/). The recovery mail lands the
     person back on that page with a ?code= (or a ?token_hash=, see
     sessionFromUrl below), which becomes a session before the page's own
     script runs, and updatePassword writes the new one against it. */
  AH.requestRecovery = function (email, redirectTo) {
    const back = redirectTo || location.origin + location.pathname;
    return startFlow(back, 60).then((pkce) => auth("/recover?redirect_to=" +
        encodeURIComponent(back), {
      method: "POST",
      body: JSON.stringify({ email, ...pkce }),
    }));
  };

  AH.updatePassword = function (password) {
    if (!AH.token) return Promise.reject(new Error("sign in first"));
    return auth("/user", {
      method: "PUT",
      headers: { Authorization: "Bearer " + AH.token },
      body: JSON.stringify({ password }),
    }).then((answer) => {
      /* a reset mail's session has done its one job; sign in with the new password */
      if (AH.session && AH.session.recovery) write(null);
      return answer;
    });
  };

  /* Signing in with a password. Nothing is stored here; it goes straight
     to Supabase and a token comes back. */
  AH.signInWithPassword = function (email, password) {
    return auth("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then((answer) => {
      const session = storeToken(answer, true);
      if (!session) throw new Error("no token came back");
      return session;
    });
  };

  /* Opening an account. The two calls above sign into one that exists;
     this one creates it. `extra` is the handle/city/name the register form
     collected — Supabase puts it in raw_user_meta_data and the profile
     trigger reads it from there (backend/sql/12_profiles.sql).

     If the project asks for email confirmation there is no session in the
     answer; we return null and the page says to go and open the link. The
     link comes back to login/ (the address on Supabase's allow-list), where
     its ?code= is traded like any other. */
  AH.signUp = function (email, password, extra) {
    const back = location.origin + location.pathname.replace(/register\/(index\.html)?$/, "login/");
    return startFlow(back, 60).then((pkce) => auth("/signup?redirect_to=" + encodeURIComponent(back), {
      method: "POST",
      body: JSON.stringify({ email, password, data: extra || {}, ...pkce }),
    })).then((answer) => {
      const session = (answer && answer.session) ||
                      (answer && answer.access_token ? answer : null);
      return session ? storeToken(session, true) : null;
    });
  };

  AH.signOut = function () {
    const token = AH.token;
    write(null);
    if (!token) return Promise.resolve();
    return auth("/logout", { method: "POST", headers: { Authorization: "Bearer " + token } })
      .catch(() => {});          /* whatever the server says, we are out locally */
  };

  AH.fetchUser = function () {
    if (!AH.token) return Promise.resolve(null);
    return auth("/user", { headers: { Authorization: "Bearer " + AH.token } })
      .catch(() => null);
  };

  AH.signedIn = () => Boolean(AH.token);

  /* Apple or Google, the same account as in the app: Supabase sends the
     person to the provider and back to login/ with a ?code=, which
     sessionFromUrl below trades for a session. The provider has to be set
     up for the web in Supabase (backend/README.md, "one account, app and site"). */
  AH.signInWith = function (provider) {
    if (!enabled) return;
    const back = location.origin + location.pathname.replace(/register\/(index\.html)?$/, "login/");
    startFlow(back, 10).then((pkce) => {
      location.href = CONFIG.url.replace(/\/$/, "") + "/auth/v1/authorize?provider=" +
        encodeURIComponent(provider) + "&redirect_to=" + encodeURIComponent(back) +
        "&code_challenge=" + encodeURIComponent(pkce.code_challenge) +
        "&code_challenge_method=" + pkce.code_challenge_method;
    });
  };
  document.addEventListener("click", (ev) => {
    const b = ev.target && ev.target.closest && ev.target.closest("[data-provider]");
    if (b) AH.signInWith(b.getAttribute("data-provider"));
  });

  /* Drop the local session without asking the server. If the token is no
     longer valid (it belongs to another project, or it expired) there is
     nothing to ask. */
  AH.dropSession = function () { write(null); };

  /* --- on load: trade what the URL brought for a session, refresh an expiring one --- */

  /* Two things may arrive in the address, both one-time and both checked
     by Supabase before a session exists:
       ?code=…                 back from Google/Apple or a mail link started
                               HERE; traded with the verifier kept above
       ?token_hash=…&type=recovery
                               a password-reset mail from the Supabase
                               template (backend/README.md). It works on
                               another device too, so the app's reset mail
                               (asked for on the phone) can land here. Taken
                               only on reset/ and delete/ and only when no
                               one is signed in in this tab: a link like that
                               opens whoever's account it was made for, so it
                               must never replace a session (audit M-12).
     #access_token=… is wiped and ignored. Why something failed is kept on
     AH.urlProblem for the page to say. */

  function sessionFromUrl() {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    const code = query.get("code");
    const tokenHash = query.get("token_hash");
    const type = query.get("type");
    const failed = query.get("error_description") || hash.get("error_description");
    const implicit = hash.has("access_token") || hash.has("refresh_token");
    if (!code && !tokenHash && !failed && !implicit) return null;

    /* Out of the address bar first: it ends up in history and in whatever
       link gets shared. */
    ["code", "token_hash", "type", "error", "error_code", "error_description"]
      .forEach((k) => query.delete(k));
    const rest = query.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") +
      (implicit || failed ? "" : location.hash));

    if (failed) { AH.urlProblem = new Error(failed.replace(/\+/g, " ")); return null; }
    if (implicit) return null;

    let asking;
    if (code) {
      const flow = takeFlow();
      if (!flow) { AH.urlProblem = new Error("no sign-in started here"); return null; }
      asking = auth("/token?grant_type=pkce", {
        method: "POST",
        body: JSON.stringify({ auth_code: code, code_verifier: flow.verifier }),
      });
    } else {
      if (type !== "recovery" || !RECOVERY_PAGES.test(location.pathname)) return null;
      if (AH.token) return null;
      asking = auth("/verify", {
        method: "POST",
        body: JSON.stringify({ type, token_hash: tokenHash }),
      });
    }
    return asking
      .then((answer) => storeToken(answer, true, !code))
      .catch((err) => { AH.urlProblem = err; return null; });
  }

  function refresh() {
    const session = AH.session;
    if (!session || !session.refresh_token) return Promise.resolve(null);
    if (session.expiresAt && session.expiresAt - Date.now() > 60000) {
      return Promise.resolve(session);       /* still good */
    }
    return auth("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })
      .then(storeToken)
      .catch((err) => {
        /* Only a real answer from the server means the token is dead. A
           network failure (a tunnel, a dead wifi, a reload while offline)
           says nothing about the token — dropping the session there was
           signing people out for losing signal for a second. */
        if (/failed to fetch|networkerror|load failed/i.test(String(err && err.message))) {
          return session;                    /* keep it, try again next time */
        }
        write(null);
        return null;                         /* refused: really signed out */
      });
  }

  /* The data layer calls this before a request when the token is close to
     running out, so a page left open past the expiry keeps working. Cheap
     when nothing is due: the early return above answers without a fetch. */
  AH.refreshSession = refresh;

  AH.sessionReady = !enabled
    ? Promise.resolve(null)
    : Promise.resolve(sessionFromUrl()).then((fresh) => fresh || refresh()).then(() => {
        /* Fetch the user once if we do not have them yet */
        if (AH.token && AH.session && !AH.session.user) {
          return AH.fetchUser().then((user) => {
            if (user) write({ ...AH.session, user });
            return AH.session;
          });
        }
        return AH.session;
      });
})();
