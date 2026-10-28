/* afterhours — the act's Wikipedia page, behind three guards. One rule for enrich.mjs
   and about-days.mjs (28.10.2026): the page must be a music act (Wikipedia's own one-line
   description says so; the extract is not trusted — "a group of former employees" is not
   a band, and MEDUZA the duo once landed on Meduza the newspaper, 22.10.2026), the title
   must be the act's name (or "Name (band)"), and it must not be a disambiguation.
   shares(fact, extract): a fact passes when three of its longer words are in the extract. */
import { norm } from "./act.mjs";

const UA = { "User-Agent": "afterhours-enrich/1.0 (https://kurtkurtkurt-del.github.io/afterhours/)" };
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

export const MUSIC = /\b(band|singer|rapper|dj|disc jockey|musician|producer|duo|music group|musical group|orchestra|composer|trio|quartet|songwriter|vocalist|guitarist|pianist|violinist|drummer|ensemble|choir|musical collective|beatmaker|boy band|girl group|rock group|pop group|hip hop group|music project|musical project)\b/i;
export const MUSIC_PAREN = /\((band|musician|singer|rapper|dj|producer|duo|group|composer|songwriter)\)$/i;

export async function wiki(path, lang = "en") {
  const r = await fetch(`https://${lang}.wikipedia.org${path}`, { headers: { ...UA, Accept: "application/json" } });
  await sleep(350);
  return r.ok ? r.json() : null;
}

/* { why } when there is no usable page; else { title, key, description, extract, url } */
export async function page(name) {
  const s = await wiki(`/w/rest.php/v1/search/title?q=${encodeURIComponent(name)}&limit=3`);
  const hits = s?.pages || [];
  const exact = hits.find((p) => norm(p.title) === norm(name));
  const bracketed = hits.find((p) => MUSIC_PAREN.test(p.title) && norm(p.title.replace(/\s*\(.*\)$/, "")) === norm(name));
  const pick = bracketed || exact;
  if (!pick) return { why: hits.length ? `no page of that name (nearest: ${hits[0].title})` : "no page" };
  const sum = await wiki(`/api/rest_v1/page/summary/${encodeURIComponent(pick.key)}`);
  if (!sum || sum.type === "disambiguation") return { why: "disambiguation or no summary" };
  if (!MUSIC.test(sum.description || "")) return { why: `not a music act (${sum.description || "no description"})` };
  return { title: sum.title, key: pick.key, description: sum.description || "", extract: (sum.extract || "").slice(0, 1500), url: sum.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pick.key)}` };
}

export const shares = (fact, extract) => {
  const words = new Set(norm(extract).split(" ").filter((w) => w.length >= 4));
  return norm(fact).split(" ").filter((w) => w.length >= 4 && words.has(w)).length >= 3;
};
