/* afterhours — geri bildirim sayfasi.
   Tek is: yazilani feedback tablosuna eklemek. Giris istemiyor —
   bozuk bir seyi bildirmek icin once hesap acmak sacma olurdu.
   Girisliyken who oldugun kendiliginden yaziliyor (author_id
   varsayilani auth.uid()), girissizken istersen bir iletisim
   satiri birakiyorsun.

   Yazileni kimse geri okuyamiyor, yonetici disinda: bu bir gelen
   kutusu, konusma degil (backend/sql/13_feedback.sql).  */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const form = el("fb-form");
  const text = el("fb-text");
  const status = el("fb-status");
  if (!form || !text) return;

  let kind = "broken";

  function say(text, cesit) {
    status.textContent = text || "";
    status.className = "account-status" + (cesit ? " " + cesit : "");
  }

  /* --- konu secimi --- */
  const kindBox = el("fb-kind");
  [...kindBox.querySelectorAll("button")].forEach((d) => {
    d.onclick = () => {
      kind = d.dataset.value;
      [...kindBox.querySelectorAll("button")].forEach((x) =>
        x.classList.toggle("selected", x === d));
    };
  });
  kindBox.querySelector("button").classList.add("selected");

  /* --- sayac: sinira yaklasinca gorunuyor --- */
  text.addEventListener("input", () => {
    const n = text.value.trim().length;
    el("fb-counter").textContent = n > 1700 ? (2000 - n) + " characters left" : "";
    if (status.textContent) say("");
  });

  /* --- gonder --- */
  el("fb-send").onclick = function () {
    const text = text.value.trim();
    if (text.length < 10) {
      say("a few more words, so it can be acted on.", "error");
      text.focus();
      return;
    }
    if (!AH.request) {
      say("this opens when the backend does.", "error");
      return;
    }

    const body = { kind: kind, body: text };
    const iletisim = el("fb-contact").value.trim();
    if (iletisim && !AH.signedIn()) body.contact = iletisim;

    say("sending…");
    el("fb-send").disabled = true;

    AH.request("/feedback", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(body),
    })
      .then(() => {
        form.hidden = true;
        el("fb-thanks").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((h) => {
        el("fb-send").disabled = false;
        say(AH.errorText(h, "couldn't send it. the words are still here."), "hata");
      });
  };

  el("fb-again").onclick = function () {
    text.value = "";
    el("fb-counter").textContent = "";
    el("fb-send").disabled = false;
    say("");
    el("fb-thanks").hidden = true;
    form.hidden = false;
    text.focus();
  };

  /* --- girisliysen iletisim satirini sormuyoruz --- */
  function render() {
    const signedIn = Boolean(AH.signedIn && AH.signedIn());
    const email = AH.session && AH.session.user && AH.session.user.email;
    el("fb-contact").hidden = signedIn;
    el("fb-contact-note").textContent = signedIn
      ? "You are signed in" + (email ? " as " + email : "") +
        ", so we already know where to find you."
      : "Optional. Leave it out and the message still gets read — there just will " +
        "note be an answer.";
  }

  AH.sessionReady.then(render).catch(render);
  AH.onSessionChange(render);
})();
