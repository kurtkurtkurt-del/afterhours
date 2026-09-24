import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { friendsKept, friendsList, kept, type FriendKept, type FriendRow } from '@/data/friends';
import { friendsLive, type LiveFriend } from '@/data/checkin';

// yours ekranının verisi: arkadaşlar, canlı olanlar, keep'ledikleri geceler, eşleşmeler.
export type YoursNight = { id: string; slug: string; title: string; venue: string; when: string; image: string | null; friends: string[] };
export type YoursFriend = { id: string; name: string; handle: string | null; live?: string; kept: number; pending?: 'incoming' | 'outgoing' };
export type YoursMatch = { friend: string; night: string };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' }).toLowerCase() : 'tba');
const initial = (f: { display_name: string | null; handle: string | null }) => (f.display_name ?? f.handle ?? 's').toLowerCase();

export function useYours() {
  const { session } = useAuth();
  const [state, setState] = useState<{ friends: YoursFriend[]; nights: YoursNight[]; matches: YoursMatch[]; ready: boolean }>({ friends: [], nights: [], matches: [], ready: false });

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const [list, fk, live, mine] = await Promise.all([
        friendsList().catch(() => [] as FriendRow[]),
        friendsKept().catch(() => [] as FriendKept[]),
        friendsLive().catch(() => [] as LiveFriend[]),
        kept().catch(() => []),
      ]);
      if (cancelled) return;
      const liveBy = new Map(live.map((l) => [l.friend_id, l.venue_name ?? l.title.toLowerCase()]));
      const keptCount = new Map<string, number>();
      fk.forEach((k) => keptCount.set(k.friend, (keptCount.get(k.friend) ?? 0) + 1));
      const friends: YoursFriend[] = list.map((f) => ({
        id: f.other_id,
        name: initial(f),
        handle: f.handle,
        live: liveBy.get(f.other_id),
        kept: keptCount.get(f.display_name ?? f.handle ?? '') ?? 0,
        pending: f.status === 'pending' ? f.direction : undefined,
      }));
      // gece başına grupla
      const byNight = new Map<string, YoursNight>();
      fk.forEach((k) => {
        const n = byNight.get(k.id) ?? { id: k.id, slug: k.slug, title: k.title.toLowerCase(), venue: k.venue_name ?? k.city_slug, when: day(k.starts_at), image: k.image_url, friends: [] };
        if (!n.friends.includes(k.friend)) n.friends.push(k.friend);
        byNight.set(k.id, n);
      });
      const nights = [...byNight.values()];
      const mineIds = new Set(mine.map((m) => m.id));
      const matches: YoursMatch[] = fk.filter((k) => mineIds.has(k.id)).map((k) => ({ friend: k.friend, night: k.id }));
      setState({ friends, nights, matches, ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // oturum yoksa bekleyecek bir şey yok
  return session ? state : { friends: [], nights: [], matches: [], ready: true };
}
