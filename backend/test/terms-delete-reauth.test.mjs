/* afterhours — the terms on the server, and a fresh sign-in to delete (111)
   M-10: accept_terms has a ceiling, and a person who has not accepted the terms in force
   as an adult cannot write what others read. M-11: delete_account() wants a session whose
   sign-in (the amr time in the token, kept across refreshes) is ten minutes old or less. */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => { console.log("\nERROR: " + ((e && e.message) || e)); process.exit(1); });

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) await db.exec(await read(d));
await db.exec(await read("../sql/111_terms_and_delete_reauth.sql"));
await db.exec(await read("../sql/111_terms_and_delete_reauth.sql"));

const id = (c) => `${c.repeat(8)}-3333-3333-3333-333333333333`;
const [A, B, C, G] = ["a", "b", "c", "9"].map(id);
const now = () => Math.floor(Date.now() / 1000);
/* claims as GoTrue signs them: amr says how and when the session was signed in */
const as = (u, signedInAgo = 60, extra = {}) => {
  const claims = { sub: u, iat: now(), amr: [{ method: "password", timestamp: now() - signedInAgo }], ...extra };
  return db.exec(`set role authenticated; set request.jwt.claims = '${JSON.stringify(claims)}';`);
};
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
/* the owner role with a caller: what a security definer function does for that person */
const asDefinerFor = (u) => db.exec(`reset role; set request.jwt.claims = '${JSON.stringify({ sub: u })}';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const one = async (sql) => (await db.query(sql)).rows[0];

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
await db.exec(`insert into auth.users (id, is_anonymous) values ('${G}', true)`);
/* the shim lets every test person say yes at birth; here nobody has, yet */
await db.exec(`update public.profiles set terms_version = null, terms_at = null, adult = false`);
const ev = (await one(`select id from public.events where is_published order by starts_at nulls last limit 1`)).id;

console.log("— the terms (M-10) —");
{
  check((await one(`select public.terms_now() as v`)).v === 1, "the terms in force are version 1");
  const app = await read("../../app/src/data/safety.ts");
  check(/export const TERMS_VERSION = 1;/.test(app), "the app asks for the same version");
  const site = await read("../../register/register.js");
  check(/p_version: 1, p_adult: true/.test(site), "the site register page asks for the same version");

  await as(A);
  check(/do not exist yet/.test(await fails(`select public.accept_terms(2, true)`) ?? ""), "a future version is refused");
  check(/do not exist yet/.test(await fails(`select public.accept_terms(2147483647, true)`) ?? ""), "the largest number is refused");
  check((await one(`select public.need_terms() as n`)).n === true, "a person who never said yes still needs the terms");

  const comment = `insert into public.comments (event_id, body) values ('${ev}', 'hello')`;
  check(/accept the terms first/.test(await fails(comment) ?? ""), "without the terms: no comment");
  check(/accept the terms first/.test(await fails(`select public.post_create('a post', null, null)`) ?? ""), "without the terms: no post");

  await db.exec(`select public.accept_terms(1, true)`);
  check((await one(`select public.need_terms() as n`)).n === false, "after yes, nothing is needed");
  check(!(await fails(comment)), "after yes, the comment goes in");

  /* a version answered in advance before the ceiling is brought back to the one in force */
  await asService();
  await db.exec(`update public.profiles set terms_version = 2147483647, adult = true where id = '${B}'`);
  await db.exec(await read("../sql/111_terms_and_delete_reauth.sql"));
  check((await one(`select terms_version as v from public.profiles where id = '${B}'`)).v === 1, "an answer above the version in force is brought back to it");
  check((await one(`select terms_version as v from public.profiles where id = '${A}'`)).v === 1, "an honest answer stays");

  /* a yes without the 18+ answer is not a yes */
  await db.exec(`update public.profiles set terms_version = 1, adult = false where id = '${C}'`);
  await as(C);
  check(/accept the terms first/.test(await fails(comment) ?? ""), "the terms without 18+: no comment");

  await asDefinerFor(C);
  check(/accept the terms first/.test(await fails(`insert into public.profile_links (user_id, kind, value) values ('${C}', 'instagram', 'cem')`) ?? ""), "the terms without 18+: no profile link");
  /* a line nobody wrote (the won line of a group plan) is not the caller speaking */
  await asService();
  await db.exec(`insert into public.groups (id, name, created_by) values ('44444444-3333-0000-0000-000000000001', 'g', '${A}')`);
  await asDefinerFor(C);
  check(!(await fails(`insert into public.group_messages (group_id, user_id, kind, body) values ('44444444-3333-0000-0000-000000000001', null, 'won', 'a night')`)),
    "a line with no author passes the gate");

  /* an old comment cannot be rewritten without the terms */
  await asService();
  const mine = (await one(`insert into public.comments (event_id, author_id, body) values ('${ev}', '${C}', 'before') returning id`)).id;
  await as(C);
  check(/accept the terms first/.test(await fails(`update public.comments set body = 'after' where id = '${mine}'`) ?? ""), "the terms without 18+: no edit either");

  await asService();
  check(!(await fails(`insert into public.comments (event_id, author_id, body) values ('${ev}', '${C}', 'by the service')`)), "the service role writes without the gate");
}

console.log("\n— a fresh sign-in to delete (M-11) —");
{
  await as(B, 60 * 60);
  check((await one(`select public.signed_in_recently() as r`)).r === false, "an hour old sign-in is not recent");
  check(/sign in again first/.test(await fails(`select public.delete_account()`) ?? ""), "an old sign-in cannot delete");

  /* a refresh gives a new iat but keeps the amr time: still refused */
  await as(B, 60 * 60, { iat: now() - 5 });
  check(/sign in again first/.test(await fails(`select public.delete_account()`) ?? ""), "a refreshed token from an old sign-in cannot delete");

  await db.exec(`set request.jwt.claims = '${JSON.stringify({ sub: B, iat: now() })}';`);
  check(/sign in again first/.test(await fails(`select public.delete_account()`) ?? ""), "a token without amr cannot delete");

  await db.exec(`set request.jwt.claims = '${JSON.stringify({ sub: B, amr: [{ method: "password", timestamp: "soon" }] })}';`);
  check(/sign in again first/.test(await fails(`select public.delete_account()`) ?? ""), "a timestamp that is not a number cannot delete");

  await asService();
  check((await one(`select count(*)::int as n from auth.users where id = '${B}'`)).n === 1, "after all that the account is still there");

  /* the last of several methods counts: an old password and a fresh email link */
  await as(B, 60 * 60, { amr: [{ method: "password", timestamp: now() - 3600 }, { method: "recovery", timestamp: now() - 30 }] });
  check((await one(`select public.signed_in_recently() as r`)).r === true, "a fresh email link is a recent sign-in");
  check(!(await fails(`select public.delete_account()`)), "a fresh sign-in deletes");
  await asService();
  check((await one(`select count(*)::int as n from auth.users where id = '${B}'`)).n === 0, "and the account is gone");

  await as(C, 9 * 60);
  check(!(await fails(`select public.delete_account()`)), "nine minutes is still recent");

  await as(G, 60 * 60 * 24);
  check(!(await fails(`select public.delete_account()`)), "a guest, with no sign-in to repeat, may go as it is");

  await db.exec(`set role anon; set request.jwt.claims = '';`);
  check(Boolean(await fails(`select public.delete_account()`)), "signed out: nothing");
  check(Boolean(await fails(`select public.signed_in_recently()`)), "signed out cannot ask either");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
