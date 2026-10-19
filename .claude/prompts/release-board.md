# Release board — yayına giden kuyruk (20–23.10.2026)

Tek dosya: gece ajanı buradan iş alır, Ahmet sabah buradan okur. Üstten alta önem
sırası. Durumlar: `bekliyor` · `yapılıyor` · `yapıldı <hash>` · `karar bekliyor` ·
`sabah Ahmet` · `bulundu` (ajan fark etti, kuyruğa yazdı, dokunmadı) · `iptal`.

Ajan kuralı: en üstteki `bekliyor` maddeyi al. Gecede 3–5 madde. Kuyrukta olmayan
iş yapılmaz. Bir madde tasarım kararı isterse 5 prototip + `karar bekliyor`, sonraki
maddeye geç. Ahmet bir satırı silerse o iş yoktur; sırayı değiştirirse sıra odur.

Üç yüz birden: **site** (kök HTML), **web app** (PWA, `app/` web derlemesi), **app**
(Expo). Bir madde üçünden birini bozmamalı; şüphede üçünde de denenir.

## A · Yayın engelleri (mağaza reddi, güvenlik, veri kaybı)

| # | İş | Yüz | Durum | Kanıt / not |
|---|---|---|---|---|
| A1 | Sistemsel boşluk denetimi: `.claude/prompts/systemic-gaps-audit.md` promptunu SADECE LİSTELE modunda koş; bulduklarını bu tabloya `bulundu` olarak, önem sırasıyla ekle (yayın engeli → güven → eksik akış → cila). Hiçbir şeyi düzeltme. | üçü | bekliyor | çıktı: bu dosyanın altına "A1 bulguları" bölümü |
| A2 | `export_me()` (14) direkt mesajları ve bilet cevaplarını (59, 60) dışarı vermiyor — `backend/promises.md`'de yazılı boşluk. Yeni numaralı SQL ile kapat, `export.test.mjs`'e kontrol, promises.md satırı. | app · site | bekliyor | GDPR: kişinin verisinin tamamı |
| A3 | Hesap silme uçtan uca: `delete_account()` yeni tabloların (rsvps, sparks, spark_invites, profile_links, dms, groups üyelikleri, rooms) hepsini temizliyor mu? Test yaz; eksikse yeni SQL. | app · site | bekliyor | mağaza kuralı: hesap silme eksiksiz |
| A4 | İngilizce gizlilik özeti: `datenschutz/` yanına `privacy/` İngilizce tam metin var mı, listing'in istediği "English privacy summary linked from datenschutz" bağlantısı kuruldu mu; Expo/Firebase/Apple/Ticketmaster/Apple Music önizleme/konum hepsi geçiyor mu. | site | bekliyor | `app/store/listing.md` kutusu |
| A5 | Play listing metni üç dilde (`app/store/listing.md`): kısa açıklama 80, uzun açıklama 4000, yenilikler; mevcut uygulamanın gerçek özelliklerinden (sparks, who is coming, gruplar, mesajlar, listen). Değiştirilecek şeyleri "sabah Ahmet" notuyla işaretle. | app | bekliyor | metin işi, karar gerekmez |
| A6 | Mağaza ekran görüntüleri: PWA derlemesinden (`npx expo export -p web`) headless tarayıcı ile 1080×2340 altı ekran (flow, night, people/connect, spark, map, account) ÜÇ dilde; `app/store/shots/` altına. Headless yoksa: neyin gerektiğini yaz, `sabah Ahmet`. | web app | bekliyor | Play 2 adet zorunlu, 8'e kadar |
| A7 | Geçmiş geceler canlıda yayında sayılıyor (11.10: health 680 geçmiş gece). `hide_past_events` cron'u ve `09_jobs.sql` incele; pg_cron yoksa alternatif (sync sonunda temizlik ya da `events_public` görünümünde `starts_at` filtresi). SQL + test. Canlıya uygulama `sabah Ahmet`. | üçü | bekliyor | `npm run health` kırmızı sebebi |
| A8 | Android App Links: `.well-known/assetlinks.json` GitHub Pages alt klasöründe bulunamıyor. Çözüm seçeneklerini yaz (kullanıcı sitesi kökü, özel alan adı, intent filtresini kaldırıp `afterhours://` ile yetinme) — `karar bekliyor`. Kod yazma. | site · app | bekliyor | README §6 "Still to do" |

## B · Güven (moderasyon, kurtarma, operasyon)

| # | İş | Yüz | Durum | Kanıt / not |
|---|---|---|---|---|
| B1 | Şikayet akışının karşı tarafı: şikayet edilen içerik/kişi panelde görünüyor mu, işlem (gizle/yasakla) şikayet edene bildiriliyor mu? Eksik olanı listele, küçükse kapat. | app | bekliyor | A1 doğrulayacak |
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

_(gece doldurur)_

## A1 bulguları

_(ilk gece doldurur)_
