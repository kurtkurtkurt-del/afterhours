import { launchImageLibraryAsync } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

// 45_posts.sql: a photo and a few words for your friends.

export type Post = {
  id: string;
  author_id: string;
  handle: string | null;
  name: string | null;
  body: string;
  photo_path: string | null;
  event_slug: string | null;
  event_title: string | null;
  created_at: string;
  mine: boolean;
};
export type Reported = { id: string; body: string; photo_path: string | null; author: string | null; reports: number; reasons: string[]; is_hidden: boolean; created_at: string };

const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const postPhotoUrl = (path: string | null) => (path ? supabase.storage.from('photos').getPublicUrl(path).data.publicUrl : null);
export const postsFeed = (before: string | null) => rpc<Post[]>('posts_feed', { p_before: before, p_limit: 20 });
export const postReport = (id: string, reason: string | null) => rpc<void>('post_report', { p_id: id, p_reason: reason });
export async function postDelete(id: string) {
  const path = await rpc<string | null>('post_delete', { p_id: id });
  if (path) await supabase.storage.from('photos').remove([path]).catch(() => {});
}
export const reportedPosts = () => rpc<Reported[]>('staff_posts_reported');
export const hidePost = (id: string, hidden: boolean) => rpc<void>('staff_post_hide', { p_id: id, p_hidden: hidden });

// The photo stays on the phone until "share": pick and shrink here, upload in postCreate.
export async function pickPostPhoto(): Promise<string | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = picked.canceled ? null : picked.assets?.[0];
  if (!asset) return null;
  const work = ImageManipulator.manipulate(asset.uri);
  if ((asset.width ?? 0) > 1440) work.resize({ width: 1440 });
  const made = await (await work.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  return made.uri;
}

export async function postCreate(uid: string, body: string, localPhoto: string | null, eventId: string | null): Promise<string> {
  let path: string | null = null;
  if (localPhoto) {
    path = `${uid}/post-${Date.now()}.jpg`;
    const sent = await supabase.storage.from('photos').upload(path, await new File(localPhoto).arrayBuffer(), { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (sent.error) throw sent.error;
  }
  try {
    return await rpc<string>('post_create', { p_body: body, p_photo: path, p_event: eventId });
  } catch (e) {
    if (path) await supabase.storage.from('photos').remove([path]).catch(() => {});
    throw e;
  }
}
