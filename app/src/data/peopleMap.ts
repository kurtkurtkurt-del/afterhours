import { supabase } from '@/lib/supabase';
import { remember } from '@/lib/offline';

// Your people as a map (101_people_map.sql): you ("me"), your friends by id with handle and
// name, the crowd around them as codes only, and who is a friend of whom between them.
// w: 0 you · 1 a friend · 2 a friend of a friend · 3 one step further.
// c / cn: the city the person set (103), the crowd too, still without a name
export type MapNode = { id: string; w: 0 | 1 | 2 | 3; h: string | null; n: string | null; c?: string | null; cn?: string | null };
export type MapData = { nodes: MapNode[]; edges: [string, string][] };

const empty: MapData = { nodes: [], edges: [] };
export const peopleMap = () =>
  remember('peopleMap', '', async () => {
    const { data, error } = await supabase.rpc('people_map');
    if (error) throw error;
    return (data as MapData | null) ?? empty;
  });
