# afterhours — App Store ve Play Store'a giden yol (04.11.2026)

Baştan sona tek liste. Sırayla gidilir; her madde bitince `[x]`. Durum sütunu
bugünkü gerçek: **var** (kodda/depoda hazır) · **yarım** · **yok** · **sen** (yalnız
sahibin yapabileceği hesap/ödeme/karar işi).

Bugün elde olan: Expo SDK 57 uygulaması (`app/`), EAS projesi bağlı
(`34222e72…`, hesap `offdutykurt`), `eas.json`'da development / preview / production
profilleri, Android için `app.afterhours.android` + `google-services.json`, iOS için
`app.afterhours.ios` + Sign in with Apple kodu, Play listing metni üç dilde
(`listing.md`), 3 karşılama ekran görüntüsü, `.well-known/assetlinks.json` (yanlış
yerde). EAS'ta bugüne dek yalnız Android **preview** APK'ları derlendi (son: versionCode 37,
SDK 57, başarılı); üretim AAB ve iOS derlemesi hiç yok. `expo-doctor` temiz (yalnız 14 paket eski). `ios/` klasörü yok, `android/`
git dışında: ikisi de EAS'ta otomatik üretilir, elle dokunulmaz.

---

## 0 · Önce kararlar (hepsini etkiler)

- [x] **0.1 Anonimlik × mağaza gerçeği — sen.** Proje anonim yürüyor ama: bireysel Apple
  Developer hesabında mağazada **gerçek ad** görünür; Play'de geliştirici adı serbest ama
  2024'ten beri bireysel hesapların **adres + telefon/e-posta** listede açık; Almanya'da
  Impressum (§5 DDG) zaten ad + adres ister; AB DSA'ya göre iki mağaza da "trader"
  bildirimi ister. Seçenekler: (a) kendi adınla çık, (b) bir UG/Einzelunternehmen adıyla
  çık (Apple Organization hesabı için D-U-N-S numarası, 1–2 hafta), (c) şimdilik yalnız
  web/PWA. Bu karar verilmeden 1 ve 4 başlamaz.
  **Karar 04.11: (a) kendi adıyla.** Bireysel Apple + Play hesabı; Impressum'a kendi ad/adres.
  Uygulama içi anonimlik kuralı (dosyalara ad yazılmaz) değişmez; yasal sayfalar bunun tek istisnası.
- [x] **0.2 Yaş sınırı — sen.** Uygulama kapıda 18+ istiyor (TermsGate). Mağaza
  anketlerinde de 18+ işaretlenecek (Apple'ın yeni yaş sınıfı 18+, Play IARC "Mature
  17+/18"). Listing'deki eski "Teen/16+" satırı silinir.
  **Karar 04.11: 16+/Teen.** Sonuçları: TermsGate'teki "18 or older" metni ve `safety.ts`
  TERMS_VERSION, listing'deki "afterhours is 18+" cümleleri (3 dil), AGB yaş maddesi 16'ya iner;
  Apple anketinde 16+, Play IARC'ta Teen. → 3.12 maddesi olarak kod işi.
- [x] **0.3 İlk sürüm numarası.** `app.json` `version: 0.1.0`. Mağazaya `1.0.0` ile
  çıkmak öneri; `versionCode` ve `buildNumber` EAS'ta uzaktan (`appVersionSource: remote`),
  elle dokunulmaz.
  **Karar 04.11: 0.1.0 kalır.** app.json'a dokunulmaz.
- [x] **0.4 Hangi şehirler.** Deste Münih + Berlin (Ticketmaster). Listing "many nights
  carry a preview" cümlesi Berlin önizlemeleri canlıya girmeden yumuşatılır ya da
  `previews-berlin.sql` uygulanır.
  **Karar 04.11: üç şehir — berlin, istanbul, münchen** (sync ve `content/cities.ts` zaten üçünü
  taşıyor). Listing metni üç şehri adıyla söyler; önizleme cümlesi "some nights" olarak yumuşar,
  Berlin SQL'i ayrı karar.

## 1 · Hesaplar ve ödemeler — sen

Durum 04.11: Expo/EAS hesabı var (`offdutykurt`, proje bağlı). Apple, Play yok. Sentry
DSN tanımlı değil (kapalı, zararsız). Destek e-postası yok.

- [ ] **1.1 Apple Developer Program** — developer.apple.com/programs/enroll → kendi Apple ID'nle
  gir (2FA açık olmalı) → "Individual/Sole Proprietor" → kimlik (pasaport/ehliyet fotoğrafı,
  Apple Developer uygulamasıyla telefondan daha hızlı) → 99 USD. Onay e-postası 1–2 gün, bazen
  48 saat+. Onay gelince bana "Apple hazır" de: Team ID'yi 4.3 ve `eas.json` için alırız.
  *Dikkat:* kayıttaki ad/adres App Store'da "Seller" olarak görünür (0.1 kararı).
- [ ] **1.2 Google Play Console** — play.google.com/console/signup → Google hesabı (anonim proje
  için ayrı bir Google hesabı mantıklı, ama Play'e kimliğin yine senin) → "Personal" →
  25 USD → kimlik doğrulama (belge + bazen adres kanıtı) → **cihaz doğrulama**: Play Console
  bir Android telefonda Play Store'a aynı hesapla girmeni ister. Sonra "Developer account
  verified" bekle (1–3 gün). Açılınca uygulamayı ben oluşturabilirim ama **12 test kullanıcısı**
  e-postasını senin bulman gerek: bir Google grubu aç (groups.google.com, ör.
  `afterhours-testers`), arkadaşları ekle; Play'e tek grup adresi yeter. 14 gün boyunca
  **katılmış ve en az bir kez açmış** olmalılar; sayaç ilk 12 katılınca başlar.
- [ ] **1.3 Sentry** — karar: (a) şimdilik kapalı kalsın (DSN yok, kod `enabled:false`'a düşüyor)
  ya da (b) sentry.io'da `afterhours` org / `app` projesi açıp DSN'i `EXPO_PUBLIC_SENTRY_DSN`
  olarak `.env`'e yaz (herkese açık değer, sır değil). Canlıda hata görmek için (b) önerilir;
  mağaza için şart değil.
- [ ] **1.4 Supabase üretim ayarları** — supabase.com → proje `elmnnyxgavwjxvwjgjcu` →
  Authentication:
  - Providers → **Apple**: aç; "Client IDs" alanına `app.afterhours.ios` (yerel Apple girişi
    için secret gerekmez; web Apple girişi varsa Services ID + key ayrıca). 1.1 bitmeden
    çalışmaz ama şimdiden açılabilir.
  - Providers → Google: açık olmalı (zaten çalışıyor, kontrol).
  - URL Configuration → Redirect URLs: `afterhours://auth-callback` var mı, `exp://**`
    geliştirme için duruyor mu, PWA ve site adresleri.
  - Sign In / Providers → **Anonymous sign-ins**: açık olmalı (misafir modu, Apple incelemesi
    için de önemli).
  - Email → Confirm email: açık mı kapalı mı; açıksa şablonlar üç dil mi (Supabase tek dil
    gönderir; en azından İngilizce temiz olsun).
  Bunlar panel işi; istersen ekran paylaşımıyla birlikte geçeriz, ben panele giremem.
- [ ] **1.5 Destek e-postası** — mağaza formları, Impressum ve `help/` için tek adres.
  Öneri: proje için ayrı bir adres (Gmail ya da ileride alan adında `hello@…`). Adres
  belli olunca `listing.md`, `help/`, `impressum/`, `privacy/` ve Supabase "sender" aynı
  anda güncellenir. **Bana adresi yaz**, dosyalara ben işlerim.

## 2 · Yasal sayfalar (site, her iki mağaza link ister)

- [ ] **2.1 `impressum/`** — 33 köşeli parantez yer tutucu (ad, adres, e-posta, telefon,
  USt-IdNr/Kleinunternehmer, §18 MStV sorumlu). "Muster — Platzhalter" bandı kalkar.
- [ ] **2.2 `datenschutz/`** — 24 yer tutucu + eksik işlemler: konum (check-in
  koordinatı), DM'ler, gruplar/albüm, posts, sparks, rsvp/bilet, Google/Apple girişi,
  Apple Music önizleme, Sentry, Expo push (Expo sunucuları üzerinden token), Firebase
  (FCM, `google-services.json`), GitHub'daki şifreli yedekler, saklama süreleri.
- [ ] **2.3 `privacy/` (İngilizce)** — 2.2 ile birebir eşitlenir; Apple ve Play bu adresi
  alır.
- [ ] **2.4 `agb/`** — 12 yer tutucu; UGC kuralları (şikayet, engel, ban, itiraz), 18+,
  bilet satışının üçüncü taraf (Ticketmaster) olduğu.
- [ ] **2.5 Hesap silme web sayfası** — Play zorunlu kılıyor. `delete/` var ama
  yalnız e-posta+şifre; **Google/Apple ile girenler webden silemez** (F7). Çözüm: e-posta
  doğrulamalı "silme talebi" formu ya da silme sayfasına Google/Apple girişi.
- [ ] **2.6 `help/`** — Apple "support URL" olarak kullanılır; içinde iletişim yolu olmalı.

## 3 · Uygulama içi mağaza kuralları (red sebepleri)

**Kaldığımız yer (04.11):** bölüm 3 tarandı; kalan kod işi 3.12 → 3.11 → 3.1 sırasıyla. 3.3, 3.6, 3.8, 3.10 hesaplar/derleme sonrası.

- [ ] **3.1 Apple 1.2 UGC seti** — 04.11 durum: DM şikayeti yapılmış (`dm_message`). Hâlâ şikayet edilemeyen: **DJ sayfası**, **üye gönderdiği gece** (gece sayfasında yalnız yorum şikayeti var), **grup albüm fotoğrafı** (yalnız grup bütünü). Üç yeni `reports.kind` → yeni SQL (orta risk) + üç ekrana uzun basma. Eski not: — var: şartlar kapısı, engelle (iki yönlü), şikayet,
  kelime izleme (`79_word_watch.sql`), moderatör paneli. Eksik: **DM şikayeti**, gönderilen
  gece / DJ sayfası / grup albüm fotoğrafı şikayeti (F8). İnceleme notuna moderasyon
  süresi (24 saat hedefi) yazılır.
- [x] **3.2 Apple 5.1.1(v) + Play: hesap silme uygulama içinde** — var
  (settings → delete account, iki kez sorar). Banlıyken de silme: yapıldı (F17), canlıda mı
  kontrol.
- [ ] **3.3 Apple 4.8 Sign in with Apple** — kod var (`auth/apple.ts`), yalnız iPhone'da
  düğme. Gerçek cihazda ilk kez 1.4 bittikten sonra denenir.
- [x] **3.4 Apple 5.1.2 veri indirme** — 04.11: zaten yapılmış (`settings.ts` exportToFile → dosya + paylaşım; `89_export_all.sql`). Eski not: — uygulamadaki "download my data" yalnız KB
  gösteriyor, dosya vermiyor (F2); `expo-sharing` zaten bağımlılıkta, dosya + paylaşım
  sayfası yapılır. `export_me()` eksik tablolar (F3).
- [x] **3.5 İzin metinleri** — 04.11: push izni yalnız hesapla girişten sonra, kurulum başına bir kez (`push.ts`); misafirde sorulmuyor, kabul. — konum ve foto metinleri var. Kamera kapalı. Push için
  iOS'ta izin isteği kullanıcı bir şey yaptıktan sonra mı geliyor (Apple ilk açılışta
  istemeyi sevmez) — `lib/push.ts` kontrol.
- [ ] **3.6 Android izin listesi** — üretim AAB'den gerçek liste okunur (Play Console →
  App bundle explorer); `blockedPermissions` ile RECORD_AUDIO/STORAGE engelli, iyi.
  FOREGROUND/BACKGROUND konum yok, iyi.
- [x] **3.7 Zorunlu güncelleme kapısı** — 04.11: zaten var (`78_min_version.sql` + `UpdateGate.tsx`). Eski not: — F10: SQL değişince eski sürümler sessizce
  bozuluyor; `expo-updates` yok. Mağazada sürüm yaşayacaksa sunucuda
  `min_supported_version` + "güncelle" ekranı (küçük iş) ya da `expo-updates` ile OTA.
- [ ] **3.8 Misafir modu inceleme hesabı** — Apple incelemeci giriş isteyecek: test
  hesabı (`ada` değil, inceleme için ayrı) + App Review notlarına yazılır; misafir
  modu varsa onu da anlatırız.
- [ ] **3.9 Üçüncü taraf bilet linkleri** — Apple 3.1.3(e)/3.1.1: fiziksel etkinlik
  bileti dış linkle satılabilir, IAP gerekmez; uygulama hiçbir şey satmıyor, notlara
  yazılır.
- [ ] **3.10 iOS Privacy Manifest** — Expo modülleri kendi `PrivacyInfo.xcprivacy`'sini
  getiriyor; `aes-js`, `supabase-js` saf JS, sorun yok. İlk TestFlight yüklemesinde
  Apple'ın e-postası gelirse `app.json` → `ios.privacyManifests` ile kapatılır.
- [ ] **3.11 Tasarım/kalite** — 04.11: `userInterfaceStyle` → `dark` tek satır, hafif; henüz yapılmadı. — `supportsTablet: false` (iPad'de iPhone modunda açılır,
  kabul). Dark splash + `userInterfaceStyle: light` çelişkisi: uygulama koyu, iOS'ta
  sistem rengi karışmasın diye `dark` yapmak düşünülür. Çevrimdışı/boş durumlar yapıldı
  (D1).

- [ ] **3.12 Yaş kapısı 18 → 16** — 04.11 dökümü, değiştirilecek yerler: `app/src/i18n/parts/pages.ts` `terms.body` + `terms.adult` (3 dil); site `lang/en|de|tr.js` `register.terms` + `register.terms.needed`; `agb/index.html` "Mindestalter 18"; `listing.md` "afterhours is 18+" ×3; yorum satırları (TermsGate, safety.ts). TERMS_VERSION artırılmaz (kapı gevşiyor, yeniden onay gerekmez). Henüz dokunulmadı. — 0.2 kararı: TermsGate metni (3 dil), `safety.ts`
  TERMS_VERSION artar (herkes bir kez yeniden onaylar), listing + AGB + privacy'de 18 → 16.

## 4 · Deep link / App Links / Universal Links

- [ ] **4.1 Host sorunu (A8)** — `assetlinks.json` ve `apple-app-site-association`
  host **kökünde** olmalı; site `kurtkurtkurt-del.github.io/afterhours/` altında, kök 404.
  Üç yol: (a) `user-site/` içeriğini `kurtkurtkurt-del.github.io` deposu olarak yayınla
  (hazır), (b) özel alan adı (anonimlik için de iyi: `afterhours.app` gibi), (c) intent
  filtresini kaldır, yalnız `afterhours://` ile yetin (ilk sürüm için en hızlı).
- [ ] **4.2 Play App Signing SHA-256** — 1.2 bitip ilk AAB yüklenince Play'in anahtarı
  `assetlinks.json`'a eklenir (şu an yalnız EAS anahtarı var).
- [ ] **4.3 iOS Associated Domains** — `app.json` → `ios.associatedDomains:
  ["applinks:<host>"]` + AASA dosyası (Team ID 1.1'den sonra belli olur).

## 5 · Derleme (EAS)

- [ ] **5.1 Bağımlılıklar** — `npx expo install --check` (14 eski paket), `npx tsc
  --noEmit`, `npx expo lint`, `npm test`. Çalışma ağacındaki 6 değişmiş dosya
  (messages, people, groups, Motifs, Passport) önce commit.
- [ ] **5.2 `app.json` son hali** — version 1.0.0, `ios.buildNumber` yok (remote),
  `ios.associatedDomains` (4.3), `ios.config.usesNonExemptEncryption` zaten false,
  `android.versionCode` yok (remote). `description` ve `privacy` alanları.
- [ ] **5.3 EAS secret'ları** — `EXPO_PUBLIC_SUPABASE_URL/KEY` `.env`'de; `.env` EAS'a
  gidiyor mu (`.gitignore` `.env*.local` diyor, `.env` gidiyor; iyi) ya da `eas env:create`
  ile tanımlanır. Sentry token varsa secret.
- [ ] **5.4 Android üretim derlemesi** — `npx eas-cli@latest build -p android --profile
  production` → AAB. İlk seferde EAS keystore üretir/seçer (mevcut önizleme anahtarı
  korunur). Çıkan AAB'nin izin listesi 3.6'ya.
- [ ] **5.5 iOS önizleme + üretim derlemesi** — 1.1 sonrası `build -p ios --profile
  preview` (sertifika + APNs anahtarı otomatik), gerçek iPhone'da Apple girişi, push, konum,
  foto, deep link denenir; sonra `--profile production`.
- [ ] **5.6 Push üretimde** — Android: FCM `google-services.json` var; EAS'a FCM V1
  servis hesabı anahtarı yüklenir (`eas credentials`). iOS: APNs anahtarı 5.5'te. Expo push
  gönderen sunucu tarafı (`push_outbox`, `push_flush`) pg_cron'a bağlı (F11) — canlıda açık
  mı kontrol.
- [ ] **5.7 `eas.json` submit bölümü** — Android `track: internal` var; `serviceAccountKeyPath`
  (Play API servis hesabı JSON) eklenir. iOS için `appleId`, `ascAppId`, `appleTeamId`.

## 6 · Mağaza varlıkları

- [ ] **6.1 İkon** — `assets/icon.png` (1024×1024, alfa yok?) kontrol; Android adaptive
  üçlüsü var. Play ikon 512×512 ayrıca yüklenir.
- [ ] **6.2 Ekran görüntüleri** — şu an yalnız 3 karşılama (1080×2340). Gerek: Play
  telefon 4–8 adet × 3 dil; Apple **6.9"** (1320×2868) 3–10 adet × 3 dil (`tools/
  store-shots.mjs` genişletilir: deste, gece sayfası, kim geliyor, spark, harita, hesap).
- [ ] **6.3 Play feature graphic** 1024×500 — metinde tarif var, dosya yok.
- [ ] **6.4 Tanıtım videosu (isteğe bağlı)** — `npm run film` 7 sn film var; Play'e YouTube
  linki, Apple'a App Preview (dikey, 15–30 sn) olarak uyarlanabilir.
- [ ] **6.5 Metinler** — `listing.md` üç dilde var; Apple için ayrıca alt başlık (30),
  anahtar kelimeler (100), tanıtım metni; destek + pazarlama URL'si.
- [ ] **6.6 Yenilikler (release notes)** — üç dilde var; sürüm 1.0.0'a göre düzeltilir.

## 7 · Mağaza formları

- [ ] **7.1 Play Console** — uygulama oluştur · Mağaza kaydı (metin, görseller, kategori
  Lifestyle, e-posta, gizlilik URL) · **Data safety** (listing.md'deki cevaplar; UGC, DM,
  foto, konum, e-posta, ad; üçüncü taraf: Supabase, Sentry, Expo, Firebase) ·
  **IARC içerik derecelendirmesi** (18+ sosyal, kullanıcı mesajları) · Hedef kitle 18+ ·
  Reklam yok · **Hesap silme URL** (2.5) · Haber/devlet/finans beyanları hayır ·
  **DSA trader** beyanı · Uygulama erişimi: inceleme hesabı.
- [ ] **7.2 Play kapalı test** — AAB internal/closed track'e, 12 test kullanıcısı
  e-postaları (Google grubu kolay), 14 gün kesintisiz; sonra production access anketi
  (1–7 gün).
- [ ] **7.3 App Store Connect** — uygulama kaydı (bundle `app.afterhours.ios`, SKU) ·
  **App Privacy** (nutrition label: konum, e-posta, ad, foto, UGC, kimlik; takip yok) ·
  **Yaş derecelendirmesi** anketi 18+ · kategori Lifestyle/Social · fiyat ücretsiz ·
  **EULA** (standart Apple EULA yeter, UGC için link AGB'ye) · **Trader status** (DSA,
  AB'de zorunlu, adres/telefon mağazada görünür) · App Review notları: test hesabı,
  misafir modu, moderasyon, bilet linklerinin üçüncü taraf olduğu, Sign in with Apple yolu.
- [ ] **7.4 TestFlight** — iç test (kendin + birkaç kişi), isteğe bağlı dış test (ayrı
  kısa inceleme).

## 8 · Gönderim ve sonrası

- [ ] **8.1 `eas submit`** — Android: `-p android --profile production` (servis hesabı
  ile); iOS: `-p ios` (App Store Connect API anahtarı EAS'a verilir).
- [ ] **8.2 İnceleme** — Apple 24–48 saat tipik, ilk uygulamada red olası (UGC
  detayları, giriş); Play yeni hesaplarda 3–7 gün. Red gelirse neden buraya yazılır,
  düzeltilip yeniden.
- [ ] **8.3 Canlı sonrası** — Sentry'de hata izleme açık, `npm run health` günlük,
  `release-board.md` kapatılır / yeni sürüm kuyruğu açılır, is-gunlugu satırı.
- [ ] **8.4 Sürüm döngüsü** — sonraki sürümler: `eas build` + `eas submit`; JS-only
  değişiklikler için `expo-updates` (3.7 kararına bağlı).

---

## Sıra önerisi (paralel giden üç hat)

| Hafta | Sen (hesap/karar) | Biz (kod/site) |
|---|---|---|
| 1 | 0.1–0.4 kararları, 1.1 Apple, 1.2 Play (12 tester listesi), 1.5 e-posta | 2.1–2.6 yasal sayfalar, 2.5 silme formu, 3.4 veri indirme, 3.1 DM şikayeti |
| 2 | 1.4 Supabase Apple provider, Play kimlik/cihaz doğrulama | 5.1 bağımlılıklar, 5.4 Android AAB → 7.2 kapalı test **başlar** (14 gün sayacı) |
| 3 | 7.1 Play formları, 7.3 ASC formları | 6.2 ekran görüntüleri ×3 dil ×2 mağaza, 6.3 feature graphic, 4.1 host kararı |
| 4 | 7.4 TestFlight'ta dene | 5.5 iOS build, 3.3 Apple girişi gerçek cihazda, 3.7 güncelleme kapısı |
| 5 | Play production access başvurusu | 8.1 iOS submit → inceleme; Play onayı gelince Android submit |

En uzun kritik yol Play'in 14 günlük kapalı testi: Play hesabı ve ilk AAB ne kadar
erken olursa çıkış o kadar erken.
