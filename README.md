# afterhours

**[kurtkurtkurt-del.github.io/afterhours](https://kurtkurtkurt-del.github.io/afterhours/)**

Münih'in (ve İstanbul'un) gecesini bulma sitesi: rave, club night, konzert,
festival, meetup, hausparty. Tek kart, tek gece, sağa kaydır sakla.

> **Bu dosya projenin tek referansı.** Her değişiklikten sonra güncellenir —
> yeni bir sayfa, yeni bir betik, yeni bir kural buraya da yazılır. Sıfırdan
> gelen biri (ya da altı ay sonraki sen) yalnızca bunu okuyup devam
> edebilmeli.

---

## 1. Ne yapmaya çalışıyor

Üç cümlelik ürün:

1. **Arama yok.** Hiçbir yerde. Gece, aradığın şey değil, karşına çıkan şey.
   Deste sana tek kart verir: sağa atarsan saklarsın, sola atarsan bir daha
   göremezsin.
2. **Gecenin kendisi değil, devamlılığı önemli.** Gittiğin her gece bir
   *afterhours kartına* dönüşür: o gecenin sesi, konuşmaları, kimler vardı.
   Koleksiyon geçmişi tutar; "şimdi ve gelecek" ayrı yerde durur.
3. **Sayfa sana bir gece satmaz.** Etkinlik sayfası "bu gece ne var" demez,
   "bu senin kaçıncı kez oluşun" der. Bilet düğmesi var ama sayfanın
   merkezinde değil.

### Ruhu

- Siyah-beyaz. Renk yalnızca posterlerde ve kartlarda var.
- Kutu yok, gölge yok, köşe yuvarlaması yok. Ayırıcı = 1px saç teli çizgi.
- İki yazı tipi: **Inter Tight** (PP Neue Montreal'in ulaşılabilir karşılığı)
  ve **JetBrains Mono** (bütün ince yazılar: 10px, 0.14–0.18em aralık,
  büyük harf, %38–50 opaklık).
- Arayüz metni **İngilizce ve küçük harf**; kod yorumları ve bu dosya
  **Türkçe**; hukuk sayfaları **Almanca**.
- Sayfadaki her şey elle üretildi: posterler elde yazılmış SVG, ses
  sentezlendi. `foto.jpg` dışında dışarıdan medya yok.
- Bağımlılık yok, derleme adımı yok. Ne npm ne bundler. Tarayıcı ne
  anlıyorsa o.

---

## 2. Çalıştırmak

```bash
python3 -m http.server 4340
```

Sonra `http://localhost:4340`. `file://` ile açma — SVG posterler `<object>`
içinde yüklendiği için harici CSS/font gelmiyor.

Backend olmadan da tam çalışır: `ayar.js` boşsa veri `events-data.js`'ten
okunur ve site aynı davranır.

---

## 3. Sayfa haritası

| Yol | Ne | Durum |
|---|---|---|
| `index.html` | İniş sayfası, beş ekran derinliğinde: poster vitrini → swipe anlatımı → kart şeridi → dönen şehir küresi → siyah footer ekranı | çalışıyor |
| `explore/` | **Deste.** Tek kart, sağa/sola. Filtreler (ülke/şehir/tür/tarih), üç kaynak (global deck / friends liked swipes / i feel lucky), yanda beforehours yorumları | çalışıyor |
| `explore/<slug>/` | **Etkinlik sayfası** (kontak baskısı) — 36 gece, hepsi tek düzenden. Bkz. §6 | çalışıyor |
| `maps/` | Şehir şeması, mekânlar nokta olarak | çalışıyor, **menüden bağlantısı yok** |
| `cards/` | **Card collection** — afterhours kartları. Girişliyken boş (kart mantığı henüz yok) | iskelet |
| `friends/` | Handle, arkadaş ekleme, sakladıkların; altta nachtradar'dan tanıdık yüzler | çalışıyor |
| `login/` | Giriş + hesap sayfası. Üç sütun: giriş · (first time? / account settings) · give feedback | çalışıyor |
| `register/` `settings/` `feedback/` | Boş kabuklar, hesap sayfasındaki bağlantıların hedefi | **boş** |
| `help/` | Sitenin nasıl çalıştığı | çalışıyor |
| `impressum/` `datenschutz/` `agb/` | Almanca hukuk sayfaları | **Muster** (köşeli parantezler doldurulacak) |
| `admin/` | Etkinlik düzenleme, poster kontrolü, yorum moderasyonu | sadece `is_admin` |
| `posters/` | 36 SVG poster, gece başına bir tane | — |
| `ses/` | İki kısa kayıt, tamamen sentezlenmiş | — |
| `serit.html` | Park edilmiş deneme (yatay şeritler) | dokunma |

Her sayfanın altında **dipnot** var: `© 2026 afterhours` + impressum ·
datenschutz · agb. İki hâli: akışta duran normal hâl ve tam ekran sayfalar
(`explore`, `maps`) için köşede duran `dipnot ince`. Dipnotu olmayan üç
sayfa: `index.html` (kendi siyah footer ekranı var), `admin/`, `serit.html`.

---

## 4. Veri akışı

```
ayar.js          Supabase URL + publishable key (ikisi de herkese açık)
   ↓
veri.js          canlı mı yerel mi karar verir
   ├── canlı  →  Supabase REST → satırları sitenin biçimine çevirir
   └── yerel  →  data-yedek ile events-data.js
   ↓
window.POSTERS   36 etkinlik: { slug, tur, baslik, meta, metin, poster }
   ↓
data-sonra       sayfanın kendi betikleri ANCAK veri geldikten sonra yüklenir
```

Sayfalardaki kalıp:

```html
<script src="../veri.js?v=101"
        data-yedek="../events-data.js?v=101"
        data-sonra="explore.js?v=101, filtre.js?v=101"></script>
```

Ortak `AH` nesnesi: `AH.durum` (`canli` / `yerel`), `AH.istek()`,
`AH.oturum`, `AH.girisliMi()`, `AH.oturumHazir` (promise),
`AH.oturumDegisti(cb)`, `AH.etkinlikler()`, `AH.atislar`, `AH.arkadaslar()`.

**Güvenlik:** `ayar.js`'teki anahtar gizli değil, gizli olması da gerekmiyor.
Veriyi koruyan şey `backend/sql/02_rls.sql`'deki satır düzeyi kurallar.
`service_role` anahtarı bu depoya **asla** yazılmaz.

---

## 5. Dosya dosya

**Kök**

| Dosya | İş |
|---|---|
| `veri.js` | Veri katmanı. Önce o çalışır, sonra sayfanın betiklerini yükler |
| `ayar.js` | Supabase URL + anon anahtar + varsayılan şehir |
| `oturum.js` | Oturum: Supabase Auth REST'ine doğrudan konuşur, jeton `localStorage`'da |
| `menu.js` | Menünün oturuma göre hâli: "welcome <ad>", yöneticiye admin bağlantısı |
| `atislar.js` | Sağa/sola atılanlar. Girişsizken `localStorage`, girişliyken veritabanı |
| `arkadaslar.js` | Arkadaşlık istekleri; işin tamamı veritabanı fonksiyonlarında |
| `beforehours.js` | Etkinlik yorumları (okuma herkese, yazma girişe bağlı) |
| `app.js` | İniş sayfasının beş ekranı, poster vitrini, kaydırma mantığı |
| `sehir.js` | Dönen şehir küresi. Three.js yok — kendi izdüşüm matematiği, canvas'a çizer |
| `mekanlar.js` | Münih mekânlarının şema koordinatları |
| `kartlar.js` | **Afterhours kartı üreteci.** `KARTLAR.on(gece, id)` / `.arka(gece, id)` SVG döndürür |
| `events-data.js` | 36 etkinlik, backend kapalıyken kullanılan yedek |
| `tools-etkinlik.py` | Etkinlik sayfalarının kabuğunu üretir (§6) |
| `tools-favicon.py` | Favicon'ları üretir (boyuta göre farklı çizim) |

**Sayfa betikleri**

| Dosya | İş |
|---|---|
| `explore/explore.js` | Deste: sürükleme, uçurma, yeniden dağıtma, saklanan kutusu |
| `explore/filtre.js` | Kendi açılır listelerimiz (native `<select>` değil) |
| `explore/yorumlar.js` | Beforehours havuzu — tür bazlı, slug tohumuyla seçilir |
| `explore/etkinlik.js` | **Etkinlik sayfasını kuran tek şablon** (§6) |
| `explore/etkinlik-veri.js` | Etkinlik sayfasının tür bazlı içerik havuzları |
| `cards/cards.js` · `kartlar-veri.js` · `kk.js` | Koleksiyon: örnek kartlar, oturuma göre gizleme |
| `friends/friends.js` · `nachtradar.js` | Handle/arkadaş/sakladıkların; tanıdık yüzler listesi |
| `login/login.js` · `hesap.js` | Giriş formu; ortadaki bloğun oturuma göre değişmesi |
| `maps/harita.js` | Şemaya mekânları yerleştirir |
| `admin/admin.js` | Yönetim paneli |

---

## 6. Etkinlik sayfası: kontak baskısı

36 gece için 36 sayfa yazmıyoruz. **Düzen tek, içerik veriden geliyor.**

Fikir fotoğrafçılıktan: kontak baskısı bir sonuç değil, envanterdir —
"elimde bunlar var". Sayfa da tek bir geceyi değil, tekrar eden bir şeyin bu
ayki karesini anlatır.

```
┌──────────┬────────────────────────────────┬──────────────┐
│ SOL RAY  │ ORTA                           │ SAĞ          │
│ (sabit)  │                                │              │
│ poster   │ explore / <ad>                 │ which        │
│          │ edition 05 · your 3rd          │ friends are  │
│ künye:   │ <BAŞLIK>                       │ going        │
│ doors    │ tür · gün tarih                │  ↓           │
│ curfew   │                                │ get the      │
│ capacity │ üç paragraf                    │ ticket       │
│ door     │                                │  ↓           │
│ payment  │ THE ROLL — beş kare, biri boş  │ beforehours  │
│ photos   │ [][][][ ][]                    │ · arkadaşlar │
│ walk     │                                │              │
│ room     │ ─ ilk ekran burada biter ─     │              │
│ from     │ editions you were at (kartlar) │              │
└──────────┴────────────────────────────────┴──────────────┘
```

- **Sol ray** sayfa kaysa da yerinde kalır. Bilerek sıkıcı: serinin kimliği
  değişkenlerde değil, değişmeyenlerde. Sadece her edisyonda aynı olan
  şeyler burada — **saatler burada değil, karelerde.**
- **Kareler** eşit boyda. Rezidans da konuk da aynı kutuda; biri büyük isim
  değil, hepsi aynı rulodan çıktı. Dördüncü kare boş: "not shot yet /
  fills at the door". Boş kare de bir bilgidir.
- **Sağ sütun** önce kimin geleceğini, sonra bileti, sonra arkadaşların o
  geceye/mekâna/tarihe dair yorumlarını gösterir.
- **Altta** gittiğin geçmiş edisyonlar — gerçek afterhours kartları olarak.

### İçerik nereden geliyor

| Parça | Kaynak |
|---|---|
| Başlık, tür, meta, ilk paragraf, poster | Etkinliğin kendi verisi (`POSTERS`) |
| Künye satırları, roller, isimler, paragraflar, fiyat, bilet yazısı, yorumlar | `explore/etkinlik-veri.js` — **tür bazlı havuzlar** |
| Hangi parçanın hangi geceye düşeceği | **slug'dan üretilen mulberry32 tohumu** |

Yani bir etkinlik her açılışta aynı şeyi gösterir, iki etkinlik birbirine
benzemez. (`explore/yorumlar.js` de aynı deseni kullanıyor.)

Tür başına değişenler — konzert `get the ticket`, rave `get on the list`,
hausparty `ask for the address`, meetup `save a seat`; roller `dj set /
support / headline` yerine `kitchen / living room / balcony` olur; künye
`card only` yerine `bring something` der.

### Kareler neden posterden kesiliyor

Gerçek fotoğraf yok. Her kare, etkinliğin **kendi posterinin başka bir
şeridi** (`--kay: 0 / 42 / 83 / 125`, poster 2:3, kare 3:2). Her gecenin
posteri farklı olduğu için her rulo da farklı. Siyah-beyaza çekiliyor.
Gerçek fotoğraflar geldiğinde tek yapılacak `etkinlik.js`'te karenin
kaynağını değiştirmek.

### Yeni etkinlik eklemek

1. `events-data.js`'e satırı yaz (ya da veritabanına ekle) — `slug`, `tur`,
   `baslik`, `meta`, `metin`, poster numarası.
2. Posteri `posters/NN.svg` olarak koy (2:3, `xmlns` şart, fontlar SVG'nin
   kendi `<style>@import`'unda).
3. Kabuğu üret:

```bash
python3 tools-etkinlik.py 102
```

Argüman sürüm numarası (§9). Klasörü ve `index.html`'i açar, düzen
kendiliğinden gelir.

---

## 7. Afterhours kartı

`kartlar.js` gecenin verisinden SVG kart üretir. Kullanan üç yer:
iniş sayfasının şeridi, `cards/`, etkinlik sayfasının geçmiş edisyonları.

```js
KARTLAR.on(gece, "benzersiz-id")    // ön yüz
KARTLAR.arka(gece, "benzersiz-id")  // arka yüz: gecenin zaman çizelgesi
```

`gece` nesnesi: `sehir t ty v d metal motif in out dur crew more aud msg
who froze no at1 at2 q1 q2`. Örnek için `cards/kartlar-veri.js`.

- **Metaller:** steel, gold, chrome, copper, gunmetal, brass, rose,
  titanium, nickel, anthracite
- **Motifler:** rays, oval, diagonal, orbit, grid, moon, moire, bands, iso,
  descend

---

## 8. Backend

Postgres + Supabase. Tablolar: `cities`, `event_types`, `venues`, `events`,
`profiles`, `swipes`, `comments`, `friendships`.

Kurulum, testler ve yerel Supabase taklidi (`tools/yerel-sunucu.mjs`,
PGlite üstünde PostgREST + GoTrue) için → **[backend/README.md](backend/README.md)**

---

## 9. Yayın ve önbellek

GitHub Pages, `main` dalından. `.nojekyll` var (alt çizgili yollar için).

**Sürüm numarası kuralı:** bütün HTML'lerdeki `?v=NN`. CSS ya da bir betik
değiştiğinde hepsi birden artırılır, yoksa tarayıcı eski dosyayı kullanır:

```bash
sed -i '' -E 's|\?v=101|?v=102|g' $(find . -name "*.html" -not -path "./.git/*" -not -path "./backend/*")
```

Şu anki sürüm: **101**.

---

## 10. Sıfırdan adım adım

Sıra önemli: her adım bir öncekinin açtığı yolu kapatıyor.

**Bitmiş olanlar**

- [x] İniş sayfası, beş ekran
- [x] Deste: sürükleme, filtreler, üç kaynak, saklananlar
- [x] Beforehours yorumları (okuma + yazma)
- [x] Oturum, handle, arkadaşlık, sakladıkların
- [x] Backend: şema, RLS, seed, testler, yerel taklit
- [x] Yönetim paneli
- [x] Dipnot + hukuk sayfaları (Muster)
- [x] Hesap sayfası kısayolları
- [x] **Etkinlik sayfası sistemi** — 36 gece, tek düzen

**Sırada (önerilen sıra)**

1. **Kayıt yolu.** `login.js`'te sign-up yok; yeni kimse hesap açamıyor.
   Bu olmadan kart biriktirme, arkadaşlık ve yorum yazma herkese kapalı.
   Hedef sayfa hazır: `register/`.
2. **`maps/` menüye.** Sayfa var, hiçbir yerden bağlantısı yok.
3. **`settings/`** — profil, handle, hesap silme (DSGVO için de gerekli).
4. **`feedback/`** — "give feedback" bir yere gitmeli.
5. **Etkinlik verisinin genişlemesi.** Bugün beş alan var
   (`slug tur baslik meta metin`). Etkinlik sayfasındaki her şey — kadro,
   saatler, kapasite, fiyat, kurallar — şu an havuzdan uyduruluyor. Gerçek
   olması için `events` tablosuna alan eklemek gerekiyor. Bu yapıldığında
   `etkinlik-veri.js` havuzları yalnızca **yedek** olur.
6. **Card collection.** Konseptin kalbi ama en pahalısı: geçmiş gece verisi,
   "o gecenin sesi/konuşmaları" ne demek olduğuna karar vermek, kart üretimi.
7. **Hukuk sayfalarının doldurulması** — köşeli parantezler + gerçek Stand
   tarihi.
8. **Gerçek fotoğraflar** — kareler poster şeritleri yerine gerçek kareler.

---

## 11. Bilinen tuzaklar

Hepsi bir kere canımızı yaktı:

- **`login/login.js` yarıda hata veriyor.** `handle-form` / `arkadas-form`
  arıyor, o ögeler friends sayfasında. Satır 173'te `TypeError`, sonrası
  hiç çalışmıyor. Giriş formu daha önce bağlandığı için giriş çalışıyor.
  *Bu yüzden `login/hesap.js` ayrı dosya.*
- **`<object>` içindeki SVG'ye `filter` işlemez** (ayrı belge). Kareleri
  gri yapan şey `mix-blend-mode: saturation` katmanı.
- **`<img>` içindeki SVG webfont yükleyemez.** Posterler bu yüzden
  `<object>` ile geliyor; `<object>` de `pointer-events: none` ister.
- **`[hidden]` `display`'e yenilir.** `style.css`'te
  `[hidden] { display: none !important }` var, sebebi bu.
- **`lang="tr"` + `text-transform: uppercase`** Türkçe i→İ üretir
  ("CLUB NİGHT"). Sayfalar `lang="en"`, hukuk sayfaları `lang="de"`.
- **`overflow-x: clip` tek başına `body`'de kesmez** — `html:has(body.explore)`
  da gerekiyor.
- **Flex/grid ögesine `min-width: 0`** verilmezse uzun paragraf sayfayı
  yatayda taşırır.
- **Google Fonts** IP'yi Google'a gönderiyor; datenschutz'ta yazılı. Yerel
  servis edilirse o madde düşer.
- **Önizleme paneli** kaydırılmış içeriği yeniden boyamıyor; ekran görüntüsü
  için taze yükleme gerekiyor. Ölçüm için panel yerine
  `getBoundingClientRect` güvenilir.

---

## 12. Sözlük

Kod Türkçe yazılıyor. Karşılıkları:

| Kod | Anlam |
|---|---|
| `deste` / `atis` / `ucur` | deste / sağa-sola atış / kartı uçurmak |
| `kirinti` / `dipnot` / `kunye` | breadcrumb / footer / colophon |
| `ray` / `kare` / `poz` | rail / frame / exposure |
| `oturum` / `girisli` / `jeton` | session / signed in / token |
| `serit` / `sehir` / `mekan` | strip / city / venue |
| `yorum` / `konu` / `cevap` | comment / thread / reply |
| `tohum` / `havuz` / `karistir` | seed / pool / shuffle |
