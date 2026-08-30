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

  const form = el("gb-form");
  const metin = el("gb-metin");
  const durum = el("gb-durum");
  if (!form || !metin) return;

  let tur = "broken";

  function soyle(yazi, cesit) {
    durum.textContent = yazi || "";
    durum.className = "hesap-durum" + (cesit ? " " + cesit : "");
  }

  /* --- konu secimi --- */
  const turKutu = el("gb-tur");
  [...turKutu.querySelectorAll("button")].forEach((d) => {
    d.onclick = () => {
      tur = d.dataset.deger;
      [...turKutu.querySelectorAll("button")].forEach((x) =>
        x.classList.toggle("secili", x === d));
    };
  });
  turKutu.querySelector("button").classList.add("secili");

  /* --- sayac: sinira yaklasinca gorunuyor --- */
  metin.addEventListener("input", () => {
    const n = metin.value.trim().length;
    el("gb-sayac").textContent = n > 1700 ? (2000 - n) + " characters left" : "";
    if (durum.textContent) soyle("");
  });

  /* --- gonder --- */
  el("gb-yolla").onclick = function () {
    const yazi = metin.value.trim();
    if (yazi.length < 10) {
      soyle("a few more words, so it can be acted on.", "hata");
      metin.focus();
      return;
    }
    if (!AH.istek) {
      soyle("this opens when the backend does.", "hata");
      return;
    }

    const govde = { kind: tur, body: yazi };
    const iletisim = el("gb-iletisim").value.trim();
    if (iletisim && !AH.girisliMi()) govde.contact = iletisim;

    soyle("sending…");
    el("gb-yolla").disabled = true;

    AH.istek("/feedback", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(govde),
    })
      .then(() => {
        form.hidden = true;
        el("gb-tesekkur").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((h) => {
        el("gb-yolla").disabled = false;
        soyle("couldn't send: " + h.message, "hata");
      });
  };

  el("gb-yeniden").onclick = function () {
    metin.value = "";
    el("gb-sayac").textContent = "";
    el("gb-yolla").disabled = false;
    soyle("");
    el("gb-tesekkur").hidden = true;
    form.hidden = false;
    metin.focus();
  };

  /* --- girisliysen iletisim satirini sormuyoruz --- */
  function ekraniKur() {
    const girisli = Boolean(AH.girisliMi && AH.girisliMi());
    const eposta = AH.oturum && AH.oturum.kullanici && AH.oturum.kullanici.email;
    el("gb-iletisim").hidden = girisli;
    el("gb-iletisim-not").textContent = girisli
      ? "You are signed in" + (eposta ? " as " + eposta : "") +
        ", so we already know where to find you."
      : "Optional. Leave it out and the message still gets read — there just will " +
        "not be an answer.";
  }

  AH.oturumHazir.then(ekraniKur).catch(ekraniKur);
  AH.oturumDegisti(ekraniKur);
})();
