import { useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { t } from '@/i18n';

// profil fotoğrafı. BU TELEFONDA durur: seçilen dosya uygulamanın kendi klasörüne
// kopyalanır, adresi kv-store'da saklanır. veritabanında karşılığı yok.
// üç ekran (hesap, ayarlar, profil) aynı fotoğrafı gösterir; biri değiştirince
// ötekiler de yenilensin diye küçük bir ortak kayıt.
const KEY = 'account.photo';

let current: string | null = read();
const listeners = new Set<() => void>();

function read() {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
}

function set(uri: string | null) {
  const old = current;
  current = uri;
  try {
    if (uri) Storage.setItemSync(KEY, uri);
    else Storage.removeItemSync(KEY);
  } catch {}
  if (old && old !== uri) {
    try {
      const file = new File(old);
      if (file.exists) file.delete();
    } catch {}
  }
  listeners.forEach((fn) => fn());
}

export async function choosePhoto() {
  try {
    const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const from = picked.canceled ? null : picked.assets[0]?.uri;
    if (!from) return;
    // her seçimde yeni ad: aynı adrese yazılan yeni resmi Image önbellekten eski haliyle gösterir
    const kept = new File(Paths.document, `account-${Date.now()}.jpg`);
    new File(from).copy(kept);
    set(kept.uri);
  } catch {
    Alert.alert(t('account.photo'), t('account.photo.failed'));
  }
}

export const removePhoto = () => set(null);

export function usePhoto() {
  const photo = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
  return { photo, choose: choosePhoto, remove: removePhoto };
}
