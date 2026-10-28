import { supabase } from '@/lib/supabase';
import { remember } from '@/lib/offline';

// Where your people are (102_people_places.sql), for the friends view on the map: your
// friends in the city they set, the waves beyond them only as a count per city.
export type PlaceFriend = { id: string; h: string | null; n: string | null; city: string; name: string; lat: number; lng: number };
export type PlaceCrowd = { w: 2 | 3; city: string; name: string; lat: number; lng: number; n: number };
export type Places = { friends: PlaceFriend[]; crowd: PlaceCrowd[] };

export const peoplePlaces = () =>
  remember('peoplePlaces', '', async () => {
    const { data, error } = await supabase.rpc('people_places');
    if (error) throw error;
    return (data as Places | null) ?? { friends: [], crowd: [] };
  }, 1, { ttl: 60_000 });
