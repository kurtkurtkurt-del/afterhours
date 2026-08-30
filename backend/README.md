# afterhours — backend

Veritabani, kurallar, yonetim paneli ve bunlari sinayan testler.
Site (ust klasor) bunlar olmadan da calisir: `ayar.js` bos oldugu surece
veri `events-data.js`'ten okunur ve hicbir sey degismez.

## Dosyalar

```
sql/01_schema.sql        tablolar
sql/02_rls.sql           kimin neyi gorup yazabilecegi  ← guvenlik burada
sql/03_seed_katalog.sql  sehir, tur, mekan          (uretilmis)
sql/04_seed_events.sql   36 etkinlik                (uretilmis)
sql/05_seed_comments.sql ornek beforehours yorumlari (uretilmis)
sql/06_views.sql         deste, biriktirilenler, sayaclar
sql/07_friends.sql       arkadaslik islemleri
sql/08_storage.sql       poster deposu (yalniz Supabase'de)
sql/09_jobs.sql          gecmisi dusurme + saglik ozeti
sql/11_dunya.sql         54 sehir, 106 gece
sql/12_profiles.sql      kisi profilleri: kart + ayarlar + kayit adimi

tools/seed-uret.mjs      on yuzdeki veriden 03/04/05'i uretir
tools/yerel-sunucu.mjs   Supabase taklidi — gelistirme icin
tools/yedek.mjs          icerigi JSON'a yedekler
tools/saglik.mjs         durum kontrolu

test/                    155 kontrol; hepsi gercek Postgres'te (PGlite)
```

## Gunluk isler

```bash
npm test          # sema, tohum, gorunumler, arkadaslik, isler
npm run sunucu    # http://localhost:4350 — Supabase olmadan gelistirme
npm run seed      # events-data.js degistiyse SQL'leri yeniden uret
npm run saglik    # yayindaki veritabaninin durumu
npm run yedek     # icerik yedegi al
```

Yerel sunucu ile siteyi denemek: sunucuyu baslat, sonra sayfayi
`?backend=http://localhost:4350` ile ac. Bu kisayol yalnizca localhost'ta
calisir. Giris baglantisi e-posta yerine sunucunun konsoluna yazilir.

## SENIN YAPMAN GEREKENLER

Benim yapamayacaklarim: hesap acmak, anahtar almak, panelden ayar
degistirmek. Sirasiyla:

**1 · Supabase projesi ac** — supabase.com, yeni proje, bolge olarak
Frankfurt (Munih'e en yakini). Ucretsiz plan yeter.

**2 · SQL'leri sirayla calistir** — Supabase panelinde SQL Editor.

> **Onemli:** Run dugmesinin yanindaki rol/RLS secenegini **kapali**
> tut ("run without RLS"). Rol taklidi acikken editor betigi oldugu gibi
> gondermiyor, sarmalayip yeniden yaziyor; uzun kurulum dosyasinda bu
> ceviri bozuluyor ve `relation "one" does not exist` gibi anlamsiz bir
> hata veriyor. Hata dosyada degil, o moddadir. (29.08.2026'da tam olarak
> bu yasandi.)

Sirasiyla:
`sql/kurulum-1-yapi.sql` → `sql/kurulum-2-yorumlar.sql`. Bu ikisi
`01..09`'un birlestirilmis hali (`npm run kurulum` ile yeniden uretilir);
tek tek de calistirabilirsin. 08 (depo) ve 09'daki zamanlama satirlari
yalniz Supabase'de anlamli, baska yerde kendilerini atlarlar.

Panodan yapistirmakta sorun yasarsan dosyayi dogrudan kaynagindan al:
`raw.githubusercontent.com/kurtkurtkurt-del/afterhours/main/backend/sql/kurulum-1-yapi.sql`

Her dosyanin 3. satirinda bir SURUM damgasi var; editorde hangi kopyanin
durdugunu oradan anlarsin.

**3 · Kendini yonetici yap** — once siteden giris yap (asagidaki 5.
adimdan sonra), sonra SQL Editor'de:

```sql
update public.profiles set is_admin = true, handle = 'ahmet'
where id = (select id from auth.users where email = 'senin@epostan');
```

Bu satiri SQL Editor'den calistirmak zorundasin: kimse kendini
tarayicidan yonetici yapamiyor, kural bunu engelliyor.

**4 · Anahtarlari al** — Project Settings → API. Iki deger var:
- `Project URL` ve `anon public` → `ayar.js`'e yazilir. Bunlar aciktir,
  herkes gorebilir, sorun degil.
- `service_role` → **hicbir yere yazilmaz.** Bu anahtar butun kurallari
  atlar. Tarayiciya konursa veritabani herkese acilir.

**5 · `ayar.js`'i doldur** (ust klasorde):

```js
window.AH_AYAR = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi...",
  sehir: "munchen",
};
```

**6 · Giris baglantilarinin dondugu adresleri tanit** —
Authentication → URL Configuration → Redirect URLs:
`https://kurtkurtkurt-del.github.io/afterhours/**` ve gelistirme icin
`http://localhost:4340/**`. Bu liste eksikse giris baglantisi calismaz.

**7 · pg_cron'u ac** (istege bagli) — Database → Extensions → `pg_cron`.
Sonra `09_jobs.sql`'i bir kez daha calistir; gecmis etkinlikleri dusuren
gorev kurulur. Acmazsan `select public.hide_past_events();` diye elle
calistirabilirsin.

**8 · Yedek** — Supabase gunluk yedek aliyor. Ayrica ayda bir
`npm run yedek` calistir; metinlerin projeden bagimsiz bir kopyasi
`backend/yedek/` altina duser.

## Profil (12_profiles.sql)

Kayit olduktan sonra ortaya cikan sey. Ikiye ayrilmis, cunku ikisi ayni
sey degil:

| tablo | ne | kim gorur |
|---|---|---|
| `profiles` | handle, gorunen ad, bir satirlik tanim, sehir, katilma tarihi, son gorulme | **herkes** |
| `profile_settings` | sakladiklarini kim gorsun, adinla bulunabilir misin, e-posta, dil | **yalniz sahibi** — yonetici bile degil |

Ayirmasaydik `profiles`'in "herkes okur" kurali ayarlari da acardi.

**Kayit akisi.** Hesap acilinca tetikleyici (`handle_new_user`) profili ve
ayar satirini kendiliginden kurar. Ama kayit **handle secilene kadar
bitmis sayilmaz**: `onboarded_at` o an damgalanir. Kayit formu handle ve
sehri metadata ile gonderirse tetikleyici onlari dener; handle doluysa
sessizce bos birakir, kisi sonra secer.

```
auth.users’a satir  →  handle_new_user()  →  profiles + profile_settings
                                              (handle bos, onboarded_at bos)
                              ↓
                       profile_setup(handle, ad, sehir, bir satir)
                              ↓
                       onboarded_at damgalandi — kayit bitti
```

**Fonksiyonlar**

| ad | ne yapar |
|---|---|
| `handle_status(handle)` | `ok` · `bos` · `bicim` · `dolu` · `senin` — kayit formu her tusta sorar |
| `profile_setup(handle, ad, sehir, bio)` | kaydi tamamlar, tek istekte |
| `profile_me()` | kendi profilin + sayilar (sakladigin, arkadas, yorum) + ayarlar |
| `profile_card(handle)` | baskasinin gordugu kart; sayilar ancak arkadassan ve ayar izin veriyorsa |
| `seen()` | son gorulme damgasi |
| `kept_visible(id)` | ayara gore "sakladiklari gorunur mu" — RLS bunu kullaniyor |
| `card_visible(id)` | ayara gore "karti yabanciya acik mi" |
| `is_linked(id)` | arkadas ya da bekleyen istek — profil okuma kurali bunu kullaniyor |
| `handle_to_id(handle)` | ada gore kimlik; arkadaslik istegi buradan geciyor |
| `author_name(id, yedek)` | yorumun altindaki isim, profil tablosuna dokunmadan |
| `delete_account()` | hesabi siler; yorumlarin metni kalir, adi `someone`a doner |

**Kural degisikligi:** 02'deki "onayli arkadas SAGA attiklarini gorur"
kurali artik ayara da bakiyor. Kisi `private` dediyse arkadasi da goremez,
`friends_kept()` destesinde de cikmaz.

### Liste gezilemiyor

02'de `profiles` "herkes okur" idi: hesabi olmayan biri tek istekle butun
uye listesini indirebilirdi. Artik tabloyu **dogrudan** okuyabildigin
satirlar: kendin, onayli arkadaslarin, aranizda bekleyen istek olanlar,
bir de yonetici. Yabancinin gordugu her sey `security definer`
fonksiyonlardan geciyor ve her biri yalnizca gerekli alani veriyor.

| kim | ne gorur |
|---|---|
| girissiz ziyaretci | hicbir profil satiri. Yorumlarin altindaki isim `author_name()`'den geliyor |
| adini bilen yabanci | `profile_card()` — ad, bir satir, sehir, katilma. Sayilar ve son gorulme YOK |
| ayarini kapatmis kisinin yabancisi | hicbir sey. Ama adini bilen yine **istek gonderebilir** — yoksa o kisiyi kimse ekleyemezdi |
| onayli arkadas | kart + sakladigi sayisi (ayari izin veriyorsa) + son gorulme **gun olarak** |
| kendisi | hepsi, saatiyle |

**Son gorulme hicbir zaman saatiyle disari cikmiyor** (`last_seen_at::date`):
kimin ne zaman ayakta oldugu cikarilmasin.

Kurala takilan iki eski tanim 12'de yeniden yazildi: `comments_public`
artik profil tablosuna join etmiyor, `friend_request` ada gore kimligi
`handle_to_id()`'den aliyor.

## Bilerek yapilmayanlar

- **Sifre yok.** Giris yalniz e-postaya gelen baglantiyla. Sifre
  saklanmiyor, sifirlanmiyor, sizmiyor.
- **Yonetim paneli gizli bir adres degil.** `admin/` herkese acik; yetkisi
  olmayan hicbir sey goremez ve yazamaz, cunku kural veritabaninda.
- **Kimin neyi begendigi kimseye acik degil.** Yonetici bile tek tek
  goremez, yalnizca toplam sayiyi gorur. Arkadasin SOLA attigi hicbir
  yerde gorunmez.
- **Tahmin edilen tarihler kendiliginden gizlenmez.** 36 etkinligin
  24'unde yil yoktu ve cikarimla dolduruldu; bunlara dayanip bir gecenin
  ilanini siteden dusurmek yanlis olurdu. Panelde `date?` diye isaretli.
