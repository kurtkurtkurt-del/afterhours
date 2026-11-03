# Edge Functions

## apple-revoke

App Store rule 5.1.1(v): deleting an account made with Sign in with Apple must revoke
its Apple tokens. On delete the app asks Apple once more (Face ID) for an authorization
code and posts it here; the function trades it for a token and revokes it. Without the
function the account is still deleted; the failure lands in `client_errors`.

Deploy once, in the Supabase dashboard:

1. **Apple key.** developer.apple.com → Certificates, IDs & Profiles → Keys → + →
   name it, tick *Sign in with Apple*, Configure → primary App ID `app.afterhours.ios`
   → Continue → Register → **Download** the `.p8` (only once). Note the **Key ID**
   and the **Team ID** (top right of the developer page).
2. **Function.** Supabase → Edge Functions → Deploy a new function → *Via editor* →
   name `apple-revoke` → paste `apple-revoke/index.ts` → Deploy. Leave *Verify JWT* on.
3. **Secrets.** Edge Functions → Secrets → add
   `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID` = `app.afterhours.ios`,
   `APPLE_PRIVATE_KEY` = the whole `.p8` file, BEGIN and END lines included.

Or with the CLI: `supabase functions deploy apple-revoke` from a folder whose
`supabase/functions/apple-revoke/index.ts` is this file, and `supabase secrets set …`.

## intro-lines

Ask for an intro, on the map of your people: two or three first lines for meeting someone
in the crowd, written by `claude-haiku-5-5` from what `intro_hints` (116) gives the one
asking, and from nothing else. The function calls `intro_hints` with the caller's own
token, so it sees only what they may see, and counts against a ceiling of 12 an hour
before the model is asked. Friends' names go to the model as `{f1}`, `{f2}` and are put
back here; the line the member types for their friend never leaves the app. Without the
function the ask still works: the app shows the facts and no lines.

Deploy once, in the Supabase dashboard (after `116_intro_hints.sql` is pasted):

1. **Function.** Supabase → Edge Functions → Deploy a new function → *Via editor* →
   name `intro-lines` → paste `intro-lines/index.ts` → Deploy. Leave *Verify JWT* on.
2. **Secret.** Edge Functions → Secrets → add `ANTHROPIC_API_KEY` (the same key
   `tools/enrich.mjs` uses). `SUPABASE_URL` and `SUPABASE_ANON_KEY` are already there.

Or with the CLI: `supabase functions deploy intro-lines` and `supabase secrets set ANTHROPIC_API_KEY=…`.
