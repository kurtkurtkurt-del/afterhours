/* afterhours — the session.
   We talk straight to Supabase Auth's REST endpoint. No SDK, because the
   site's rule is zero dependencies.

   Two ways in are wired up: a password (what the site actually uses) and
   a link sent by email (AH.requestLink, kept because it needs no password
   at all — it is unused for now because the built-in mailer is rate
   limited). A token arriving in the address bar as #access_token=... is
   picked up, stored, and then wiped from the URL so it does not sit in
   history or in a shared link.

   With config.js empty this whole file quietly does nothing.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const CONFIG = window.AH_CONFIG || {};

  /* Same development redirect as data.js; localhost only. */
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    const override = new URLSearchParams(location.search).get("backend");
    if (override) { CONFIG.url = override; CONFIG.anonKey = CONFIG.anonKey || "local"; }
  }

  const enabled = Boolean(CONFIG.url && CONFIG.anonKey);
  const KEY = "afterhours.session";
  const OLD_KEY = "afterhours.oturum";        /* before the code spoke English */

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

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || "null");
    } catch (_) { return null; }
  }
  function write(session) {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
      localStorage.removeItem(OLD_KEY);
    } catch (_) {}
    AH.session = session;
    AH.token = session && session.access_token;
    announce();
  }

  AH.session = read();
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

  /* Store the token that came back. expires_in is in seconds.
     `fresh` means a new token arrived from the address bar — the stored
     user may then belong to SOMEBODY ELSE and has to be dropped. */
  function storeToken(answer, fresh) {
    if (!answer || !answer.access_token) return null;
    const session = {
      access_token: answer.access_token,
      refresh_token: answer.refresh_token,
      expiresAt: Date.now() + (answer.expires_in || 3600) * 1000,
      user: answer.user || (!fresh && AH.session && AH.session.user) || null,
    };
    write(session);
    return session;
  }

  /* --- what the pages use --- */

  AH.requestLink = function (email) {
    return auth("/otp", {
      method: "POST",
      body: JSON.stringify({
        email,
        create_user: true,
        options: { email_redirect_to: location.origin + location.pathname },
      }),
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
     answer; we return null and the page says to go and open the link. */
  AH.signUp = function (email, password, extra) {
    return auth("/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: extra || {},
        options: { email_redirect_to: location.origin + location.pathname },
      }),
    }).then((answer) => {
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

  /* Drop the local session without asking the server. If the token is no
     longer valid (it belongs to another project, or it expired) there is
     nothing to ask. */
  AH.dropSession = function () { write(null); };

  /* --- on load: take the token from the URL, refresh an expiring one --- */

  function tokenFromUrl() {
    if (!location.hash || location.hash.indexOf("access_token") < 0) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    const answer = {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      expires_in: Number(params.get("expires_in") || 3600),
    };
    /* Keep the token out of the address bar: it ends up in history and in
       whatever link gets shared. */
    history.replaceState(null, "", location.pathname + location.search);
    return storeToken(answer, true);
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
    : Promise.resolve(tokenFromUrl() || refresh()).then(() => {
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
