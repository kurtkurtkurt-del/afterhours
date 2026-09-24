import { supabase } from '@/lib/supabase';

// beforehours: geceden önce söylenenler. web ile aynı tablo (comments_public),
// aynı iki adım: önce konular, sonra onların cevapları. şimdilik salt okunur.
export type Comment = { id: string; who: string; when: string; body: string; replies: { who: string; when: string; body: string }[] };

type Row = { id: string; parent_id: string | null; author: string | null; body: string; created_at: string };

const whenText = (iso: string) => {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600e3);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const d = new Date(iso);
  return `${['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][d.getMonth()]} ${d.getFullYear()}`;
};

export async function fetchComments(eventId: string): Promise<Comment[]> {
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
    who: (t.author ?? 'someone').toLowerCase(),
    when: whenText(t.created_at),
    body: t.body,
    replies: reps.filter((r) => r.parent_id === t.id).map((r) => ({ who: (r.author ?? 'someone').toLowerCase(), when: whenText(r.created_at), body: r.body })),
  }));
}
