/* afterhours — a file that cannot go at once waits in a queue (100) */

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
/* Supabase's own storage table, with the trigger that now refuses a direct delete */
await db.exec(`create schema if not exists storage;
  create table if not exists storage.objects (bucket_id text, name text);
  create or replace function storage.protect_delete() returns trigger language plpgsql as $$
  begin raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.' using errcode = '42501'; end; $$;
  create trigger protect_delete before delete on storage.objects for each row execute function storage.protect_delete();`);
await db.exec(await read("../sql/100_storage_queue.sql"));
await db.exec(await read("../sql/100_storage_queue.sql"));

const U = "aaaaaaaa-1111-1111-1111-111111111111";
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const rows = async (sql) => (await db.query(sql)).rows;
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };

await asService();
await db.exec(`insert into auth.users (id, email) values ('${U}', 'a@x')`);
await db.exec(`update public.profiles set handle = 'ada' where id = '${U}'`);
await db.exec(`insert into storage.objects values ('photos', '${U}/post-1.jpg')`);

console.log("\n— a post with a photo goes, even when storage says no —");
{
  await as(U);
  const id = (await rows(`select public.post_create('a story', '${U}/post-1.jpg', null) as id`))[0].id;
  const r = await fails(`select public.post_delete('${id}')`);
  check(r === null, "the post is deleted (the storage refusal no longer rolls it back)", r ?? "");
  await asService();
  check((await rows(`select 1 from public.posts where id = '${id}'`)).length === 0, "the row is gone");
  const q = await rows(`select path, folder from public.storage_leftovers`);
  check(q.length === 1 && q[0].path === `${U}/post-1.jpg` && !q[0].folder, "its file waits in the queue for the sweep");
  await as(U);
  check((await fails(`select * from public.storage_leftovers`)) !== null || (await rows(`select * from public.storage_leftovers`)).length === 0, "nobody but the service reads the queue");
}

console.log("\n— an account goes, its folder queued —");
{
  await asService();
  await db.exec(`delete from public.profiles where id = '${U}'`);
  const q = await rows(`select path, folder from public.storage_leftovers where folder`);
  check(q.length === 1 && q[0].path === U, "the whole folder waits in the queue");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
