# afterhours — projenin tam anlatımı

*Bu doküman, projeyi hiç görmemiş bir yapay zekâya (DeepSeek) projeyi baştan sona anlatmak için 26.10.2026'da yazıldı. Kaynakları: kök `README.md` (1351 satır, projenin tek resmî referansı), `backend/README.md`, `backend/promises.md`, `backend/model.md`, `.claude/prompts/release-rules.md`, `.claude/prompts/release-board.md`, `.claude/prompts/afterhours-context.md`, git geçmişi (400 commit) ve iki aylık oturum notları. Burada yazan bir şey README ile çelişirse README doğrudur.*

*Proje anonimdir: sahibinden "owner" diye söz edilir. Koda, teste, dokümana, mağaza metnine, i18n'e, filme ya da SQL'e owner'ın adı, e-postası, fotoğrafı veya hesap adları yazılmaz. Test kullanıcısı `ada`, yer tutucu e-posta `you@example.com`.*

---

## 0. Beş dakikada afterhours

- **Ne:** Bir şehrin gecelerini (rave, club night, konzert, festival, meetup, hausparty) kart kart önüne koyan ve arkadaşlarla gece bulduran mobil uygulama + onun kapısı olan web sitesi + ikisinin altındaki Supabase veritabanı. Üçü tek repoda.
- **Ana fiil:** *keep*. Sağa kaydır → geceyi sakladın, arkadaşların görür. Sola → bıraktın. Yukarı → bilet sitesi. Aşağı → gece sayfası. Gece gelince check-in; o gecenin *afterhours kartı* koleksiyona girer.
- **Arama yoktur.** Hiçbir yerde. Gece aranmaz, önüne gelir.
- **Her şey geceye bağlıdır**, kişiye değil. Kişiye bağlı "post" akışı yazıldı, denendi, kapatıldı (`POSTS_ON = false`).
- **Slogan:** *find your night. one card at a time.*
- **Ne kadardır:** 28.08.2026'da sıfırdan başladı. Bugün (26.10.2026) iki ay, 400 commit, 96 numaralı SQL migration, 80 test dosyası (950+ kontrol), Android APK v26, PWA yayında, site yayında.
- **Nereye:** Önce Android (native) yayına; web/PWA sonra. Münih önce, İstanbul sonra, Ticketmaster senkronunun ulaştığı şehirler.
- **Nasıl çalışıyoruz:** Owner Türkçe konuşur, kod/commit/doküman İngilizce. Owner tasarım kararlarını kendi verir; AI prototip çizer, beş seçenek sunar, owner seçer, sonra yazılır. Hiçbir şey istenmeden yapılmaz. README her değişiklikle aynı commit'te güncellenir. `npm run gate` geçmeden push yok.

---

## 1. Ürün: ne yapmaya çalışıyor

Üç cümlede ürün (README §1'in aslı):

1. **Arama yok.** Gece aranacak bir şey değil, sana gelen bir şey. Uygulamada deste sana bir kart uzatır: sağa kaydırırsan *keep*, sola *let go*. Web'de aynı geceler *the wall*'da asılıdır, en yakın tarihli önde.
2. **Önemli olan gece değil süreklilik.** Gittiğin her gece bir *afterhours kartı*na dönüşür: o gecenin sesi, konuşması, kim vardı. Koleksiyon geçmişi tutar; "şimdi ve sonrası" başka yerde yaşar.
3. **Sayfa sana gece satmaz.** Gece sayfası "bu gece ne var" demez, "bu senin kaçıncı kez oluşun" der. Bilet düğmesi vardır, tek kelime `ticket`, ama sayfanın merkezi değildir.

**İki yüzey, tek ürün.** Uygulama gecenin olduğu yerdir: deste, harita, kim geliyor, check-in, oda, koleksiyon, DJ'ler. Web kapı ve arşivdir: landing, duvar, her gecenin sayfası (beforehours yorumlarıyla), hesap ve ayarları. Uygulamada yaşayan şeyler için web'de "only available in the app." diyen kapalı sayfalar vardır (`friends/`, `maps/`, `djs/`). Kelimeler iki tarafta aynıdır.

### Ürün kavramları sözlüğü

| Kavram | Anlamı |
|---|---|
| **night** | Etkinlik. Asla "event" denmez (kodda `events` tablosu kalır, arayüzde night). Türler küçük harf: rave · club night · konzert · festival · meetup · hausparty |
| **keep / let go** | Sağa / sola kaydırma. Saklanan liste *yours* |
| **the deck / flow** | Deste. Uygulamanın ilk sekmesi. Her deste 99 kart, bitince "deal the next 99" |
| **the wall** | Web'deki keşif sayfası: altı poster yan yana, en yakın tarih önde, hover ile metin |
| **afterhours card** | Check-in sonrası kazanılan kart. SVG, 10 metal teması (steel/gold/chrome/copper/gunmetal/brass/rose/titanium/nickel/anthracite). Ön yüz: kim vardı; arka yüz: gecenin zaman çizgisi, ses notu, alıntılar |
| **the collection** | Kartların durduğu yer (account sekmesi / web `cards/`) |
| **beforehours** | Gece öncesi konuşma: gece sayfasındaki yorum konuları ve cevapları. Okumak herkese açık, yazmak hesap ister (misafir de yazabilir) |
| **the room / the moment** | Check-in'den sonra 48 saat açık kalan sohbet; sonra "frozen", sonsuza kadar salt okunur |
| **check-in** | Gece gelince "ben buradayım". Kart bununla doğar. 1 saat geri alma |
| **yours** | Senin sakladıkların + arkadaşlarının sakladıkları. Arkadaşın sadece SAĞA attıklarını görür, sola attıklarını asla |
| **waves** | 2nd wave = arkadaşlarının arkadaşlarının sakladıkları; 3rd wave = bir adım öte. Her kart zincirini gösterir: *via lina · tarık kept it* |
| **spark** | Kimsenin organize etmediği gece: evde derbi, nehir kenarında mangal, yürüyüş, gün doğumunu izlemek... 31 tür. Kart gibi görünür; sağa kaydır → tek dokunuşla yarat, dalga seçerek (1-3) arkadaşlara yayılır |
| **who's coming?** | RSVP: i'm in · maybe · not tonight |
| **nudge** | Arkadaşı bir gece hakkında dürtmek (tek dokunuş DM) |
| **groups / travel** | Arkadaş grupları: swipe · matches · live · plan · chat · memories · album; travel = şehir ve gün rotası (`group_legs`) |
| **who is this?** | Gecenin sanatçısı hakkında 2-3 cümle + iki numaralı gerçek (Wikipedia + Claude ile üretildi, kaynak linkli, "summarised with ai") |
| **listen** | Sanatçının en bilinen parçasından 30 saniyelik önizleme (Apple → Deezer), kartta `♪ listen` pill'i |
| **szene / ticket** | Gece türü: biletli mi, sahne (kapıda / listede / adresi sor) mi |
| **the owner** | Proje sahibi. Tek yönetici; etkinlikleri sadece o girer (Ticketmaster senkronu + elle) |

---

## 2. Zaman çizgisi: iki ayda ne oldu

Commit yoğunluğu (gün başına): 28.08 (27) · 29.08 (32) · 30.08 (33) · 31.08 (7) · 01.09 (25) · 02.09 (9) · 22-24.09 (69) · 25-29.09 (21) · 06-12.10 (73) · 19-22.10 (104).

### Hafta 1 — 28.08.2026: site doğuyor, bir günde beş ekranlı landing

Owner ilk gün tüm ürün spesini anlattı (landing + web app, Scene/Tickets toggle, 6 tür, Tinder kaydırma, 5 sekme) ama kuralı koydu: *"aklında bulunsun, ama sadece istediğimi yap, adım adım"*. Aynı gün:

- Header: "afterhours" sol üst, explore / help / login sağ üst. Siyah üstüne beyaz. Font Inter Tight (PP Neue Montreal'in ücretsiz karşılığı).
- Favicon: siyah kare, `af`/`hr` lockup; boyuta göre farklı artwork (16/32 px'te tek büyük `af`), `tools-favicon.py` üreteci.
- Poster vitrini: 2×10 grid, 20 gerçek SVG poster (owner'ın elinden), sağda hover ile değişen metin paneli. Sayfa kaymaz, sadece poster sütunu kayar; tam **6 tam + 2 yarım poster** görünür (`--row: calc((100vh - 104px) / 3.5)`). Poster `<object>` ile yüklenir (`<img>` içindeki SVG webfont çekemez).
- Site yapısı: klasör başına `index.html`, slug URL'ler (`explore/asap-rocky/`), slug'lar `events-data.js`'te tek kaynak.
- Poster seti 36'ya çıktı (Hausparty ve Meetup türleri eksikti, 16'sı AI tarafından aynı dilde çizildi).
- Çok ekranlı landing: `.screens` içinde N adet 100vh `.screen`; wheel ile 240px eşik, dokunmada 70px. Ekran 1: dev "Swipe through every event in your city." + tek kart; kartı kaydırmadan ilerleyemezsin (kart titrer). Ekran 2: kart şeridi telefonun **içinden** geçer (telefon ortası şeffaf). Ekran 3: şehir küresi (`globe.js`, **Three.js yok**, kendi projeksiyonu, canvas; sphere kenarı asla kadrajda değil çünkü tam küre "dikenli mayın" gibi duruyordu ve "global" okunuyordu, slogan ise "go local."). Ekran 5: siyah footer, ziyaretçinin saati, açık oda sayacı, manifesto "Success is nights attended, not screen time."
- Ses: iki sentezlenmiş techno loop (`/tmp/muzik_loop.py`, lameenc ile mp3) — üçüncü taraf medya yok.
- GitHub: `kurtkurtkurt-del/afterhours` public, Pages.
- Mobil: tek `@media (max-width: 720px)` bloğu; iOS Safari `100vh` → `100dvh` dersi; `?v=N` cache-busting.
- Explore = kaydırma destesi: 3 derin `.ex-kart`, 120px eşik, filtre satırı (o gün bilerek işlevsiz), beforehours paneli (slug-tohumlu mulberry32 ile hep aynı tartışma), ← / → tuşları, kept pile rozeti, üç deste kaynağı (global / friends liked / i feel lucky).
- Aynı gün üç ekran yazılıp silindi (plan→keep bölümü, çizilmiş Münih haritası, Szene vs Ticket karşılaştırması). Ders: **owner'ın yazılı brief'i bir eskizdir, tatmin edilecek bir spec değil.**

### Hafta 1 — 29-31.08: backend, canlıya geçiş, İngilizceye çeviri, güvenlik turu

- **29.08 Backend (12 adım):** Supabase seçildi. **SDK yok**, istemci PostgREST/GoTrue'ya düz `fetch` ile konuşur (sitenin sıfır bağımlılık kimliği). `backend/sql/01..09` (şema, RLS, tohum, görünümler, arkadaşlık, depo, işler). Test altyapısı **PGlite** (Postgres'in WASM derlemesi; makinede Postgres/Docker yok), `test/supabase-shim.sql` auth şemasını taklit eder. `tools/local-server.mjs` = PGlite üstünde PostgREST + GoTrue taklidi (port 4350); daha proje açılmadan istemcide 5 gerçek hata buldu. Güvenlik veritabanında: anonim okur, girişli kendi swipe'larını yazar, arkadaş sadece sağa atılanları görür, yönetici kimin ne beğendiğini göremez (sadece sayı). `user_id` varsayılanı `auth.uid()` → tarayıcı kimin adına yazdığını hiç göndermez.
- Ön yüzde az değişiklik: `config.js` boşken site **eski haliyle birebir** çalışır; `data.js` veriyi alır, `window.POSTERS`'a koyar, sayfanın scriptlerini `data-after` ile **sırayla** yükler.
- Aynı akşam **Supabase canlı**. SQL editörü tuzakları (RLS taklidi açıkken betik yeniden yazılıyor → "Run without RLS"). Dünya verisi: 54 şehir, 106 uydurma gece, 106 üretilmiş poster. Explore filtresi kendi dropdown'ı. Yeni sekmeler: friends&more, card collection; maps park edildi. Giriş magic link'ten şifreye çevrildi (Supabase dahili e-posta kotası saatte 2-4).
- **30.08:** Etkinlik sayfası = "kontak baskısı" (owner'ın vizyonu): sol sabit ray (poster + künye), ortada beş eşit kare, sağda kim geliyor + bilet + beforehours. 36 gece tek şablondan (`explore/etkinlik.js`, slug tohumu). Profil ikiye bölündü (`profiles` herkese açık kart, `profile_settings` yalnız sahibi). Kayıt handle seçilene kadar bitmiş sayılmaz. settings/, feedback/, register/ sayfaları çalışır. `delete_account()`. **Owner'ın kalıcı kuralı:** her değişiklikten sonra README güncellenir.
- **30.08 Proje tamamen İngilizce** (`1f26e2d`): sınıf adları, id'ler, dosya adları, `AH` API'si, veri alanları, yorumlar, SQL sütunları. Ders: toplu yeniden adlandırma tarayıcıda görünmeyen 5 şeyi sessizce kırdı (sözlük README §13).
- Migration log (`00_migrations.sql`), GitHub Actions (`test.yml`, `health.yml`), yedek + geri yükleme testi, `export_me()` (DSGVO 15/20).
- **31.08 Güvenlik turu:** tam kod denetimi, 29 bulgu, üç turda hepsi kapatıldı (arkadaşlık onayı atlanamaz, moderasyon kalıcı, sütun bazlı grant'ler, uuid oracle'ları, admin SVG `innerHTML` değil DOMParser, vb.). Testler 245 → 262. Duyarlılık turu (5 genişlik). "Doğrudan yapabildiklerinin hepsi": fontlar yerel (`fonts/`, Google'a 0 istek), 142 geceye sayfa, küre kendini türetiyor, explore sayacı, `reset/` şifre sıfırlama, a11y, lazy-load, `manifest.webmanifest`, `tools-site-check.py`.

### Hafta 2 — 01-02.09: gerçek etkinlikler

- **Ticketmaster senkronu:** edge function değil **GitHub Actions** (`sync-events.yml`, 04:10 UTC günlük), `backend/tools/sync-ticketmaster.mjs` sıfır bağımlılık, service_role ile REST'e yazar. İlk koşuda **5.105 gerçek gece**. Uydurma 142 gece silindi. 94 şehir kapsamı (`16_coverage.sql`). Upsert `external_id` üstünden → uuid ve swipe'lar koşular arası korunur.
- Ev kuralları: 18:00 öncesi ret (festival/rave muaf), ADDON regex'i (VIP/parking/M&G...), tekrarlayan gösteri tek paket.
- Çizim posterlerden çıkış başladı (owner: "bu tarz poster tasarımlarından tamamen kurtul"). Ana sayfa duvarı canlı ve **küratörlü**: `featured.js`'te elle seçilmiş 20 gece (Weeknd "After Hours Til Dawn" birinci — isim kardeşliği), her birine farklı türde hover metni (gümrük beyannamesi, bug ticket, diplomatik telgraf...), sanatçının en ünlü şarkısından iTunes önizlemesi.
- Deste 99 + sıradaki 99. Tarih filtresi gerçek. JetBrains Mono UI'dan tamamen çıktı (owner fontu beğenmiyor; sadece poster/kart artwork'ünde yaşar). İç linkler aynı sekme.
- Owner siteyi `file://` ile açar → hiçbir link çıplak klasör olamaz, module script yok.

### 22-29.09: uygulama repoya geliyor, tasarım v2, üç dil

- **25.09:** `app/` repoya kendi geçmişiyle (65 commit) girdi: Expo SDK 57, React Native 0.86, expo-router, TypeScript. Web uygulamayı takip eder: deste yerine duvar, `friends/ maps/ djs/` kapalı + "preview." düğmesi telefon maketinde gerçek ekran görüntüleriyle. Landing 6 ekrana indi. DJ ekranında ceviz tuning düğmesi (Claude Design'da owner çizdi, three.js, IIFE bundle) + radyo (statik ses, iki kanal bulur). EAS: ilk APK.
- **26.09 Rebrand kırmızı + design v2 "red on black":** ink #0E0D0C, paper #F3F1EC, red #D7261E. Logo = Archivo wdth 62 wght 900 (`ArchivoLogo.ttf`), "afterhours" + kırmızı nokta. DeckViewer, back = alt sol altı çizili "back" + sol kenar kaydırma (ilk deneme "very bad" alındı; kutu/pill yok), PullDownScroll, check-in açıldı (23_checkin_open), oda "the moment." sohbeti.
- **27.09 Üç dil** (en · de · tr) site + app tek seferde: site `i18n.js` head'de bloklayan ilk script, `lang/src/*.json` → `tools-lang.py`; app `src/i18n/` tipli anahtarlar. Ses: küçük harf, du/sen, Almanca isimler de küçük. Account sekmesi (afiş üstte, kâğıt üstünde deste), settings paneller, profil fotoğrafı hesaba bağlı (`24_photos.sql`).
- **28.09:** Konum takip (`data/here.ts`: en yakın gecelerin çoğunluk şehri), sekmeye tekrar basınca sıfırlama, **offline mode** (`lib/offline.ts`: shelf + outbox), waves, Google sign-in, **app yuvarlak köşeli oldu** (owner kararı; web değişmedi), intro film.
- **29.09:** Push bildirimleri (`26_push.sql`, 3 grup: istekler/eşleşmeler/canlı, gece/oda/cevap/digest/dj/wave; sessiz saat 00-09; günlük tavan 10), people search (`25_people.sql`), APK v9.

### 05-12.10: sparks, yours/connect, gruplar, mesajlar, bir kapı

- **05.10 Sparks:** `27_sparks.sql` → `28_spark_waves.sql` (dalga 1-3) → `30_spark_map.sql` (haritada altın elmas). Yours v2 (gallery, decks, people, past feed), RSVP (`32_rsvp.sql`), profile more (`29`), Avatar çizimi.
- **06-07.10:** person/[handle] profili, sharing, "who is this?" (`40_event_about.sql`), account types + staff panel (`41`, `42`), event submit (`43`), **groups** (`44-48`: gruplar, postlar, planlar, geceler, push), 31 spark türü, settings gruplandı. Setup canlıya yapıştırıldı (38'e kadar).
- **09.10 PWA:** aynı `app/` web'e derlenir, `afterhours-pwa` reposunda; her web farkı `src/web/*` shim'lerinde.
- **11-12.10:** Bilet kartı tasarımı E, gece sayfası B, connect A, mesajlar D (hepsi `prototypes/*.html`'de 5 seçenekten owner seçti). Blocks (`50`), safety/reports (`51`), bans (`52`), trust/rate limit (`53`), **`57_doors.sql` tek kapı** (`assert_member()`, `visible_to()`, `reachable()`; 33 yerde kendi kelimeleriyle sorulan soru tek fonksiyona indi), push asla metin taşımaz (`58`), DM (`59`), tickets (`60`), travel (`61`), group covers (`62`), previews (`63`). `backend/promises.md` 13 söz. `npm run gate` + pre-push hook. Yours sekmesi gizlendi (owner: "feed afterhours için yanlış şekil"), mesajlar kendi sekmesi oldu.

### 19-22.10: otonom geceler, yayın kuyruğu, light tema

- **20.10:** Owner Cuma'ya kadar yayına hazırlık için kendi kendine koşan geceler istedi. `release-rules.md` (anayasa), `release-board.md` (A-D öncelikli kuyruk, F1-F39 sistemsel boşluk denetimi), bulut rutinleri kuruldu, sonra owner "bulutta çalışma, lokal çalış" dedi → aynı gün lokal 72 commit. SQL 64-94: export more, account delete, keep past nights (F1: sabah senkronu dünkü geceleri DELETE edip cascade ile kartları götürüyordu → artık `is_published=false`), deck today, report answered, rsvp push, blocks everywhere, health more, night changed, messages go, ban stays, spark off, sent nights, reserved handles, min version, word watch, guest merge, posts off, leftovers, dj after, report snapshot, appeals, person file, cron health, checkin truth, export all, dm seen, checksums, timezones, staff backlog, retention. **Anonim proje kararı.** APK v21.
- **22.10 (`try/light` dalı):** light tema varsayılan + ayarlardan tema/aksan seçimi (5 aksan), one-sound (`doNotMix`), KeyboardSafe, specialties (halloween/new year/oktoberfest desteleri), DialogHost (`Alert.alert` uygulamanın kendi sayfasına), açılış asla donmaz (auth 4 s, font 6 s), profil plak kılıfı pre-render webp + 93 şehir plağı, spark edit (`96`), enrich.mjs (362 önizleme + 232 about), PWA iPhone'a uyarlandı (12 splash, visualViewport klavye, add-to-home hint), APK v24 ve v26.

### Bugün — 26.10.2026

Dal `try/light`, `main`'in 30 commit önünde (origin ile aynı). Üç küçük düzenleme commit'lenmemiş (deste "hepsini gördün · start over", NudgeSheet ilk karede dolu, launch.json). tsc/lint/jest 33/33/backend 80 dosya temiz. Gate kanıtı eski, push öncesi `npm run gate` yeniden koşmalı.

---

## 3. Owner'ın çalışma mantığı (bunu anlamadan bu projede çalışılmaz)

Bu bölüm iki aylık oturumlardan damıtıldı. Bir AI'ın bu projede nasıl davranması gerektiğini anlatır.

### 3.1 Sadece istenen yapılır

- **Mevcut mesajda istenen yapılır, fazlası yapılmaz.** Spec arka plandır ("aklında bulunsun"); gelecek sekmeler, rotalar, bölümler önceden iskeletlenmez. "Şunu da ekleyeyim mi?" yerine istenen biter, varsa gözlem bir cümleyle söylenir.
- **Büyük bir brief bile eskizdir.** Owner iki kez ayrıntılı yazılı brief verdi, birebir uygulandı ve *"hiç beğenmedim"* ile silindi. Uygulama: böyle işler kolayca silinebilir yazılır, ayrı dosyada/ayrı sayfada denenir, canlı sayfaya class toggle'larıyla sokulmaz (`strip.html` park kalıbı).
- **Reddedilen fikir yeniden önerilmez.** Reddedilenler README §12 / oturum notlarında yazılıdır (poster grid arkada duvar, fotoğrafı yakınlaştırma, saat saat renk değiştiren footer, "kurt yazınca admin", mono UI yazısı, Three.js, feed sekmesi, "explore" adlı düğme...).
- **"Doğrudan yapabildiklerinin hepsini yap"** denince: owner'ın elinin değmesi gerekmeyen (canlı DB yazımı, secret, hesap açma dışında) her şey tek partide yapılır, raporlanır.

### 3.2 Tasarım kararları owner'ındır

- Yeni ekran, değişen düzen, bir "his" gerekiyorsa: `prototypes/<ad>.html` içine **telefon genişliğinde 5 tasarım (A-E)**, uygulamanın renkleriyle, tek dosyada. Owner telefonundan bakar, birini seçer, sonra yazılır. AI seçmez, kurmaz.
- Küçük mekanik düzeltmeler (margin, kesilen etiket, eksik boş durum) karar değildir, yapılır.
- Owner tasarımları bazen Claude Design'da kendisi çizer (knob, film, plak, mesajlar) ve standalone HTML bundle'ı indirir; AI onu unpack edip koda taşır.
- Owner'ın eleştiri notları uygulanmaz, sadece söylenir ("kırmızı 4 anlam taşıyor" dendi, owner sadece paleti uygulamamı istedi, eleştiri uygulanmadı).

### 3.3 Dil

- **Konuşma Türkçe.** Açıklamalar, raporlar, sorular Türkçe.
- **Kod, yorum, commit, README, test çıktısı İngilizce** (30.08.2026'dan beri; öncesi Türkçeydi ve tamamen çevrildi).
- **Arayüz üç dil** (en · de · tr), İngilizce fallback ve HTML'deki metin. Hukuk sayfaları Almanca bağlayıcı.
- Ses: küçük harf, kısa, kuru. Almanca isimler de küçük (*finde deine nacht.*), `du` ve `sen`.

### 3.4 Doğrulama ve dürüstlük

- **"Yaptım" demek için kanıt gerekir.** Site değişikliği tarayıcıda ölçülür (`getBoundingClientRect`, computed style), app değişikliği telefonda görülür; görülemediyse "telefonda doğrulanmadı" yazılır. README'deki her "works" sütunu ölçülmüştür.
- **Testler kırmızıyken commit yok.** "I ran the tests" bir dosyadır: `.qa/gate-proof.json`, HEAD'in tree hash'ine bağlı.
- Pane/tarayıcı önizleme tuzakları bilinir ve etrafından dolaşılır (transition'lı computed style bayat okunur, `document.hidden` true, canvas arka planda 0 genişlik, önbellek ?v bump ister).
- Bir sorun bulunduğunda **önce tek bir bilgi ölçülür**, sonra teşhis konur. (SQL editörü tuzağında üç yanlış teşhisin dersi.)

### 3.5 Owner'ın elindeki işler (AI yapamaz / yapmamalı)

- Canlı Supabase'e SQL yapıştırmak (ya da `npm run migrate -- --write`), ilk admin'i atamak.
- GitHub secret'ları, Google/Apple OAuth ayarları, Supabase Auth provider'ları, redirect URL listesi.
- EAS build başlatmak (AI başlatabilir ama owner istemeden değil), Play listing.
- Token/şifre: owner kendi terminaline girer, osxkeychain'de durur; AI asla cevapta tekrar etmez, chat'e yapıştırılan token revoke edilir.
- Owner `main`'e merge eder; AI merge etmez, force-push etmez.

### 3.6 Diğer kalıcı kurallar

- **README her değişiklikle aynı commit'te güncellenir.** Biri sıfırdan gelse yalnız README'yi okuyup devam edebilmeli.
- **Anonim proje** (3.0'daki not).
- Owner siteyi `file://` ile Edge'de açar → module script yok, dynamic import yok, çıplak klasör linki yok (`explore/event/index.html?slug=` açıkça yazılır).
- Owner telefondan takip eder (Remote Control açık). Uzun komutlar arka planda.
- Owner'ın tercih ettiği his: "sayfayı büyütmeden" (yeni şey ekle ama yükseklik ekleme), "aynı bilgi iki kez yazılmasın", tanıtım paragrafı uzun olsun.

---

## 4. Fable (Claude) çalışma standardı — bir AI bu projede nasıl çalışır

Bu, iki ay boyunca Claude'un bu projede uyguladığı ve owner'ın onayladığı çalışma biçimidir. DeepSeek de aynı standardı sürdürmelidir.

### 4.1 Her değişiklik öncesi

1. İlgili README bölümünü oku (§3 sayfa haritası, §6 app, §8 backend, §12 tuzaklar).
2. Dokunacağın dosyayı oku; class adlarını, id'leri, mevcut attribute'ları gör (bir `<main>`'e ikinci `id` eklemek admin panelini sessizce kırdı).
3. Yapacağın şey tasarım kararı mı, mekanik düzeltme mi? Kararsa prototip + `karar bekliyor`.

### 4.2 Her commit öncesi (gate)

```bash
cd app && npx tsc --noEmit && npx expo lint && npm test     # app: tipler, lint, jest
cd backend && npm test                                       # 950+ kontrol, PGlite
python3 tools-lang.py --check                                # site sözlükleri
python3 tools-site-check.py                                  # her href/src, tek ?v=
cd backend && npm run gate                                   # hepsi + .qa/gate-proof.json
```

Kırmızı → düzelt ya da değişikliği geri al; asla kırmızı commit. Sıra: commit → `npm run gate` → push. Pre-push hook `main`'e kanıtsız kod push'unu reddeder (yalnız doküman push'u muaf).

### 4.3 Commit mesajı

Tek satır, ne değişti ve neden, sade kelimeler, emoji yok, İngilizce. `git log`'daki stil. Örnek: *"The web app made for the iPhone: start-up images per screen, the page pinned to the screen, the keyboard padded from the visual viewport, a one-time add-to-home-screen hint, maskable icons"*.

### 4.4 Yeni iş eklerken dört yer kuralı

Yeni SQL dosyası için **dört yer**: `tools/build-setup.mjs` listesi, `tools/local-server.mjs` listesi, `package.json` test zinciri, `backend/README.md` dosya listesi. Ayrıca `tools/expected-sql.mjs` ve `app/src/data/expectedSql.ts` aynı listeyi taşır. Biri unutulursa dosya setup'a girmez ve canlıya hiç gitmez.

Yeni site sayfası için: menü + footer + dört standart script (`i18n.js`, `data.js`, `session.js`, `menu.js`) + `tools-site-check.py` + sitemap + `?v=` bump (**tüm sayfalar birlikte**, CI tek `?v=` ister).

Yeni app metni için: `app/src/i18n/parts/*.ts`'e üç dilde, anahtar `alan.ad`; `textTransform` kullanma, `up()` kullan.

### 4.5 Güvenlik değişikliğinde

Who-may-do-what değişiyorsa: yeni numaralı SQL + PGlite testi + `backend/promises.md` satırı, **aynı commit'te**. Test ya da RLS kuralı bir şeyi geçirmek için asla zayıflatılmaz/silinmez.

### 4.6 Bilinen tuzakları yazma kuralı

Bir hata zaman yediyse README §12'ye "ne oldu, neden, nasıl uygulanır" biçiminde yazılır. Oturum notlarında ayrıca "tried and rejected — don't re-propose" listesi tutulur.

### 4.7 Raporlama

Owner'a Türkçe, kısa, kanıtlı: ne yapıldı, hangi commit, hangi test/dosya kanıtlıyor, owner'ın eliyle yapması gereken (SQL yapıştırma, secret) ne, telefonda doğrulanmayan ne. Otonom gecelerde: `morning-YYYY-MM-DD.md` en fazla on satır.

### 4.8 Yapılmayanlar

- İş uydurma: kuyrukta olmayan iş yapılmaz; fark edilen şey `bulundu` olarak kuyruğa yazılır.
- Bağımlılık ekleme: nedeni PR'da yazılmadan asla; native kodlu bir şey Expo Go'da çalışmaz, yeni build ister.
- Üçüncü tarafa bir şey göndermek, hesap açmak, ödeme, canlı DB'ye yazmak (owner istemeden).
- SQL yorumunda ASCII apostrof (`'`) — setup testi reddeder, tipografik `’` serbest.
- Sitede `type="module"` ya da dynamic `import()`.

---

## 5. Tasarım prensipleri

### 5.1 Ruh (README "The spirit")

- **Web: siyah-beyaz** (`#000` üstüne `#fff`). Kutu yok, gölge yok, yuvarlak köşe yok; ayraç 1px hairline. Renk yalnız posterlerde ve kartlarda.
- **App: mürekkep ve kâğıt.** Orijinali ink #0E0D0C üstüne paper #F3F1EC, tek kırmızı #D7261E. 22.10.2026'dan beri **varsayılan light** (ink #FBFAF7 zemin, paper #1F1D1A yazı; isimler rolünü korur, değerler döner). Saf siyah ve saf beyaz yok. 28.09.2026'dan beri **yuvarlak köşeler** (`radius` ölçeği), hâlâ gölge yok.
- **Tek yazı tipi:** Inter Tight (400/500/600). Küçük satırlar da Inter Tight: 10px, 0.14-0.18em tracking, büyük harf, %38-50 opaklık. **JetBrains Mono UI'da yasak** (owner beğenmiyor); yalnız çizilmiş poster/kart artwork'ünde ve app'te poster altyazı detaylarında (`fonts.jet`, 10-11px). **ArchivoLogo** (Archivo wdth 62 wght 900) yalnız isim ve başlık için.
- **Her şey elle yapıldı:** posterler el yazımı SVG, ses sentezlenmiş, kartlar üreteçten. Dışarıdan medya: `foto.jpg`, senkron fotoğraflar, app'in müzik parçaları (Free Music Archive CC BY), spark/feed fotoğrafları (Unsplash, `CREDITS.md`).
- **Site bağımlılıksız, build'siz.** npm yok, bundler yok. Tarayıcı ne anlıyorsa o. (App Expo projesidir, ikisi de var.)
- **Arayüz metni İngilizce ve küçük harf** (üç dilde de küçük harf).

### 5.2 App token'ları (`app/src/theme/tokens.ts`)

```
ACCENTS: red #D7261E (varsayılan) · green #1E9E57 · yellow #E5B000 · blue #2D6BE0 · pink #DD3B8A
         her biri spot (dolgu) + spotText (ink üstünde okunur metin) + rgb (tint için)
colors (light / dark):
  ink    #FBFAF7 / #0E0D0C   zemin
  paper  #1F1D1A / #F3F1EC   zemin üstündeki yazı
  paper2, ink2, rule, ink3 (hairline), mute, meta (küçük büyük harf satırlar)
  poster #0E0D0C, onPhoto #F6F4EF, onPhotoMute, onPhotoMeta, onPhotoRule, onSpot  (iki temada aynı: foto koyu bir nesnedir)
  sleeve (boş foto çerçevesi), card (zeminden ayrılan kart), edge (perforasyon)
ground(a) · paperTint(a) · scrim(a) · tint(a) · veil (0.74 light / 0.35 dark)
radius: xs 5 (küçük kareler, baş harfler) · sm 9 (chip) · md 14 (düğme, panel, kart) · lg 24 (sheet, deste kartı) · pill 999
fonts: regular/medium/semibold Inter Tight · jet JetBrains Mono · logo ArchivoLogo
intro: hold 300 · photoIn 1400 · wordDelay 900 · word 800 · leaveAt 3200 ms
```

Tema ve aksan açılışta **bir kez** okunur (her StyleSheet ondan kurulur); değişince `lib/restart.ts` `reloadAppAsync` ile uygulama yeniden başlar ve gelinen sayfayı hatırlar.

### 5.3 Seçilmiş tasarımlar (prototiplerden owner'ın seçtikleri)

| Alan | Seçim | Dosya |
|---|---|---|
| Bilet kartı (flow) | **E** — poster, sol üstte ink tarih etiketi (`fri 17.10` Archivo + saat), sağ üstte tür; altında kart gövdesi, kırmızı Archivo başlık, mekân, arkadaş kareleri; sol `details ↓`, sağ kırmızı şerit `keep →` | `prototypes/ticket-card.html` |
| Gece sayfası | **B** — bilet biçimi: foto, başlık, tür · mekân, perforasyon, stub (tarih · kapı · yer), kırmızı aksiyon (`get a ticket ↗` / `check in` / `the room`) | `prototypes/night-page.html` |
| Connect (people) | **A** — ilk iki grup kapağı yan yana, `with your people` galerisi, desteler | `prototypes/connect.html` |
| Mesajlar | **D / design 3** — stories üstte, tonight / together sekmeleri | `prototypes/messages-page.html` |
| Hesap, kartların altı | **B** — kâğıt yok; coming up posterleri, your sparks, cities | `prototypes/account-paper.html` |
| Wave zinciri | **E** — üç halka, ortada sen, kartın dalgası kırmızı, *via lina · tarık kept it* | `prototypes/via-chain.html` |
| Listen | **D** — `♪ listen` pill, büyük halka saniyelerle dolar | `prototypes/listen.html` |
| Plak kılıfı | **1 "föhn"** (5'ten) | Claude Design canvas |

### 5.4 Kaydırma dili her yerde aynı

Sağ = keep · sol = let go · yukarı = ticket sitesi · aşağı = gece sayfası. Deste, DeckViewer (yours/friends/waves), haritadaki kart hepsi aynı. Kart uçarken arkadaki hazır. `undo` son kaydırmayı ve yazısını geri alır.

### 5.5 Fotoğraf ve kart

Fotoğraf full-bleed, altında ink blok. `FitPoster` posteri **kırpmadan** gösterir, arkada bulanık kopya (yalnız dark). Senkron geceler `<img>` 2:3 `object-fit: cover`; çizim posterler `<object>` 2:3 (`viewBox 0 0 400 600`; 3:4 kutu artwork'ü ezer). Harita karoları bilerek desatüre (zemin), geceler renkli (29.09'dan beri grayscale yok).

### 5.6 Web yerleşim bantları

Masaüstü-önce, `style.css`'te bantlar: <1180px fotoğraf `min(780px, 46vw)`, duvar 6 → 4 poster; <900px küre listesi alta, oda/djs ekranları üst üste; <720px her şey stack (menü sarılır, ses satırları alt bar, fotoğraf gider, duvar 2 poster). 1440 masaüstü her geçişten sonra ölçülür: poster 146×219, foto 780px.

### 5.7 Tek sözlük (25.09.2026, app'in kelimesi kazanır)

night (asla event) · keep / let go · yours · who's coming? → i'm in · maybe · not tonight · where · when · kind, sonra ticket / szene · düğme tek kelime `ticket` · tarih `thu 26.09 · 20:00` (kart `26.09.26`) · zaman filtresi tonight · tomorrow · this weekend · this week · this month · any night · ayarlar: who sees what you kept · findable by handle · email me · download my data · delete account.

Çeviri sözlüğü: night *nacht / gece* · keep *behalten / sakla* · let go *ziehen lassen / bırak* · deck *stapel / deste* · card *karte / kart* · wall *wand / duvar* · collection *sammlung / koleksiyon* · map *karte / harita* · yours *deins / seninkiler* · the room *der raum / oda*.

### 5.8 Çevrilmeyenler

Veri (başlık, mekân, sanatçı, şehir, handle, insanların yazdıkları), marka kelimeleri (afterhours, beforehours, szene), çizilmiş artwork. Tür adları çevrilir (`type.<slug>`). Türkçe ek asla `{placeholder}`'a asılmaz (*katılım {when}*, *{when}'den beri* değil).

---

## 6. Kod mimarisi

### 6.1 Repo yerleşimi

```
afterhours/                        (GitHub: kurtkurtkurt-del/afterhours, public; Pages = site)
├── index.html  style.css  app.js  data.js  config.js  session.js  i18n.js  menu.js
│   cards.js  globe.js  knob.js  radio.js  phone.js  featured.js  events-data.js
│   venues.js  avatars.js  beforehours.js  webapp.js  strip.*  (site kökü)
├── explore/  (duvar + explore/event/ gece şablonu + event.js + event-data.js)
├── login/ register/ reset/ settings/ profile/ feedback/ help/ privacy/ cards/ admin/ delete/ g/
├── friends/ maps/ djs/              (web'de kapalı: "only available in the app." + preview)
├── impressum/ datenschutz/ agb/     (Almanca, yer tutucu — anonim kalacak)
├── lang/src/*.json → lang/*.js      (üç dil; tools-lang.py üretir)
├── fonts/ posters/ sound/ og/ phone/ design/ prototypes/ user-site/ vendor/
├── tools-*.py                       (favicon, knob, lang, previews, site-check, event-pages)
├── 404.html  manifest.webmanifest  robots.txt  sitemap.xml
├── .github/workflows/  (test.yml · sync-events.yml · health.yml · backup.yml)
├── .githooks/pre-push   .qa/gate-proof.json   .claude/prompts/*.md
├── app/                             (Expo / React Native / expo-router / TS)
│   ├── src/app/        rotalar (her dosya bir ekran)
│   ├── src/components/ src/data/ src/lib/ src/i18n/ src/theme/ src/auth/ src/audio/
│   ├── src/content/    örnek veri, sparks, cardsgen.js, records, taglines
│   ├── src/web/        PWA shim'leri (metro.config.js yalnız web'de yönlendirir)
│   ├── src/__tests__/  jest (offline, waves, when, sparkHints)
│   ├── assets/ public/ store/ tools/ (film, icons, record, shots, publish-pwa.sh)
│   ├── AGENTS.md CLAUDE.md CREDITS.md app.json eas.json
└── backend/
    ├── sql/00_migrations … 96_spark_edit.sql + setup-1-structure.sql + setup-2-comments.sql + tek atımlıklar
    ├── test/*.test.mjs (80 dosya) + supabase-shim.sql
    ├── tools/ (build-setup, stamp-sql, gate, migrate, health, backup, restore, local-server,
    │          sync-ticketmaster, enrich, previews, world-*, expected-sql)
    ├── README.md  model.md  promises.md  reports/  backup/  functions/apple-revoke
```

### 6.2 Veri akışı (iki istemci, tek Supabase)

Her iki istemci aynı Supabase projesine aynı public key ve aynı RPC'lerle konuşur: `deck`, `city_counts`, `swipe_set`, `kept`, `friends_*`, `profile_*`, `event_people`, `check_in`, `room_*`, `nights_near`, `export_me`, `delete_account` ve devamı.

**Sitede:**

```
config.js   →  data.js (live mi local mi?)  →  window.POSTERS  →  data-after scriptleri
                  ├ live: Supabase REST → sitenin şekline çevir
                  └ local: events-data.js (data-fallback)
```

```html
<script src="../data.js?v=199" data-fallback="../events-data.js?v=199"
        data-after="wall.js?v=199, filters.js?v=199"></script>
```

Ortak `AH` nesnesi: `AH.mode`, `AH.request()`, `AH.session`, `AH.signedIn()`, `AH.sessionReady`, `AH.onSessionChange`, `AH.refreshSession()` (her istek öncesi token tazeler), `AH.signUp/signInWithPassword/requestRecovery/updatePassword`, `AH.events/kept/saveSwipe/friends/comments/myProfile`, `AH.t/tn/has/i18nApply/setLang`. **Supabase SDK yok**, düz `fetch`.

**App'te (`src/data/`)**, her tablo/RPC için bir dosya, desen:

```ts
remember(group, key, () => supabase.rpc(...), max)  // saklı kopya hemen, taze arkada
peek(group, key)                                    // yalnız telefondaki kopya
send({ kind, ... })                                 // her yazma tek outbox'tan
```

### 6.3 Site (kök) — kurallar

- Her sayfanın `<head>`'inde ilk script `i18n.js` (bloklayan; `document.write` ile `lang/en.js` + seçilen sözlük; file:// ile de çalışır). Dil sırası: `?lang=` → `localStorage afterhours.lang` → tarayıcı → en.
- Markup: `data-i18n`, `data-i18n-html`, `data-i18n-attr="placeholder:key"`, `data-lang-block="de"` (hukuk sayfaları 3× yazılı), `data-lang-pick`.
- `data.js` → `POSTERS` → `data-after`. `session.js` token'ı localStorage'da tutar, GoTrue REST'e düz `fetch`.
- Gece sayfası **tek şablon**: `explore/event/index.html?slug=…` (`event.js` önce `?slug` okur, destede yoksa canlıdan `events_public?slug=eq.` çeker). İçerik havuzları `explore/event-data.js`, slug tohumlu mulberry32 (bir gece her açılışta aynı, iki gece birbirinin aynı değil).
- `cards.js` (site) ve `app/src/content/cardsgen.js` (app) **iki kopya, birlikte değişir**.
- Landing `index.html`: 6 ekran (0 posterler · 1 swipe · 2 kart şeridi · 3 djs/knob · 4 küre · 5 footer). `body[data-screen]`; ekran eklenip çıkarılınca üç yer yeniden numaralanır (dark-menu kuralları, `globe.js` çizim koşulu).
- `?v=NN` her asset'te **tek ve aynı** (şu an 199); CI `versions` işi + `tools-site-check.py` zorlar. Bump komutu: `find . -name '*.html' -not -path './.git/*' -not -path './app/*' | xargs sed -i '' -E 's/\?v=[0-9]+/?v=NEW/g'` + app.js'teki `knob.js/radio.js?v=`.
- Tüm fontlar yerel (`fonts/`, 20 woff2 + fonts.css); Google'a 0 istek. `404.html` hiç font yüklemez (her derinlikte render olur).
- `explore` sınıfları `ex-` önekli (çıplak `photo` landing ile çakıştı). `[hidden] { display: none !important }`.
- Hukuk sayfaları `lang="de"`, diğerleri `lang="en"` (`lang="tr"` + uppercase → "CLUB NİGHT").

### 6.4 App (`app/`) — mimari

**Yığın:** Expo SDK 57, React Native 0.86, React 19.2, expo-router (dosya tabanlı), TypeScript 6, reanimated 4.5, gesture-handler 2.32, supabase-js 2.117, expo-sqlite kv-store, netinfo, expo-location/notifications/image-picker/image-manipulator/audio/web-browser/apple-authentication, react-native-webview (Leaflet haritası), Sentry (yalnız DSN varsa ve dev değilse). Android önce (`app.afterhours.android`), iOS yapılandırıldı yayınlanmadı. `app/AGENTS.md` Expo'nun istediği kural dosyasıdır (versiyonlu docs'u oku, `npx expo install`, native klasörlere el değme).

**Giriş:** `src/app/_layout.tsx`: fontlar (Inter Tight 400/500/600, JetBrains Mono, ArchivoLogo), SplashScreen, Android nav bar gizli, sağlayıcılar `AuthProvider → LanguageProvider → AmbientProvider`, global katmanlar `PushBridge GenrePicker OfflineBar NoticeSheet TermsGate UpdateGate DialogHost InstallHint`. Font 6 s'de gelmezse devam; auth 4 s'de hazır (saklı oturum ayakta); `ErrorBoundary → Crashed` ("something broke · try again").

**Sekmeler** (`(tabs)/_layout.tsx`), sırayla: **flow · messages · people (connect) · map · account**. (`yours.tsx` dosyası duruyor ama 12.10'dan beri sekmede yok.) Sekme geçişi 260 ms fade; detay sayfaları `ios_from_right`. Sekmeye tekrar basmak sıfırlar (`hooks/useTabReset.ts`). Android'de tab bar 22 px yukarıda (`LIFT`; sistem nav bar gizli, alt kenar sistem jestine gidiyordu).

**Ekranlar** (`src/app/`): `index` (intro + home: dönen tagline, sign up, explore your city, ses), `film` (intro filmi, WebView'da el yazımı HTML, 43 s, üç dil altyazı, `npm run film`), `(tabs)/flow` (deste; `tickets · spark` anahtarı; what · when pill'leri; `+` → `/make`), `(tabs)/messages` (DM + your people), `(tabs)/people` (connect), `(tabs)/map` (Leaflet WebView, radar halkaları, km slider, pin: gece kare, arkadaş kırmızı, spark altın elmas), `(tabs)/account` (plak kılıfı + koleksiyon; altında coming up / your sparks / cities), `night/[slug]`, `room/[slug]`, `dm/[id]`, `person/[handle]`, `friend/[id]`, `dj/[id]`, `list/[kind]`, `spark/[kind]`, `groups/*` (index, new, join, invite, [id], chat, album, memories), `post/new`, `make`, `rooms` (→ messages), `signup`, `welcome`, `settings`, `profile`, `credits`, `auth-callback`, `panel/*` (personel: nights, people, reports, appeals, comments, djs, feedback, errors, log...), `+native-intent.ts` (web adresi → `/night/<slug>`).

**Veri katmanı** (`src/data/`): `deck, checkin, friends, dms, groups, sparks, near, cities, about, previews, tickets, rsvp, when, here, photo, settings, profile, comments, feed, posts, waves, safety, staff, messages, djs, geo, jobs, warm, accent, theme, expectedSql`. `data/jobs.ts` açılışta outbox handler'larını import eder.

**Offline** (`src/lib/offline.ts`): "shelf" — `cachedRead` saklı kopyayı hemen verir, tazeyi arkada çeker, değişirse `useShelf(group)` dinleyen ekran yeniden okur; `cache.<uid>.<group>` kv-store'da, bellekte tutulur, 400 ms sonra tek yazımla diske. Outbox: `outbox(kind, run, touches)` ile handler kaydı; `send` çevrimdışıysa kuyruğa (2 s → 1 dk geri çekilme), sunucunun reddettiği düşer; her işin telefon üretimi `id` + `at` (37_offline.sql tekrarı tekilleştirir). Supabase `getSession()` çevrimdışı null dönerse saklı oturum ayakta kalır, yalnız SIGNED_OUT dinlenir.

**Konum** (`src/data/here.ts`): tek "şu anki şehir". Açılışta ve 30 dk sonra: konum (son bilinen ≤10 dk, yoksa 8 s'lik taze) → `nights_near(lat,lng,60km,30)`'un çoğunluk `city_slug`'ı; isimden değil (İngilizce telefon "Munich" der, liste "münchen"). Elle seçim gerçekten başka şehre taşınana kadar kalır.

**Dil** (`src/i18n/`): `index.tsx` (`LanguageProvider`, `useLang()` → `t · tn · tx · up · lang · setLang`), `core.ts` (React'siz çekirdek), `dict.ts` (**anahtarlar tipli**, olmayan anahtar tsc'de patlar), `parts/{common,home,tabs,pages,staff,tips,groups,posts,server}.ts` (~2274 satır, üç dil yan yana). Sunucu hataları `lib/serverText.ts` ile çevrilir. `textTransform: 'uppercase'` yasak (RN telefonun yerelini kullanır) → `up()` / `upperData()`.

**En sık dokunulan bileşenler:** `CardFace.tsx` (deste kartı; `DeckCard` tipi, `toDeckCard`, `openTicket`, `openDetails`, `FitPoster`), `Deck.tsx` (jestler, `undo`, `swipe(dir)`, `listed`), `DeckViewer.tsx` (`Deck` üstüne; yours/friends/wave2/wave3/specialties), `Sleeve.tsx` (plak kılıfı; 93 `assets/record/*.webp`), `MapWeb.tsx`, `TabBar.tsx`, `KeyboardSafe.tsx` ('padding' iki platformda; Android edge-to-edge adjustResize'ı yok sayar), `DialogHost.tsx` + `lib/dialog.ts` (`Alert.alert` → uygulamanın sayfası), `Scrim`, `Tips` (sayfa başına bir ipucu, web'de kapalı), `TermsGate` (18+ / şartlar / kapalı hesap + itiraz), `UpdateGate` (`78_min_version`), `OfflineBar`, `PickerSheet/BigPicker/WhenPicker/PlacePicker/DayPicker`, `Avatar` (isim hash'inden çizilmiş yüz), `AfterhoursCard` (SVG, `content/cardsgen.js`), `NudgeSheet`, `WhoSheet`, `Listen`, `About`, `ShareButton`, `PullDownScroll`, `Logo`, `PhotoBox`, `People`, `StoryStrip/StoryViewer`, `PostCard` (kapalı).

**Ses** (`src/audio/`): `AmbientContext` (`doNotMix`: burada bir şey çalınca telefonun diğer sesi durur), `useTrack` (uygulama genelinde tek parça). Müzik `app/sound/<genre>/01–10.m4a` (FMA CC BY, `CREDITS.md`).

**Web / PWA:** aynı kod `expo export -p web` ile derlenir; her web farkı `src/web/*` shim'lerinde (kv-store, secure-store, WebView→iframe, file-system, apple, notifications, navigation-bar, alert) + `Platform.OS === 'web'` dalları + `app/public/` (sayfa, manifest, 12 iPhone splash). Yayın `tools/publish-pwa.sh` → `afterhours-pwa` reposuna force-push. Web'de yok: push, titreşim, Apple girişi, ilk dokunuşa kadar ses.

**Build:** `npx eas-cli build --profile development` (dev client APK), `--profile preview` (dağıtılacak APK, autoIncrement), `--profile production` (AAB); `eas build --local` da çalışır (JDK 17 + SDK var, ~10 dk). Expo hesabı owner'ın; keystore Expo sunucusunda. Native klasörler elle düzenlenmez (CNG).

**App ↔ site:** `share` gecenin web adresini verir; app siteyi poster SVG, `reset/`, `datenschutz/` için açar; sitenin her gece sayfasında `open in the app` (`afterhours://night/<slug>`) + store rozetleri. Android App Links yarım: `.well-known/assetlinks.json` hazır ama Pages alt klasörde; çözüm `user-site/` içeriğiyle `kurtkurtkurt-del.github.io` reposu (owner'ın adımı). iOS: Apple Developer hesabı, Sign in with Apple (yazıldı), TestFlight bekliyor.

### 6.5 Backend (`backend/`) — mimari ve güvenlik modeli

**Tablolar (model.md + sonrası):** `cities · countries · event_types · venues · events · profiles · profile_settings · profile_photos · profile_links · swipes · comments · friendships · feedback · checkins · rooms/room_lines · djs · push_tokens · push_outbox · sparks · spark_invites · rsvps · groups · group_members · group_legs · posts · blocks · reports · bans · appeals · dm_threads · dm_lines · tickets · event_about · event_previews · migrations` ve devamı.

**İki kritik veri kararı:** `meta` ekranda görünen satırın ta kendisi olarak saklanır (yapısal tarih yanına eklenir, yerine değil); **biriktirilen kartlar ayrı tablo değil**, yönü `right` olan swipe'lardır.

**Kurallar:**

1. **Numaralı, yalnızca eklenen migration dosyaları** (`00…96`). Uygulanmış dosya değiştirilmez; değişiklik yeni numaradır. Her dosya kendini `public.migrations`'a damgalar; `91_checksums.sql` sha256 ile içerik de damgalanır (daha önce "log tamam ≠ kurallar güncel" tuzağı yaşandı).
2. **Her tablo RLS ile kapalı.** İstemci tabloya değil `security definer` RPC'lere konuşur. Tek kapı `assert_member()` (üye ve yasaklı değil), görünürlük `visible_to(viewer, other)` / `reachable()` (`57_doors.sql`).
3. **Yazma izinleri sütun bazında.** `comments insert (event_id, parent_id, author_id, body)`; `friendships` pending doğar, yalnız alıcı status değiştirir; `is_hidden` yalnız admin trigger'ı. `created_at`, `last_seen_at`, `onboarded_at` yalnız definer fonksiyonlardan.
4. **Üye listesi taranamaz.** `profiles` doğrudan: kendin + onaylı arkadaş + aranızda bekleyen istek + admin. Yabancı her şeyi definer fonksiyonlardan görür; `last_seen_at` yalnız arkadaşa ve yalnız gün olarak.
5. **Push asla üyenin metnini taşımaz** (`58_push_words.sql`): sabit cümle + isim. Sessiz saat 00-09 yerel, günlük tavan 10, `push_hourly` + `push_flush` pg_cron, Expo'ya pg_net.
6. **Her migration'ın PGlite testi var** (`backend/test/*.test.mjs`, 80 dosya, 950+ kontrol). `backend/promises.md` 13 söz: her satırda SQL dosyası + kanıtlayan test adı; `setup.test.mjs` satırı testiyle doğrular, testi giden söz görünür biçimde düşer.
7. **Setup iki dosya:** `tools/build-setup.mjs` → `setup-1-structure.sql` + `setup-2-comments.sql` (Supabase editörüne yapıştırılır ya da `npm run migrate -- --write`). `setup.test.mjs` setup'ı iki kez koşar, hiçbir şey kıpırdamamalı (tekrarlanabilirlik). `upgrade.test.mjs` eski şemayı git'ten kurup bugünkü setup'ı üstüne yapıştırır (`create or replace view` sütun adı değiştiremez tuzağı).
8. Sırlar repoda yok: `TICKETMASTER_KEY`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`, `ANTHROPIC_API_KEY`. `config.js`'teki publishable key gizli değildir; koruma RLS'tir.

**13 söz (promises.md):** 1 kimse başkasının swipe'ını okuyamaz, arkadaş yalnız sağa atılanı görür · 2 tarayıcıdan admin olunamaz · 3 arkadaşlık pending doğar, yalnız alıcı kabul eder · 4 ayarlar yalnız sahibinin · 5 üye listesi taranamaz · 6 export senin her şeyini içerir, başkasının hiçbir şeyini · 7 block iki yöne kapatır (kart, arama, istek, dalga, mesaj) · 8 yasaklı hiçbir şey yazmaz, feed okumaz · 9 eklenmediğin gruba üye olamazsın · 10 push asla metin taşımaz · 11 DM yalnız onaylı, birbirine ulaşabilen arkadaşlar arasında · 12 burst sınırlı (dakikada 20 satır, günde 40 istek) · 13 silinen hesaptan hiçbir satır kalmaz; son admin kendini silemez.

**Araçlar:** `sync-ticketmaster.mjs` (günlük; upsert + geçmişi **yayından kaldırır, silmez**), `enrich.mjs` (who is this? + listen; Apple→Deezer, Wikipedia + Claude; `--dry`), `previews.mjs`, `migrate.mjs`, `health.mjs` (canlı DB durumu, eksik SQL, geçmiş gece sayısı), `backup.mjs`/`restore.mjs`, `local-server.mjs`, `gate.mjs`, `stamp-sql.mjs`, `world-*.mjs`, `build-seed/posters`.

**Otomasyon** (`.github/workflows/`): `test.yml` (backend · app · generated · versions · site; her push/PR, secret'sız), `sync-events.yml` (04:10 UTC), `health.yml` (06:20 UTC, kırmızıysa e-posta), `backup.yml`.

### 6.6 Kullanılan ve bilinçli kullanılmayan teknolojiler

| Kullanılan | Kullanılmayan (ve neden) |
|---|---|
| Düz HTML/CSS/JS (site) | Framework/bundler sitede (sıfır bağımlılık kimliği) |
| Supabase (Postgres + Auth + Storage + REST) | Kendi sunucu kodu (edge function bile yok; senkron GitHub Actions) |
| Düz `fetch` (site) / supabase-js (app) | Supabase SDK sitede |
| Kendi projeksiyonu + canvas (küre) | Three.js sitede genel olarak (yalnız owner'ın knob tasarımı için vendored) |
| PGlite (test) | Docker/lokal Postgres (makinede yok) |
| Expo + expo-router + RN | Bare RN, native klasör düzenleme |
| Leaflet WebView | react-native-maps |
| expo-sqlite kv-store (shelf) | AsyncStorage |
| iTunes/Deezer önizleme API | Spotify (Premium + login; markalı iframe) |
| GitHub Pages (site, PWA) | Vercel/Netlify |
| Inter Tight, Archivo, JetBrains Mono (yerel) | Google Fonts CDN (DSGVO), ikon fontu (ikonlar inline SVG) |

---

## 7. Kod temizliği standartları

- **İngilizce her şey**: tanımlayıcılar, yorumlar, commit'ler, testlerin çıktı cümleleri, dokümanlar. Türkçe sadece owner ile konuşmada ve `.claude/prompts/` planlarında.
- **Yorumlar "neden"i anlatır**, "ne"yi değil. Kod kendini okutur; `tokens.ts`'teki gibi: *"Read once at start: every StyleSheet below is built from it, so a new pick reloads the app."*
- **Renk, font, radius yalnız `theme/tokens.ts`'ten** (app). Hardcoded hex yasak (MapWeb pinleri bile token'dan).
- **Her ekran kendi metnini `useLang()` ile alır**; string literal arayüz metni yok. Anahtarlar tipli; üç dil aynı anda eklenir.
- **Sayılar türetilir, hardcode edilmez** (landing sayacı `POSTERS`'tan, footer şehir listesi `city_counts`'tan, help sayıları `health()`'ten).
- **Tek kaynak kuralı**: slug'lar `events-data.js`'te; kapsam `16_coverage.sql` + `PLACES` haritası birlikte; `expected-sql` iki kopya birlikte; `cards.js` / `cardsgen.js` birlikte; sözlükler JSON'da, üretilen dosya elle düzenlenmez.
- **Veri güvenliği istemcide değil DB'de**: istemci "kim" bilgisini göndermez (`default auth.uid()`), gizleme/moderasyon trigger'da.
- **Ölçülmeden iddia yok**: `getBBox()` ile poster taşması, `getBoundingClientRect` ile başlık sığması, `npm run health` ile canlı durum.
- **Bulk rename kuralı**: hedef ad dosyada zaten tanımlıysa reddet; nesne anahtarı ve `.okuma`yı aynı geçişte değiştir; başkasının API parametresi (`order=`) senin değil; sonra her aracı bir kez çalıştır (`node --check` ve tarayıcı bunları göstermez).
- **Yıkıcı aksiyon asla `onError`'a bağlanmaz** (fotoğraf silme kazası).
- **Sayfanın başında hiçbir şey sonsuza kadar beklemez** (auth 4 s, font 6 s, film 90 s).
- **Örnek veri gerçek verinin üstünde ve `sample` der**; yayında yok (`SAMPLES = __DEV__`).
- **Bir sayfa / bir ekran = bir dosya**; rota olmayan kod `src/app/` dışında.
- **Boş durum her sayfada** (giriş yok / arkadaş yok / şehirde gece yok / çevrimdışı), üç dilde.
- **Park edilen deneyler silinmez**, ayrı dosyada durur (`strip.html`, `maps/` eski çizim, `yours.tsx`), ama menüden/sekmeden çıkar.
- **Tuzak bulununca README §12'ye yazılır.**
- **Dead code temizliği** (knip ile 29.09), kullanılmayan `babel.config` gibi dosyalar kaldırılır.
- **Dosya adları küçük harf**, SQL `NN_snake.sql`, test `kebab.test.mjs`, prototip `kebab.html`.

---

## 8. Geçmişte ne ekledik — numaralı SQL ile özellik listesi

Her numara bir özellik, bir test dosyası ve (çoğunda) bir app/site karşılığı demektir.

| # | Dosya | Ne |
|---|---|---|
| 00 | migrations | Göç kaydı, `migration_done()` |
| 01-02 | schema, rls | Çekirdek şema; RLS; sütun bazlı grant'ler; moderasyon trigger'ı; 2000 karakter yorum tavanı |
| 03-05 | seed catalog/events/comments | Tohumlar (tekrar koşulabilir) |
| 06 | views | `events_public`, `comments_public`, `keep_counts` (`security_invoker`) |
| 07 | friends | Arkadaşlık (pending doğar, yalnız alıcı kabul) |
| 08 | storage | Poster bucket'ı (admin yazar) |
| 09 | jobs | `hide_past_events()`, `health()`, pg_cron |
| 10-11 | countries, world | 54 şehir dünya tohumu |
| 12 | profiles | Profil kart + ayar bölünmesi, `handle_status/profile_setup/profile_me/profile_card/seen/delete_account`, gizlilik, `discoverable`, `kept_visibility` |
| 13 | feedback | Herkes yazar, yalnız admin okur |
| 14 | export | `export_me()` DSGVO |
| 15-16 | ticketmaster, coverage | source/external_id/image_url/ticket_url; 94 şehir |
| 17 | real_people | nachtradar'dan taşınan kişiler |
| 18 | geo | `nights_near` |
| 19 | checkins | Check-in, kart numarası, oda |
| 20-21 | djs, sound | DJ'ler, ses dosyaları |
| 22 | hardening | `is_guest()`, misafir kısıtları |
| 23 | checkin_open | 6 saat / 500 m kapı testi kaldırıldı |
| 24 | photos | Profil fotoğrafı (ayrı tablo, `photo_set`, arkadaş görür) |
| 25 | people | `people_search`, `people_suggested` |
| 26 | push | Push token/outbox/switch'ler, sessiz saat, tavan, pg_net |
| 27-28, 30, 34, 39, 56 | sparks, spark_waves, spark_map, spark_push, spark_kinds(_2) | Sparks (dalga 1-3, haritada, push, 31 tür) |
| 29 | profile_more | bio 300, about 1500, linkler |
| 31 | past_feed | Geçmiş akışı (cursor) |
| 32 | rsvp | who's coming |
| 33, 35-38 | (ara dosyalar) | DJ takip, oda satırları, offline tekilleştirme, profile lists vb. |
| 40 | event_about | who is this? |
| 41-42 | account_types, staff | Hesap türleri, personel paneli |
| 43 | event_submit | Gece gönderme |
| 44-48 | groups, posts, group_plans, group_nights, group_push | Gruplar (swipe/matches/live/plan/chat/memories), postlar, push |
| 49 | design_reads | Tasarım okumaları |
| 50-53 | blocks, safety, bans, trust | Engelleme, şikayet, yasak, hız sınırı |
| 54 | upkeep | Bakım |
| 55 | post_social | Post etkileşimi |
| 57 | doors | **Tek kapı**: `assert_member`, `visible_to`, `reachable` |
| 58 | push_words | Push metin taşımaz |
| 59 | dms | Direkt mesaj |
| 60 | tickets | "got it / not this time" |
| 61-62 | travel, group_covers | Seyahat rotası, grup kapağı |
| 63 | previews | listen |
| 64-65 | export_more, account_delete | Export DM+bilet; son admin silinemez, grup devri |
| 66-67 | keep_past_nights, deck_today | Senkron geçmişi silmez, yayından kaldırır; deste tarihle eler |
| 68-75 | report_answered, rsvp_push, blocks_and_dm_reports, health_more, night_changed, messages_go, ban_stays, spark_off | Yayın öncesi güven turu |
| 76-96 | sent_nights, reserved_handles, min_version, word_watch, guest_merge, posts_off, leftovers, dj_after, report_snapshot, appeals, person_file, cron_health, checkin_truth, export_all, dm_seen, checksums, timezones, staff_backlog, retention, past_night_page, spark_edit | Yayın öncesi ikinci tur |

Tek atımlık (numarasız) dosyalar: `cleanup-seed-events.sql`, `cleanup-test-groups.sql`, `seed-test-*.sql`, `rename-test-users.sql`, `about-munich*.sql`, `previews-*.sql`, `enrich-2026-10-22.sql`, `paste-*.sql`, `update-world.sql`, `fix-*.sql`.

### Site tarafında bitenler (README §11 "Done")

Landing (5 → 7 → 6 ekran) · deste → duvar · beforehours okuma + yazma · oturum, handle, arkadaşlık, kept · backend + RLS + seed + testler + lokal taklit · admin paneli · footer + hukuk sayfaları (yer tutucu) · hesap sayfası kısayolları · etkinlik sayfası sistemi · profil yapısı · settings · feedback · register · og/robots/sitemap · 404, a11y, insan dilinde hatalar · feedback inbox · İngilizceye çeviri · CI + migration log · yedek + restore testi · export · 29 bulgulu denetim · her yüzey (5 genişlik) · yerel fontlar · 142 geceye sayfa · landing kendini türetir · help sayıları · reset · cevaplar, sayaç, boş deste çıkışları · site-check · Ticketmaster · manifest + lazy-load · uygulama repoda · web uygulamayı takip eder · app ↔ site bağlı · üç dil · PWA · logo seti.

### App tarafında bitenler

Deste (E kartı, 99'luk, filtreler, specialties) · gece sayfası (B, bilet, check-in, oda, nudge, beforehours yazma, who is this?, listen, share) · connect (A, gruplar, gallery, desteler, waves, people search) · mesajlar (D, DM, stories, your people) · harita (Leaflet, radar, slider, sparks) · account (plak kılıfı, koleksiyon, coming up, sparks, cities, 93 plak) · settings (gruplar, dil, tema, aksan, müzik, bildirimler, gizlilik, export, silme) · profile (fotoğraf, bio, about, linkler) · sparks (31 tür, dalgalar, harita, edit) · gruplar + travel · push (3 grup, sessiz saat) · offline (shelf + outbox) · konum takip · Google + Apple girişi · misafir modu · intro film · one-sound · DialogHost · TermsGate (18+, itiraz) · UpdateGate · personel paneli · PWA + iPhone uyarlaması · light tema + 5 aksan · APK v1 → v26.

---

## 9. Bilinen tuzaklar (en pahalıları)

README §12 tam liste; burada en çok tekrar edenler:

**Tarayıcı / site**
- `<img>` içindeki SVG webfont yükleyemez → `<object>` + `pointer-events: none`. `<object>` içindeki SVG'ye CSS `filter` işlemez → `mix-blend-mode: saturation` katmanı.
- `[hidden]` `display`'e yenilir → `!important`. `const` global `window`'a yazmaz (üç kez düşüldü: POSTERS, MEKANLAR, KARTLAR).
- iOS Safari `100vh` adres çubuğunu saymaz → `100dvh`. Emüle edilen viewport bunu göstermez.
- `lang="tr"` + uppercase → `İ`. `overflow-x: clip` body'de tek başına kesmez.
- Çıplak sınıf adları sayfalar arası çakışır (`photo`) → önek.
- Mobil `@media` bloğu, sonradan eklenen kuralların **sonrasında** olmalı (specificity eşitse sonraki kazanır).
- `file://`'da module script yok, çıplak klasör linki yok.
- Önizleme paneli: transition'lı computed style bayat, `document.hidden === true` (rAF çalışmaz), arka plan sekmede canvas 0 genişlik, CSS önbelleği (?v bump), scroll sonrası screenshot boş, `innerWidth` gizliyken 0.

**Backend / SQL**
- Supabase SQL editöründe rol/RLS taklidi açıkken betik yeniden yazılıyor → "Run without RLS". Telefonda editör ~10 KB üstünde donar (`tools/paste-parts.py`).
- `create or replace` view sütun adı değiştiremez, fonksiyon dönüş tipi değiştiremez → `drop` önce.
- Yeni tabloya grant elle; Postgres yeni fonksiyona herkese EXECUTE verir → geri al.
- Düz `language sql` fonksiyon RLS'i çağırana göre uygular; başkasının ayarını okuyacaksa `security definer`.
- WHERE'siz çıplak UPDATE SELECT politikasına takılmaz → trigger/sütun grant.
- SQL yorumunda `'` yasak. `perl -pi -e` UTF-8'de em-dash bozar.
- Göç dosyasını güncel şemaya karşı test etmek hiçbir şey kanıtlamaz → `upgrade.test`.
- Migration log dosya adı tutuyordu, içerik değil → `91_checksums`.
- `datetime-local` yerel, `toISOString()` UTC → her aç-kaydet 2 saat kaydırıyordu.
- Tarihe bağlı test takvim ilerleyince kırılır → kurulumda her şeyi geleceğe it.
- CI sığ klon (`fetch-depth: 0` gerek); teşhis: `--depth 1` klonda `npm ci && npm test`.
- Ticketmaster id büyük/küçük harf duyarlı; slug kuyruğu `md5(id)[:8]`.
- Supabase dahili e-posta saatte 2-4 → şifreli giriş, confirm email kapalı; gerçek kullanıcı gelince Resend SMTP.

**App**
- Expo Go'da native modül yok → dev build. `TabSlot` web'de küçülmez (376 000 px hesap sayfası). Android edge-to-edge klavye → `KeyboardSafe`. Modal kapanırken picker açmak Android'i kilitler (320 ms bekle). `DevSettings.reload` yalnız dev → `reloadAppAsync`. `getCurrentPositionAsync` içeride çözülmez → last known + 6 s yarış. `getSession()` offline null döner → saklı oturum. RN `textTransform` telefon yerelini kullanır. `react-hooks/set-state-in-effect` → async IIFE. 93 tam boy görseli raile koyma → thumb. `eas build:view --json` stdout'a spinner basar → ilk `{`'e kadar kes. EAS `npm ci` lock uyumsuzluğunda ölür → scratch'te `npm ci --ignore-scripts` dene. NetInfo web `reachabilityUrl '/'` → 404 → PWA offline takılır.
- ArchivoLogo Latin subset ğ ş İ çizmiyordu → tam Archivo'dan kes.

**Çalışma biçimi**
- Büyük blok replace sonrası assert/grep şart (sessiz no-op oldu).
- Paralel agent'lar Browser pane'i paylaşır, birbirinin sekmesini götürür.
- Shell cwd paralel çağrılar arasında `afterhours` / `afterhours/app` arasında gidip gelir → mutlak yol.
- Node PATH'te değil (`~/.local/node/bin`), adb PATH'te değil (`~/Library/Android/sdk/platform-tools/adb`), `gh` yok, Chrome yok (tools-previews.py ister), Docker/Postgres yok.

---

## 10. Şu anki durum ve açık işler (26.10.2026)

**Canlı:** Site GitHub Pages'te (`?v=199`), PWA `afterhours-pwa`'da (22.10 yayını), Supabase'de SQL 00-96 + enrich yapıştırılı (`health: 96 of 96`), Ticketmaster günlük senkron çalışıyor, APK v26 (lokal build, USB ile telefonda). Play'de closed test var (farklı imza olabilir).

**Dal:** `try/light` = origin, `main`'in 30 commit önünde. Owner `main`'e merge edecek. 3 küçük uncommitted düzeltme.

**Yakın hedef:** Android (native) yayın. Web/PWA sonra.

**Owner'ın elindeki açıklar (release-board "sabah owner"):**
- A8 App Links: `kurtkurtkurt-del.github.io` reposunu aç, `user-site/` içeriğini push et.
- A6 Mağaza ekran görüntüleri: APK ile 1080×2340, altı ekran, üç dil, `app/store/shots/<lang>/01-06.png`.
- Hukuk sayfaları: owner kararı anonim → yer tutucular kalıyor (F4 beklemede).
- `previews-berlin.sql`, bekleyen tek atımlıklar varsa (`npm run health` söyler).
- Supabase redirect listesine `…/afterhours/login/`, `…/afterhours/delete/`, `…/afterhours-pwa/**`.
- Google Cloud OAuth client, Supabase Google/Apple provider, Firebase + FCM key (push için).
- Health kırmızı: "135 past events are still published — hide_past_events is not running" (cron 7 iş görünüyor; retire adımı ya da kontrolün kendisi bakılacak).
- iOS: Apple Developer hesabı, TestFlight.

**README ile küçük farklar (26.10 notu):** README §1 hâlâ "mürekkep zemin" diyor, app varsayılanı light; §10 "version 195" diyor, sayfalar 199; `backend/README.md` "278 checks" diyor, gerçek 950+; `data/jobs.ts` `@/data/dms` import etmiyor (DM işi mesajlar açılana kadar bekler, kaybolmaz).

**README §11 "Next" (uzun vadeli sıra):** 1 etkinlik verisinin genişlemesi (bugün 5 alan; kadro/saat/fiyat havuzdan) · 2 kart koleksiyonu (konseptin kalbi, en pahalı parça: "o gecenin sesi ve konuşması" ne demek) · 3 hukuk metinleri · 4 after'ın listelere bağlanması · 5 üçüncü help sayısı · 6 assetlinks + app'ten beforehours.

**Vizyonlar, yazıldı, yapılmadı:** DJ sekmesi yeniden düşünülecek (başka uygulamanın dilini konuşuyor, hiçbir geceye götürmüyor; kendi sorusu "who is..." olmalı); 25 spark fikri listesi + her birine kısa video; sesli not "soon".

---

## 11. Nereye ne eklenir

| İş | Yer |
|---|---|
| Yeni app ekranı | `app/src/app/<ad>.tsx` (+ gerekiyorsa `_layout.tsx`'e `Stack.Screen`) |
| Yeni app metni | `app/src/i18n/parts/*.ts`, üç dil, anahtar `alan.ad` |
| Yeni okuma/yazma | `app/src/data/<konu>.ts`: `remember`/`peek` + `send`, `outbox` handler; `data/jobs.ts`'e import |
| Yeni görsel bileşen | `app/src/components/`; renk/font/radius yalnız `theme/tokens.ts` |
| Tasarım kararı | `prototypes/<ad>.html`, 5 seçenek, 390 px, app renkleri |
| Yeni tablo/kural | `backend/sql/NN_ad.sql` + `backend/test/<ad>.test.mjs` + `promises.md` (gerekirse) + dört yer + `npm run setup && npm run stamp` |
| Site metni | `lang/src/*.json` → `python3 tools-lang.py`; `?v=` bump (hepsi) |
| Site sayfası | elle HTML + `i18n.js` + `data.js` + menü + footer; `tools-site-check.py`; sitemap |
| Yeni gece (elle) | admin paneli ya da `events` tablosu; senkron geceler Ticketmaster'dan |
| Yeni spark türü | `app/src/content/sparks.ts` (ad, metin, foto, saat, üç dil) + `spark_kinds` SQL |

**Komutlar:**

```bash
# site
python3 -m http.server 4340             # file:// posterleri yüklemez
python3 tools-lang.py && python3 tools-site-check.py

# app
cd app && npm install
npx expo start                          # Expo Go; harita için dev build
npx tsc --noEmit && npx expo lint && npm test
npm run film                            # intro filmi
tools/publish-pwa.sh                    # PWA yayını
npx eas-cli build --platform android --profile preview

# backend
cd backend && npm ci && npm test        # 950+ kontrol
npm run gate                            # hepsi + .qa/gate-proof.json
npm run health                          # canlı durum + eksik SQL
npm run setup && npm run stamp          # üretilen dosyaları tazele
npm run server                          # PGlite üstünde Supabase taklidi, :4350
npm run migrate -- --write              # canlıya (owner, SUPABASE_DB_URL)
```

**En çok işe yarayan dosyalar:** `README.md` (§6, §8, §9, §12) · `backend/promises.md` · `backend/model.md` · `.claude/prompts/release-rules.md` · `.claude/prompts/release-board.md` · `app/src/theme/tokens.ts` · `app/src/lib/offline.ts` · `app/src/components/CardFace.tsx` · `app/src/app/night/[slug].tsx` · `app/src/app/(tabs)/flow.tsx` · `backend/tools/gate.mjs` · `backend/tools/build-setup.mjs` · `backend/sql/57_doors.sql`.

---

## 12. Eski adlar (git geçmişi okurken)

Kod 30.08.2026'ya kadar Türkçeydi. Eski → yeni: `ayar/oturum/veri/atislar.js` → `config/session/data/swipes.js` · `data-yedek/data-sonra` → `data-fallback/data-after` · `KARTLAR.on/.arka` → `CARDS.front/.back` · `AH.durum/istek/girisliMi` → `AH.mode/request/signedIn` · deste/atış/uçur → deck/swipe/fly away · kırıntı/dipnot/künye → breadcrumb/footer/colophon · ray/kare/poz → rail/frame/exposure · oturum/girişli/jeton → session/signed in/token · şerit/şehir/mekan → strip/city/venue · yorum/konu/cevap → comment/thread/reply · tohum/havuz/karıştır → seed/pool/shuffle · SQL `sira` → `sort_order`, `yon` + `giden/gelen` → `direction` + `outgoing/incoming` · `ses/` → `sound/` · `backend/yedek/` → `backend/backup/`. Yalnız `strip.html` (park) ve `afterhours.oturum` localStorage anahtarı eski adı taşır.

---

## 13. Bir cümlede

afterhours, "gece aranmaz, gelir" diyen; her şeyi geceye bağlayan; güvenliği sayfada değil veritabanında, kararı kodda değil prototipte veren; bağımlılıksız bir site, Expo bir uygulama ve 96 migration'lık bir Postgres'ten oluşan; iki ayda sıfırdan yazılmış, her adımı README'ye işlenmiş, her kuralı bir testle kanıtlanmış, owner'ın "sadece istediğimi yap, adım adım" kuralıyla büyümüş bir projedir.
