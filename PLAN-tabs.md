# Plan: DJ sekmesini gizle, "yours"u ikiye böl

Bu dosyayı uygulayan model: **planlama yapma, adımları sırayla uygula.** Her adım hangi
dosyada neyin değişeceğini söylüyor. Dosyaları baştan sona okuma; verilen satır
numaralarının çevresine (`sed -n` / grep) bak. Branch: `claude/hopeful-cannon-y0fafm`.

## Hedef

Alt bar şu an: `flow · djs · yours · map · (panel) · account`

Olacak: `flow · people · yours · map · (panel) · account`

- **djs**: silinmez, sadece bardan kaldırılır (`app/src/app/(tabs)/djs.tsx` aynen kalır).
- **people** (yeni, djs'in yeri): groups kutusu + with your people + decks + your people.
- **yours** (orta, sosyal): sadece "from past nights" akışı.
- **"from your people"** (`posts.section`, PostCard listesi): ekrandan kaldırılır.

## Yaklaşım (az değişiklik)

`yours.tsx` 800+ satır ve tüm bölümler aynı state'i paylaşıyor. Kodu taşıma.
`YoursScreen`'e bir `part` prop'u ekle, bölümleri koşullu render et. Yeni sekme dosyası
aynı bileşeni `part="people"` ile çağırır.

---

## Adım 1: `app/src/app/(tabs)/yours.tsx`

1. Satır 53 civarı:
   ```tsx
   export default function YoursScreen() {
   ```
   şununla değiştir:
   ```tsx
   export default function YoursTab() {
     return <YoursScreen part="social" />;
   }

   // Two tabs share this screen: "people" (groups, gallery, decks, faces) and
   // "social" (the feed from past nights).
   export function YoursScreen({ part }: { part: 'people' | 'social' }) {
   ```
2. Satır 148: `useTabReset('yours', ...)` → `useTabReset(part === 'people' ? 'people' : 'yours', ...)`.
3. Satır 390 civarı `<>` fragmentinin içinde (query boşken render edilen kısım):
   - **Groups** kutusu (`{/* Groups: ... */}` Pressable), **With your people** galerisi
     (`{/* With your people: the gallery. */}` ... yükleniyor placeholder'ının bittiği `: null}`),
     **Decks** (`{/* Decks as stacks of cards. */}` + ScrollView), **Your people**
     (`{/* Your people: ... */}` Head + ScrollView, `<SuggestedInRow />`'dan sonraki
     `</ScrollView>`'a kadar) → hepsini tek bir sarmala:
     ```tsx
     {part === 'people' ? (
       <>
         ...bu dört bölüm, olduğu gibi...
       </>
     ) : null}
     ```
   - **"from your people"** bloğunu sil (yaklaşık satır 559-563):
     ```tsx
     {/* Posts by you and your friends, newest first. */}
     {posts.length ? <Head label={t('posts.section')} /> : null}
     {posts.map((p) => ( <PostCard ... /> ))}
     ```
   - **From past nights** bloğunu (`{/* From past nights ... */}`'dan `pastState === 'loading'`
     satırına kadar) sarmala: `{part === 'social' ? (<> ... </>) : null}`.
4. Sonsuz akış sadece social'da yüklenmeli: ScrollView'daki
   `onScroll={query.trim() ? undefined : nearBottom}` →
   `onScroll={query.trim() || part !== 'social' ? undefined : nearBottom}`.
5. Posts artık kullanılmıyor: `posts` state'ini, `postsFeed(null).then(setPosts...)`
   satırını, `PostCard` ve `postsFeed, type Post` import'larını kaldır (satır 14, 15, 57, 61).
   Kullanılmayan import/değişken kalmasın (lint). `myGroups` kalır.
6. Başlık: satır 359 `{t('yours.title')}` →
   `{t(part === 'people' ? 'tab.people' : 'yours.title')}`.
7. `<Tips page="yours" .../>` (satır ~624): sadece people'da göster, çünkü ipuçları
   galeri ve destelerle ilgili: `{part === 'people' ? <Tips .../> : null}`.
   `DeckViewer` ve `WhoSheet` olduğu gibi kalsın; social'da açılmazlar, zararsız.

## Adım 2: Yeni dosya `app/src/app/(tabs)/people.tsx`

```tsx
import { YoursScreen } from './yours';

// The people tab: groups, nights with your people, decks and faces (yours.tsx).
export default function PeopleTab() {
  return <YoursScreen part="people" />;
}
```

## Adım 3: `app/src/app/(tabs)/_layout.tsx`

1. Satır 26-28'deki djs trigger'ını sil, yerine:
   ```tsx
   <TabTrigger name="people" href="/people" asChild>
     <TabItem icon="people" />
   </TabTrigger>
   ```
2. djs route'u hâlâ var (`djs.tsx`), sadece butonu yok. Gerekirse `/djs` linki çalışır.
   Geri açmak için trigger'ı geri koymak yeter.
3. Satır 11'deki yorumu güncelle: `flow · people · yours · map · account (djs hidden for now)`.

## Adım 4: İkon, `app/src/components/Icon.tsx`

1. Satır 3: `IconName` union'ına `'people'` ekle.
2. Satır 20-27 arası `name === 'djs'` / `name === 'yours'` bloklarının yanına
   `name === 'people'` bloğu ekle. **Önce `yours` bloğunun çizim stilini oku** (filled /
   stroke kullanımı) ve aynı stilde iki kişi silueti çiz. viewBox ve prop'lar komşu
   bloklarla aynı olsun. Örnek path (24×24, stroke):
   - kafa 1: `M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z`
   - gövde 1: `M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6`
   - kafa 2: `M16.5 11a3 3 0 1 0 0-6`
   - gövde 2: `M17 14c2.7.3 4.5 2.6 4.5 6`

## Adım 5: i18n, `app/src/i18n/parts/tabs.ts`

Satır 5'in altına ekle:
```ts
'tab.people': { en: 'people', de: 'leute', tr: 'insanlar' },
```
(`TabItem` a11y etiketini `tab.<icon>`'dan alıyor, başlık da bunu kullanıyor.)
Gerekiyorsa `tools-lang.py` / i18n tip kontrolü yeni anahtarı kabul etsin; `tab.djs` silinmez.

## Adım 6: Kontrol

`app/` içinde:
```
npx tsc --noEmit
npx eslint src/app/(tabs) src/components/Icon.tsx
```
Hata yoksa commit ("Tabs: hide djs, split yours into people + social feed") ve
`git push -u origin claude/hopeful-cannon-y0fafm`.

Elle test (Expo Go, `npx expo start`):
- Bar: flow · people(iki kişi ikonu) · yours · map · account; DJ ikonu yok.
- people: arama, groups kutusu, with your people, decks, your people. Akış yok.
- yours: arama + from past nights akışı, aşağı kaydırınca yükleniyor. "from your people" yok.
- Aynı sekmeye tekrar basınca en üste kayıyor (useTabReset).

---

## Açık sorular (kullanıcıya sorulacak, cevap gelene kadar yukarıdaki varsayımlar geçerli)

1. **Yeni sekmenin adı ve ikonu**: "people" ve iki kişi ikonu varsayıldı. "groups" mu olsun?
2. **Arama kutusu (PeopleSearch)** iki sekmede de duruyor. Sadece people'da mı olsun?
3. **Üst bant butonları** (chat/rooms, + yeni post, ses): iki sekmede de duruyor.
   "from your people" kalkınca **+ (yeni post)** butonu anlamını yitiriyor mu, kaldırılsın mı?
   Postlar from past nights akışına mı karışmalı?
4. **Ortadaki sekmenin başlığı**: "yours" kalsın mı, yoksa "nights" / "feed" gibi bir şey mi?
5. Başka ekranlarda djs'e giden link var mı? Grep'te `/djs` push'u bulunmadı, sadece bar.
   Web sitesindeki `djs/` klasörü ayrı, ona dokunulmuyor.
