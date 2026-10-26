# afterhours — proje hafızası / devam notu

26.10.2026'da repo baştan sona okunarak çıkarıldı: README (1351 satır), backend
dokümanları, `.claude/prompts/*`, app kaynak ağacı, site, CI ve test düzeni.
**Tek referans README'dir**; bu dosya "nereden devam ediyoruz" notudur ve README'nin
yerine geçmez. README ile çelişirse README doğrudur (aşağıdaki "README ile farklar"
bölümü hariç — orada fark bilerek yazıldı).

---

## 1. Ürün, üç cümlede

Bir şehrin gecelerini (rave, club night, konzert, festival, meetup, hausparty) kart
kart önüne koyan ve arkadaşlarla gece bulduran uygulama. **Arama yoktur**: gece aranmaz,
önüne gelir. Ana fiil **keep**: sağa kaydır sakla, sola kaydır bırak; gece gelince
check-in, o gecenin **afterhours kartı** koleksiyona girer. Her şey geceye bağlıdır,
kişiye bağlı "post" yoktur (posts kapalı, `content/flags.ts` `POSTS_ON = false`).

Üç yüzey, tek Supabase projesi (`elmnnyxgavwjxvwjgjcu`):

| Yüzey | Nerede | Ne |
|---|---|---|
| Site | repo kökü | düz HTML/CSS/JS, build yok. `index.html` (yedi ekranlı landing), `explore/` (duvar), `explore/event/` (gece sayfası), `login/ register/ reset/ settings/ profile/ feedback/ help/ privacy/ cards/ admin/`, kapalı sayfalar `friends/ maps/ djs/`, hukuk `impressum/ datenschutz/ agb/` (yer tutucu) |
| Uygulama | `app/` | Expo SDK 57 / RN 0.86 / expo-router / TS. Android önce; iOS yapılandırıldı, yayınlanmadı. Aynı kod PWA olarak da derleniyor |
| Veritabanı | `backend/` | Supabase Postgres, numaralı SQL (00–96), PGlite testleri, araçlar, yedek |

Ek: `prototypes/` 18 HTML (tasarım seçimleri burada), `user-site/` App Links için kök
site içeriği (hazır, repo açılması bekliyor), `phone/` app ekran görüntüleri, `posters/`,
`sound/`, `fonts/`, `og/`.

---

## 2. app/ — mimari

### Giriş ve gezinme
- `src/app/_layout.tsx`: fontlar (Inter Tight 400/500/600, JetBrains Mono, ArchivoLogo),
  Sentry (yalnız DSN varsa ve dev değilse), `SplashScreen`, Android nav bar gizli,
  sağlayıcılar `AuthProvider → LanguageProvider → AmbientProvider`, global katmanlar:
  `PushBridge GenrePicker OfflineBar NoticeSheet TermsGate UpdateGate DialogHost InstallHint`.
  Font 6 s'de gelmezse devam eder (açılış donmasın). `Sentry.wrap(RootLayout)`,
  `ErrorBoundary` → `Crashed` ("something broke · try again", `logError` + Sentry).
- `src/app/(tabs)/_layout.tsx`: beş sekme, sırayla **flow · messages · people (connect) ·
  map · account**. `TabSlot` web'de küçülmediği için `flexBasis 0 / flexShrink 1 /
  minHeight 0`; sekme geçişi 260 ms fade + 8 px yukarı.
- Rotalar `src/app/` altında; rota olmayan her şey `components/ data/ lib/ …`.
  Detay sayfaları `ios_from_right` 320 ms, giriş/sekme geçişleri fade 400 ms.

### Veri katmanı (`src/data/`)
Her tablo/RPC için bir dosya (`deck.ts`, `checkin.ts`, `friends.ts`, `dms.ts`, `groups.ts`,
`sparks.ts`, `near.ts`, `cities.ts`, `about.ts`, `previews.ts`, `tickets.ts`, `when.ts` …).
Desen:
```ts
remember(group, key, () => supabase.rpc(...), max)      // kayıtlı kopya önce, arka planda tazele
peek(group, key)                                        // yalnız telefondaki kopya
send({ kind, ... })                                     // her yazı tek outbox'tan
```
- **Okuma**: `lib/offline.ts` "shelf" — `cachedRead` kayıtlı kopyayı hemen verir, tazeyi
  arkada çeker; değişirse `useShelf(group)` dinleyen ekran tekrar okur. Kayıt yoksa ve
  çevrimdışıysa `OfflineError`. `ttl` sık değişmeyen listeler (şehirler, DJ'ler, mekân
  fotoğrafları, tahminler) için. Kopya `cache.<uid>.<group>` altında (`expo-sqlite/kv-store`),
  bellekte tutulur, 400 ms sonra tek yazımla diske iner; çıkışta `forgetCache`.
- **Yazma**: `outbox(kind, run, touches)` ile handler kaydı; `send` çevrimdışıysa kuyruğa
  atar, sırayla gönderir (2 s → 1 dk geri çekilme), sunucunun reddettiği iş düşer ve
  `refused` sayılır. Her işin telefon üretimi `id`'si ve `at`'ı vardır (37_offline.sql
  tekrarı tekilleştirir). Kuyruktaki işler ekranda "bekliyor" olarak görünür.
- Handler'lar: `swipe/unswipe/settings` (offline.ts içinde), `comment`, `checkin`,
  `checkOut`, `rsvp`, `friend*`, `profile*`, `djs`, `spark*`, `dmSend`.
  `data/jobs.ts` açılışta hepsini import eder — **`@/data/dms` burada yok** (bir dm
  işi, mesajlar ekranı açılmadan gönderilmez; kaybolmaz, gecikir).
- Şehir: `data/here.ts` tek kaynak. Konumdan, **en yakın gecelerin çoğunluk şehri** ile
  (60 km / 30 gece; isim eşleşmesi yalnız gece yoksa) bulunur; elle seçilen şehir, gerçekten
  başka şehre taşınana kadar kalır. Sekmeler açılışta ve 30 dk sonra konumu tazeler.

### Dil (`src/i18n/`)
`index.tsx` (`LanguageProvider`, `useLang()` → `t · tn · tx · up · lang · setLang`),
`core.ts` (React'siz çekirdek; veri katmanı ve AuthContext bunu kullanır), `dict.ts`
(parçaları birleştirir, **anahtarlar tipli** — olmayan anahtar `tsc`'de patlar),
`parts/*.ts` (common · home · tabs · pages · staff · tips · groups · posts · server;
~2274 satır, en/de/tr yan yana). Öncelik: cihaz seçimi → hesabın dili → telefon dili →
İngilizce. Yeni hesapta (10 dk) cihaz dili kazanır ve hesaba yazılır. `up()` / `upperData()`
elle büyütür (RN'in `textTransform`'u telefonun yerelini kullanır; Türkçe i→İ).
Sunucu hataları `lib/serverText.ts` + `parts/server.ts` ile çevrilir.

### Tema ve tipografi (`src/theme/tokens.ts`)
- `themeId: 'dark' | 'light'`, **varsayılan light** (try/light dalı). Renk adları rol
  taşır: `ink` = zemin, `paper` = zemin üstündeki yazı; light'ta değerler döner.
  `paper2, ink2, ink3, rule, mute, meta, card, edge, sleeve` + fotoğraf üstü sabitler
  (`poster, onPhoto…`), `ground(a)`, `paperTint(a)` (yazının renginde sessiz dolgu),
  `scrim(a)` (foto üstü koyu), `barStyle`, `veil`.
- Aksan 5 renk (`ACCENTS`: red varsayılan, green, yellow, blue, pink); `tint(a)`.
  Tema ve aksan açılışta bir kez okunur → değişince `lib/restart.ts` `reloadAppAsync` ile
  uygulamayı yeniden başlatır ve gelinen sayfayı hatırlar.
- `radius`: xs 5 · sm 9 · md 14 · lg 24 · pill 999. Gölge yok.
- `fonts`: Inter Tight (metin), JetBrains Mono (küçük teknik satırlar), `ArchivoLogo`
  (yalnız isim/başlık). Küçük etiketler 9–11 px, geniş harf aralığı, `up()`.

### Bileşenler (en sık dokunulacaklar)
- `CardFace.tsx`: akış/deste kartı. Poster üstünde sol üstte tarih etiketi (`fri 17.10`
  + saat, Archivo), sağ üstte tür; altında beyaz kart gövdesi: kırmızı Archivo başlık,
  mekân, zincir (wave), arkadaş kareleri; solda `details ↓`, sağda kırmızı şerit
  (`keep` / `create →`). `FitPoster` posterin tamamını gösterir (kırpmadan), arkada
  bulanık kopya (yalnız dark; light'ta düz zemin). `toDeckCard`, `openDetails`,
  `openTicket`, `DeckCard` tipi.
- `Deck.tsx`: jestler sağ = keep, sol = let go, yukarı = ticket, aşağı = gece sayfası;
  kart uçarken arkadaki hazır; `KEPT` rozeti (spark'ta yok); `undo`, `swipe(dir)`
  imperatif API; boş durum `listed` sayesinde "hepsini gördün · start over" diyebilir.
- `Sleeve.tsx`: plak kılıfı (fotoğraf kapak + plak); plak `assets/record/*.webp`
  (`record.webp` boş etiketli taban + 92 şehrin kendi etiketi, toplam 93 dosya),
  `content/records.ts` listesi; şehir `tools/build-record.py` ile çizilir.
- Kabuk/parçalar: `Scrim` (tam ekran karartma), `Tips` (sayfa başına bir ipucu, web'de
  kapalı), `TabBar` (+ Android'de 22 px `LIFT`), `KeyboardSafe` (Android'de klavye
  altında kalmayı çözer — her alanlı ekran bunu kullanır), `DialogHost` + `lib/dialog.ts`
  (`Alert.alert` uygulamanın kendi sayfasına gider), `UpdateGate`, `TermsGate` (18+ /
  şartlar / kapalı hesap + itiraz), `OfflineBar`, `PillAction`, `Button`, `Input`,
  `PickerSheet`/`BigPicker`/`WhenPicker`/`PlacePicker`/`DayPicker`, `Avatar`,
  `AfterhoursCard` (kart SVG'si `content/cardsgen.js`).

### Ekranlar (kısa harita)
- `(tabs)/flow`: şehir başlığı, `tickets · spark` anahtarı, `what · when` pill'leri,
  ortadaki `+` (`/make`), deste; altta ✕ / ↺ / ♥. `panel='spark'` yalnız sparks
  (31 tür, dalga davetleri). Zaman filtresi istemcide (`data/when.ts`).
- `night/[slug]`: bilet tasarımı — foto, başlık, tür · mekân, perforasyon, stub (tarih ·
  kapı · yer), kırmızı aksiyon (`get a ticket ↗` / `check in` / `the room`), altında
  check-in / keep / share, `nudge a friend` kartı (yüzler; tek dokunuş DM), gecenin
  metni, beforehours (yorum + cevap + şikâyet). Check-in kartı modalı + 1 saat geri alma.
  Bilet sorusu ("got it / not this time") uygulama öne gelince bir kez.
- `(tabs)/people` (connect): ilk iki grup kapağı, `with your people` galerisi (grup planı
  ve oyları önce, sonra arkadaşların sakladıkları, sparks; 6 s'de kendi kayan, tam ekran
  foto), desteler (mine/friends/wave2/wave3 + specialties), arama.
- `(tabs)/messages`: DM listesi + `your people` katlanır satırı (istekler, çıkışta
  olanlar, arama), yeni konuşma; grup sohbetleri gruplarda, oda gece sayfasında.
- `(tabs)/map`: Leaflet WebView (`MapWeb`), radar halkaları, 1 parmak zoom, km slider,
  pinler (gece = kare/dikdörtgen, arkadaş = kırmızı, spark = altın elmas), kartı
  kaydırarak gezme.
- `(tabs)/account`: plak kılıfı, bio, link markaları, iki sayaç (`events`, `your people`),
  kırmızı `edit profile`, koleksiyon; altında kağıt: coming up (bilet işaretli), your
  sparks, cities (plak kayıtları, `ALL_CITY_RECORDS = __DEV__`).
- Diğer: `spark/[kind]`, `groups/*` (swipe · matches · live · plan · chat · memories ·
  album · passport/travel), `person/[handle]`, `friend/[id]`, `dj/[id]`, `list/[kind]`,
  `room/[slug]`, `dm/[id]`, `settings`, `profile`, `panel/*` (personel), `make`, `signup`,
  `welcome`, `film`, `credits`, `auth-callback`, `+native-intent`.

### Web / PWA
- Bütün web farkı `src/web/*` shim'lerinde + `Platform.OS === 'web'` dallarında
  (`metro.config.js` yalnız web'de yönlendirir): kv-store, secure-store, WebView (iframe),
  file-system, apple, notifications, navigation-bar.
- Yayın: `app/tools/publish-pwa.sh` → `expo export -p web` (+`404.html`, `.nojekyll`) →
  `afterhours-pwa` reposuna force-push. Supabase redirect listesinde
  `…/afterhours-pwa/**` olmalı. iPhone splash'ları `tools/build-icons.py`.

---

## 3. backend/ — veritabanı ve araçlar

### Kurallar
- Numaralı, **yalnızca eklenen** migration dosyaları (`sql/00…96`). Uygulanmış dosya
  değiştirilmez; değişiklik yeni numaradır.
- Her tablo RLS ile kapalı. İstemci tabloya değil **security definer RPC**'lere konuşur.
  Tek kapı: `assert_member()` (üye ve yasaklı değil), görünürlük: `visible_to(viewer,
  other)` / `reachable()` (57_doors.sql).
- Yazma izinleri sütun bazında; `is_hidden` gibi alanları yalnız moderasyon tetikleyicisi
  oynatır. Push asla üyenin metnini taşımaz (58_push_words.sql).
- Her migration'ın PGlite testi var (`backend/test/*.test.mjs`, 80 dosya, 950+ kontrol).
  `backend/promises.md` 13 söz: SQL dosyası + kanıtlayan test adı; `setup.test.mjs`
  satırı testiyle birlikte doğrular.
- `tools/build-setup.mjs` → `setup-1-structure.sql` + `setup-2-comments.sql` (Supabase
  editörüne yapıştırılan iki dosya). `tools/stamp-sql.mjs` her dosyanın damgasına kendi
  sha256'sını yazar (`sql-hashes.json`, 91_checksums.sql).
- `app/src/data/expectedSql.ts` **ve** `backend/tools/expected-sql.mjs` aynı listeyi taşır.
- `tools/gate.mjs`: sırayla SQL damgaları → backend testleri → app tsc → lint → jest →
  site kontrolü; sonra `.qa/gate-proof.json` (HEAD tree hash'i). `.githooks/pre-push`
  `main`'e kod push'unda bu kanıtı arar (yalnız doküman push'u muaftır).

### Araçlar
`sync-ticketmaster.mjs` (günlük 04:10 UTC; upsert + geçmişi **yayından kaldırır**, silmez),
`enrich.mjs` (who is this? + listen; Apple→Deezer, Wikipedia + Claude, `--dry`, `--plain`,
`--sql`, `--per-city`, ilerleme dosyası, rapor), `previews.mjs`, `world-*.mjs`,
`build-seed/posters`, `migrate.mjs` (SUPABASE_DB_URL; `--write` olmadan yazmaz),
`health.mjs`, `backup.mjs` / `restore.mjs`, `local-server.mjs` (PGlite üstünde
PostgREST+GoTrue taklidi), `upload-sound.mjs`.

### Canlıya uygulama
Owner'ın elinde: ya `SUPABASE_DB_URL=… npm run migrate -- --write` ya da SQL editörüne
sırayla yapıştırma. İlk admin SQL editöründe atanır. Sırlar repoda yok
(`TICKETMASTER_KEY`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`,
`ANTHROPIC_API_KEY`).

---

## 4. Site — kurallar

- `data.js` her sayfanın ilk scripti: Supabase REST ya da `events-data.js` → `POSTERS`;
  sayfanın kendi scriptleri `data-after` ile sonra yüklenir. `AH` API'si `session.js`,
  `swipes.js`, `comments.js`, `friends.js` üzerinden.
- `i18n.js` `<head>`'de bloklar; `?lang=` → `localStorage afterhours.lang` → tarayıcı →
  İngilizce; `lang/en.js` her zaman + seçilen sözlük `document.write` ile. Sözlükler
  `lang/src/*.json`'dan `python3 tools-lang.py` ile üretilir (CI `--check`).
  **JSON'u düzenle, üretileni değil.**
- `?v=NN` her asset'te tek ve aynı olmalı (CI `versions` işi). Şu an **199**.
- `tools-site-check.py` her href/src'yi, her gecenin sayfa+poster+og'sini yürür.
- Gece sayfası tek şablon: `explore/event/index.html?slug=…` (`explore/event.js`),
  içerik havuzları `explore/event-data.js` + slug tohumu; kapak `cards.js` /
  `app/src/content/cardsgen.js` (iki kopya birlikte değişir).
- CI: `test.yml` (backend · app · generated · versions · site), `sync-events.yml`,
  `health.yml`, `backup.yml`.

---

## 5. Komutlar

```bash
# site
python3 -m http.server 4340            # file:// çalışmaz

# app
cd app && npm install
npx expo start                         # Expo Go (harita için dev build)
npx tsc --noEmit && npx expo lint && npm test
npm run film                           # intro filmi derler
npm run shots                          # mağaza ekran görüntüleri
tools/publish-pwa.sh                   # PWA yayını

# backend
cd backend && npm ci && npm test       # 950+ kontrol, PGlite
npm run gate                           # hepsi + .qa/gate-proof.json
npm run health                         # canlı DB durumu + eksik SQL
npm run seed / setup / stamp           # üretilen dosyaları tazele
npm run migrate -- --write             # canlıya (owner)

# kök
python3 tools-lang.py && python3 tools-site-check.py
```

Sıra: commit → `npm run gate` → push. Kırmızıyken commit yok.

---

## 6. Çalışma kuralları (release-rules.md özeti)

- Tasarım kararları **owner'ın**: yeni ekran/düzen/his gerekiyorsa `prototypes/` içine
  telefon genişliğinde 5 tasarım (A–E), madde `karar bekliyor`, sonra devam. Küçük
  mekanik düzeltmeler karar değildir, yapılır.
- Seçilmiş tasarımlar: bilet kartı **E**, gece sayfası **B**, connect **A**, mesajlar
  **D** (design 3), hesap kartlar-altında **B**.
- Üç dil her yeni metinde (app `i18n/parts/*`, site `lang/*.js`). Örnek veri gerçek
  verinin üstünde ve `sample` der; yayında örnek yok (`SAMPLES = __DEV__`).
- Güvenlik veritabanındadır, sayfada değil; who-may-do-what değişirse `promises.md`
  aynı commit'te.
- README her değişiklikle aynı commit'te güncellenir.
- Kod `main`'e değil `release/night-YYYY-MM-DD` dalına; owner birleştirir. Force-push,
  merge, EAS build, canlı DB yazımı yok (owner istemeden).
- Commit mesajı: tek satır, ne değişti + neden, sade, emoji yok.
- SQL yorumunda apostrof yok (Supabase editörü), sitede module script yok.

---

## 7. Şu anki durum (26.10.2026)

- Dal: **`try/light`** (origin ile aynı, `main`'in 30 commit önünde; `main` 20.10.2026
  birleştirmesinde kaldı). Aktif geliştirme bu dalda.
- **Commit edilmemiş iş (26.10):** üç küçük düzeltme + iki dokunulmamış dosya:
  1. `app/src/components/Deck.tsx` + `flow.tsx`: yeni `listed` prop'u — şehirde gece
     varken deste boş gelirse (hepsi daha önce kaydırılmış) "hepsini gördün" der ve
     `start over` sunar; eskiden "nothing listed yet" deyip çıkışsız bırakıyordu.
  2. `components/NudgeSheet.tsx` + `night/[slug].tsx`: sayfa elindeki yüzleri `seed`
     olarak verir (ilk karede dolu sayfa); kayma `Modal onShow` + `withTiming` ile elle
     sürülür — eskiden kısa/boş sayfaya göre ölçülen `SlideInDown` alt kısmı ekran
     dışında bırakıyordu.
  3. `.claude/launch.json` biçim değişikliği; `app/tools/record/sheet.png` (plak kontak
     sayfası) ve `.claude/prompts/afterhours-in-brief.md` izlenmiyor.
- Doğrulama (bu turda koşuldu): `npx tsc --noEmit` temiz · `npx expo lint` temiz ·
  app jest **33/33** · backend `npm test` zinciri **exit 0** (80 dosya).
- `.qa/gate-proof.json` eski: head `2e1d9ff`, bugünkü head `90cf393`. Push'tan önce
  `npm run gate` yeniden koşmalı.
- Canlı (26.10 health): SQL 96/96 · 3710 yayında gece · son sync 0.4 gün önce · cron 7 iş ·
  **RED: 252 geçmiş gece hâlâ yayında** · 399 gece mekânsız. Ayrıntı §11.

### README ile farklar / notlar (küçük)
- README §1 hâlâ "mürekkep zemin, kâğıt yazı" diyor; app'in varsayılanı artık **light**
  ve ayarlarda tema seçimi var. Dal denemesi README'ye işlenmemiş.
- README §10 "current version 195"; sayfalar **199**.
- `backend/README.md` "278 checks" diyor; gerçek 950+ (kök README doğru).
- `data/jobs.ts` `@/data/dms` import etmiyor → soğuk açılışta bekleyen bir DM işi,
  mesajlar ekranı açılana kadar gitmez (kaybolmaz).
- `flow.tsx` `listed` sayısı tür filtresinden bağımsız (şehirdeki tüm tipler); tür
  filtresi seçiliyken de doğru davranır, ama "0 gece" durumunda metin şehir geneline
  bakar.
- Owner'ın anlatımına göre `enrich-2026-10-22.sql` (232 about + 362 önizleme) ve
  `previews-berlin.sql` canlıya yapıştırıldı; health yalnız numaralı migration'ları
  saydığı için bunları doğrulamaz (96/96 numaralı dosya görünüyor).
- Açık büyük işler: A8 App Links (user-site hazır, `kurtkurtkurt-del.github.io` reposu
  açılmalı), hukuk sayfaları (owner kararı: anonim, yer tutucular kalıyor), mağaza ekran
  görüntüleri, `F3/F36` export/yedek kalanları, assetlinks/apple-app-site-association.

---

## 8. Nereye ne eklenir

| İş | Yer |
|---|---|
| Yeni ekran | `app/src/app/<ad>.tsx` + `_layout.tsx`'e `Stack.Screen` gerekirse |
| Yeni metin | `app/src/i18n/parts/*.ts` (üç dil), anahtar `alan.ad` |
| Yeni okuma/yazma | `app/src/data/<konu>.ts`: `remember`/`peek` + `send`, `outbox` handler; `data/jobs.ts`'e import |
| Yeni görsel bileşen | `app/src/components/`; renk/font/radius yalnız `theme/tokens.ts`'ten |
| Tasarım kararı | `prototypes/<ad>.html` (5 seçenek, 390 px, app'in renkleri) |
| Yeni tablo/kural | `backend/sql/NN_ad.sql` (son numaradan sonra) + `backend/test/<ad>.test.mjs` + `promises.md` gerekirse + `npm run setup && npm run stamp` |
| Site metni | `lang/src/*.json` → `python3 tools-lang.py`; `?v=` bump |
| Site sayfası | elle HTML + `data.js` + `footer`; `tools-site-check.py` |

## 9. Okurken en çok işe yarayan dosyalar

`README.md` (§6 app, §8 backend, §9 otomasyon, §12 tuzaklar) · `backend/promises.md` ·
`backend/model.md` · `.claude/prompts/release-rules.md` · `.claude/prompts/release-board.md`
(A1 bulguları F1–F40) · `app/src/theme/tokens.ts` · `app/src/lib/offline.ts` ·
`app/src/components/CardFace.tsx` · `app/src/app/night/[slug].tsx` ·
`app/src/app/(tabs)/flow.tsx` · `backend/tools/gate.mjs` · `backend/tools/build-setup.mjs`.

---

## 10. Owner'ın anlatımından ek kurallar (26.10.2026)

Owner bu projeyi 26.10.2026'da baştan sona yazdırdı; yukarıdaki bölümlerin üstüne şu
çalışma kuralları gelir:

- **Yalnız istenen yapılır.** Brief arka plandır; gelecek sekmeler, rotalar, bölümler
  önceden iskeletlenmez. Bir gözlem varsa tek cümleyle söylenir, iş kendiliğinden eklenmez.
- **Reddedilen fikir yeniden önerilmez** (README §12 + oturum notları: poster grid arkası,
  fotoğraf yakınlaştırma, saatle renk değiştiren footer, mono UI yazısı, Three.js, feed
  sekmesi…).
- **"Doğrudan yapabildiklerinin hepsini yap"** = owner'ın eli değmeden yapılabilen her şey
  tek partide yapılır ve raporlanır.
- **Owner'ın eleştirisi görev değildir.** Sadece istenen değişiklik uygulanır.
- **Dört yer kuralı — yeni SQL dosyası:** `backend/tools/build-setup.mjs` listesi,
  `backend/tools/local-server.mjs` listesi, `backend/package.json` test zinciri,
  `backend/README.md` dosya listesi; ayrıca `backend/tools/expected-sql.mjs` **ve**
  `app/src/data/expectedSql.ts`. Biri unutulursa dosya setup'a girmez, canlıya hiç gitmez.
- **Yeni site sayfası:** menü + footer + dört standart script (`i18n.js`, `data.js`,
  `session.js`, `menu.js`) + `tools-site-check.py` + `sitemap.xml` + tek `?v=` bump.
- **Site `file://` ile de açılır:** `type="module"` ve dinamik `import()` yok, çıplak
  klasör linki yok (`explore/event/index.html?slug=…` açıkça yazılır).
- **Kanıt olmadan "yaptım" yok.** Site tarayıcıda ölçülür, app telefonda görülür; görülmediyse
  "telefonda doğrulanmadı" yazılır.
- **Yeni bağımlılık** ancak nedeni yazılarak; native kodlu paket Expo Go'da çalışmaz, yeni
  build ister.
- **Owner'ın elinde:** canlı SQL yapıştırma / `npm run migrate -- --write`, ilk admin,
  GitHub secret'ları, Google/Apple OAuth ve Supabase provider'ları, redirect URL listesi,
  Play/EAS, merge. AI merge etmez, force-push etmez, token istemez veya yazmaz.
- **README aynı commit'te**; yeni tuzak README §12'ye, "denendi ve reddedildi" notu oturum
  notlarına.
- Uzun komutlar arka planda; owner telefondan izler.

---

## 11. Doğrulama notları (bu okuma turu, 26.10.2026)

- **Canlı `npm run health`:** SQL **96/96** · events 6882 (3710 yayında) · newest sync
  0.4 gün önce · cron 7 iş (bugün 1 hata) · pushes stuck 0 · **RED: 252 geçmiş gece hâlâ
  yayında** ("the sync or hide_past_events is not running") · 399 gece mekânsız.
  (Owner'ın notundaki "135 geçmiş gece" bugün 252.)
- **Landing 6 `.screen`** taşıyor (owner'ın "6 ekran"ı doğru; README "seven" diyor).
- **Deste boyu:** `deck()` RPC'sinde 99 tavanı yok (varsayılan 60), flow **120** ister.
  "Her deste 99 kart" koda yansımamış; istenirse ayrı iş.
- **Mesajlar sayfasında sekme yok:** 22.10'dan beri tek sayfa, `your people` katlanır satır
  (owner'ın 5.3 tablosundaki "tonight / together" 11.10 sürümü; stories hâlâ üstte).
- `data/jobs.ts` hâlâ `@/data/dms` import etmiyor → bekleyen DM işi mesajlar ekranı açılana
  kadar gecikir (kaybolmaz).
- Site/PWA sürümü **199**; README §10 hâlâ 195 diyor. `backend/README.md` "278 checks"
  diyor; gerçek 950+.
- Commit sayısı **400**; `try/light` `main`'in 30 commit önünde.
