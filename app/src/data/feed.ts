import { supabase } from '@/lib/supabase';

// 31_past_feed.sql: past nights with a photo, newest first, a page at a time.
// people: who of yours was there (checked in or kept it); mine: you were.
export type PastNight = {
  id: string;
  slug: string;
  title: string;
  image_url: string;
  venue_name: string | null;
  city_name: string;
  type_slug: string;
  type_name: string;
  starts_at: string;
  people: string[];
  mine: boolean;
};

// after: the last card already shown (null for the first page).
export async function pastFeed(city: string | null, after: PastNight | null, limit = 10): Promise<PastNight[]> {
  const { data, error } = await supabase.rpc('past_feed', {
    p_city: city,
    p_before: after?.starts_at ?? null,
    p_before_id: after?.id ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as PastNight[];
}
