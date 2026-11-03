// afterhours — intro-lines (Supabase Edge Function)
//
// Ask for an intro (app/src/app/people-map.tsx): two or three first lines for meeting
// someone in the crowd of your people, written by claude-haiku-5-5 from the facts that
// intro_hints (116) gives the caller, and from nothing else.
//
// - intro_hints is called with the caller's own token, so the function sees only what
//   the caller may see, and with lines = true, so the ceiling of 12 an hour holds
//   before the model is ever asked.
// - The names of friends never reach the model: they go as {f1}, {f2} and are put back
//   here. Night titles, room names and the city are public already.
// - The line the member typed for their friend stays in the app; only the reason chip
//   (one of REASONS) travels.
// - Nothing to say (no facts) → no lines. The app then shows none: nothing made up.
//
// Secret (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY.
// SUPABASE_URL and SUPABASE_ANON_KEY are set by Supabase. Leave Verify JWT on.
//
// POST { code, reason, lang } → { lines: string[] }

type Hints = {
  steps: 2 | 3;
  ties: number;
  via: { h: string; n: string | null }[];
  city: string | null;
  same_city: boolean;
  kinds: { k: string; n: number }[];
  rooms: string[];
  shared: { t: string; s: string }[];
  shared_n: number;
};

const REASONS: Record<string, string> = {
  night: "they think they were at the same night once",
  circle: "they keep running into this circle of friends",
  city: "they are new in the city and looking for people to go out with",
  sound: "they think the two of them like the same kind of nights",
  heard: "a friend keeps talking about this person",
  curious: "they are simply curious who this is",
};
const KINDS: Record<string, string> = {
  rave: "raves", "club-night": "club nights", konzert: "concerts",
  festival: "festivals", meetup: "meetups", hausparty: "house parties",
};
const LANGS: Record<string, string> = { en: "English", de: "German", tr: "Turkish" };

const answer = (o: unknown, status = 200) => Response.json(o, { status });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("post only", { status: 405 });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!key || !url || !anon) return answer({ error: "not set up" }, 500);
  const auth = req.headers.get("authorization");
  if (!auth) return answer({ error: "sign in first" }, 401);

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const reason = typeof body.reason === "string" && REASONS[body.reason] ? body.reason : "curious";
  const lang = typeof body.lang === "string" && LANGS[body.lang] ? body.lang : "en";
  if (!/^x[0-9a-f]{12}$/.test(code)) return answer({ error: "no such person" }, 400);

  const rpc = await fetch(`${url}/rest/v1/rpc/intro_hints`, {
    method: "POST",
    headers: { apikey: anon, authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ p_code: code, p_lines: true }),
  });
  if (!rpc.ok) {
    const e = await rpc.json().catch(() => ({}));
    return answer({ error: e.message ?? "intro_hints " + rpc.status }, /slow down/.test(e.message ?? "") ? 429 : rpc.status);
  }
  const h = (await rpc.json()) as Hints | null;
  if (!h) return answer({ lines: [] });

  // the friends as {f1}, {f2}: their names stay here
  const names = h.via.slice(0, 3).map((v) => (v.n || v.h).toLowerCase());
  const facts: string[] = [];
  if (h.steps === 2) facts.push(`they are friends with ${names.map((_, i) => `{f${i + 1}}`).join(" and ") || "a friend"}, ${h.ties} of the asker's friends know them`);
  else facts.push(`they are one step further out: they know someone who is a friend of ${names.map((_, i) => `{f${i + 1}}`).join(" and ") || "a friend"}`);
  if (h.city) facts.push(h.same_city ? `they live in the same city as the asker, ${h.city}` : `they live in ${h.city}`);
  if (h.kinds.length) facts.push(`the friends around them keep mostly ${h.kinds.map((k) => KINDS[k.k] ?? k.k).join(", ")}`);
  if (h.rooms.length) facts.push(`the friends around them often go to ${h.rooms.join(" and ")}`);
  if (h.shared.length) facts.push(`the asker and that circle both kept ${h.shared_n} night${h.shared_n === 1 ? "" : "s"}, for example "${h.shared[0].t}"`);
  if (!names.length && facts.length < 2) return answer({ lines: [] });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 400,
      output_config: { effort: "low" },
      system:
        "You write first lines for meeting someone, in a nightlife app. The asker will say the line in person, to someone they have not met, " +
        "who is in the circle of their friends. Use only the facts given; never invent anything about the person, and never say the person " +
        "kept, liked or went to anything: the facts are about the circle around them. Write {f1}, {f2} where a friend is named, exactly so. " +
        "Style: all lower case, plain and warm, a little wry, short (under 90 characters), no emoji, no exclamation marks, no hashtags, " +
        "nothing flirty, nothing about looks. Each line is something to say or ask, not advice. Answer JSON only.",
      messages: [{
        role: "user",
        content: `Why the asker wants to meet them: ${REASONS[reason]}.\nFacts:\n- ${facts.join("\n- ")}\n\nReturn {"lines":["...","...","..."]}: three different first lines in ${LANGS[lang]}.`,
      }],
    }),
  });
  if (!r.ok) return answer({ error: "model " + r.status }, 502);
  const j = await r.json();
  const text = (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const m = /\{[\s\S]*\}/.exec(text);
  let raw: unknown[] = [];
  try { raw = m ? JSON.parse(m[0]).lines ?? [] : []; } catch { raw = []; }

  const lines = raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.replace(/\{f(\d)\}/g, (all, i) => names[Number(i) - 1] ?? all))
    .filter((x) => !/\{f\d\}/.test(x))
    .map((x) => x.replace(/\p{Extended_Pictographic}|️/gu, "").replace(/!+/g, ".").replace(/\s+/g, " ").trim().toLocaleLowerCase(lang))
    .filter((x) => x.length >= 8 && x.length <= 140)
    .slice(0, 3);
  return answer({ lines });
});
