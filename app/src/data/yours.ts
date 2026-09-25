import { useEffect, useState } from 'react';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useAuth } from '@/auth/AuthContext';
import { friendsKept, friendsList, kept, type FriendKept, type FriendRow } from '@/data/friends';
import type { Night } from '@/data/deck';
import { friendsLive, type LiveFriend } from '@/data/checkin';
import { dayLabel } from '@/data/when';

// yours ekranının verisi: arkadaşlar, canlı olanlar, keep'ledikleri geceler, eşleşmeler.
export type YoursNight = { id: string; slug: string; title: string; venue: string; when: string; image: string | null; friends: string[] };
export type YoursFriend = { id: string; name: string; handle: string | null; live?: string; kept: number; pending?: 'incoming' | 'outgoing' };
export type YoursMatch = { friend: string; night: string };

const day = (iso: string | null) => dayLabel(iso);
// friends_kept 'friend' sütunu handle'ı önce alır; her yerde aynı anahtar
const nameOf = (f: { display_name: string | null; handle: string | null }) => (f.handle ?? f.display_name ?? 'a friend').toLowerCase();

export function useYours() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const tick = useRefreshOnFocus();
  // mine: sağa kaydırdıklarım (your deck) · swipes: arkadaşların sağa kaydırdıkları, tek tek (friends' deck)
  const [state, setState] = useState<{ friends: YoursFriend[]; nights: YoursNight[]; matches: YoursMatch[]; mine: Night[]; swipes: FriendKept[]; ready: boolean }>({ friends: [], nights: [], matches: [], mine: [], swipes: [], ready: false });

  useEffect(() => {
    if (!uid) return;
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
      fk.forEach((k) => keptCount.set(k.friend.toLowerCase(), (keptCount.get(k.friend.toLowerCase()) ?? 0) + 1));
      const friends: YoursFriend[] = list.map((f) => ({
        id: f.other_id,
        name: nameOf(f),
        handle: f.handle,
        live: liveBy.get(f.other_id),
        kept: keptCount.get(nameOf(f)) ?? 0,
        pending: f.status === 'pending' ? f.direction : undefined,
      }));
      // gece başına grupla
      const byNight = new Map<string, YoursNight>();
      fk.forEach((k) => {
        const n = byNight.get(k.id) ?? { id: k.id, slug: k.slug, title: k.title.toLowerCase(), venue: k.venue_name ?? k.city_slug, when: day(k.starts_at), image: k.image_url, friends: [] };
        if (!n.friends.includes(k.friend.toLowerCase())) n.friends.push(k.friend.toLowerCase());
        byNight.set(k.id, n);
      });
      const nights = [...byNight.values()];
      const mineIds = new Set(mine.map((m) => m.id));
      const matches: YoursMatch[] = fk.filter((k) => mineIds.has(k.id)).map((k) => ({ friend: k.friend.toLowerCase(), night: k.id }));
      setState({ friends, nights, matches, mine: mine as Night[], swipes: fk, ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, tick]);

  // oturum yoksa bekleyecek bir şey yok
  return session ? state : { friends: [], nights: [], matches: [], mine: [], swipes: [], ready: true };
}
