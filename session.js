/* afterhours — oturum.
   Supabase Auth'un REST ucuna dogrudan konusuyoruz; SDK yok, sitenin
   sifir bagimlilik kurali bozulmasin diye.

   Sifre YOK: e-postaya bir baglanti gidiyor, tiklayinca donuyorsun.
   Adres cubugundaki #access_token=... yakalanip saklaniyor, sonra
   adresten siliniyor ki jeton gecmiste durmasin.

   config.js bos ise burasi sessizce devre disi kalir.  */

(function () {
  const AH = (window.AH = window.AH || {});
  const AYAR = window.AH_CONFIG || {};

  /* data.js ile ayni gelistirme yonlendirmesi; sadece localhost'ta. */
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    const p = new URLSearchParams(location.search).get("backend");
    if (p) { AYAR.url = p; AYAR.anonKey = AYAR.anonKey || "local"; }
  }

  const acik = Boolean(AYAR.url && AYAR.anonKey);
  const KUTU = "afterhours.oturum";

  const dinleyiciler = [];
  AH.onSessionChange = (f) => { dinleyiciler.push(f); return () => {
    const i = dinleyiciler.indexOf(f); if (i >= 0) dinleyiciler.splice(i, 1);
  }; };
  const duyur = () => dinleyiciler.forEach((f) => { try { f(AH.session); } catch (e) { console.warn(e); } });

  function oku() {
    try { return JSON.parse(localStorage.getItem(KUTU) || "null"); } catch (_) { return null; }
  }
  function yaz(o) {
    try { o ? localStorage.setItem(KUTU, JSON.stringify(o)) : localStorage.removeItem(KUTU); }
    catch (_) {}
    AH.session = o;
    AH.token = o && o.access_token;
    duyur();
  }

  AH.session = oku();
  AH.token = AH.session && AH.session.access_token;

  function auth(yol, secenek = {}) {
    if (!acik) return Promise.reject(new Error("backend kapali"));
    return fetch(AYAR.url.replace(/\/$/, "") + "/auth/v1" + yol, {
      ...secenek,
      headers: {
        apikey: AYAR.anonKey,
        "Content-Type": "application/json",
        ...(secenek.headers || {}),
      },
    }).then(async (c) => {
      const govde = c.status === 204 ? null : await c.json().catch(() => null);
      if (!c.ok) throw new Error((govde && (govde.msg || govde.error_description || govde.message)) || c.status);
      return govde;
    });
  }
  AH.auth = auth;

  /* Donen jetonu sakla. expires_in saniye cinsinden.
     yeniGiris: adresten taze bir jeton geldi demek — o zaman saklanan
     kullanici bilgisi BASKA birine ait olabilir, atilmali. */
  function jetonuKaydet(c, yeniGiris) {
    if (!c || !c.access_token) return null;
    const o = {
      access_token: c.access_token,
      refresh_token: c.refresh_token,
      expiresAt: Date.now() + (c.expires_in || 3600) * 1000,
      user: c.user || (!yeniGiris && AH.session && AH.session.user) || null,
    };
    yaz(o);
    return o;
  }

  /* --- disa acilan --- */

  AH.requestLink = function (eposta) {
    return auth("/otp", {
      method: "POST",
      body: JSON.stringify({
        email: eposta,
        create_user: true,
        options: { email_redirect_to: location.origin + location.pathname },
      }),
    });
  };

  /* Sifreyle giris. Sitenin genelinde YOK: orada sifresiz baglanti var.
     Bu yol yalniz yonetim paneli icin, e-posta kotasina takilmadan
     girebilmek adina. Sifre hicbir yerde saklanmiyor; dogrudan
     Supabase'e gidiyor ve karsiliginda jeton geliyor. */
  AH.signInWithPassword = function (eposta, sifre) {
    return auth("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email: eposta, password: sifre }),
    }).then((c) => {
      const o = jetonuKaydet(c, true);
      if (!o) throw new Error("jeton gelmedi");
      return o;
    });
  };

  /* Hesap acma. Ustteki iki yol var olan bir hesabi acar, bu yenisini
     kurar. `ekstra` kayit formundan gelen handle/sehir/ad — Supabase
     bunu raw_user_meta_data'ya koyuyor ve profil tetikleyicisi oradan
     okuyor (backend/sql/12_profiles.sql).

     Projede e-posta dogrulamasi ACIKSA cevapta oturum gelmiyor; o zaman
     null donuyoruz ve sayfa "postana bak" diyor. */
  AH.signUp = function (eposta, sifre, ekstra) {
    return auth("/signup", {
      method: "POST",
      body: JSON.stringify({
        email: eposta,
        password: sifre,
        data: ekstra || {},
        options: { email_redirect_to: location.origin + location.pathname },
      }),
    }).then((c) => {
      const oturum = (c && c.session) || (c && c.access_token ? c : null);
      return oturum ? jetonuKaydet(oturum, true) : null;
    });
  };

  AH.signOut = function () {
    const j = AH.token;
    yaz(null);
    if (!j) return Promise.resolve();
    return auth("/logout", { method: "POST", headers: { Authorization: "Bearer " + j } })
      .catch(() => {});           /* sunucu ne derse desin, yerelde cikildi */
  };

  AH.fetchUser = function () {
    if (!AH.token) return Promise.resolve(null);
    return auth("/user", { headers: { Authorization: "Bearer " + AH.token } }).catch(() => null);
  };

  AH.signedIn = () => Boolean(AH.token);

  /* Sunucuya sormadan yerel oturumu birak. Jeton artik gecerli degilse
     (baska bir projeye ait, suresi gecmis) sunucuya gitmenin anlami yok. */
  AH.dropSession = function () { yaz(null); };

  /* --- acilista: adresteki jetonu al, sureli olani yenile --- */

  function adrestenAl() {
    if (!location.hash || location.hash.indexOf("access_token") < 0) return null;
    const p = new URLSearchParams(location.hash.slice(1));
    const c = {
      access_token: p.get("access_token"),
      refresh_token: p.get("refresh_token"),
      expires_in: Number(p.get("expires_in") || 3600),
    };
    /* Jeton adres cubugunda kalmasin: gecmise, paylasilan baglantiya girer */
    history.replaceState(null, "", location.pathname + location.search);
    return jetonuKaydet(c, true);
  }

  function yenile() {
    const o = AH.session;
    if (!o || !o.refresh_token) return Promise.resolve(null);
    if (o.expiresAt && o.expiresAt - Date.now() > 60000) return Promise.resolve(o);   /* daha var */
    return auth("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: o.refresh_token }),
    })
      .then(jetonuKaydet)
      .catch(() => { yaz(null); return null; });        /* yenilenemiyorsa cik */
  }

  AH.sessionReady = !acik
    ? Promise.resolve(null)
    : Promise.resolve(adrestenAl() || yenile()).then(() => {
        /* kullanici bilgisi yoksa bir kere cek */
        if (AH.token && AH.session && !AH.session.user) {
          return AH.fetchUser().then((k) => {
            if (k) yaz({ ...AH.session, user: k });
            return AH.session;
          });
        }
        return AH.session;
      });
})();
