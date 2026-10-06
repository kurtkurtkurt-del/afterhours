import { supabase } from '@/lib/supabase';
import { OfflineError, outbox, peek, pendingJobs, remember, send } from '@/lib/offline';
import { t as tNow, tx as txNow } from '@/i18n/core';
import type { Key } from '@/i18n/dict';

// Beforehours: what people say before a night. Same table as the web (comments_public),
// same two steps: topics first, then their replies. Anyone can post, guests included
// (author_id comes from the session; without a name it shows "someone").
// Empty who means no name ("someone"); at is the raw date. Both become strings at render time.
export type Comment = { id: string; who: string; at: string; body: string; replies: { who: string; at: string; body: string; waiting?: boolean }[]; waiting?: boolean };

// Server error text → string key.
export const commentErrors: Record<string, Key> = {
  signin: 'comments.error.signin',
  'sign in first': 'comments.error.signin',
  empty: 'comments.error.empty',
  'two levels only': 'comments.error.deep',
  offline: 'offline.write',
};
export const commentCode = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  return Object.keys(commentErrors).find((k) => m.includes(k)) ?? null;
};

type Row = { id: string; parent_id: string | null; author: string | null; body: string; created_at: string };

// Components pass t and tx from useLang(); otherwise the current language is used.
export const whenText = (iso: string, t: typeof tNow = tNow, tx: typeof txNow = txNow) => {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600e3);
  if (hours < 1) return t('comments.now');
  if (hours < 24) return t('comments.hours', { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('comments.yesterday');
  if (days < 30) return t('comments.days', { n: days });
  const d = new Date(iso);
  return `${tx('comments.month.' + d.getMonth())} ${d.getFullYear()}`;
};

export async function fetchComments(eventId: string): Promise<Comment[]> {
  const waiting = pendingJobs('comment').filter((j) => j.eventId === eventId);
  let list: Comment[] = [];
  try {
    list = await remember('comments', eventId, () => loadComments(eventId), 40);
  } catch (e) {
    if (!(e instanceof OfflineError && waiting.length)) throw e;
  }
  if (!waiting.length) return list;
  // Written offline: topics on top, replies under their topic, both marked waiting.
  const me = peek<{ handle: string | null; display_name: string | null }>('profile', '');
  const who = (me?.handle ?? me?.display_name ?? '').toLowerCase();
  const out = list.map((c) => ({ ...c, replies: [...c.replies] }));
  waiting.forEach((j) => {
    const at = new Date(j.at).toISOString();
    const body = j.body as string;
    if (!j.parentId) out.unshift({ id: j.id, who, at, body, replies: [], waiting: true });
    else out.find((c) => c.id === j.parentId)?.replies.push({ who, at, body, waiting: true });
  });
  return out;
}

async function loadComments(eventId: string): Promise<Comment[]> {
  const { data: topics, error } = await supabase
    .from('comments_public')
    .select('id,parent_id,author,body,created_at')
    .eq('event_id', eventId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const tops = (topics ?? []) as Row[];
  if (!tops.length) return [];
  const { data: replies } = await supabase
    .from('comments_public')
    .select('id,parent_id,author,body,created_at')
    .in('parent_id', tops.map((t) => t.id))
    .order('created_at', { ascending: true })
    .limit(200);
  const reps = (replies ?? []) as Row[];
  return tops.map((t) => ({
    id: t.id,
    who: (t.author ?? '').toLowerCase(),
    at: t.created_at,
    body: t.body,
    replies: reps.filter((r) => r.parent_id === t.id).map((r) => ({ who: (r.author ?? '').toLowerCase(), at: r.created_at, body: r.body })),
  }));
}

// A topic (no parentId) or a reply. The database fills author_id from the session;
// RLS accepts guest sessions too (role authenticated).
// Offline it waits in the outbox and shows at once (fetchComments). The job's id goes
// in client_id, so a retry after a lost answer is not stored twice (37_offline.sql).
outbox(
  'comment',
  async (j) => {
    const row: { event_id: string; body: string; parent_id?: string; client_id?: string } = { event_id: j.eventId as string, body: j.body as string, client_id: j.id };
    if (j.parentId) row.parent_id = j.parentId as string;
    let r = await supabase.from('comments').upsert(row, { onConflict: 'author_id,client_id', ignoreDuplicates: true });
    // Before 37_offline.sql there is no client_id column (or index): plain insert.
    if (r.error && (r.error.code === 'PGRST204' || r.error.code === '42P10' || r.error.code === '42703' || /client_id/.test(r.error.message))) {
      delete row.client_id;
      r = await supabase.from('comments').insert(row);
    }
    if (r.error) throw r.error;
  },
  ['comments'],
);

export async function postComment(eventId: string, body: string, parentId?: string) {
  const text = body.trim();
  if (!text) throw new Error('empty');
  await send({ kind: 'comment', eventId, body: text, parentId });
}
