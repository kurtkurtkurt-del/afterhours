# PR hazırlığı — try/light → main (hazırlandı 26.10.2026, bekletiliyor)

Owner kararı: açık zemin deney değil, kalıcı özellik. Dal normal yola giriyor:
`release/light-2026-10-26` → tek PR → main, owner birleştirir.

**Bekleme sebebi:** başka bir oturum son bir iş yapıyor (mekân masası `97_venue_desk.sql`,
deste boş durumu, `migrate.mjs`; çalışma ağacında commit'siz). O iş commit'lenince
aşağıdaki adımlar koşar. O işe bu oturum dokunmaz.

## Kart (hat.md §1)

```
İŞ      : try/light dalını main'e taşı (açık zemin + iki haftanın işi)
YÜZ     : app · web app · backend (96_spark_edit, enrich SQL) · site (küçük)
VAAT    : — (promises.md satırları değişmiyor; 96 yeni definer fonksiyon → ağır sayılır)
RİSK    : ağır — backend/sql'e yeni dosya var, setup-1/2 yeniden üretildi
BİTTİ   : PR açık, CI üç iş yeşil, owner telefonda açık zemini görüyor
TUR     : 2
```

## Kanıt (commit'li hal, temiz kopyada, 26.10.2026)

- app: `tsc` 0 hata, `expo lint` 0 hata, jest 4 paket / 33 test geçti
- backend: `npm test` — 80 paket, 1269 kontrol geçti, 0 hata (exit 0)

## İçindekiler (27 commit, 342 dosya, +7454 / −787)

- Açık zemin: tokens'ta light/dark, ayarlarda tema seçimi, bilet beyaz kart,
  fotoğraflar koyu poster kalıyor, harita açık, web derlemesi spark kartında çökmüyor
- Her şehre bir plak (93 etiket, `tools/build-record.py`), Münih "föhn"
- Yeni logo 11F "the shared stub", ikonlar, splash, expo-dev-client
- Mesajlar tek sayfa (tasarım 3), bağlan sekmesinde özel desteler, dürtme kartı
- Klavye düzeltmeleri (KeyboardSafe), tek ses, açılış asla takılmaz, uygulama kendi sheet'iyle sorar
- Spark düzenleme: `96_spark_edit.sql` + 19 kontrol, push "ada changed it"
- `enrich.mjs`: her gece için "who is this + listen" (Apple→Deezer, Wikipedia); `enrich-2026-10-22.sql` yapıştırılacak dosya
- PWA: iPhone açılış görselleri, ana ekrana ekle ipucu, manifest üzerinden ağ kontrolü
- Belge: hat.md, is-gunlugu.md (main'de zaten var, 081fbe9)

## Sabah karar (canlıya uygulanacaklar)

- `96_spark_edit.sql` canlıya yapıştırılacak (PGlite'ta kanıtlı)
- `enrich-2026-10-22.sql` yapıştırılacak mı: 362 önizleme + 232 "about"
- README §6 açık zemini anlatıyor; ayrı bir "tema" satırı eklenmeli mi

## Koşulacak adımlar (o iş bitince)

```
git checkout -b release/light-2026-10-26 try/light
git push -u origin release/light-2026-10-26
# PR: https://github.com/kurtkurtkurt-del/afterhours/compare/main...release/light-2026-10-26
# başlık: "Light — the ground, the records, the line"
```

`gh` bu makinede yok; PR tarayıcıdan açılır. Sonra `is-gunlugu.md`'ye satır.
