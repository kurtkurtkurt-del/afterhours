afterhours'u gerçek, yayında olan bir sosyal etkinlik uygulamasıyla karşılaştırarak **sistemsel eksiklikleri** bul. Kod hatası değil; bir özelliğin uçtan uca çalışması için gereken ama hiç kurulmamış parçaları arıyorum.

Örnek: rol sistemi ve admin paneli kuruldu, ama ilk admini atamanın uygulama içinde bir yolu yoktu. Bunu ancak SQL editöründe elle yaparak çözdük. Bu, kodu okuyunca değil, "gerçek bir uygulamada bu nasıl çalışır?" diye sorunca fark edilir.

## Nasıl bakacaksın

Her özellik için (hesap/giriş, profil, arkadaşlık, etkinlikler ve deck, sparks, waves, DJ'ler, yorumlar, bildirimler, check-in, harita, roller ve panel, offline, çok dil) şu soruları sor:

1. **Başlangıç (bootstrap):** Bu özellik sıfır veriyle, ilk kullanıcıyla, ilk admin ile nasıl başlar? Elle SQL gerektiren bir adım var mı?
2. **Tam yaşam döngüsü:** Oluştur, düzenle, gizle, sil, geri al. Hangisi eksik? (Örnek: DJ hesabı normal kullanıcıya dönünce sayfası ne oluyor?)
3. **Diğer taraf:** Bir işlemin karşı tarafı görüyor mu? Bildirim, e-posta, durum mesajı var mı? (Örnek: biri community manager yapılınca haberi oluyor mu? Yorumu gizlenen kişi?)
4. **Kötüye kullanım ve moderasyon:** Şikayet et, engelle, spam/limit, sahte hesap. Gerçek uygulamalarda olan hangisi yok?
5. **Kurtarma:** Şifre/e-posta değişimi, hesap kaybı, yanlışlıkla silinen veri, admin hesabının kaybolması.
6. **Operasyon:** Yeni bir SQL dosyası canlıya nasıl gider, hangisi eksik, kim bilir? Hata ve çökme takibi, yedek, izleme.
7. **Mağaza ve hukuk:** App Store / Play Store'un zorunlu tuttuğu şeyler (hesap silme, içerik şikayeti, kullanıcı içeriği politikası, yaş sınırı), GDPR/DSGVO.
8. **Uçtan uca bağlantı:** Bir yerde kaydedilen veri gösterilmesi gereken her yerde görünüyor mu? (Örnek: DJ'nin "hakkında" metni kaydediliyor ama sayfada görünmüyor.) Web sitesi ile uygulama arasında eşit olmayan özellikler.

## Çıktı

- Önce sadece **listele**, hiçbir şeyi düzeltme.
- Her madde için: ne eksik, gerçek bir uygulamada nasıl çözülüyor, kullanıcıya etkisi, tahmini büyüklük (küçük/orta/büyük).
- Önem sırasına diz: **yayın engeli** (mağaza reddi, güvenlik, veri kaybı) → **güven** (moderasyon, kurtarma) → **eksik akış** → **cila**.
- Kodda ya da veritabanında doğruladığın şeyle, tahmin ettiğin şeyi ayır.
- Sonunda hangilerini önce yapmayı önerdiğini söyle ve onayımı bekle.

EAS build başlatma.
