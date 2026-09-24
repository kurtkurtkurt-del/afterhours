import { supabase } from '@/lib/supabase';
import { djs as localDjs, sets as localSets, type Dj, type DjSet } from '@/content/djs';

// 20_djs.sql: djs, dj_sets, dj_follows. tablo boşsa ya da ağ yoksa yerel örnekler.
const photos: Record<string, number> = Object.fromEntries(localDjs.map((d) => [d.id, d.photo]));
const fallbackPhoto = localDjs[0].photo;

export async function loadDjs(): Promise<{ djs: Dj[]; sets: DjSet[]; live: boolean }> {
  const [a, b] = await Promise.all([
    supabase.from('djs').select('slug,name,genre,sound,since,followers,photo_url,cities(name)').order('sort_order'),
    supabase.from('dj_sets').select('venue,starts_at,hours,djs(slug)').gte('starts_at', new Date(Date.now() - 12 * 3600_000).toISOString()).order('starts_at'),
  ]);
  if (a.error || b.error || !a.data?.length) return { djs: localDjs, sets: localSets(), live: false };
  const djs: Dj[] = a.data.map((r) => ({
    id: r.slug as string,
    name: r.name as string,
    genre: r.genre as string,
    sound: r.sound as Dj['sound'],
    city: ((r as { cities?: { name?: string } | null }).cities?.name ?? '').toLowerCase(),
    since: (r.since as number) ?? 0,
    followers: fmt(r.followers as number),
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
