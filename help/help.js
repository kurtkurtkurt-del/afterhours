/* afterhours — the three numbers at the top of help.
   Two of them are real now: health() hands back how many swipes and how
   many confirmed friendships the database holds, and this writes them
   in. The third waits for the card collection; until then it stays a
   dash — an invented number would be a lie, and a bare zero would read
   as a broken page. */

(function () {
  const CONFIG = window.AH_CONFIG || {};
  if (!(CONFIG.url && CONFIG.anonKey)) return;   /* the dashes stay */

  const put = (id, n) => {
    const box = document.getElementById(id);
    if (box && typeof n === "number" && isFinite(n)) {
      box.textContent = n.toLocaleString("en-GB");
    }
  };

  fetch(CONFIG.url.replace(/\/$/, "") + "/rest/v1/rpc/health", {
    method: "POST",
    headers: {
      apikey: CONFIG.anonKey,
      Authorization: "Bearer " + CONFIG.anonKey,
      "Content-Type": "application/json",
    },
    body: "{}",
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((rows) => {
      const s = rows && rows[0];
      if (!s) return;
      put("stat-swipes", Number(s.swipes));
      put("stat-friendships", Number(s.friendships));
    })
    .catch(() => {});   /* the dashes are the honest fallback */
})();
