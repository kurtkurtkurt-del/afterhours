import { supabase } from '@/lib/supabase';
import { remember } from '@/lib/offline';
import { djs as localDjs, sets as localSets, type Dj, type DjSet } from '@/content/djs';

// 20_djs.sql: djs, dj_sets, dj_follows. Local samples when the table is empty or offline.
const photos: Record<string, number> = Object.fromEntries(localDjs.map((d) => [d.id, d.photo]));
const fallbackPhoto = localDjs[0].photo;

export async function loadDjs(): Promise<{ djs: Dj[]; sets: DjSet[]; live: boolean }> {
  // Raw rows are cached (photo numbers change between releases and are mapped every time).
  const raw = await remember('djs', '', async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('djs').select('id,slug,name,genre,sound,since,photo_url,cities(name)').order('sort_order'),
      supabase.from('dj_sets').select('venue,starts_at,hours,djs(slug)').gte('starts_at', new Date(Date.now() - 12 * 3600_000).toISOString()).order('starts_at'),
      supabase.rpc('dj_follow_counts'),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    return { a: a.data ?? [], b: b.data ?? [], c: (c.data ?? []) as { dj_id: string; n: number }[] };
  }).catch(() => null);
  if (!raw || !raw.a.length) return { djs: localDjs, sets: localSets(), live: false };
  const a = { data: raw.a };
  const b = { data: raw.b };
  const counts = new Map<string, number>(raw.c.map((r) => [r.dj_id, Number(r.n)]));
  const djs: Dj[] = a.data.map((r) => ({
    id: r.slug as string,
    name: r.name as string,
    genre: r.genre as string,
    sound: r.sound as Dj['sound'],
    city: ((r as { cities?: { name?: string } | null }).cities?.name ?? '').toLowerCase(),
    since: (r.since as number) ?? 0,
    followers: fmt(counts.get(r.id as string) ?? 0),
    photo: photos[r.slug as string] ?? fallbackPhoto,
    photoUrl: (r.photo_url as string | null) ?? null,
  }));
  const sets: DjSet[] = b.data.map((r) => ({
    dj: (r as { djs?: { slug?: string } | null }).djs?.slug ?? '',
    venue: r.venue as string,
    startsAt: new Date(r.starts_at as string),
    hours: Number(r.hours),
  }));
  return { djs, sets, live: true };
}
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

export async function isFollowing(slug: string): Promise<boolean> {
  const { data } = await supabase.from('dj_follows').select('dj_id, djs!inner(slug)').eq('djs.slug', slug).maybeSingle();
  return !!data;
}
export async function setFollow(slug: string, on: boolean) {
  const { data: dj } = await supabase.from('djs').select('id').eq('slug', slug).maybeSingle();
  if (!dj) return;
  if (on) await supabase.from('dj_follows').insert({ dj_id: dj.id });
  else await supabase.from('dj_follows').delete().eq('dj_id', dj.id);
}

// Slugs of the DJs you follow; empty without a session or offline.
export async function followedSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('dj_follows').select('djs!inner(slug)');
  if (error || !data) return [];
  return (data as unknown as { djs: { slug: string } | { slug: string }[] }[]).flatMap((r) => (Array.isArray(r.djs) ? r.djs : [r.djs]).map((d) => d.slug));
}
