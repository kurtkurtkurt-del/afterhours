# Release board — yayına giden kuyruk (20–23.10.2026)

Tek dosya: gece ajanı buradan iş alır, Ahmet sabah buradan okur. Üstten alta önem
sırası. Durumlar: `bekliyor` · `yapılıyor` · `yapıldı <hash>` · `karar bekliyor` ·
`sabah Ahmet` · `bulundu` (ajan fark etti, kuyruğa yazdı, dokunmadı) · `iptal`.

Ajan kuralı: en üstteki `bekliyor` maddeyi al. Gecede 3–5 madde. Kuyrukta olmayan
iş yapılmaz. Bir madde tasarım kararı isterse 5 prototip + `karar bekliyor`, sonraki
maddeye geç. Ahmet bir satırı silerse o iş yoktur; sırayı değiştirirse sıra odur.

Dal kuralı (20.10): PR #3 henüz birleşmediyse gece dalı `main`'den değil `origin/release/night-2026-10-19` üzerinden açılır, PR yine `main`'e; böylece 64/65 ile çakışma olmaz.

Üç yüz birden: **site** (kök HTML), **web app** (PWA, `app/` web derlemesi), **app**
(Expo). Bir madde üçünden birini bozmamalı; şüphede üçünde de denenir.

## A · Yayın engelleri (mağaza reddi, güvenlik, veri kaybı)

| # | İş | Yüz | Durum | Kanıt / not |
|---|---|---|---|---|
| A0 | **F1 — sabah senkronu kullanıcı verisini siliyor.** `sync-ticketmaster.mjs` dünkü geceleri DELETE ediyor; cascade ile check-in kartları, oda yazıları, swipe'lar, yorumlar, rsvp ve bilet cevapları gidiyor. Silme yerine yayından kaldırma: `is_published=false` (+ gerekiyorsa `archived_at`), geçmiş geceler deste/harita/sayaçlardan düşsün, koleksiyon ve past feed görsün. Test: sync sonrası kullanıcının kartı duruyor. `--dry` ile doğrula; canlıya uygulama `sabah Ahmet`. Ahmet 20.10 sabah onayladı. | üçü | yapıldı 554fd61 | `release/night-2026-10-20`. Sync artık hiçbir şey SİLMİYOR: geçmiş TM geceleri ve ev kurallarına takılanlar `PATCH is_published=false` (`tools/sync-retire.mjs`); `archived_at` gerekmedi — koleksiyon (`my_cards`) ve past feed yayından kalkmış geceyi zaten okuyor, deste/harita/sayaçlar `is_published` filtreliyor. Ev kuralı taraması artık sadece yayındaki satırlara bakıyor (yoksa geçmiş bir tekrar yeni tarihi öldürürdü). Kanıt: yeni `sync-retire.test.mjs` ("the card, the room line, the swipe, the comment, the rsvp and the ticket answer stay", "the check-in card is still in the collection", "the past feed still shows last night", "sync-ticketmaster.mjs sends no DELETE at all"). `--dry` bulutta koşamadı (TM anahtarı yok) → **sabah Ahmet**. Yeni bulgu: F40 |
| A1 | Sistemsel boşluk denetimi: `.claude/prompts/systemic-gaps-audit.md` promptunu SADECE LİSTELE modunda koş; bulduklarını bu tabloya `bulundu` olarak, önem sırasıyla ekle (yayın engeli → güven → eksik akış → cila). Hiçbir şeyi düzeltme. | üçü | yapıldı (main, belge) | "A1 bulguları" bölümü: 39 madde (F1–F39) + site↔app ön tablosu; hiçbir şey düzeltilmedi. **En acil: F1** (sync her sabah dünkü geceleri silip check-in kartlarını cascade ile götürüyor) |
| A2 | `export_me()` (14) direkt mesajları ve bilet cevaplarını (59, 60) dışarı vermiyor — `backend/promises.md`'de yazılı boşluk. Yeni numaralı SQL ile kapat, `export.test.mjs`'e kontrol, promises.md satırı. | app · site | yapıldı 4eca25c | `64_export_more.sql`: `export_me()` artık yazdığın DM satırlarını (kime gittiğiyle) ve bilet cevaplarını veriyor; karşı tarafın satırları dışarıda (söz 6). Kanıt: `export.test.mjs` "my message, with the friend it went to", "not their message", "my ticket answer, named by its night". promises.md boşluk satırı silindi. Eksik kalan tablolar: A1 F3. Canlıya: **sabah Ahmet** |
| A3 | Hesap silme uçtan uca: `delete_account()` yeni tabloların (rsvps, sparks, spark_invites, profile_links, dms, groups üyelikleri, rooms) hepsini temizliyor mu? Test yaz; eksikse yeni SQL. | app · site | yapıldı 0f6b977 | Tüm listelenen tablolar cascade ile gidiyor (doğrulandı). Eksikler kapandı, `65_account_delete.sql`: son admin hesabını silemez; sahip olduğu grup en eski üyeye geçer, yalnızsa grup silinir. Kanıt: yeni `delete-account.test.mjs` (15 kontrol; silmeden sonra profiles'a giden HER FK yürünür: "no row of any table still points at the person"). promises.md söz 13 eklendi, setup testi 12→13. Grup sohbeti/oda satırları isimsiz kalıyor → A1 F32 (karar). Canlıya: **sabah Ahmet** |
| A4 | İngilizce gizlilik özeti: `datenschutz/` yanına `privacy/` İngilizce tam metin var mı, listing'in istediği "English privacy summary linked from datenschutz" bağlantısı kuruldu mu; Expo/Firebase/Apple/Ticketmaster/Apple Music önizleme/konum hepsi geçiyor mu. | site | yapıldı 5af626a | `privacy/` vardı ve datenschutz'tan bağlıydı; eksikler üç dilde eklendi: Google/Apple girişi, DM/grup/spark/post, şikayet/engel, 30 gün hata kaydı, Apple Music/Deezer önizleme, silmenin gerçekte neyi aldığı; "tam olarak üç hizmet" cümlesi düzeltildi. Firebase/Expo/Ticketmaster/konum zaten vardı. **sabah Ahmet**: bağlayıcı Almanca `datenschutz/` hâlâ eski + yer tutucular (A1 F4/F5) |
| A5 | Play listing metni üç dilde (`app/store/listing.md`): kısa açıklama 80, uzun açıklama 4000, yenilikler; mevcut uygulamanın gerçek özelliklerinden (sparks, who is coming, gruplar, mesajlar, listen). Değiştirilecek şeyleri "sabah Ahmet" notuyla işaretle. | app | yapıldı (main, belge) | `app/store/listing.md`: kısa açıklama (65/66/55 karakter), uzun açıklama (~1500/4000) ve yenilikler (≤180/500) en·de·tr; DJ'ler bilerek dışarıda. Data safety UGC satırı güncellendi. 5 adet **sabah Ahmet** notu dosyada (yaş derecelendirmesi 18+, önizleme sadece Münih, izin listesi, silme URL'si, sürüm no) |
| A6 | Mağaza ekran görüntüleri: PWA derlemesinden (`npx expo export -p web`) headless tarayıcı ile 1080×2340 altı ekran (flow, night, people/connect, spark, map, account) ÜÇ dilde; `app/store/shots/` altına. Headless yoksa: neyin gerektiğini yaz, `sabah Ahmet`. | web app | sabah Ahmet (kısmen yapıldı dc50751) | `npm run shots` (`app/tools/store-shots.mjs`): PWA'yı derler, kendisi sunar, kurulu Chrome ile 360×780 @3× = 1080×2340, en·de·tr. Buluttan canlı veriye dokunmak yasak olduğu için `--offline` koştu: sadece karşılama ekranı gerçek görünüyor → `app/store/shots/{en,de,tr}-welcome.png`. Yeni dev bağımlılığı `playwright-core` (yerel kod yok, tarayıcı indirmez; neden PR'da). Kalan beş ekran (flow, map, people, messages, account) canlı veri + giriş ister → **sabah Ahmet** adım 3 |
| A7 | Geçmiş geceler canlıda yayında sayılıyor (11.10: health 680 geçmiş gece). `hide_past_events` cron'u ve `09_jobs.sql` incele; pg_cron yoksa alternatif (sync sonunda temizlik ya da `events_public` görünümünde `starts_at` filtresi). SQL + test. Canlıya uygulama `sabah Ahmet`. | üçü | yapıldı ca4791e | Kök: temizlik sadece pg_cron'a bağlıydı. `66_past_off.sql`: service rolü `hide_past_events()`'i çağırabilir; sabah sync'i her koşunun sonunda çağırıyor (66 yoksa sadece uyarı, sync düşmez). Okuyucuya tarih filtresi eklenmedi (F11'in o yarısı açık). Kanıt: `sync-retire.test.mjs` "the service role may run it", "a seed night from last week leaves the deck", "a night that started two hours ago stays up", "anon/authenticated still may not run it". Canlıya 66: **sabah Ahmet** |
| A8 | Android App Links: `.well-known/assetlinks.json` GitHub Pages alt klasöründe bulunamıyor. Çözüm seçeneklerini yaz (kullanıcı sitesi kökü, özel alan adı, intent filtresini kaldırıp `afterhours://` ile yetinme) — `karar bekliyor`. Kod yazma. | site · app | karar bekliyor | Kod yazılmadı. **(a) Kullanıcı sitesi** — `kurtkurtkurt-del.github.io` adlı ikinci public repo, içeriği `user-site/`'de hazır (`.well-known/assetlinks.json` + iOS dosyası, adımlar `user-site/README.md`). Ücretsiz, ~5 dk, `app.json`/linkler değişmez; yeni build gerekmez. Eksi: ikinci repo; Play App Signing açılınca Play anahtarının SHA-256'sı dosyaya eklenmeli. **(b) Özel alan adı** (ör. afterhours.app) — yıllık ücret, DNS + Pages ayarı, `app.json` host, `config.js` `AH_CONFIG.app`, paylaşılmış tüm linkler değişir, yeni build. Artı: marka, iOS universal links için temiz. **(c) Intent filtresini kaldır**, sadece `afterhours://` — küçük kod + yeni build; https linkleri tarayıcıda açılır, site uygulamaya yönlendirir (`g/` zaten böyle). Eksi: doğrulanmış link yok, bir dokunuş fazla. Öneri: şimdi (a), mağazadan sonra (b). Kök 404 durumu buluttan doğrulanamadı (proxy reddetti) |

## B · Güven (moderasyon, kurtarma, operasyon)

| # | İş | Yüz | Durum | Kanıt / not |
|---|---|---|---|---|
| B1 | Şikayet akışının karşı tarafı: şikayet edilen içerik/kişi panelde görünüyor mu, işlem (gizle/yasakla) şikayet edene bildiriliyor mu? Eksik olanı listele, küçükse kapat. | app | yapıldı 78e167b | Var olan: panelde içerik/kişi görünüyor (`staff_reports`: metin, yazar, sayı, gerekçeler; postlar `staff_posts_reported`), işlem tut/kaldır/yazarı yasakla, içerik SAHİBİNE bildirim (53). Eksik olan ve kapatılan: şikayet EDENE hiçbir şey gitmiyordu → `67_report_answer.sql`: rapor kapanınca (her yoldan: settle, ban, post gizle) şikayet edene "ekip baktı" bildirimi, karar söylenmiyor; uygulamada 'from the team' sayfasında üç dilde. Kanıt: yeni `report-answer.test.mjs` (10). Hâlâ eksik (dokunulmadı): gerekçe + itiraz yolu (F16), push yok (bildirim uygulama açılınca), sitede bildirim yok (F6), DM/gece/DJ/albüm şikayet edilemiyor (F8). Canlıya 67: **sabah Ahmet** |
| B2 | Şifre sıfırlama ve e-posta değişimi uçtan uca: `reset/` sayfası, Supabase redirect listesi, PWA'da deep link. Her üç yüzde dene (kodla), sonucu yaz. | üçü | bekliyor | kurtarma |
| B3 | Yedek geri yükleme provası: `backup.yml` + `restore.mjs` ile boş PGlite'a geri yükleme testi (`backup.test.mjs` genişlet). | backend | bekliyor | veri kaybı |
| B4 | Uygulanmamış SQL listesi: `app/src/data/expectedSql.ts` ile canlı `migration_done` farkını `npm run health` raporlasın; sabah listesi için tek komut. | backend | bekliyor | operasyon |

## C · Eksik akışlar (özellik yarım)

| # | İş | Yüz | Durum | Kanıt / not |
|---|---|---|---|---|
| C1 | "Kim geliyor" cevabına bildirim: arkadaş `geliyorum` deyince `push_outbox` satırı (26/58 kalıbı, sabit cümle + ad), ayar anahtarı `notify_matches` altında. SQL + test. | app | bekliyor | 05.10 notu: bildirim yoktu |
| C2 | Spark sahibine cevap bildirimi (varım/yokum) aynı kalıpla. | app | bekliyor | |
| C3 | Berlin önizlemeleri: `tools/previews.mjs` Berlin için koş, `previews-berlin.sql` üret (yapıştırma `sabah Ahmet`). | app | bekliyor | Münih 38/50 |
| C4 | Spark fotoğrafları: 11 tür ödünç fotoğraf kullanıyor (`content/sparks.ts` notu). Her türe Unsplash'ten kendi fotoğrafı; `CREDITS.md`. Ajan Unsplash'e ulaşamazsa aday listesi + `sabah Ahmet`. | app | bekliyor | |
| C5 | Site ↔ app eşitliği: sitede olup app'te olmayan, app'te olup sitede olmayan özellikleri tablo olarak çıkar (A1 ile birlikte). Küçük olanları kapat. | site · app | bekliyor | |

## D · Cila (Cuma'ya oturmuş his)

| # | İş | Yüz | Durum | Kanıt / not |
|---|---|---|---|---|
| D1 | Boş durumlar turu: giriş yok / arkadaş yok / şehirde gece yok / çevrimdışı — her sekme ve her sayfa; eksik ya da İngilizce kalmış olanları üç dilde yaz. | app · web app | bekliyor | |
| D2 | Üç dil denetimi: `tools-lang.py` ve i18n parts'ta eksik anahtar, uzun Almanca kelimelerin sığmadığı yerler (adjustsFontSizeToFit). | üçü | bekliyor | |
| D3 | PWA'da `Alert.alert` → `confirm` dönüşümlerinin hepsi gerçekten çalışıyor mu; iOS Safari'de bilinen 3 kısıt README'de yazılı mı. | web app | bekliyor | |
| D4 | Intro film: üç dilde altyazı süreleri, `end` zamanı; `npm run film` temiz. | app | bekliyor | |
| D5 | Site: `tools-site-check.py` temiz, `?v=` tek, og görselleri güncel sayfalar için var. | site | bekliyor | |

## Sabah Ahmet (gece ajanının bıraktığı el işleri)

Gece 1 (19→20.10.2026):

1. **PR'ı incele ve birleştir** (`release/night-2026-10-19` → `main`). Sonra canlıya iki SQL, sırayla, Supabase SQL editöründe: `backend/sql/64_export_more.sql`, `backend/sql/65_account_delete.sql` (ya da `setup-1-structure.sql`'in tamamı). Kontrol: `cd backend && npm run health` listede 64 ve 65'i görmeli.
2. **F1'e bak** (A1 bulguları): `backend/tools/sync-ticketmaster.mjs` ~475'teki DELETE her sabah dünkü Ticketmaster gecelerini ve onlara bağlı check-in kartlarını, oda yazılarını, swipe'ları siliyor. Kuyruğa alınırsa bir gecelik iş.
3. `datenschutz/`, `impressum/`, `agb/` yer tutucularını doldur (ad, adres, hoster, tarih); Almanca datenschutz'u `privacy/` özetindeki yeni maddelerle eşitle.
4. `app/store/listing.md`'deki **sabah Ahmet** notları: IARC'ta 18+, Data safety'de mesaj/foto/UGC, AAB'deki gerçek izin listesi, sürüm numarası.
5. A1 bulgularından hangilerinin kuyruğa gireceğine karar ver (öneri listesi bölümün sonunda).

Gece 2 (20.10.2026) — sıra önemli:

1. **Önce PR #3, sonra Gece 2 PR'ı** birleştir. Supabase SQL editöründe sırayla: `64_export_more.sql`, `65_account_delete.sql`, `66_past_off.sql`, `67_report_answer.sql` (ya da `setup-1-structure.sql`'in tamamı). Kontrol: `cd backend && npm run health` 64–67'yi görmeli.
2. **A0 doğrula:** `cd backend && TICKETMASTER_KEY=... node tools/sync-ticketmaster.mjs --dry`, sonra Actions → sync-events → Run workflow. Günlükte "taken off the deck" ve "hide_past_events: N" olmalı, "refused" olmamalı. Ertesi gün bir check-in kartının durduğuna bak.
3. **A6 ekranları:** `cd app && npm install`. Girişsiz ekranlar: `npm run shots` (welcome, flow, map; canlı veri). Girişli ekranlar için bir kez: `npx expo export -p web --output-dir /tmp/ah && npx serve -s /tmp/ah -l 4398`, Chrome'u `--user-data-dir=$HOME/ah-shots http://localhost:4398` ile aç, test hesabıyla gir, kapat; sonra `npm run shots -- --profile $HOME/ah-shots`. Beğendiklerini `app/store/shots/`'ta bırak.
4. **A8 kararı:** tahtadaki (a)/(b)/(c); öneri (a).

## Çelişkiler ve gece notları

- Gece 1: `night-run.md` PR'ı `gh pr create` ile açmayı söylüyor; bulutta `gh` için token yok, PR GitHub bağlantısı (MCP) ile açıldı (#3) — kural "gh token yoksa gövdeyi sabah notuna yaz" diyor, ikisi de yapıldı.
- Gece 1: A1 tablodaki ilk madde ama A2/A3 kod işiyle paralel yürüdü (denetim arka planda okuma yaptı); commit sırası A2, A3, A4 kodda; A1 ve A5 belge olarak main'de.
- Sabit sınırlarla (main'e kod yok, force-push yok, merge yok, build yok, canlı DB yok, sır yok) çelişen bir satır bulunmadı.
- Gece 2: Görev 20.10 06:28 UTC'de başladı (gece değil). Dal adı bugünün tarihi: `release/night-2026-10-20`; PR #3 açık olduğu için dal kurala göre `origin/release/night-2026-10-19` üzerinden açıldı. Sabah notu `morning-2026-10-20.md` adı Gece 1'de kullanılmıştı; üzerine yazmamak için Gece 1'in kalıbıyla (Ahmet'in okuyacağı sabah) `morning-2026-10-21.md`.
- Gece 2: Hazırlık testleri yeşildi; tek pürüz ortamdan: bulut sığ klon aldığı için `upgrade` testi 5dabbd2'yi bulamadı, `git fetch --unshallow` sonrası 1065 kontrol yeşil. Kodda değişiklik gerekmedi.
- Gece 2: A6 "headless ile çek" diyor; headless vardı ama veri canlıdan geliyor ve canlıya dokunmak sabit sınırla yasak. Sınır kazandı: `--offline` çekildi, kalan ekranlar sabah Ahmet.
- Gece 2: `night-run.md` PR'ı `gh pr create` ile istiyor; `gh` token'ı yok, PR GitHub bağlantısıyla açıldı, gövde sabah notunda da var.


## A1 bulguları

Gece 1 (19→20.10.2026), SADECE LİSTELE modu: hiçbir şey düzeltilmedi (A2/A3'ün kendi
kapsamı hariç). **D** = kodda/SQL'de görüldü, **T** = tahmin (canlı panel/ayar görülemez).
Büyüklük: k küçük · o orta · b büyük. Durum hepsinde `bulundu`; Ahmet sıraya alırsa iş olur.

### Yayın engeli (mağaza reddi, güvenlik, veri kaybı)

| # | Eksik | Gerçek uygulamada | Etki | Boy | Doğr. | Durum |
|---|---|---|---|---|---|---|
| F1 | **Sabah sync'i dünkü geceleri SİLİYOR** (`sync-ticketmaster.mjs` ~475: `DELETE /events?source=eq.ticketmaster&starts_at=lt.<bugün>`). `events`'e bağlı her şey cascade ile gidiyor: check-in kartları (koleksiyon), oda yazıları, swipe geçmişi, yorumlar, rsvp, bilet cevapları, grup albümü satırları (dosyalar yetim kalıyor). Past feed Ticketmaster gecesini hiç gösteremez. | Silme yok; `archived_at` / yayından kaldırma | Kullanıcının koleksiyonu her sabah 04:10'da kayboluyor | o | D | bulundu |
| F2 | Uygulamadaki "verimi indir" veriyi vermiyor: `app/src/app/settings.tsx` ~194 `exportMe()` sonucunu sadece KB olarak gösteriyor, dosya yok (site dosya kaydediyor). | Dosya + paylaşım sayfası | GDPR Art. 15/20 uygulamada yerine gelmiyor | k | D | bulundu |
| F3 | `export_me()` hâlâ eksik (A2 yalnız DM + bilet ekledi): posts, beğeni/yorum, gruplar (üyelik, mesaj, foto, oy), sparks + davetler, rsvps, check-in (konumlu), oda yazıları, profil linkleri/foto, engeller, şikayetler, bildirim ayarları, DJ sayfası, gönderilen geceler yok. | Her yeni tablo exporter'a kaydolur + "kullanıcı FK'lı her tablo exportta mı" testi | Eksik erişim hakkı | o | D | bulundu |
| F4 | Hukuk sayfaları şablon: `impressum/` 33, `datenschutz/` 24, `agb/` 12 köşeli parantezli yer tutucu (`[Vor- und Nachname]`, `[PLZ]`…). | Gerçek bilgiler | Impressum Almanya'da zorunlu; mağaza linkleri taslağa gidiyor | k (Ahmet'in bilgisi gerek) | D | bulundu |
| F5 | Datenschutz uygulamanın işlediği verileri saymıyor: konum (check-in koordinatı), DM, gruplar/albüm, posts, sparks, rsvp/bilet, Google/Apple girişi, Apple Music önizleme, GitHub'daki 30 günlük şifreli yedekler, 30 günde silinen misafirler. "Şikayetler incelenene kadar saklanır" diyor ama kod silmiyor; `push_outbox` hiç budanmıyor. (A4 ile kesişir.) | Tablo başına saklama süresi + budama işleri | Mağaza gizlilik etiketleri ile çelişki | o | D | bulundu |
| F6 | Site 18+/şartlar kapısını ve moderasyonu atlıyor: `register/` şart/yaş kutusu yok, `accept_terms`/`account_status`/`my_notices` sitede hiç çağrılmıyor, sitede yorum yazılabiliyor ama şikayet/engelle yok. Veritabanı yazarken `terms_version`/`adult` kontrol etmiyor. | Şart kabulü sunucuda (UGC tablolarında) zorunlu | Apple 1.2 / Play UGC | o | D | bulundu |
| F7 | Sadece Google/Apple ile giren kullanıcı sitede hesabını silemez (site sadece e-posta+şifre); webde silme Apple token iptalini de atlıyor. | Webde e-postayla doğrulanan "silme talebi" formu | Play web silme şartı | k–o | D | bulundu |
| F8 | Bazı içerikler şikayet edilemiyor: DM, gönderilen geceler, DJ sayfaları, grup albüm fotoları (`reports.kind` listesi, `dm/[id].tsx`'te şikayet yok). | Her UGC'ye şikayet yolu | Apple 1.2 | k–o | D | bulundu |
| F9 | Check-in hiçbir şeyi kanıtlamıyor (23: pencere ve 500 m testi kaldırıldı), yine de arkadaşlara "X şu an dışarıda" push'u gidiyor; check-out/geri alma yok. | Zaman penceresi + yumuşak konum ya da QR | Yanlış bildirim, kötüye kullanım | o | D | bulundu |
| F10 | Eski uygulama sürümleri SQL değişince sessizce bozuluyor: `expo-updates` yok, minimum sürüm kontrolü yok; dosyalar fonksiyonları drop/create ediyor. | Sunucuda `min_supported_version` + zorunlu güncelleme ekranı | Yayından sonra kırık uygulama | o | D | bulundu |
| F11 | Geçmiş geceleri gizleme pg_cron'a bağlı; `deck()` kendi tarih filtresine sahip değil. pg_cron kapalıysa push_flush, push_hourly, grup işleri, guests_prune, hata budama da sessizce ölü. (A7 ile aynı kök.) | Okuyucuda tarih filtresi + cron'u health'te denetle | 680 geçmiş gece canlıda | k–o | D+T | bulundu |

### Güven (moderasyon, kurtarma)

| # | Eksik | Gerçek uygulamada | Etki | Boy | Doğr. | Durum |
|---|---|---|---|---|---|---|
| F12 | Kanıt kayboluyor: DM'ler iki taraftan biri silinince cascade, `dm_unsay` geri alıyor, şikayet şikayetçiyle siliniyor, "kaldır" oda/grup mesajını, spark'ı, grubu kalıcı siliyor (geri alınamaz). | Şikayete içerik anlık görüntüsü + N gün yumuşak silme | Taciz eden hesabını silince delil yok | o | D | bulundu |
| F13 | Ban kaçışı: `delete_account()` `banned_at`'e bakmıyor, ad hemen serbest, aynı e-postayla geri kayıt; `staff_ban` oda ve grup mesajlarını görünür bırakıyor, `room_list`'te ban/engel filtresi yok; süreli askı yok. | Hash'lenmiş kimlik listesi, tek "yazar görünür" filtresi | Yasaklı kişi geri gelir | o | D | bulundu |
| F14 | Engel beforehours yorumlarını ve odaları kapsamıyor (`comments_public`, `room_list`). | Her okuyucuda engel filtresi | Engellenen kişinin yazısı görünür | k–o | D | bulundu |
| F15 | Moderatör kötü bir kullanıcı adını/görünen adı düzeltemiyor; ayrılmış adlar yok ("admin", "afterhours", "support") — ekip taklidi kolay. | Zorla yeniden adlandırma + yasak kelime listesi | Taklit | k | D | bulundu |
| F16 | Şikayet eden sonucu hiç öğrenmiyor; ban, reddedilen gece için bildirim türü yok; itiraz yolu yok (DSA). Bildirimler push'suz, sadece uygulama açılınca. (B1 ile kesişir.) | "Şikayetin incelendi" + gerekçe + itiraz | Güven, DSA | o | D | bulundu |
| F17 | Yasaklı kullanıcı silme ve dışa aktarmaya ulaşamıyor (TermsGate sadece neden + çıkış). | Banlıyken de silme (ban hash'i saklanarak) | Apple 5.1.1(v), GDPR | k | D | bulundu |
| F18 | Kişi başına vaka görünümü yok (geçmiş şikayetler, banlar); CM, admin'in banını kaldırabiliyor. | Kişi dosyası, yetki kademesi | Moderasyon körlüğü | o | D | bulundu |
| F19 | Kurtarma/hesap güvenliği: onay e-postasını yeniden gönderme yok (`auth.resend` hiç yok), şifre değişimi mevcut şifre istemiyor, silme yeniden giriş istemiyor ve geri alınamaz, "tüm cihazlardan çık" yok, e-posta değişimi sitede yok. (B2 ile kesişir.) | Yeniden doğrulama, 7–30 gün geri alma | Hesap kaybı | o | D | bulundu |
| F20 | Sunucu hataları sadece İngilizce (`raise exception` metni de/tr kullanıcıya gösteriliyor); Supabase e-postaları muhtemelen tek dil. | Hata kodu → istemcide çeviri | Üç dil sözü | o | D+T | bulundu |
| F21 | UGC'de içerik filtresi yok (ad, yorum, post, DM, grup adı). | Kelime listesi | Apple 1.2 "filtreleme yöntemi" | k–o | D (yokluk) | bulundu |

### Eksik akış

| # | Eksik | Gerçek uygulamada | Etki | Boy | Doğr. | Durum |
|---|---|---|---|---|---|---|
| F22 | Değişen/iptal edilen geceler duyurulmuyor: sync `dates.status` okumuyor, `staff_event_delete` kayıtları, biletleri, rsvp'leri cascade siliyor, "gece değişti/iptal" push türü yok. | Gelecek/bileti olana push | Kullanıcı iptali öğrenmez | o | D | bulundu |
| F23 | Spark iptali kimseye söylenmiyor (`spark_cancel` siler); spark düzenleme yok, eski spark'lar temizlenmiyor. (C2'ye yakın.) | "İptal" push'u | Katılan boşa gider | k | D | bulundu |
| F24 | Gönderilen gece yaşam döngüsü yarım: gönderen düzenleyemez/geri çekemez, onay/ret bildirimi yok, tarihi geçmiş bekleyenler kuyrukta kalıp 5 limitini dolduruyor. | Durum bildirimi + süresi geçeni düşürme | Gönderen bekler | k | D | bulundu |
| F25 | DJ sayfası DJ'den sonra yaşıyor: sahip silinince `owner_id` null ama `verified` kalıyor; `push_hourly` dj_live döngüsü `verified`'a bakmıyor (gizli sayfa için push). Personelin yaptığı sayfa gerçek DJ'e bağlanamıyor (çift sayfa). DJ `bio`'su kaydediliyor, onaylanıyor ama `dj/[id].tsx`'te gösterilmiyor. | Sahiplik devri, görünürlük filtresi | Hayalet sayfa, boş bilgi | k–o | D | bulundu |
| F26 | Posts ve past feed yetim: `yours` sekmesi gizli, `post/new` ve past feed sadece oradan; post_like/post_comment push'ları `/yours`'a gidiyor. | Yeni yer ya da kaldırma | Ölü push | k | D | bulundu |
| F27 | "E-posta ile bildir" ayarı (`notify_email`) kaydediliyor/dışa aktarılıyor ama hiçbir şey e-posta göndermiyor. | Gizle ya da yap | Yanıltıcı ayar | k | D | bulundu |
| F28 | DM'ler ince: çevrimdışı kuyrukta değil (mesaj kaybolur), 3 sn yoklama (Realtime değil), okundu bilgisi sadece telefonda, sohbet sessize alma/silme yok. | Outbox + Realtime + sunucu okundu | Kayıp mesaj | o | D | bulundu |
| F29 | "Who is this?" ve önizlemeler elle yapıştırılan içerik, sadece Münih; yeni sync gecelerine hiç gelmiyor. (C3 ile kesişir.) | Zamanlanmış iş | Diğer şehirler boş | k–o | D | bulundu |
| F30 | Örnek (uydurma) içerik gerçek verinin yanında: örnek hikâyeler, örnek DJ'ler, gerçek gecelerde "örnek arkadaşlar". | Yayında kapalı | Güven | k–o (politika kararı) | D | bulundu |
| F31 | Misafir → kayıt sırasında e-posta zaten varsa `signIn`'e düşüyor, misafirin swipe'ları yetim kalıyor. | Birleştirme | Veri kaybı (küçük) | k | D | bulundu |
| F32 | Grup sohbeti ve oda yazıları hesap silinince isimsiz kalıyor (yorumlar gibi); DSGVO açısından metin kişisel olabilir — politika kararı. | Ya sil ya da açıkça yaz | Silme sözü | k | D | bulundu |

### Operasyon / cila

| # | Eksik | Gerçek uygulamada | Etki | Boy | Doğr. | Durum |
|---|---|---|---|---|---|---|
| F33 | Göçler elle ve sadece dosya adıyla damgalı: checksum yok, uygulandıktan sonra değişen dosya fark edilmez; eski bir dosyayı yeniden yapıştırmak paylaşılan fonksiyonları geri alır (`push_enqueue` 26/48/59). Veri yapıştırmaları (paste-*, about-*, previews-*) hiçbir yere kaydedilmiyor; `cleanup-test-groups.sql` canlıda koştu mu bilinmiyor. (B4 ile kesişir.) | Checksum'lı göç + CI'da onaylı dağıtım | Sessiz geri dönüş | o | D+T | bulundu |
| F34 | İzleme ince: `health.mjs` `past_still_up`'ı yazıyor ama kırmızı yapmıyor, sync tazeliği / push_outbox birikmesi / cron varlığı / hata patlaması denetlenmiyor; sync sadece her dilim reddedilince 1 ile çıkıyor; GitHub 60 gün hareketsizlikte zamanlanmış işleri kapatır. | Tazelik + birikme alarmı | Sessiz arıza | o | D | bulundu |
| F35 | Çökme takibi: `log_error` saatte 100 ile sınırlı (kesintide çoğu düşer), native çökme/ANR yok, source map yok, alarm yok, sitede hiç yok. | Sentry/Crashlytics | Kör uçuş | k–o | D | bulundu |
| F36 | Yedek tam geri yüklemeyi kapsamıyor: sırlar yoksa iş yeşil biter; `pg_dump --schema=public` `auth.users`'ı almıyor (profiles FK'sı → temiz projeye geri yükleme kırılır); storage (fotolar) yok; şifreli geri yükleme hiç denenmedi. (B3 ile kesişir.) | Tam döküm + storage + prova | Veri kaybı | o | D | bulundu |
| F37 | Gece saatleri saat dilimsiz saklanıyor (yerel saat UTC gibi): night_soon push'ları, geçmiş kesimi, odalar, sessiz saatler Avrupa'da 1–2 saat kayık. | `timestamptz` gerçek dilimle | Yanlış zamanlı push | o | D | bulundu |
| F38 | Personel uyarısı sadece push (`staff_ping`); telefonu kayıtlı personel yoksa kimse duymaz; 24 saat sözü için yaşlanma/eskalasyon yok. | E-posta yedeği | Şikayet bekler | k | T | bulundu |
| F39 | Artıklar: gizlenen post/yorum fotoğrafı public bucket'ta URL ile erişilebilir; dosya temizliği sadece istemcide, `guests_prune` dosya bırakır. | Sunucu tarafı temizlik | Gizlilik | k | D | bulundu |
| F40 | (Gece 2) Yayından kalkmış geçmiş gecenin sayfası boş açılıyor: koleksiyon kartı, past feed ve passport `/night/<slug>`'a gidiyor, `night/[slug]` `events_public`'i okuyor, görünüm `security_invoker` + RLS `is_published or is_admin()` → normal kullanıcıya satır yok. A0'dan önce TM gecesi hiç yoktu; şimdi kart duruyor ama dokununca boş. Seed'lerde cron yüzünden zaten böyleydi. | Geçmiş gece için ayrı okuma (kartı/rsvp'si olan görebilir) | Koleksiyon kırık görünür | k | D | bulundu |

### Site ↔ app (C5 için ön tablo)

- Sadece sitede: geri bildirim formu (uygulamada kullanıcıya açık geri bildirim/yardım girişi yok), tarih filtreli poster duvarı.
- Sadece uygulamada: sparks, gruplar (site `g/` sadece davet sayfası), DM, check-in/oda/kartlar, harita (`maps/` kapalı), DJ'ler (`djs/` kapalı), arkadaşlar (`friends/` kapalı), kim geliyor, bilet cevabı, listen, who is this?, bildirimler, şikayet, şart/18+ kapısı, push.
- Elle kurulum (hiçbiri denetlenmiyor): ilk admin SQL editöründe, pg_cron + pg_net, Google/Apple sağlayıcıları, anonim giriş, redirect URL'leri, push kimlikleri, dört GitHub sırrı.

### Önce yapılması önerilen (Ahmet'in onayını bekler)

1. **F1** — en acil: her sabah kullanıcı koleksiyonunu siliyor. Sync'te DELETE yerine `is_published = false` (küçük kod + test).
2. **F2, F4, F5** — mağaza/hukuk: uygulamada export dosyası, Impressum/Datenschutz bilgileri (Ahmet), veri envanteri.
3. **F6, F8, F17** — UGC kuralları: sitede şart kapısı, DM/foto şikayeti, banlıyken silme.
4. **F11 / A7** — okuyucuda tarih filtresi + health'te cron denetimi.
5. **F12, F13** — delil ve ban kaçışı (politika kararı gerekir).


## Bekçi raporu · 2026-10-20 05:40 UTC

(`gh` girişi yok; GitHub bağlantısı üzerinden okundu. Sayfa 200 kontrolü yapılamadı.)

1. PR #3 (`release/night-2026-10-19`) açık, birleştirilebilir (clean); CI yeşil: site, generated, app, backend, versions.
2. `main` üzerinde son test.yml (561c058, 00:00 UTC) yeşil; pages build da yeşil.
3. sync-events: son çalışma 19.10 09:50 UTC yeşil (bugünkü çalışma henüz başlamadı, saat erken).
4. health: son çalışma 19.10 13:21 UTC yeşil.
5. backup: son çalışma 19.10 08:44 UTC yeşil; "iki sır var mı" satırını günlükte göremedim (veritabanı adımları listede yok, sırlar eksik olabilir — A1 F36).
6. Tahta: `yapılıyor` maddesi yok, değiştirilecek bir şey yok.
7. Sabah notunda prototip bağlantısı yok (yalnız PR #3); denetlenecek sayfa yok.

ok
