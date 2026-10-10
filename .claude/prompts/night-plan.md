# Gece planı (11.10.2026)

Tek oturumda, sırayla. Her maddenin sonunda: `npx tsc --noEmit`, `npx expo lint`, `npm test` (app) ve `npm test` (backend) temiz; README güncel. EAS build yok. Commit'ler madde başına, push yok (sabah birlikte). KULA'dan çıkan backend adımları ayrı dosyada (`kula-backend-plan.md`) ve bu plana dahil DEĞİL; Ahmet söyleyince eklenir.

## Yapıldı (planlama sırasında)

- yours: örnek gönderiler ve hazır yorumlar kaldırıldı (`SamplePost.tsx`, `content/posts.ts`, üç fotoğraf; README §6, CREDITS). Commit edilmedi.

## Özellikler

1. **people · gruplar: tasarım C** (`prototypes/people-groups.html`). Seninkilerle galerisi karışık akar: arkadaşların sakladığı geceler, kıvılcımlar ve **grup planları** aynı büyük kartta. Grup kartı: rozet + grup adı sol üstte, "group plan" mono etiketi, gece başlığı, mekân · gün · saat, kırmızı "4 of 6 in · vote closes thu", katılanların yüzleri, sağda "i'm in" düğmesi. Aramanın altında ince bir satır: üst üste grup rozetleri, "groups · 2 live", › → `/groups`. Bugünkü gruplar çubuğu kalkar. Veri: `group_plan` / `group_peek` (46, 49). Plansız grup galeriye girmez.

2. **flow · bilet kartı: tasarım E** (`prototypes/ticket-card.html`). Tarih ve saat posterin sol üst köşesinde mürekkep bir etiket (Archivo "fri 17.10" + Inter Tight "23:00"), tür sağ üstte küçük mono; blokta yalnızca başlık (daha büyük), mekân (Inter Tight) ve arkadaş kareleri. "ticket" kelimesi yalnızca yukarı ipucunda, meta satırından kalkar. Sağ şerit "keep →" kalır. `components/CardFace.tsx`; spark kartları aynı dili alır (tarih yerine önerilen saat).
3. **20 yeni spark türü.** Düşün, yarat, ekle: `39_spark_kinds.sql` kalıbıyla yeni bir migration (`56_spark_kinds_2.sql`), `content/sparks.ts` içinde her türün adı, fotoğrafı (CREDITS'e kaynak), önerilen saat ve yer mantığı (`data/sparks.ts`), i18n üç dilde, `app/spark/[kind].tsx` çalışır. Fikirler gece üretilir; liste sabah onaya sunulur, kaldırılmak istenen silinir.
4. **wave decks · "kimin üzerinden geldi" zinciri: tasarım E** (`prototypes/via-chain.html`). Dalga simgesi: iç içe üç halka, ortada sen, kartın dalgası kırmızı (2. dalga → orta halka, 3. → dış halka). Yanında "friends of friends" / "one step further", altında tek satır "cansu kept it · via berk" (3. dalgada "via berk, lina"). Kareler ve mono cümle gider. `Chain` bileşeni `CardFace.tsx` içinde yeniden; bilet kartından sonra.
5. **harita · kart gezdirme.** Haritada açık bilet kartı sağa/sola kaydırıldığında haritadaki etkinlikler arasında dolaşır, bir sonraki/önceki etkinliğe geçer ve harita o pine kayar. Sağa kaydırma burada "sakla" değil "sonraki"; sakla için kartın kendi düğmesi.

6. **yours · mesajlaşma: tasarım D** (`prototypes/messaging.html`). Sağ altta, sekme çubuğunun üstünde kırmızı yuvarlak kayan düğme, okunmamış sayısı açık renk rozet; yours ve people'da aynı yerde, akışla kaymaz. Dokununca "messages": açık odalar (kalan süre), grup sohbetleri, donmuş odalar tek listede (`/rooms` genişler). Banddaki balon kalkar. Okunmamış sayısı: odalardaki yeni satırlar + grup sohbetinde son görülenden sonrakiler (gerekirse `57_unread.sql`).
7. **admin paneli bio'dan.** Hesap/bio sayfasına (`(tabs)/account.tsx`, kayıt kılıfı) staff için bir satır: "panel ›" → `/panel`. Altı sekmeli çubuktaki panel sekmesi kalkar; çubuk beş sekmeye iner. Rol kontrolü `isStaff()`.

## Sabah (Ahmet)


- Supabase SQL editöründe, test gönderilerini silmek için:
  `delete from public.posts where author_id in (select id from auth.users where email like 'fake-%@afterhours.test');`
  (Fake arkadaşlar ve "(test)" gruplar kalır. Hepsini kaldırmak için `cleanup-test-groups.sql`.)
