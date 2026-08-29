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

tools/seed-uret.mjs      on yuzdeki veriden 03/04/05'i uretir
tools/yerel-sunucu.mjs   Supabase taklidi — gelistirme icin
tools/yedek.mjs          icerigi JSON'a yedekler
tools/saglik.mjs         durum kontrolu

test/                    82 kontrol; hepsi gercek Postgres'te (PGlite)
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
