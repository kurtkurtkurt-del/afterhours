/* afterhours — a block closes the waves, a shared group, sparks, comments, a dm thread and pushes (109) */

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
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) {
  await db.exec(await read(d));
}

const [A, B, C] = ["aaaaaaaa-1111-1111-1111-111111111111", "bbbbbbbb-2222-2222-2222-222222222222",
                   "cccccccc-3333-3333-3333-333333333333"];
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rows = async (sql) => (await db.query(sql)).rows;
const one = async (sql) => (await rows(sql))[0];

await asService();
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x'),('${B}','b@x'),('${C}','c@x')`);
for (const [u, h] of [[A, "ada"], [B, "berk"], [C, "cansu"]]) {
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
/* ada — cansu — berk: berk is the second wave of ada */
await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${A}','${C}','accepted'), ('${C}','${B}','accepted')`);

const night = await one(`select e.id, e.slug, c.slug as city from public.events e join public.cities c on c.id = e.city_id where e.is_published limit 1`);
await db.exec(`update public.events set starts_at = now() + interval '1 day' where id = '${night.id}'`);
await db.exec(`insert into public.swipes (user_id, event_id, direction) values ('${B}', '${night.id}', 'right')`);

/* a group of three with a plan, a vote, lines and photos from everyone */
const g = (await one(`insert into public.groups (name, created_by) values ('trio', '${A}') returning id`)).id;
await db.exec(`insert into public.group_members (group_id, user_id, role) values ('${g}','${A}','owner'), ('${g}','${B}','member'), ('${g}','${C}','member')`);
await db.exec(`insert into public.group_messages (group_id, user_id, body) values ('${g}','${A}','ada line'), ('${g}','${B}','berk line'), ('${g}','${C}','cansu line')`);
await db.exec(`insert into public.group_photos (group_id, event_id, user_id, path) values ('${g}','${night.id}','${A}','a.jpg'), ('${g}','${night.id}','${B}','b.jpg'), ('${g}','${night.id}','${C}','c.jpg')`);
const leg = (await one(`insert into public.group_legs (group_id, leg_no, city_slug, date_from, date_to) values ('${g}', 1, '${night.city}', current_date, current_date + 3) returning id`)).id;
const round = (await one(`insert into public.group_rounds (group_id, started_by, closes_at) values ('${g}', '${B}', now() + interval '1 hour') returning id`)).id;
await db.exec(`insert into public.group_round_options (round_id, event_id) values ('${round}', '${night.id}')`);
await db.exec(`insert into public.group_ballots (round_id, user_id, event_id) values ('${round}', '${A}', '${night.id}'), ('${round}', '${B}', '${night.id}')`);
/* two of three voted, so the vote stays open */
await db.exec(`update public.groups set plan_event_id = '${night.id}', plan_set_by = '${B}' where id = '${g}'`);

/* sparks: berk hosts one and ticked ada, ada hosts one berk is in, cansu hosts one both are in */
const sB = (await one(`insert into public.sparks (host_id, kind, title, starts_at) values ('${B}', 'grill', 'berk grill', now() + interval '1 day') returning id`)).id;
const sA = (await one(`insert into public.sparks (host_id, kind, title, starts_at) values ('${A}', 'hike', 'ada hike', now() + interval '1 day') returning id`)).id;
const sC = (await one(`insert into public.sparks (host_id, kind, title, starts_at) values ('${C}', 'derby', 'cansu derby', now() + interval '1 day') returning id`)).id;
await db.exec(`insert into public.spark_invites (spark_id, user_id) values ('${sB}', '${A}')`);
await db.exec(`insert into public.spark_invites (spark_id, user_id, answer, answered_at) values ('${sA}', '${B}', 'in', now()), ('${sC}', '${A}', 'in', now()), ('${sC}', '${B}', 'in', now())`);

/* a comment by berk, a dm thread with a line from berk */
await db.exec(`insert into public.comments (event_id, author_id, author_name, body) values ('${night.id}', '${B}', 'berk', 'berk comment')`);
const thread = (await one(`insert into public.dm_threads (a, b) values ('${A}', '${B}') returning id`)).id;
await db.exec(`insert into public.dm_messages (thread_id, user_id, body) values ('${thread}', '${B}', 'hey ada')`);

console.log("\n— before the block —");
{
  await as(A);
  const w = await rows(`select via from public.waves_kept()`);
  check(w.length === 1 && w[0].via.join(">") === "cansu>berk", "ada sees the night berk kept, via cansu", JSON.stringify(w));
  check((await rows(`select 1 from public.group_thread('${g}')`)).length === 3, "the whole group thread");
  check((await rows(`select 1 from public.spark_inbox() where id = '${sB}'`)).length === 1, "the spark berk ticked her for");
  check((await rows(`select 1 from public.comments where author_id = '${B}'`)).length === 1, "berk comment from the table");
  check((await rows(`select 1 from public.dm_thread('${thread}')`)).length === 1, "and the dm line");
}

console.log("\n— ada blocks berk —");
await as(A);
await db.exec(`select public.block_user('${B}')`);

console.log("\n· M-6 waves_kept");
{
  await as(A);
  check((await rows(`select 1 from public.waves_kept()`)).length === 0, "the night berk kept is gone from ada's waves");
  await asService();
  await db.exec(`insert into public.swipes (user_id, event_id, direction) values ('${A}', '${night.id}', 'right') on conflict do nothing`);
  await as(B);
  check((await rows(`select 1 from public.waves_kept()`)).length === 0, "and berk does not see ada's either");
  await as(C);
  check((await rows(`select 1 from public.waves_kept()`)).length === 0, "cansu: both are first wave, nothing changes there");
}

console.log("\n· M-7 the shared group");
{
  await as(A);
  const t = (await rows(`select body from public.group_thread('${g}')`)).map((x) => x.body);
  check(!t.includes("berk line") && t.length === 2, "ada reads no line of berk", JSON.stringify(t));
  const gg = (await one(`select public.group_get('${g}') as j`)).j;
  check(!gg.members.some((m) => m.id === B) && gg.members.length === 2, "berk is not in ada's member list", JSON.stringify(gg.members));
  const wall = (await rows(`select path from public.group_wall('${g}')`)).map((x) => x.path);
  check(!wall.includes("b.jpg") && wall.length === 2, "no photo of berk on the wall", JSON.stringify(wall));
  const album = (await rows(`select path from public.group_album('${g}', '${night.id}')`)).map((x) => x.path);
  check(!album.includes("b.jpg") && album.length === 2, "nor in the album", JSON.stringify(album));
  const legp = (await rows(`select path from public.group_leg_photos('${g}', '${leg}')`)).map((x) => x.path);
  check(!legp.includes("b.jpg") && legp.length === 2, "nor in the trip leg", JSON.stringify(legp));
  const p = (await one(`select public.group_plan('${g}') as j`)).j;
  check(p.round && p.round.started_by === null, "the vote berk started has no name for ada", JSON.stringify(p.round && p.round.started_by));
  check(p.round && !p.round.options[0].voters.includes("berk") && p.round.options[0].voters.length === 1, "berk is not among the voters", JSON.stringify(p.round && p.round.options));
  check(p.plan && p.plan.set_by === null && !p.plan.people.some((x) => x.id === B), "the plan: no berk as setter or in the people", JSON.stringify(p.plan));
  await as(B);
  const tb = (await rows(`select body from public.group_thread('${g}')`)).map((x) => x.body);
  check(!tb.includes("ada line") && tb.includes("berk line"), "berk reads no line of ada (both ways)", JSON.stringify(tb));
  check(!(await one(`select public.group_get('${g}') as j`)).j.members.some((m) => m.id === A), "and ada is not in berk's member list");
  await as(C);
  const tc = (await rows(`select body from public.group_thread('${g}')`)).map((x) => x.body);
  check(["ada line", "berk line", "cansu line"].every((x) => tc.includes(x)), "cansu still reads everyone", JSON.stringify(tc));
  check((await one(`select public.group_get('${g}') as j`)).j.members.length === 3, "and sees all three members");
  await asService();
  await db.exec(`delete from public.push_outbox where kind = 'group_message'`);
  await as(B);
  await db.exec(`select public.group_say('${g}', 'berk again')`);
  await asService();
  const out = (await rows(`select user_id from public.push_outbox where kind = 'group_message'`)).map((x) => x.user_id);
  check(!out.includes(A) && out.includes(C), "a line of berk buzzes cansu, not ada", JSON.stringify(out));
}

console.log("\n· M-9 sparks");
{
  await asService();
  check((await rows(`select 1 from public.spark_invites where (spark_id = '${sB}' and user_id = '${A}') or (spark_id = '${sA}' and user_id = '${B}')`)).length === 0,
    "the block dropped the invites between them, either host");
  check((await rows(`select 1 from public.spark_invites where spark_id = '${sC}'`)).length === 2, "a spark of cansu keeps both answers");
  /* an invite that slips back in still does not open the spark */
  await db.exec(`insert into public.spark_invites (spark_id, user_id) values ('${sB}', '${A}'), ('${sA}', '${B}') on conflict do nothing`);
  await as(A);
  check((await rows(`select 1 from public.spark_inbox() where id = '${sB}'`)).length === 0, "berk's spark is not in ada's inbox");
  check((await rows(`select 1 from public.spark_get('${sB}')`)).length === 0, "nor on its page");
  check(Boolean(await fails(`select public.spark_answer('${sB}', 'in')`)), "and ada cannot answer it");
  const ppl = (await rows(`select name from public.spark_people('${sC}')`)).map((x) => x.name);
  check(!ppl.includes("berk") && ppl.includes("ada"), "on cansu's spark ada does not see berk going", JSON.stringify(ppl));
  check((await rows(`select 1 from public.spark_get('${sA}')`)).length === 1, "ada still opens her own spark");
  await as(B);
  check((await rows(`select 1 from public.spark_get('${sA}')`)).length === 0, "berk does not see ada's spark");
  check(Boolean(await fails(`select public.spark_answer('${sA}', 'in')`)), "nor answer it");
  check(!(await rows(`select name from public.spark_people('${sC}')`)).some((x) => x.name === "ada"), "nor see ada going to cansu's");
  await as(C);
  check((await rows(`select 1 from public.spark_people('${sC}')`)).length === 2, "cansu, the host, sees both");
}

console.log("\n· L-1 comments, the table itself");
{
  await as(A);
  check((await rows(`select 1 from public.comments where author_id = '${B}'`)).length === 0, "ada reads no comment of berk from the table");
  await as(C);
  check((await rows(`select 1 from public.comments where author_id = '${B}'`)).length === 1, "cansu still does");
  await asAnon();
  check((await rows(`select 1 from public.comments where author_id = '${B}'`)).length === 1, "and so does a signed-out reader");
  await as(B);
  check((await rows(`select 1 from public.comments where author_id = '${B}'`)).length === 1, "berk reads his own");
}

console.log("\n· L-2 dm_thread");
{
  await as(A);
  check(Boolean(await fails(`select * from public.dm_thread('${thread}')`)), "ada cannot open the thread with berk");
  await as(B);
  check(Boolean(await fails(`select * from public.dm_thread('${thread}')`)), "nor berk");
}

console.log("\n· L-9 pushes");
{
  await asService();
  const parent = (await one(`insert into public.comments (event_id, author_id, author_name, body) values ('${night.id}', '${A}', 'ada', 'ada asks') returning id`)).id;
  const r1 = (await one(`insert into public.comments (event_id, parent_id, author_id, author_name, body) values ('${night.id}', '${parent}', '${B}', 'berk', 'berk answers') returning id`)).id;
  const r2 = (await one(`insert into public.comments (event_id, parent_id, author_id, author_name, body) values ('${night.id}', '${parent}', '${C}', 'cansu', 'cansu answers') returning id`)).id;
  check((await rows(`select 1 from public.push_outbox where key = 'reply:${r1}'`)).length === 0, "berk's reply does not buzz ada");
  check((await rows(`select 1 from public.push_outbox where key = 'reply:${r2}'`)).length === 1, "cansu's reply does");
  await db.exec(`insert into public.checkins (user_id, event_id) values ('${A}', '${night.id}'), ('${B}', '${night.id}'), ('${C}', '${night.id}') on conflict do nothing`);
  await db.exec(`delete from public.push_outbox where kind = 'room_message'`);
  await db.exec(`insert into public.room_posts (event_id, user_id, body) values ('${night.id}', '${B}', 'room berk')`);
  const room = (await rows(`select user_id from public.push_outbox where kind = 'room_message'`)).map((x) => x.user_id);
  check(!room.includes(A) && room.includes(C), "a room line of berk buzzes cansu, not ada", JSON.stringify(room));
}

console.log("\n· M-7 more group reads");
{
  await asService();
  await db.exec(`insert into public.group_swipes (group_id, user_id, event_id, direction) values ('${g}','${A}','${night.id}','right'), ('${g}','${B}','${night.id}','right'), ('${g}','${C}','${night.id}','left')`);
  await db.exec(`insert into public.group_live (group_id, user_id) values ('${g}','${A}'), ('${g}','${B}'), ('${g}','${C}')`);
  await db.exec(`insert into public.group_invites (code, group_id, created_by) values ('TRIO1', '${g}', '${B}')`);
  await as(A);
  const v = (await rows(`select user_id from public.group_votes('${g}', '${night.id}')`)).map((x) => x.user_id);
  check(!v.includes(B) && v.length === 2, "group_votes: no vote of berk for ada", JSON.stringify(v));
  const live = (await one(`select public.group_live_state('${g}') as j`)).j;
  check(!(live.people || []).some((x) => x.id === B) && (live.people || []).length === 2, "group_live_state: berk is not among the people live", JSON.stringify(live.people));
  const gn = (await rows(`select people, cover, photos from public.group_nights('${g}') where id = '${night.id}'`))[0];
  check(gn && !gn.people.some((x) => x.id === B) && gn.people.length === 2, "group_nights: no berk among the people of the night", JSON.stringify(gn && gn.people));
  check(gn && gn.cover !== "b.jpg" && gn.photos === 2, "group_nights: the cover and the count leave out berk's photo", JSON.stringify(gn && { cover: gn.cover, photos: gn.photos }));
  const mg = (await rows(`select faces from public.my_groups() where id = '${g}'`))[0];
  check(mg && !mg.faces.includes(B) && mg.faces.length === 2, "my_groups: no face of berk", JSON.stringify(mg && mg.faces));
  const pk = (await rows(`select names, owner from public.group_peek('TRIO1')`))[0];
  check(pk && !pk.names.includes("berk") && pk.owner === null, "group_peek: no berk among the names or as the inviter", JSON.stringify(pk));
  await as(C);
  check((await rows(`select 1 from public.group_votes('${g}', '${night.id}')`)).length === 3, "cansu still sees three votes");
  check((await rows(`select faces from public.my_groups() where id = '${g}'`))[0].faces.length === 3, "and three faces");
}

console.log("\n— a second run of 109 —");
{
  await asService();
  /* the invite that slipped back in above stands for one made before 109: the run drops it */
  check((await rows(`select 1 from public.spark_invites where spark_id = '${sB}' and user_id = '${A}'`)).length === 1, "an invite across the block is there before the run");
  await db.exec(await read("../sql/109_blocks_everywhere.sql"));
  check((await rows(`select 1 from public.spark_invites where (spark_id = '${sB}' and user_id = '${A}') or (spark_id = '${sA}' and user_id = '${B}')`)).length === 0, "the run drops invites across a block that was already there");
  check((await rows(`select 1 from public.spark_invites where spark_id = '${sC}'`)).length === 2, "and leaves the others");
  await as(A);
  check((await rows(`select 1 from public.comments where author_id = '${B}'`)).length === 0, "still closed after running it twice");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
