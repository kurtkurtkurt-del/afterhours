# Gece planı (11.10.2026) — YAPILDI, sabah 12.10.2026

Tek oturumda, sırayla. Her maddenin sonunda: `npx tsc --noEmit`, `npx expo lint`, `npm test` (app) ve `npm test` (backend) temiz; README güncel. EAS build yok. Commit'ler madde başına, push yok (sabah birlikte). KULA'dan çıkan backend adımları ayrı dosyada (`kula-backend-plan.md`) ve bu plana dahil DEĞİL; owner söyleyince eklenir.

## Yapıldı

Yedi madde, yedi commit (f58895b … 05c77eb), hepsi README'ye işlendi; `tsc`, `expo lint`, app testleri (33) ve backend testleri (858 + yeni kontroller) temiz; `tools-site-check.py` temiz. Push yok.

- yours: örnek gönderiler ve hazır yorumlar kaldırıldı.
- 1 gruplar C · 2 bilet kartı E · 3 yirmi spark (`56_spark_kinds_2.sql`) · 4 zincir E · 5 haritada kart gezdirme · 6 mesajlaşma D (görülenler telefonda, `data/messages.ts`; sunucu tarafı sayaç gerekmedi) · 7 panel bio'dan (sekme çubuğu beşe indi, `app/panel/index.tsx`).
- Not: `npm run health` canlıda 680 geçmiş geceyi hâlâ yayında sayıyor; `hide_past_events` cron'u çalışmıyor olabilir (pg_cron açık mı?). Bakılacak.

## Özellikler

1. **people · gruplar: tasarım C** (`prototypes/people-groups.html`). Seninkilerle galerisi karışık akar: arkadaşların sakladığı geceler, kıvılcımlar ve **grup planları** aynı büyük kartta. Grup kartı: rozet + grup adı sol üstte, "group plan" mono etiketi, gece başlığı, mekân · gün · saat, kırmızı "4 of 6 in · vote closes thu", katılanların yüzleri, sağda "i'm in" düğmesi. Aramanın altında ince bir satır: üst üste grup rozetleri, "groups · 2 live", › → `/groups`. Bugünkü gruplar çubuğu kalkar. Veri: `group_plan` / `group_peek` (46, 49). Plansız grup galeriye girmez.

2. **flow · bilet kartı: tasarım E** (`prototypes/ticket-card.html`). Tarih ve saat posterin sol üst köşesinde mürekkep bir etiket (Archivo "fri 17.10" + Inter Tight "23:00"), tür sağ üstte küçük mono; blokta yalnızca başlık (daha büyük), mekân (Inter Tight) ve arkadaş kareleri. "ticket" kelimesi yalnızca yukarı ipucunda, meta satırından kalkar. Sağ şerit "keep →" kalır. `components/CardFace.tsx`; spark kartları aynı dili alır (tarih yerine önerilen saat).
3. **20 yeni spark türü.** Düşün, yarat, ekle: `39_spark_kinds.sql` kalıbıyla yeni bir migration (`56_spark_kinds_2.sql`), `content/sparks.ts` içinde her türün adı, fotoğrafı (CREDITS'e kaynak), önerilen saat ve yer mantığı (`data/sparks.ts`), i18n üç dilde, `app/spark/[kind].tsx` çalışır. Fikirler gece üretilir; liste sabah onaya sunulur, kaldırılmak istenen silinir.
4. **wave decks · "kimin üzerinden geldi" zinciri: tasarım E** (`prototypes/via-chain.html`). Dalga simgesi: iç içe üç halka, ortada sen, kartın dalgası kırmızı (2. dalga → orta halka, 3. → dış halka). Yanında "friends of friends" / "one step further", altında tek satır "cansu kept it · via berk" (3. dalgada "via berk, lina"). Kareler ve mono cümle gider. `Chain` bileşeni `CardFace.tsx` içinde yeniden; bilet kartından sonra.
5. **harita · kart gezdirme.** Haritada açık bilet kartı sağa/sola kaydırıldığında haritadaki etkinlikler arasında dolaşır, bir sonraki/önceki etkinliğe geçer ve harita o pine kayar. Sağa kaydırma burada "sakla" değil "sonraki"; sakla için kartın kendi düğmesi.

6. **yours · mesajlaşma: tasarım D** (`prototypes/messaging.html`). Sağ altta, sekme çubuğunun üstünde kırmızı yuvarlak kayan düğme, okunmamış sayısı açık renk rozet; yours ve people'da aynı yerde, akışla kaymaz. Dokununca "messages": açık odalar (kalan süre), grup sohbetleri, donmuş odalar tek listede (`/rooms` genişler). Banddaki balon kalkar. Okunmamış sayısı: odalardaki yeni satırlar + grup sohbetinde son görülenden sonrakiler (gerekirse `57_unread.sql`).
7. **admin paneli bio'dan.** Hesap/bio sayfasına (`(tabs)/account.tsx`, kayıt kılıfı) staff için bir satır: "panel ›" → `/panel`. Altı sekmeli çubuktaki panel sekmesi kalkar; çubuk beş sekmeye iner. Rol kontrolü `isStaff()`.

## 12.10.2026 sabahı eklenenler (sahibin istekleri)

- Kartta tür sağ üstte; gruplar satırına çerçeve; bilet ipucu büyük; keep üstündeki ok kalktı.
- yours sekmesinin ikonu gönderi kartı oldu (people ile karışmıyor).
- Grup kurarken süre sorulmuyor; grup hep kalır.
- Mesajlar: "yeni konuşma" ile bir arkadaşa yazılabiliyor (`59_dms.sql`, `dm/[id]`).
- Gece sayfası: tasarım **B** (bilet) seçildi ve yapıldı (`prototypes/night-page.html`).
- KULA backend adımlarının sekizi de yapıldı (`kula-backend-plan.md`).

## Sabah (owner)

- `56_spark_kinds_2.sql`, `57_doors.sql`, `58_push_words.sql`, `59_dms.sql` canlıya: ya `SUPABASE_DB_URL=… npm run migrate -- --write` (backend/) ya da editöre sırayla yapıştır. 57 ve 58 birbirine bağlı değil ama sıra numarayla.
- GitHub → Settings → Secrets: `SUPABASE_DB_URL` ve `BACKUP_PASSPHRASE` (kişisel veri yedeği için).
- `git push` birlikte; Expo Go'da Metro'yu `--clear` ile yeniden başlat.
- Supabase SQL editöründe, test gönderilerini silmek için:
  `delete from public.posts where author_id in (select id from auth.users where email like 'fake-%@afterhours.test');`
  (Fake arkadaşlar ve "(test)" gruplar kalır. Hepsini kaldırmak için `cleanup-test-groups.sql`.)
