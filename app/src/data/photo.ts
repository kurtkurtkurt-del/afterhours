import { useEffect, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from '@/lib/supabase';
import { must, remember } from '@/lib/offline';
import { useAuth } from '@/auth/AuthContext';
import { t } from '@/i18n/core';

// Profile photo (24_photos.sql), tied to the account: the file lives in the "photos" bucket
// as <user>/<number>.jpg and its path in profile_photos. Only the owner and CONFIRMED
// friends can read it.
//
// A copy is also kept on the phone so screens open without waiting for the network and
// guests (no account) can see their own photo. A guest's photo is not uploaded; it goes
// up at the first chance once there is an account.
//
// Three screens (account, settings, profile) show the same photo; a small shared store
// keeps them in sync when one changes it.
const LOCAL = 'account.photo'; // local file URI
const PATH = 'account.photo.path'; // bucket path; empty until uploaded
const OWNER = 'account.photo.owner'; // whose photo it is: removed when someone else signs in
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

const photoUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// The displayed URL: the local file, else the bucket's.
const shown = () => get(LOCAL) ?? (get(PATH) ? photoUrl(get(PATH) as string) : null);

// working: picking or resizing · sending: uploading to the account (screens do not wait)
type PhotoState = { photo: string | null; busy: 'idle' | 'working' | 'sending' };
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

// The id of a user with an account (not a guest); otherwise null.
async function account() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous ? user.id : null;
}

// Uploads the local file, writes the path to the database, removes the old file.
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

// If the network hangs, do not leave "sending" hanging too.
const within = <T,>(ms: number, work: Promise<T>) =>
  Promise.race([work, new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

async function choosePhoto() {
  // Two taps must not open two pickers, but if the picker never returns (Android
  // killed and restarted the app in the background) the button must not stay locked.
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
    // Nobody needs the camera's 12 megapixels: 1080 wide, JPEG.
    const work = ImageManipulator.manipulate(asset.uri);
    if ((asset.width ?? 0) > WIDE) work.resize({ width: WIDE });
    const made = await (await work.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    // A new name on every pick: Image would show a cached old image for the same URL.
    kept = new File(Paths.document, `account-${Date.now()}.jpg`);
    new File(made.uri).copy(kept);
  } catch {
    tell('idle');
    Alert.alert(t('account.photo'), t('account.photo.failed'));
    return;
  }
  // The old bucket file: photo_set returns the old path after the new upload, then it is removed.
  setLocal(kept.uri);
  put(PATH, null);
  tell('idle');

  const uid = await account().catch(() => null);
  put(OWNER, uid);
  if (!uid) return; // guest: stays on the phone
  tell('sending');
  try {
    await within(40_000, upload(uid, kept.uri));
  } catch {
    Alert.alert(t('account.photo'), t('account.photo.offline'));
  }
  tell('idle');
}

// The image failed to render. NEVER touches the account photo: a broken local copy is
// dropped in favour of the account's; if that does not load either (offline) it waits.
function photoBroken(uri: string) {
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

// Reconciles phone and account, on sign-in and when the account screen opens.
//   · the local photo belongs to someone else (signed out, another user signed in) → removed
//   · the account has a photo and the phone has none or an older one → the account's is shown
//   · the phone has one and the account does not → uploaded (picked as a guest or before this feature)
let syncing = false;
async function syncPhoto() {
  if (syncing) return;
  syncing = true;
  try {
    const uid = await account();
    const owner = get(OWNER);
    if (owner && owner !== uid) {
      // The previous account's photo must not be shown to the new user.
      setLocal(null);
      put(PATH, null);
      put(OWNER, null);
      tell();
    }
    if (!uid) return;
    const { data, error } = await supabase.from('profile_photos').select('path').eq('user_id', uid).maybeSingle();
    if (error) return;
    const remote = (data?.path as string | undefined) ?? null;
    if (current.busy !== 'idle') return; // do not interfere while a pick is in progress
    if (remote) {
      if (remote !== get(PATH)) {
        setLocal(null); // changed on another phone
        put(PATH, remote);
      }
      put(OWNER, uid);
      tell();
    } else if (get(LOCAL)) {
      put(PATH, null);
      await upload(uid, get(LOCAL) as string).catch(() => {});
      tell();
    } else if (get(PATH)) {
      put(PATH, null); // removed on another phone
      tell();
    }
  } finally {
    syncing = false;
  }
}

// On sign-out: the photo belongs to the account and is not left on the phone (the bucket file stays).
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

// Friends' photos: id → URL. The database enforces access; the table only returns
// your own row and those of confirmed friends.
export async function friendPhotos(): Promise<Map<string, string>> {
  const rows = await remember('photos', '', async () => ((await must(supabase.from('profile_photos').select('user_id,path'))) ?? []) as { user_id: string; path: string }[]).catch(() => []);
  return new Map(rows.map((r) => [r.user_id, photoUrl(r.path)]));
}
