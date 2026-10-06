import { useEffect, useState } from 'react';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useAuth } from '@/auth/AuthContext';
import { friendsKept, friendsList, kept, type FriendKept, type FriendRow } from '@/data/friends';
import type { Night } from '@/data/deck';
import { friendsLive, type LiveFriend } from '@/data/checkin';
import { friendPhotos } from '@/data/photo';
import { dayLabel } from '@/data/when';

// Data for the yours screen: friends, who is live, the nights they kept, matches.
export type YoursNight = { id: string; slug: string; title: string; venue: string; when: string; startsAt?: string | null; image: string | null; friends: string[] };
export type YoursFriend = { id: string; name: string; handle: string | null; photo?: string; live?: string; kept: number; pending?: 'incoming' | 'outgoing' };
export type YoursMatch = { friend: string; night: string };

const day = (iso: string | null) => dayLabel(iso);
// friends_kept's 'friend' column prefers the handle; the same key is used everywhere.
const nameOf = (f: { display_name: string | null; handle: string | null }) => (f.handle ?? f.display_name ?? 'a friend').toLowerCase();

// Adding a friend reloads yours so the pending square appears immediately.
let bump = 0;
const bumps = new Set<() => void>();
export function refreshYours() {
  bump += 1;
  bumps.forEach((fn) => fn());
}
function useBump() {
  const [n, setN] = useState(bump);
  useEffect(() => {
    const fn = () => setN(bump);
    bumps.add(fn);
    return () => {
      bumps.delete(fn);
    };
  }, []);
  return n;
}

type YoursState = { friends: YoursFriend[]; nights: YoursNight[]; matches: YoursMatch[]; mine: Night[]; swipes: FriendKept[]; ready: boolean };
const EMPTY: YoursState = { friends: [], nights: [], matches: [], mine: [], swipes: [], ready: false };
let last: { uid: string; state: YoursState } | null = null;

export function useYours() {
  const again = useBump();
  const { session } = useAuth();
  const uid = session?.user.id;
  const tick = useRefreshOnFocus('friends', 'friendsKept', 'live', 'kept', 'photos');
  // mine: nights you kept (your deck) · swipes: friends' right swipes, one by one (friends' deck)
  // The last result for this account, kept in memory: coming back to yours shows it at
  // once (no empty page while the five reads run again behind it).
  const [state, setState] = useState<YoursState>(() => (last && last.uid === uid ? last.state : EMPTY));

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const [list, fk, live, mine, photos] = await Promise.all([
        friendsList().catch(() => [] as FriendRow[]),
        friendsKept().catch(() => [] as FriendKept[]),
        friendsLive().catch(() => [] as LiveFriend[]),
        kept().catch(() => []),
        friendPhotos().catch(() => new Map<string, string>()),
      ]);
      if (cancelled) return;
      const liveBy = new Map(live.map((l) => [l.friend_id, l.venue_name ?? l.title.toLowerCase()]));
      const keptCount = new Map<string, number>();
      fk.forEach((k) => keptCount.set(k.friend.toLowerCase(), (keptCount.get(k.friend.toLowerCase()) ?? 0) + 1));
      const friends: YoursFriend[] = list.map((f) => ({
        id: f.other_id,
        name: nameOf(f),
        handle: f.handle,
        photo: photos.get(f.other_id),
        live: liveBy.get(f.other_id),
        kept: keptCount.get(nameOf(f)) ?? 0,
        pending: f.status === 'pending' ? f.direction : undefined,
      }));
      // Group by night.
      const byNight = new Map<string, YoursNight>();
      fk.forEach((k) => {
        const n = byNight.get(k.id) ?? { id: k.id, slug: k.slug, title: k.title.toLowerCase(), venue: k.venue_name ?? k.city_slug, when: day(k.starts_at), startsAt: k.starts_at, image: k.image_url, friends: [] };
        if (!n.friends.includes(k.friend.toLowerCase())) n.friends.push(k.friend.toLowerCase());
        byNight.set(k.id, n);
      });
      const nights = [...byNight.values()];
      const mineIds = new Set(mine.map((m) => m.id));
      const matches: YoursMatch[] = fk.filter((k) => mineIds.has(k.id)).map((k) => ({ friend: k.friend.toLowerCase(), night: k.id }));
      const next: YoursState = { friends, nights, matches, mine: mine as Night[], swipes: fk, ready: true };
      if (uid) last = { uid, state: next };
      setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, tick, again]);

  // Without a session there is nothing to wait for.
  return session ? state : { friends: [], nights: [], matches: [], mine: [], swipes: [], ready: true };
}
