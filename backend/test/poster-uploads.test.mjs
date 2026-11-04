/* afterhours — a member hangs their own poster (117) */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nERROR: " + ((e && e.message) || e));
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) await db.exec(await read(d));
const sql = await read("../sql/117_poster_uploads.sql");
const rows = async (s) => (await db.query(s)).rows;
const fails = async (s) => { try { await db.exec(s); return null; } catch (e) { return e.message; } };

console.log("\n— without a storage schema —");
check((await fails(sql)) === null, "the file runs where there is no storage (the local tests)");
check((await fails(sql)) === null, "and runs twice without tripping over itself");

console.log("\n— with the storage schema the server has —");
/* the shape the policies touch: a bucket table, an object table and storage.foldername */
await db.exec(`
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1] $$;
`);
check((await fails(sql)) === null, "the file runs against storage");
check((await fails(sql)) === null, "and again (policies are dropped first)");
{
  const b = (await rows(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'posters'`))[0];
  check(b && b.public === true && Number(b.file_size_limit) === 3145728 && b.allowed_mime_types.join(",") === "image/jpeg,image/png",
        "the bucket is public, 3 MB, jpeg or png", JSON.stringify(b));
  const p = (await rows(`select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'posters member%' order by 1`))
    .map((r) => r.policyname + ":" + r.cmd).join(" ");
  check(p === "posters member removes own:DELETE posters member sees own:SELECT posters member writes own:INSERT", "a member may write, see and remove their own, nothing else", p);
  check((await rows(`select 1 from pg_policies where schemaname = 'storage' and policyname = 'posters okunur'`)).length === 0, "the open listing policy is gone");
}

console.log("\n— the folder is the person —");
const A = "aaaaaaaa-1111-1111-1111-111111111111", B = "bbbbbbbb-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.com'), ('${B}', 'b@x.com');
  grant usage on schema storage to authenticated; grant all on storage.objects to authenticated;`);
const asUser = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asGuest = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}","is_anonymous":true}';`);
await asUser(A);
check((await fails(`insert into storage.objects (bucket_id, name) values ('posters', '${A}/1.jpg')`)) === null, "into your own folder: yes");
check(Boolean(await fails(`insert into storage.objects (bucket_id, name) values ('posters', '${B}/1.jpg')`)), "into another folder: no");
check(Boolean(await fails(`insert into storage.objects (bucket_id, name) values ('posters', 'loose.jpg')`)), "at the root: no");
await db.exec(`reset role; set request.jwt.claims = ''; insert into storage.objects (bucket_id, name) values ('posters', 'admin/loose.png'), ('posters', '${B}/b.jpg');`);
await asUser(A);
{
  const seen = (await rows(`select name from storage.objects where bucket_id = 'posters' order by 1`)).map((r) => r.name).join(",");
  check(seen === `${A}/1.jpg`, "you see your own file and nothing else of the bucket", seen);
}
check((await fails(`delete from storage.objects where name = '${B}/b.jpg'`)) === null && (await rows(`select 1 from storage.objects where name = '${B}/b.jpg'`)).length === 0 /* invisible to A */, "another folder: the delete touches nothing");
await db.exec(`delete from storage.objects where name = '${A}/1.jpg'`);
await db.exec(`reset role; set request.jwt.claims = '';`);
check((await rows(`select 1 from storage.objects where name = '${A}/1.jpg'`)).length === 0, "removing your own file removes it (checked as the server)");
check((await rows(`select 1 from storage.objects where name = '${B}/b.jpg'`)).length === 1, "and the other folder is untouched (checked as the server)");
await asUser(A);
for (let i = 0; i < 10; i++) await db.exec(`insert into storage.objects (bucket_id, name) values ('posters', '${A}/n${i}.jpg')`);
check(Boolean(await fails(`insert into storage.objects (bucket_id, name) values ('posters', '${A}/n10.jpg')`)), "the eleventh poster is refused");
await asGuest(B);
check(Boolean(await fails(`insert into storage.objects (bucket_id, name) values ('posters', '${B}/1.jpg')`)), "a guest hangs nothing");
await db.exec(`reset role; set request.jwt.claims = ''; select set_config('afterhours.ban', 'on', false); update public.profiles set banned_at = now() where id = '${B}'; select set_config('afterhours.ban', '', false);`);
await asUser(B);
check(Boolean(await fails(`insert into storage.objects (bucket_id, name) values ('posters', '${B}/2.jpg')`)), "a closed account hangs nothing");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
