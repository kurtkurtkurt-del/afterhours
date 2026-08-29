# afterhours — veri modeli

Bu dosya kod değil, kararların yazılı hali. Tablolar buradan çıkıyor.

## Kararlar (2026-08-29)

- **Giriş yapmadan gezilebilir.** Etkinlikler ve yorumlar herkese açık okunur.
  Kişisel olan her şey (swipe, biriktirilen kartlar, arkadaşlar) giriş ister.
- **Etkinlikleri sadece Ahmet giriyor.** Tek yönetici. Organizatör hesabı,
  dışarıdan veri çekme yok — sonradan eklenebilir, şimdi yok.
- **Ön yüz olabildiğince değişmiyor.** Bu yüzden `meta` gibi ekranda birebir
  görünen metinler veritabanında da aynen duruyor; yapısal alanlar
  (mekân, tarih) bunun *yanına* ekleniyor, yerine değil.

## Şeyler ve aralarındaki bağlar

```
city ──< venue ──< event >── event_type
                    │
                    ├──< swipe >── profile        (sola/sağa atış, kişiye özel)
                    └──< comment >── profile      (beforehours; cevaplar parent_id ile)

profile ──< friendship >── profile                (karşılıklı, onaylı)
```

### city — şehir
`münchen`, `istanbul` yayında; `ankara` yakında; `berlin`, `wien`, `köln` soluk.
Bu ayrım ana sayfanın altındaki dürüst şehir listesinden geliyor, uydurma değil.

### venue — mekân
`app.js` içindeki `MEKANLAR` dizisinin karşılığı: ad, şehir haritasındaki x/y,
açılış saati ve kaç saat açık. Footer'daki "şu an kaç oda açık" sayacı bunu
kullanıyor, o yüzden saat bilgisi taşınıyor.

### event_type — tür
Spec'in altı türü, spec'teki sırayla: Rave, Club Night, Konzert, Festival,
Meetup, Hausparty. Sıra `sira` alanında duruyor çünkü ana sayfadaki kategori
tuşları bu sırayı kullanıyor.

### event — etkinlik
36 kaydın gittiği yer. Alanlar `events-data.js` ile birebir:

| alan | ne | not |
|---|---|---|
| `slug` | `asap-rocky` | URL'i bu belirliyor, değişmez |
| `title` | `A$AP Rocky` | posterdeki isim |
| `meta` | `Olympiahalle · 11.09.26 · 18:30` | **ekranda görünen satır**, aynen saklanıyor |
| `body` | panel metni | |
| `poster_no` | `1` → `posters/01.svg` | |
| `venue_id`, `starts_at` | yapısal karşılıkları | **boş olabilir** |

`starts_at`'in boş olabilmesi önemli: mevcut veride "Sommer 2027", "Mittwochs",
"2027 TBA" gibi tarih olmayan tarihler var. Bunları zorla tarihe çevirmek veriyi
bozar. `meta` her zaman doğru; `starts_at` varsa tarihe göre filtre yapılabilir.

### profile — kişi
Giriş yapan herkesin bir satırı. Supabase'in `auth.users` tablosuna bağlı;
oradaki e-posta gizli kalır, bu tablo herkese açık olan kısımdır (kullanıcı adı).
`is_admin` alanı sadece Ahmet'te true — etkinlik yazma yetkisi buradan çıkıyor.

### swipe — atış
`(kim, hangi etkinlik)` başına tek satır. `direction` sola/sağa.
**Biriktirilen kartlar ayrı bir tablo değil**, sağa atılmış swipe'lardır —
"kept tonight" listesi bunun sorgusudur. Aynı kartı iki kez atmak yok:
`(user_id, event_id)` benzersiz, tekrar atış üzerine yazar.

### comment — beforehours
Tek tablo, `parent_id` ile iki seviye: `parent_id` boşsa konu, doluysa cevap.
Üçüncü seviye bilinçli olarak yasak (ekran iki seviye gösteriyor).
`author_name` alanı, gerçek kullanıcısı olmayan **örnek** yorumlar için;
gerçek yorumlarda `author_id` dolu olur.

### friendship — arkadaşlık
`requester` → `addressee`, `status`: pending / accepted.
"friends liked swipes" modu = onaylı arkadaşların sağa attıkları.

## Kimin neyi görebileceği

| | anonim | giriş yapmış | Ahmet (admin) |
|---|---|---|---|
| etkinlik, mekân, şehir, tür | okur | okur | okur + yazar |
| yorum | okur | okur + yazar (kendi) | + siler/gizler |
| kendi swipe'ları | — | okur + yazar | — |
| arkadaşının sağa attıkları | — | okur (onaylıysa) | — |
| başkasının swipe'ları | — | **hayır** | **hayır** |

Son satır önemli: kimin neyi beğendiği kişiseldir. Admin bile tek tek göremez,
sadece toplam sayıları görür.
