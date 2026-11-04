# İş günlüğü

Her biten iş bir satır. Sayı, içerik değil. İlk okuma 26.01.2027 (`hat.md` §3).

Sütunlar: tarih · iş (board no ya da üç kelime) · yüz · risk · tur (düzeltme turu sayısı) ·
süre (dk, yaklaşık) · ayrı göz (evet/hayır · bulgu sayısı) · sonuç (`indi` / `karar bekliyor` /
`iptal`) · yayın sonrası hata (`—` / kısa not + tarih; sonradan doldurulur).

| tarih | iş | yüz | risk | tur | süre | ayrı göz | sonuç | yayın sonrası hata |
|---|---|---|---|---|---|---|---|---|
| 26.10.2026 | hat kuruldu (hat.md + bu dosya) | belge | hafif | 0 | 15 | hayır | indi | — |
| 28.10.2026 | güvenlik 1/10 · 104 bekleyen istek gizliliği (H-1) | backend | ağır | 1 | — | evet · 0 | indi | — |
| 28.10.2026 | güvenlik 2/10 · 105 saklananlar yalnız arkadaşa (H-2) | backend · site | ağır | 1 | — | evet · 1 | indi | — |
| 28.10.2026 | güvenlik 3/10 · 106 ban ve misafir kapıları (M-1, M-3, M-4, B-1) | backend | ağır | 1 | — | evet · 2 | indi | — |
| 28.10.2026 | güvenlik 4/10 · 107 handle tetikleyicisi, okuma sınırı (M-2, L-5, L-11, B-2) | backend | ağır | 1 | — | evet · 5 | indi | — |
| 28.10.2026 | güvenlik 5/10 · 108 show_friends kartlar (M-5, L-12, L-8) | backend | ağır | 2 | — | evet · 6 | indi | — |
| 28.10.2026 | güvenlik 6/10 · 109 engel her yerde (M-6, M-7, M-9, L-1, L-2, L-9) | backend | ağır | 2 | — | evet · 7 | indi | 108'in foto süzgecini eziyordu; birleştirmede düzeltildi 28.10.2026 |
| 28.10.2026 | güvenlik 7/10 · 110 mekân kapsamı (M-8, M-15, L-10, L-3) | backend | ağır | 2 | — | evet · 5 | indi | — |
| 28.10.2026 | güvenlik 8/10 · 111 şart sürümü, silmede yeniden giriş (M-10, M-11) | backend · app · site | ağır | 2 | — | evet · 11 | indi | — |
| 28.10.2026 | güvenlik 9/10 · 112 misafir sırrı, yedek, foto adı (M-16, M-13, M-14, L-13) | backend · app | ağır | 1 | — | evet · 4 | indi | — |
| 28.10.2026 | güvenlik 10/10 · PKCE, ?backend bayrağı, meta CSP (M-12, L-7, L-14) | site · app | ağır | 2 | — | evet · 10 | indi | — |
| 28.10.2026 | güvenlik birleştirme · on dal → security-merge → main, tam gate | backend · app · site | ağır | 1 | 60 | hayır | indi | 104–112 canlıda değil; migrate owner'da |
| 28.10.2026 | about night: who is this her şehir, her sabah (Action plan 05:00 UTC → Haiku rutini 05:30 → Action apply); 113 atlananlar; spark week her sabah 06:30, haftaya yayılmış, ayrı göz | backend · cloud | orta | 0 | 120 | hayır | indi | 113 canlıda değil; rutinin kum havuzu Supabase/Wikipedia görmüyor, plan bu yüzden Action'da |
| 28.10.2026 | connect galeri (wave örnek kartları, decks kalktı), live'da who is this + listen, invite geri tuşu + raftan açılış, messages "add a story", bilet sorusu yalnız butonla | app | orta | 0 | 60 | hayır | indi | telefonda bakılmadı |
| 28.10.2026 | 114 grup daveti: kur/ekle davet bırakır, rafta "invited", evet/hayır, push group_ask | backend · app | orta | 1 | 45 | hayır | indi | 114 canlıda değil; preview APK alındı |
| 03.11.2026 | 116 tanıştır: "bu kişi senin için kim" seçenekleri, çevrenin gösterdikleri, ilk cümleler (intro-lines fonksiyonu); kalabalık kodu gizli tuzla, harita ve ipucu tek kaynaktan, kapalı hesap çizilmez | backend · app | ağır | 1 | 150 | evet · 4 | indi | 116 canlıda 03.11 (owner evet, migrate --write); fonksiyon deploy edilmedi (API anahtarı yok); people_suggested ile şekil eşleme açık (101/103+104/108, ürün kararı) |
| 03.11.2026 | grup ekranı sadeleşti: deste (flow 1) + koçan pasaport (flow 5); listen/who is this kart kenarında, şehir-gün pill'i, arkadaş ekle ayrı sayfa, edit yalnız görünüm, şehir yazarak eklenir | app | orta | 0 | 90 | hayır | indi | commit yok, telefonda bakılmadı |
| 03.11.2026 | specialties 50'ye çıktı (çoğu şimdilik boş), connect'te 6 + "all specialties" sayfası aramalı; ortak plain motif seti | app | hafif | 0 | 25 | hayır | indi | commit yok; preview APK alınıyor |
| 04.11.2026 | canlıdaki test verisi gitti: 6 test_* hesap, 3 "(test)" grup, 3 sahte gece (owner evet); şehir balonlarında Android gölge beyazlığı | backend-data · app | hafif | 0 | 20 | hayır | indi | silme tek atımlık betikle, dosya bırakılmadı; pill düzeltmesi telefonda bakılmadı |
| 04.11.2026 | afterhours kartları yeniden: 6 tür × 10 motif, tek yüz, yalnız bilinen şeyler (ad, tarih·kapı, gelenler, müzik notu, foto); app + web app + site tek üreteç; admin koleksiyonuna 60 kart (50 gerçek geçmiş gece + 10 staff hausparty, owner evet) | site · web app · app · backend-data | hafif | 0 | 150 | hayır | indi | SQL yok; retired gecelerde parça adı çıkmıyor (motif), takip: my_card_sounds; gece sayfası CARDS.back'te bir süre kırıldı, site oturumu düzeltti |
