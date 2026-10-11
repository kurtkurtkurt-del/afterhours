# KULA'dan çıkarımlar — backend adımları (11.10.2026) — YAPILDI 12.10.2026

Sekiz adımın hepsi uygulandı (commit: bkz. git log). Numaralar kaydı: kapı `57_doors.sql`, bildirim sözcükleri `58_push_words.sql`; `59_dms.sql` (direkt mesajlar) aynı gece eklendi. Sözler listesi `backend/promises.md`, kapı `backend/tools/gate.mjs` + `.githooks/pre-push`, migrasyon `backend/tools/migrate.mjs`, yedek `backup.yml` ikinci iş. Kaynak: KULA mimarisi ve afterhours için dersler dokümanı, 7. bölüm.


Bildirim metni kararı: **hayır**, üyenin metni kilit ekranına çıkmaz.

1. `test.yml`'e app işi (tsc, lint, jest).
2. `tools/gate.mjs` + `.githooks/pre-push` + `postinstall`; docs-only muaf.
3. `56_doors.sql`: `assert_member()`, `visible_to()`; her definer RPC'nin ilk satırı; dört elek tek kaynak; `doors.test.mjs`.
4. `backend/promises.md`, 12 cümle → SQL dosyası → test adı; `setup.test.mjs` adları doğrular.
5. `tools/migrate.mjs` (`SUPABASE_DB_URL`, `--dry` varsayılan, yazma yalnızca açık bayrakla). Gece yalnızca yazılır ve test edilir; canlıya uygulanmaz.
6. `57_push_words.sql`: `{text}`/`{body}` şablonları sabit cümleye; `26_push.sql` ve `55_post_social.sql` dokunulmaz (uygulanmış dosyalar append-only). Gizlilik sayfası ve promises.md güncellenir.
7. `backup.yml`'e `pg_dump --data-only --schema public`, `gpg --symmetric`, 30 gün artifact. Gizli anahtarlar: `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE` (sabah Ahmet ekler).
8. `EXPECTED_SQL` iki listede güncel (`backend/tools/expected-sql.mjs`, `app/src/data/expectedSql.ts`).


## Sabah (Ahmet), bu adımlar için

- GitHub → Settings → Secrets: `SUPABASE_DB_URL` (Supabase → Settings → Database → connection string, session mode) ve `BACKUP_PASSPHRASE`.
- Yeni migrasyonlar ya `node tools/migrate.mjs --write` ile ya da editöre yapıştırarak.
