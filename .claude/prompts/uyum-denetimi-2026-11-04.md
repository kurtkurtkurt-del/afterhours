# Uyum denetimi — site · web app (PWA) · app (04.11.2026)

Kod kontrolleri: app `tsc` temiz, `eslint` temiz, backend `npm test` yeşil (son dosya 17/17, exit 0),
`tools-lang.py` temiz (670 anahtar × 3), site `?v=203` tek (uyarı yalnız eski worktree'lerden),
`npm run health`: 116/116 SQL canlıda, cron sağlıklı, 457 mekânsız gece.
Canlı site = main (?v=203). main = origin/main. 11 eski worktree dalı hepsi main'e birleşmiş (silinebilir).

## KIRIK (çalışmıyor)
K1. **Canlı PWA boş.** afterhours-pwa 04.11 16:44Z yayını siyah ekran, konsol "No routes found"; pakette ne rota, ne Supabase, ne i18n var. Bu `app/`'den derlenmemiş (yerel dist 28.10). Yayın yalnız `app/tools/publish-pwa.sh` ile elle, geçmiş tutulmuyor (force-push).
K2. **App "güncelle" düğmesi 404.** `app/src/data/safety.ts:21` → site `phone/` (index.html yok).
K3. **host/ "just my people" gecesi herkese açık listeye gidiyor.** Seçim yalnız gövdeye `[friends]` etiketi olarak düşüyor (`host/host.js:94`); app'te aynı şey spark.
K4. **Geçmiş gece linki sitede "gone".** App `night_page()` ile açıyor, site yalnız `events_public` (`explore/event.js:613`). App'ten paylaşılan geçmiş gece webde boş.
K5. host/ poster `image/*` kabul ediyor ama 117 yalnız jpeg/png ≤3 MB; başka format sessizce düşüyor. App posterleri `photos` kovasına yazıyor, 117'yi kullanmıyor.
K6. assetlinks.json hâlâ 404 (A8, user-site deposu açılmadı).

## KAVRAM / MENÜ FARKI (karar ister)
M1. Site menüsü: explore · host an event · your people · map · collection · help · account. App: messages · people(connect) · flow · map · account. Yalnız sitede: explore(duvar), host, collection(üst seviye), help. Yalnız app'te: messages, flow.
M2. "your people" (site) ↔ "people"/"connect." (app); tr: seninkiler ↔ insanlar(ın).
M3. "host an event · publish" (site) ↔ make.tsx "what are we doing? · with a ticket / among friends · send for review" (app).
M4. Tarih filtresi: site takvim günü (bu hafta = pazara kadar), app kayan pencere (7 gün). Aynı filtre farklı geceler.
M5. Site duvarı her zaman München açılıyor (`config.js:14`), ayarlar "duvar burada açılır" diyor; app konuma göre.
M6. Ayarlar: site'de şifre değişimi reset/ ile, silme handle yazarak; app'te mevcut şifreyle, yeniden giriş ile. Bio 160 (site) ↔ 300 (app+db).
M7. host/ ↔ panel/night: başlık 80↔120, gövde 280↔2000, mekân serbest metin↔venue_id, şehir listesi live↔hepsi, tür pillleri sitede çevrilmemiş.
M8. g/ sayfası "yours → groups → join with a code" diyor; yours 12.10'dan beri gizli, gruplar people sekmesinde.
M9. webapp.js store/PWA adresleri sabit yazılmış, "get the app"/"get the web app" çevrilmemiş, mavi pill Play'e gidiyor.
M10. p/?h= intent filtresinde yok (her zaman önce web açılır); app Datenschutz'a gidiyor, privacy/ (en) hiç bağlı değil.
M11. Kelime farkları (çoğu de): behalten hast↔behältst, nicht mal↔auch…nicht, über das↔per handle, herunterladen↔laden, "ticket"↔"get a ticket", "feedback"↔"send us a note"; p/ tr "tuttuğunu"↔"sakla".
M12. App onay maili `login/`'e `?code=` ile dönerse site "no sign-in started here" hatası gösterebilir (canlı denenmedi).

## BELGE / TEMİZLİK
B1. README §3/§6/§7 eski: djs kapalı yazıyor (artık host/'a yönlendirme), host/ delete/ p/ g/ yok, menü satırı eski, "signed in → yours" (kod flow), §7 hâlâ CARDS.back/metal; sitemap.xml host/ ve privacy/ yok; help/ "djs ve collection app'te" diyor; phone.js yours-*.jpg oynatıyor.
B2. `99_spark_week.sql` üç expected listesinde de yok.
B3. Commit edilmemiş app işi (gruplar flow 1, pasaport flow 5, 50 specialty, messages foto): tsc/lint temiz, i18n üç dilde tam, rotalar var; ama hiç PWA'ya girmedi, telefonda bakılmadı. `/specials` → modül değişkeniyle el veriyor, webde yenilemede kaybolur.
B4. 11 eski worktree (.claude/worktrees) + dalları, hepsi birleşik.
B5. PWA manifest (0E0D0C, icon-192/512) ↔ site manifest.webmanifest (000/fff, favicon-180/512) farklı; ayrı uygulamalar, bilinçli olabilir.
