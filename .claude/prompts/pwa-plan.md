# Görev: afterhours uygulamasını iPhone'da denenebilir bir PWA olarak ayrı bir adreste yayınla

Hedef: `app/` (Expo SDK 57, expo-router) web olarak derlensin, iPhone Safari'de "Ana Ekrana Ekle" ile tam ekran açılsın, arkadaşlarla denensin. Yasal/mağaza işleri kapsam dışı. **Telefon uygulamasının davranışı değişmeyecek**: bütün web farkları `.web.ts(x)` dosyalarında, `Platform.OS === 'web'` kontrollerinde ya da Metro'nun sadece web için yaptığı yönlendirmede (alias) duracak.

## Çalışma kuralları (token tasarrufu)
- Alt ajan (subagent) açma. Her şeyi kendin, sırayla yap.
- Dosyaları baştan sona okuma: önce `grep -n`, sonra sadece gereken satır aralığını `sed -n` ile oku. Aşağıdaki envanter zaten çıkarıldı, tekrar tarama yapma.
- Toplu ve mekanik düzenlemeleri tek bir Python ya da sed komutuyla yap.
- Expo belgelerine sadece gerekirse bak, sadece şu sayfalara: `https://docs.expo.dev/versions/v57.0.0/` altında metro config, `+html` (expo-router web kök HTML'i) ve `experiments.baseUrl`.
- Her aşamanın sonunda tek bir doğrulama yap: `npx tsc --noEmit`, `npx expo lint` ve gerekiyorsa `npx expo export -p web`. Ara ara build alma. EAS build alma.
- Commit'i en sonda at; dış dünyaya dokunan adımlardan (yeni repo, push) önce kullanıcıya sor.
- Kullanıcıyla Türkçe konuş; kodda ve yorumlarda dosyaların mevcut İngilizce üslubunu koru.

## Hazır envanter (09.10.2026'da çıkarıldı, `app/src` altında)
- `expo-sqlite/kv-store` (`Storage.getItemSync / setItemSync / removeItemSync`): 15 dosya. Bunlar app/settings, signup, welcome, explore, (tabs)/flow, account, djs, components/City, Tips, audio/AmbientContext, theme/tokens, lib/offline, i18n/core, lib/push, data/here.
- `expo-secure-store` + `aes-js`: `lib/secureStorage.ts` (Supabase oturum deposu `LargeSecureStore`). `lib/supabase.ts` içinde `storage: new LargeSecureStore()` ve `detectSessionInUrl: false` var.
- `react-native-webview`:
  - `components/MapWeb.tsx`: Leaflet HTML'i. Sayfa → uygulama yönü: `window.ReactNativeWebView.postMessage(JSON.stringify(m))` ve `onMessage`. Uygulama → sayfa yönü: `ref.current.injectJavaScript("window.update(...)")`.
  - `app/film.tsx`: `source={{ html, baseUrl: '' }}`, film bitince `postMessage('end')` geliyor.
- `expo-file-system` (yeni API, `File`, `Directory`, `Paths`):
  - `app/film.tsx:49`: `new File(uri).text()`.
  - `app/panel/night.tsx:49`, `data/photo.ts:80`, `data/posts.ts`, `data/groups.ts`: `new File(uri).arrayBuffer()` ile yükleme.
  - `data/photo.ts:59,118-119`: `File`, `copy` ve `Paths.document` ile yerel kopya.
  - `data/cityPhotos.ts:92-99`: `Directory(Paths.cache)` önbelleği.
- `expo-apple-authentication`: `auth/apple.ts`, `app/signup.tsx`, `data/safety.ts` (hesap silmede Apple token iptali).
- `expo-notifications` + `expo-device`: `lib/push.ts`.
- `expo-navigation-bar`, `expo-splash-screen`: `app/_layout.tsx`.
- `expo-web-browser`: `auth/google.ts`. Google girişi zaten `supabase.auth.signInWithOAuth` ve `openAuthSessionAsync` kullanıyor.
- `DevSettings.reload`: `data/accent.ts`.
- `Alert.alert` ile buton/onay: 14 dosyada 30 yer. **react-native-web'de `Alert.alert` hiçbir şey yapmıyor.** Silme, engelleme, onay pencereleri webde sessizce kaybolur.
- `Share.share`: `lib/share.ts`, `app/groups/invite.tsx`. react-native-web bunu `navigator.share` ile karşılıyor, iOS Safari'de çalışır.
- Webde kendiliğinden çalışacaklar: expo-image, linear-gradient, svg, reanimated, gesture-handler, expo-audio, expo-location, expo-image-picker, expo-image-manipulator, netinfo, qrcode-svg, safe-area.
- `package.json`'da `react-dom` var; `react-native-web` yok. `app.json` içinde `web.favicon` var.

## Aşama 1 — Web derlemesi açılsın (çıktı: `npx expo export -p web` hatasız biter)
1. `npx expo install react-native-web` (ve kurulum isterse `@expo/metro-runtime`).
2. `app/metro.config.js`: `resolver.resolveRequest` ile **sadece `platform === 'web'` iken** şu modülleri `src/web/` altındaki yerine geçen dosyalara (shim) yönlendir:
   - `expo-sqlite/kv-store` → `src/web/kv-store.ts`: varsayılan export'u `getItemSync / setItemSync / removeItemSync / getItem / setItem / removeItem / clear` olan, `localStorage` kullanan bir nesne. Her çağrıyı try/catch içine al.
   - `expo-secure-store` → `src/web/secure-store.ts`: `getItemAsync / setItemAsync / deleteItemAsync`, `localStorage` üzerinde.
   - `react-native-webview` → `src/web/WebView.tsx` (ayrıntısı Aşama 3'te).
   - `expo-apple-authentication` → `src/web/apple.ts`: `isAvailableAsync() → false`, `signInAsync` hata fırlatsın, kullanılan enum'lar boş nesne olsun.
   - `expo-notifications`, `expo-device`, `expo-navigation-bar` → hiçbir şey yapmayan stub'lar. Sadece gerçekten import edilen isimleri karşıla; `grep -n "Notifications\.\|Device\.\|NavigationBar" lib/push.ts app/_layout.tsx` ile bak.
   - `expo-file-system` → `src/web/file-system.ts`:
     - `File` sınıfı: `constructor(...parts)` yolu birleştirir; `text()` ve `arrayBuffer()` `fetch(uri)` ile okur; `exists` false; `copy()` ve `write()` sessizce geçer; `uri` alanı var.
     - `Directory` sınıfı: `exists` false, `create()` sessiz.
     - `Paths`: `{ cache: 'web-cache', document: 'web-doc' }`.

     Webde amaç sadece yükleme baytlarını alabilmek; yerel önbellek ve kopya webde gerekmiyor.
3. Supabase oturumu: `lib/supabase.ts` webde `LargeSecureStore` yerine `localStorage` kullansın (`Platform.OS === 'web' ? undefined : new LargeSecureStore()`; supabase-js webde kendi `localStorage`'ını kullanır). `detectSessionInUrl` webde `true` olsun.
4. `npx expo export -p web`, sonra kalan import hatalarını tek tek kapat. Bitti ölçütü: export hatasız biter ve `npx tsc --noEmit` temiz.

## Aşama 2 — Webde bozulan davranışlar
1. **Alert:** `src/web/alert.ts` yaz ve sadece webde (`_layout.tsx` en üstte `if (Platform.OS === 'web') require('@/web/alert')`) `Alert.alert`'ü değiştir:
   - 0–1 buton: `window.alert`.
   - Cancel + 1 buton: `window.confirm`; onaylanırsa cancel olmayan butonun `onPress`'i çalışır.
   - 3 buton: önce `confirm`, sonra seçim için `prompt`. Bu nadir; basit tutman yeterli.

   Uygulamadaki 30 kullanımın hiçbirine dokunma.
2. **`data/accent.ts`:** webde `DevSettings.reload` yerine `window.location.reload()`.
3. **`lib/push.ts`:** webde `pushStatus` → `'unsupported'`, `registerPush` hiçbir şey yapmasın (ayarlardaki "bu cihaz desteklemiyor" satırı zaten var).
4. **`app/_layout.tsx`:** `NavigationBar` çağrısı zaten `Platform.OS === 'android'` koşulunda; `SplashScreen` webde zararsız. Kontrol et, gerekirse koşula al.
5. **Apple ile giriş:**
   - `app/signup.tsx`'te `appleAvailable()` webde false döner, buton gizlenir; doğrula.
   - Webde Apple için Supabase OAuth yönlendirmesi eklemek isteğe bağlı (`supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: location.origin + BASE } })`). Supabase'de web Apple ayarı yoksa çalışmaz; ekle ama hata mesajını anlaşılır yap.
6. **Google:** `auth/google.ts` webde `openAuthSessionAsync` yerine doğrudan `signInWithOAuth` + `redirectTo` ile tam sayfa yönlendirme yapsın. Dönüşte `detectSessionInUrl` oturumu alır.
7. **`data/safety.ts` hesap silme:** webde Apple iptal adımını atla (`Platform.OS === 'ios'` koşulu zaten var; doğrula).
8. Bitti ölçütü: tsc ve lint temiz.

## Aşama 3 — Harita ve film (WebView'in web karşılığı)
`src/web/WebView.tsx`, `forwardRef` ile bir bileşen:
- `source.html` verildiyse `<iframe srcDoc={html} style={{border:0,width:'100%',height:'100%'}} sandbox="allow-scripts allow-same-origin" />` çizer (React Native Web'de `iframe` doğrudan `React.createElement('iframe', …)` ile çizilir); `source.uri` verildiyse `src` kullanır.
- **Sayfa → uygulama:** iframe yüklenince `iframe.contentWindow.ReactNativeWebView = { postMessage: (d) => props.onMessage?.({ nativeEvent: { data: d } }) }` ata. Aynı origin (srcDoc + allow-same-origin) olduğu için doğrudan erişilir. Sayfa script'leri load'dan önce postMessage çağırabilir: bunu yakalamak için `srcDoc`'un `<head>`'ine `<script>window.ReactNativeWebView={postMessage:function(d){parent.postMessage({__rnw:1,d:d},'*')}}</script>` enjekte et ve `window.addEventListener('message')` ile `__rnw` mesajlarını `onMessage`'a ilet. Tek yöntem bu olsun, karıştırma.
- **Uygulama → sayfa:** `useImperativeHandle(ref, () => ({ injectJavaScript: (js) => iframe.contentWindow?.eval(js) }))`.
- `onLoadEnd` gibi kullanılan diğer prop'ları `grep -n "<WebView" -A20 components/MapWeb.tsx app/film.tsx` ile bul ve karşıla.
- Bitti ölçütü: tarayıcıda harita açılıyor, pinler geliyor, bir pine dokunmak kartı açıyor (onMessage); şehir değişince harita güncelleniyor (injectJavaScript). Film sonunda `next()` çalışıyor.

## Aşama 4 — PWA kabuğu
1. `app.json` → `expo.web`: `"output": "single"` (tek sayfa; derin linkler için), `"name"`, `"shortName"`, `"themeColor": "#0E0D0C"`, `"backgroundColor": "#0E0D0C"`, `"display": "standalone"`. Bu alanların SDK 57'de hâlâ geçerli olduğunu belgelerden doğrula; geçerli değilse manifest'i elle `public/manifest.json` olarak koy.
2. `app/src/app/+html.tsx` (expo-router web kök HTML'i):
   - `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title=afterhours`, `theme-color`.
   - `<link rel="manifest">` ve `apple-touch-icon`.
   - `viewport-fit=cover` (çentikli ekran ve safe-area için).
   - `body` arka planı `#0E0D0C`, `overscroll-behavior: none`.
3. İkonlar: `app/public/` altına `icon-192.png`, `icon-512.png` ve `apple-touch-icon.png` (180). `assets/` içindeki uygulama ikonundan `sips -z` ile üret.
4. Service worker **ekleme** (ilk sürümde önbellek hatası riski almıyoruz; iOS ana ekrana eklemek için gerekmiyor).
5. Bitti ölçütü: export çıktısında `manifest` ve meta etiketleri var.

## Aşama 5 — Yerel deneme (tarayıcı panelinde, telefon genişliğinde)
- `.claude/launch.json`'a `npx expo start --web --port 8090` ekle, `preview_start` ile aç, `resize_window` ile `mobile` boyutuna getir.
- Duman testi (her madde için tek bir ekran görüntüsü ya da `get_page_text`; konsoldaki hataları `read_console_messages onlyErrors` ile oku):
  1. Açılış ve karşılama ekranı; misafir olarak gir.
  2. Şartlar ekranı geliyor ve kabul ediliyor (localStorage'a yazıyor).
  3. Akış: kartlar geliyor, kaydırma çalışıyor.
  4. Harita açılıyor (Aşama 3 ölçütü).
  5. Seninkiler ve gönderiler yükleniyor; çift dokunuşla beğeni animasyonu çalışıyor.
  6. Ayarlar: vurgu rengi değişince sayfa yenileniyor ve renk değişiyor; bir onay penceresi (ör. çıkış yap) `confirm` olarak çıkıyor.
  7. Sayfa yenilenince oturum korunuyor.
- Giriş gerektiren adımlarda kullanıcının şifresini **girme**; misafir akışıyla test et, gerisini kullanıcıya bırak.

## Aşama 6 — Ayrı adreste yayın (dış dünyaya dokunan adım, önce sor)
- **Varsayılan plan:** GitHub Pages'te ayrı bir repo, `kurtkurtkurt-del/afterhours-pwa`. `gh` CLI yok; kullanıcıdan GitHub'da boş, public bir `afterhours-pwa` reposu açmasını iste (1 dakika). Mevcut push yetkisi git üzerinden çalışıyor.
- `app.json` → `expo.experiments.baseUrl: "/afterhours-pwa"`. Bunu sadece web export'unu etkileyecek şekilde ayarla ve belgeden doğrula. Native build'i etkiliyorsa export komutu öncesi ortam değişkeniyle ver.
- `npx expo export -p web` → `app/dist`. Ayrıca `dist/404.html` = `dist/index.html` kopyası (derin linkler için) ve `dist/.nojekyll`.
- `dist`'i ayrı geçici bir klasörde yeni git reposu olarak `main`'e push et. Ana repoya `dist` ekleme. `app/.gitignore`'da `dist` olduğunu kontrol et.
- Tekrar yayın için `app/tools/publish-pwa.sh` yaz: export → 404 kopyası → `.nojekyll` → geçici klasörden push.
- **Kullanıcıya söylenecek Supabase adımı:** Authentication → URL Configuration → Redirect URLs'e `https://kurtkurtkurt-del.github.io/afterhours-pwa/**` ekle (Google/Apple dönüşü ve e-posta onayı için).

## Aşama 7 — Kapanış
- Telefon uygulamasının bozulmadığını kontrol et: `npx tsc --noEmit`, `npx expo lint`, `npm test` (app) ve `cd backend && npm test`.
- `README.md`'ye kısa bir "PWA" bölümü ekle: ne çalışıyor, ne çalışmıyor, nasıl yayınlanır.
- Commit at (`App: web build as a PWA …`). Push'u ve PWA reposuna yayını kullanıcı onayıyla yap.
- Kullanıcıya iPhone'da nasıl ekleyeceğini anlat: Safari'de adresi aç → Paylaş → Ana Ekrana Ekle → ikondan aç → giriş yap (PWA'nın oturumu Safari'den ayrıdır).

## Bilinen sınırlar (kullanıcıya en sonda kısaca söyle; uğraşma)
- Webde bildirim yok (iOS web push ayrı bir iş, sonraya).
- Arka plan müziği ilk dokunuştan sonra başlar (iOS otomatik çalmaya izin vermiyor).
- Titreşim yok.
- Uzun süre açılmazsa iOS kayıtlı veriyi silebilir; oturum tekrar istenebilir.
- Apple ile giriş, Supabase'de web Apple ayarı yapılana kadar çalışmaz; e-posta ve Google çalışır.

## Riskler ve karar noktaları
- Bir modülün web shim'i beklenenden derin çıkarsa (ör. reanimated ya da gesture-handler'ın web hatası), o ekranı webde basitleştir (`Platform.OS === 'web'` dalı); native'e dokunma.
- `output: "single"` ile expo-router derin linkleri çalışmazsa 404.html yöntemi yeterli. Çalışmazsa `"static"`'i dene ama sunucu tarafı render hatalarına girme.
- `baseUrl` GitHub Pages'te varlık yollarını bozarsa (`/_expo/...`): önce belgeyi kontrol et. Son çare olarak repo adını `kurtkurtkurt-del.github.io` kökü yerine bir alt alana taşıma; bunun yerine kullanıcıya Netlify Drop'u öner (sürükle-bırak, hesap gerektirebilir).
- Bir aşama 2 denemede çözülmezse dur ve kullanıcıya iki seçenekle kısa durum raporu ver.
