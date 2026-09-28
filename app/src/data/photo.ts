import { useEffect, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import { useAuth } from '@/auth/AuthContext';
import { t } from '@/i18n';

// profil fotoğrafı (24_photos.sql). hesaba bağlı: dosya "photos" kovasında
// <kullanıcı>/<sayı>.jpg olarak durur, yolu profile_photos tablosunda. yalnız
// sahibi ve ONAYLI arkadaşları okur.
//
// telefonda bir kopyası da durur: ekran ağ beklemeden açılsın ve misafir de
// (hesabı olmayan) kendi fotoğrafını görebilsin diye. misafirin fotoğrafı
// yüklenmez; hesap açınca ilk fırsatta yüklenir.
//
// üç ekran (hesap, ayarlar, profil) aynı fotoğrafı gösterir; biri değiştirince
// ötekiler de yenilensin diye küçük bir ortak kayıt.
const LOCAL = 'account.photo'; // telefondaki dosyanın adresi
const PATH = 'account.photo.path'; // kovadaki yol; boşsa henüz yüklenmedi
const OWNER = 'account.photo.owner'; // fotoğraf kimin: çıkış yapıp başkası girerse silinir
const BUCKET = 'photos';
const WIDE = 1080;

const get = (key: string) => {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
};
const put = (key: string, value: string | null) => {
  try {
    if (value) Storage.setItemSync(key, value);
    else Storage.removeItemSync(key);
  } catch {}
};

export const photoUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// ekranda görünen adres: telefondaki dosya, o yoksa kovadaki
const shown = () => get(LOCAL) ?? (get(PATH) ? photoUrl(get(PATH) as string) : null);

// working: seçiliyor ya da küçültülüyor · sending: hesaba yükleniyor (ekran beklemez)
export type PhotoState = { photo: string | null; busy: 'idle' | 'working' | 'sending' };
let current: PhotoState = { photo: shown(), busy: 'idle' };
const listeners = new Set<() => void>();
const tell = (busy: PhotoState['busy'] = current.busy) => {
  current = { photo: shown(), busy };
  listeners.forEach((fn) => fn());
};

function dropFile(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {}
}

function setLocal(uri: string | null) {
  const old = get(LOCAL);
  put(LOCAL, uri);
  if (old && old !== uri) dropFile(old);
}

// hesabı olan (misafir olmayan) kullanıcının kimliği; yoksa null
async function account() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous ? user.id : null;
}

// telefondaki dosyayı kovaya yükler, yolu veritabanına yazar, eski dosyayı kaldırır
async function upload(uid: string, uri: string) {
  const path = `${uid}/${Date.now()}.jpg`;
  const bytes = await new File(uri).arrayBuffer();
  const sent = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (sent.error) throw sent.error;
  const { data: was, error } = await supabase.rpc('photo_set', { p_path: path });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw error;
  }
  put(PATH, path);
  put(OWNER, uid);
  if (typeof was === 'string' && was && was !== path) await supabase.storage.from(BUCKET).remove([was]).catch(() => {});
}

let startedAt = 0;

// ağ asılı kalırsa "gönderiliyor" yazısı da asılı kalmasın
const within = <T,>(ms: number, work: Promise<T>) =>
  Promise.race([work, new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

export async function choosePhoto() {
  // iki kez dokunmak iki seçici açmasın. ama seçici hiç dönmezse (android
  // uygulamayı arkada öldürüp yeniden açtıysa) düğme sonsuza dek kilitli kalmasın.
  if (current.busy === 'working' && Date.now() - startedAt < 45_000) return;
  startedAt = Date.now();
  let kept: File;
  tell('working');
  try {
    const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset?.uri) {
      tell('idle');
      return;
    }
    // telefonun çektiği 12 megapiksel kimseye lazım değil: 1080 genişlik, jpeg
    const work = ImageManipulator.manipulate(asset.uri);
    if ((asset.width ?? 0) > WIDE) work.resize({ width: WIDE });
    const made = await (await work.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    // her seçimde yeni ad: aynı adrese yazılan yeni resmi Image önbellekten eski haliyle gösterir
    kept = new File(Paths.document, `account-${Date.now()}.jpg`);
    new File(made.uri).copy(kept);
  } catch {
    tell('idle');
    Alert.alert(t('account.photo'), t('account.photo.failed'));
    return;
  }
  // kovadaki eski dosya: yenisi yüklenince photo_set eski yolu geri verir ve silinir
  setLocal(kept.uri);
  put(PATH, null);
  tell('idle');

  const uid = await account().catch(() => null);
  put(OWNER, uid);
  if (!uid) return; // misafir: telefonda kalır
  tell('sending');
  try {
    await within(40_000, upload(uid, kept.uri));
  } catch {
    Alert.alert(t('account.photo'), t('account.photo.offline'));
  }
  tell('idle');
}

// resim çizilemedi. HESAPTAKİ fotoğrafa asla dokunmaz: telefondaki kopya
// bozuksa onu bırakır ve hesaptakine döner; o da gelmiyorsa (ağ yok) bekler.
export function photoBroken(uri: string) {
  if (uri !== get(LOCAL)) return;
  setLocal(null);
  tell();
}

export async function removePhoto() {
  const path = get(PATH);
  setLocal(null);
  put(PATH, null);
  tell('idle');
  const uid = await account().catch(() => null);
  if (!uid) return;
  try {
    const { data: was } = await supabase.rpc('photo_set', { p_path: null });
    const gone = [path, typeof was === 'string' ? was : null].filter((p): p is string => Boolean(p));
    if (gone.length) await supabase.storage.from(BUCKET).remove([...new Set(gone)]);
  } catch {}
}

// telefon ile hesabı eşitler. giriş yapıldığında ve hesap ekranı açıldığında.
//   · telefondaki fotoğraf başkasınınsa (çıkış yapıp başka biri girdi) silinir
//   · hesapta fotoğraf var, telefonda yok ya da eskisi var → hesaptaki gösterilir
//   · telefonda var, hesapta yok → yüklenir (misafirken ya da güncellemeden önce seçilmiş)
let syncing = false;
export async function syncPhoto() {
  if (syncing) return;
  syncing = true;
  try {
    const uid = await account();
    const owner = get(OWNER);
    if (owner && owner !== uid) {
      // önceki hesabın fotoğrafı; yeni gelen onu görmemeli
      setLocal(null);
      put(PATH, null);
      put(OWNER, null);
      tell();
    }
    if (!uid) return;
    const { data, error } = await supabase.from('profile_photos').select('path').eq('user_id', uid).maybeSingle();
    if (error) return;
    const remote = (data?.path as string | undefined) ?? null;
    if (current.busy !== 'idle') return; // seçim sürerken araya girme
    if (remote) {
      if (remote !== get(PATH)) {
        setLocal(null); // başka telefonda değişmiş
        put(PATH, remote);
      }
      put(OWNER, uid);
      tell();
    } else if (get(LOCAL)) {
      put(PATH, null);
      await upload(uid, get(LOCAL) as string).catch(() => {});
      tell();
    } else if (get(PATH)) {
      put(PATH, null); // başka telefonda kaldırılmış
      tell();
    }
  } finally {
    syncing = false;
  }
}

// çıkışta: fotoğraf hesabın, telefonda bırakılmaz (kovadaki dosyaya dokunulmaz)
export function forgetPhoto() {
  setLocal(null);
  put(PATH, null);
  put(OWNER, null);
  tell();
}

export function usePhoto() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const photo = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
  useEffect(() => {
    syncPhoto().catch(() => {});
  }, [uid]);
  return { photo: photo.photo, busy: photo.busy, choose: choosePhoto, remove: removePhoto, broken: photoBroken };
}

// arkadaşların fotoğrafları: kimlik → adres. kural veritabanında; tablo zaten
// yalnız kendi satırını ve onaylı arkadaşlarınkini verir.
export async function friendPhotos(): Promise<Map<string, string>> {
  const rows = await remember('photos', '', async () => ((await must(supabase.from('profile_photos').select('user_id,path'))) ?? []) as { user_id: string; path: string }[]).catch(() => []);
  return new Map(rows.map((r) => [r.user_id, photoUrl(r.path)]));
}
