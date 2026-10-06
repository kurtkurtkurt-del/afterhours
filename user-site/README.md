# kurtkurtkurt-del.github.io — the root of the host

Android (App Links) and iOS (universal links) look for their files at the
ROOT of the host, `https://kurtkurtkurt-del.github.io/.well-known/…`. The
site lives under `/afterhours/`, so this folder is the content of a second,
tiny repository that GitHub serves at the root.

1. On GitHub: new public repository named exactly `kurtkurtkurt-del.github.io`.
2. Put this folder's content in it (`.well-known/`, `.nojekyll`, `index.html`)
   and push to `main`. Pages turns on by itself for a user site.
3. Check: `curl https://kurtkurtkurt-del.github.io/.well-known/assetlinks.json`
4. iOS, once there is an Apple Developer account: replace `TEAMID` in
   `apple-app-site-association` with the Team ID, and add
   `"associatedDomains": ["applinks:kurtkurtkurt-del.github.io"]` under
   `ios` in `app/app.json`.
5. When the app is on Play with Play App Signing: add the Play key's
   SHA-256 (Play Console → App integrity) to `assetlinks.json`.

`index.html` only sends the bare root on to `/afterhours/`.
