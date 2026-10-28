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
