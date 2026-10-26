# Hat — işin nasıl geçtiği (26.10.2026)

Dört parça, fazlası yok. `release-rules.md` neyin yapılabileceğini söyler, `release-board.md`
neyin sırada olduğunu; bu dosya bir işin başından yayına kadar hangi kapılardan geçtiğini.
Fikir KULA'nın "software factory" taslağından, on istasyondan dördü alındı, altısı bilerek
alınmadı (en altta). Kural: **kurallar yalnızca küçülür.** Aynı hata iki kez canlıya
gitmeden buraya yeni bir madde eklenmez; eklenen her madde hangi iki hatadan doğduğunu yazar.

## 1 · İş emri kartı

Her iş başlamadan, sohbette ya da board satırında, beş satır. Owner kodu okumaz, kartı okur.

```
İŞ      : <bir cümle, ne değişecek>
YÜZ     : site · web app · app · backend (hangileri)
VAAT    : promises.md'den hangi söz etkilenir (yoksa "—")
RİSK    : hafif · orta · ağır   (tablo aşağıda)
BİTTİ   : <owner'ın bakıp "tamam" diyeceği tek gözlenebilir şey>
TUR     : en fazla 2 düzeltme turu; üçüncüde durulur, owner'a sorulur
```

Kart yoksa iş yoktur. "Küçük bir şey" de kart alır, kart üç saniye sürer.

## 2 · Risk ve ayrı göz

| Risk | Ne | Kapı |
|---|---|---|
| **hafif** | metin, kenar boşluğu, bir sayfanın görünüşü, prototip, belge | testler yeşil → commit |
| **orta** | yeni ekran, yeni akış, i18n, deste/harita mantığı, sync betiği | testler yeşil + canlı kontrol (§4) → PR |
| **ağır** | **kalp** dosyalarına dokunan her şey (liste aşağıda) | testler yeşil + **ayrı göz** + owner onayı → PR |

**Kalp** — üyeyi koruyan kod. Buna dokunmak her zaman ağırdır:

- `backend/promises.md` ve her satırının "Enforced in" sütunundaki SQL dosyaları
  (`02_rls`, `07_friends`, `12_profiles`, `14_export`, `25_people`, `44_groups`, `50_blocks`,
  `52_bans`, `53_trust`, `57_doors`, `58_push_words`, `59_dms`, `64_export_more`, `65_account_delete`)
- `backend/sql/*` içinde `is_guest()`, `assert_member()`, bir RLS policy ya da bir
  `security definer` fonksiyon değiştiren her yeni dosya
- `backend/tools/sync-ticketmaster.mjs` (bir sabah üye verisini sildi: A0/F1, 20.10.2026)
- `login/`, `register/`, `reset/`, `delete/` ve app'teki karşılıkları (`app/src/app/(auth)`, hesap silme)
- ödeme ya da bilet satın alma akışı, geldiğinde

**Ayrı göz:** kodu yazan oturum değil, taze bir oturum. Tek görevi kırmak. Aldığı şey diff,
kart ve promises.md; verdiği şey en fazla on satır bulgu, her biri "şu girdi → şu yanlış".
Bulgu yoksa "bulgu yok, şunlara baktım" yazar. Yazan oturum bulguları düzeltir; en fazla iki tur.

## 3 · İş günlüğü

Her biten iş `is-gunlugu.md`'ye tek satır. İçerik değil, sayı: kaç tur, ne kadar sürdü,
yayından sonra hata çıktı mı. Üç ayda bir okunur (ilk okuma **26.01.2027**): hangi tür iş
hep sorun çıkarıyor, hangi kapı hiç bir şey yakalamadı. Yakalamayan kapı kaldırılır.

## 4 · Canlı kontrol

PR birleşip Pages/PWA yayınlandıktan sonra, **telefondan**, üç dakika:

1. Site: `/` açılıyor, duvar bugünün gecelerini gösteriyor, bir gece sayfası açılıyor.
2. Web app: giriş yapılmış hesapla deste geliyor, bir kart sağa kayıyor, koleksiyonda duruyor.
3. Backend: `backend/tools` sağlık kontrolü (cron-health) son saatte yeşil; `sync` çalıştıysa
   dünkü gecelerin check-in kartları duruyor (F1'in dersi).

Biri bozuksa: geri al (revert), sonra bak. Önce bakıp sonra geri almak değil.

## 5 · Eşikler — sonraki parçalar ne zaman gelir

Gelmeden kurulmaz. Eşiğe gelince bu dosyaya eklenir, önce değil.

| Eşik | O zaman eklenen |
|---|---|
| ilk gerçek üye hesap/ödeme verisi bırakınca | kalp listesi dondurulur, her ağır iş için owner onayı yazılı (PR'da "onay: <tarih>") |
| aynı türden hata ikinci kez canlıya gidince | o hataya özel otomatik test; kural değil, makine kontrolü |
| haftada 5'ten fazla açık iş olunca | açık iş sınırı 3; board'daki `yapıldı` satırları aylık `arşiv.md`'ye |
| gelir ya da 100+ aktif üye | aylık "kalp saldırısı": taze oturum promises.md'nin her satırını kırmayı dener |
| para kazanan ürün + owner dışında birinin geçimi bağlı | dışarıdan insan göz, ayda birkaç saat |

## Alınmayanlar

Dispatcher ve conductor katmanı (conductor owner, dispatcher bu sohbet), haftalık süreç
bekçisi ajan, review of reviews, 1–27 risk formülü, token bütçesi muhasebesi, insan denetçi.
Gerekçe: tek kişilik proje; KULA'nın kendi ölçümünde ürün kodunun payı bu katmanlarla
%58'den %19'a düştü. Üç ay sonra günlük "hat hafifledi mi" sorusuna hayır derse
bu dosya da küçülür.
