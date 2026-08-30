/* afterhours — geri bildirim sayfasi.
   Tek is: yazilani feedback tablosuna eklemek. Giris istemiyor —
   bozuk bir seyi bildirmek icin once hesap acmak sacma olurdu.
   Girisliyken kim oldugun kendiliginden yaziliyor (author_id
   varsayilani auth.uid()), girissizken istersen bir iletisim
   satiri birakiyorsun.

   Yazileni kimse geri okuyamiyor, yonetici disinda: bu bir gelen
   kutusu, konusma degil (backend/sql/13_feedback.sql).  */

(function () {
  const AH = (window.AH = window.AH || {});
  const el = (id) => document.getElementById(id);

  const form = el("fb-form");
  const metin = el("fb-text");
  const durum = el("fb-status");
  if (!form || !metin) return;

  let tur = "broken";

  function soyle(yazi, cesit) {
    durum.textContent = yazi || "";
    durum.className = "account-status" + (cesit ? " " + cesit : "");
  }

  /* --- konu secimi --- */
  const turKutu = el("fb-kind");
  [...turKutu.querySelectorAll("button")].forEach((d) => {
    d.onclick = () => {
      tur = d.dataset.deger;
      [...turKutu.querySelectorAll("button")].forEach((x) =>
        x.classList.toggle("selected", x === d));
    };
  });
  turKutu.querySelector("button").classList.add("selected");

  /* --- sayac: sinira yaklasinca gorunuyor --- */
  metin.addEventListener("input", () => {
    const n = metin.value.trim().length;
    el("fb-counter").textContent = n > 1700 ? (2000 - n) + " characters left" : "";
    if (durum.textContent) soyle("");
  });

  /* --- gonder --- */
  el("fb-send").onclick = function () {
    const yazi = metin.value.trim();
    if (yazi.length < 10) {
      soyle("a few more words, so it can be acted on.", "error");
      metin.focus();
      return;
    }
    if (!AH.request) {
      soyle("this opens when the backend does.", "error");
      return;
    }

    const govde = { kind: tur, body: yazi };
    const iletisim = el("fb-contact").value.trim();
    if (iletisim && !AH.signedIn()) govde.contact = iletisim;

    soyle("sending…");
    el("fb-send").disabled = true;

    AH.request("/feedback", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(govde),
    })
      .then(() => {
        form.hidden = true;
        el("fb-thanks").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((h) => {
        el("fb-send").disabled = false;
        soyle(AH.errorText(h, "couldn't send it. the words are still here."), "hata");
      });
  };

  el("fb-again").onclick = function () {
    metin.value = "";
    el("fb-counter").textContent = "";
    el("fb-send").disabled = false;
    soyle("");
    el("fb-thanks").hidden = true;
    form.hidden = false;
    metin.focus();
  };

  /* --- girisliysen iletisim satirini sormuyoruz --- */
  function ekraniKur() {
    const girisli = Boolean(AH.signedIn && AH.signedIn());
    const eposta = AH.session && AH.session.user && AH.session.user.email;
    el("fb-contact").hidden = girisli;
    el("fb-contact-note").textContent = girisli
      ? "You are signed in" + (eposta ? " as " + eposta : "") +
        ", so we already know where to find you."
      : "Optional. Leave it out and the message still gets read — there just will " +
        "not be an answer.";
  }

  AH.sessionReady.then(ekraniKur).catch(ekraniKur);
  AH.onSessionChange(ekraniKur);
})();
