/* afterhours — host an event (owner, 04.11.2026): the poster on the left, the facts on
   the right, publish at the bottom. A night goes to the database as a submission
   (event_submit: staff look at it, then it is on the wall and in the app). The poster
   goes to the public posters bucket first, under the person's own id. */

(function () {
  const AH = (window.AH = window.AH || {});
  const t = (k, v) => (AH.t ? AH.t(k, v) : k);
  const $ = (id) => document.getElementById(id);

  const form = $("host-form");
  if (!form) return;
  const file = $("host-file"), preview = $("host-preview"), words = $("host-poster-words"), poster = $("host-poster");
  const said = $("host-said"), publish = $("host-publish");
  let kind = "", who = "tickets";

  /* --- the poster: pick or drop, then show it in the frame --- */
  function showFile(f) {
    if (!f || !/^image\//.test(f.type)) return;
    file.chosen = f;
    const url = URL.createObjectURL(f);
    preview.src = url;
    preview.hidden = false;
    words.hidden = true;
    poster.classList.add("has");
  }
  file.addEventListener("change", () => showFile(file.files[0]));
  ["dragenter", "dragover"].forEach((ev) => poster.addEventListener(ev, (e) => { e.preventDefault(); poster.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => poster.addEventListener(ev, (e) => { e.preventDefault(); poster.classList.remove("over"); }));
  poster.addEventListener("drop", (e) => showFile(e.dataTransfer.files[0]));

  /* --- the pills: one kind, one audience --- */
  function pills(box, attr, set) {
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".host-pill");
      if (!b) return;
      [...box.children].forEach((x) => x.classList.toggle("on", x === b));
      set(b.dataset[attr]);
    });
  }
  pills($("host-kind"), "kind", (v) => { kind = v; });
  pills($("host-for"), "for", (v) => { who = v; });

  /* --- the cities, from the database --- */
  const citySel = $("host-city");
  const fillCities = () => AH.request("/cities?select=slug,name&status=eq.live&order=name")
    .then((rows) => rows.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.slug; o.textContent = c.name.toLowerCase();
      citySel.appendChild(o);
    }))
    .catch(() => {});
  if (AH.request) fillCities();

  /* --- say something under the fields --- */
  function say(key, bad) {
    said.textContent = t(key);
    said.hidden = false;
    said.classList.toggle("bad", Boolean(bad));
  }

  /* --- the poster goes to storage: posters/<user>/<time>.<ext> --- */
  function uploadPoster(f) {
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const me = AH.session && AH.session.user && AH.session.user.id;
    const path = (me || "anon") + "/" + Date.now() + "." + ext;
    const base = (window.AH_CONFIG && AH_CONFIG.url || "").replace(/\/$/, "");
    return fetch(base + "/storage/v1/object/posters/" + path, {
      method: "POST",
      headers: { apikey: AH_CONFIG.anonKey, Authorization: "Bearer " + AH.token, "Content-Type": f.type, "x-upsert": "false" },
      body: f,
    }).then((r) => { if (!r.ok) throw new Error("upload " + r.status); uploaded = path; return base + "/storage/v1/object/public/posters/" + path; });
  }
  /* a poster whose night never went in is taken down again (ten per person at most) */
  let uploaded = "";
  function dropPoster() {
    if (!uploaded) return;
    const base = (window.AH_CONFIG && AH_CONFIG.url || "").replace(/\/$/, "");
    fetch(base + "/storage/v1/object/posters/" + uploaded, { method: "DELETE", headers: { apikey: AH_CONFIG.anonKey, Authorization: "Bearer " + AH.token } }).catch(() => {});
    uploaded = "";
  }

  /* --- publish --- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!(AH.signedIn && AH.signedIn())) return say("host.err.signin", true);
    const name = $("host-name").value.trim(), city = citySel.value, date = $("host-date").value, link = $("host-link").value.trim();
    if (!name || !kind || !city || !date || !link) return say("host.err.fill", true);

    const venue = $("host-venue").value.trim();
    const line = $("host-body").value.trim();
    /* the venue by name and who the night is for travel in the body for now: the
       submission takes a venue id and a ticket link, nothing else (the reviewer reads it) */
    const body = [venue ? "@ " + venue : "", who !== "tickets" ? "[" + who + "]" : "", line].filter(Boolean).join("\n");

    publish.disabled = true;
    say("host.sending");
    const withPoster = file.chosen
      ? uploadPoster(file.chosen).catch(() => { say("host.err.poster", true); return ""; })
      : Promise.resolve("");
    withPoster
      .then((image) => AH.request("/rpc/event_submit", {
        method: "POST",
        body: JSON.stringify({
          p_title: name, p_city: city, p_type: kind, p_venue: null,
          p_date: date, p_time: $("host-time").value || "23:00",
          p_body: body, p_ticket_url: link, p_image_url: image || "",
        }),
      }))
      .then(() => {
        uploaded = "";
        say("host.done");
        form.reset();
        preview.hidden = true; words.hidden = false; poster.classList.remove("has"); file.chosen = null;
        [...$("host-kind").children].forEach((x) => x.classList.remove("on")); kind = "";
      })
      .catch((err) => { dropPoster(); said.textContent = String(err && err.message || err).toLowerCase(); said.hidden = false; said.classList.add("bad"); })
      .then(() => { publish.disabled = false; });
  });
})();
