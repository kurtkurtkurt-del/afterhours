import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from '@/lib/supabase';

// Keep the app working without a connection.
//
// Reads: every successful response is stored on the phone (kv-store, per user).
//   Offline or on failure the last stored copy is shown. A screen with nothing
//   stored says "offline" instead of staying blank.
// Writes: idempotent operations (swipe, undo, settings switch) are queued and sent
//   in order on reconnect. Check-ins, comments and room posts are not queued (sending
//   them twice would be wrong); they report "offline".

// ------------------------------------------------------------- connectivity

type Net = { online: boolean; pending: number; sending: boolean };
let net: Net = { online: true, pending: 0, sending: false };
const listeners = new Set<() => void>();
const tell = (next: Partial<Net>) => {
  const was = net.online;
  net = { ...net, ...next };
  listeners.forEach((fn) => fn());
  if (!was && net.online) {
    flush().catch(() => {});
    back.forEach((fn) => fn());
  }
};
const back = new Set<() => void>();

// Called when the connection returns (so screens can refresh).
export function onBackOnline(fn: () => void) {
  back.add(fn);
  return () => {
    back.delete(fn);
  };
}

export const isOnline = () => net.online;

export function useNet() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => net,
  );
}

let started = false;
export function startOffline() {
  if (started) return;
  started = true;
  NetInfo.addEventListener((s) => {
    // isInternetReachable null = unknown yet; treat as connected.
    tell({ online: !!s.isConnected && s.isInternetReachable !== false });
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') flush().catch(() => {});
  });
  tell({ pending: queue().length });
  flush().catch(() => {});
}

// A network failure (as opposed to the server saying no).
export function isNetworkError(e: unknown) {
  if ((e as { name?: string })?.name === 'AuthRetryableFetchError') return true;
  const m = String((e as { message?: string })?.message ?? e);
  return /network request failed|failed to fetch|network|timeout|timed out|aborted|offline/i.test(m);
}

export class OfflineError extends Error {
  constructor() {
    super('offline');
  }
}

// ------------------------------------------------------------ reads

const get = (key: string) => {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
};
const put = (key: string, value: string | null) => {
  try {
    if (value === null) Storage.removeItemSync(key);
    else Storage.setItemSync(key, value);
  } catch {}
};


// Owner of the shelves. getSession() is not used: offline it cannot refresh an expired
// token, returns an empty session, and the user's cache would suddenly vanish.
// The id is written here on every auth change and persisted on the phone.
const OWNER = 'cache.owner';
let owner: string | null = null;
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    owner = session.user.id;
    put(OWNER, owner);
  } else if (event === 'SIGNED_OUT') {
    owner = null;
    put(OWNER, null);
  }
});
async function who() {
  return owner ?? get(OWNER) ?? 'out';
}

type Shelf = Record<string, { t: number; v: unknown }>;

// group: a shelf (deck, comments …), key: slot on the shelf, max: shelf capacity.
export async function cachedRead<T>(group: string, key: string, work: () => Promise<T>, max = 1): Promise<{ value: T; stale: boolean }> {
  const shelfKey = `cache.${await who()}.${group}`;
  const shelf = (): Shelf => {
    try {
      return JSON.parse(get(shelfKey) ?? '{}') as Shelf;
    } catch {
      return {};
    }
  };
  const saved = () => shelf()[key];

  if (!net.online) {
    const s = saved();
    if (s) return { value: s.v as T, stale: true };
    throw new OfflineError();
  }
  try {
    const value = await work();
    const next = shelf();
    next[key] = { t: Date.now(), v: value };
    // A full shelf drops its oldest entry.
    const keys = Object.keys(next).sort((a, b) => next[b].t - next[a].t);
    keys.slice(max).forEach((k) => delete next[k]);
    put(shelfKey, JSON.stringify(next));
    if (!net.online) tell({ online: true });
    return { value, stale: false };
  } catch (e) {
    const s = saved();
    if (isNetworkError(e)) {
      tell({ online: false });
      if (s) return { value: s.v as T, stale: true };
      throw new OfflineError();
    }
    throw e;
  }
}

// Put something on a shelf directly (nights from the deck, so night pages open offline).
export async function shelve(group: string, entries: [string, unknown][], max: number) {
  if (!entries.length) return;
  const shelfKey = `cache.${await who()}.${group}`;
  let next: Shelf = {};
  try {
    next = JSON.parse(get(shelfKey) ?? '{}') as Shelf;
  } catch {}
  const now = Date.now();
  entries.forEach(([k, v]) => (next[k] = { t: now, v }));
  const keys = Object.keys(next).sort((a, b) => next[b].t - next[a].t);
  keys.slice(max).forEach((k) => delete next[k]);
  put(shelfKey, JSON.stringify(next));
}

// Swiped on this phone: keep them out while an older saved deck is shown.
export async function markSwiped(slug: string, on = true) {
  const key = `cache.${await who()}.swiped`;
  let list: string[] = [];
  try {
    list = JSON.parse(get(key) ?? '[]');
  } catch {}
  list = list.filter((s) => s !== slug);
  if (on) list.push(slug);
  put(key, JSON.stringify(list.slice(-1500)));
}
export async function swipedHere(): Promise<Set<string>> {
  try {
    return new Set(JSON.parse(get(`cache.${await who()}.swiped`) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export async function remember<T>(group: string, key: string, work: () => Promise<T>, max = 1): Promise<T> {
  return (await cachedRead(group, key, work, max)).value;
}

// Turns Supabase's {data, error} response into one that throws.
export async function must<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// ------------------------------------------------------------- writes

type Op =
  | { kind: 'swipe'; slug: string; direction: 'left' | 'right' }
  | { kind: 'unswipe'; eventId: string }
  | { kind: 'settings'; userId: string; patch: Record<string, unknown> };

const QUEUE = 'outbox';
function queue(): (Op & { uid: string })[] {
  try {
    return JSON.parse(get(QUEUE) ?? '[]');
  } catch {
    return [];
  }
}
function save(list: (Op & { uid: string })[]) {
  put(QUEUE, list.length ? JSON.stringify(list) : null);
  tell({ pending: list.length });
}

async function run(op: Op) {
  if (op.kind === 'swipe') {
    const { error } = await supabase.rpc('swipe_set', { p_slug: op.slug, p_direction: op.direction });
    if (error) throw error;
  } else if (op.kind === 'unswipe') {
    const { error } = await supabase.from('swipes').delete().eq('event_id', op.eventId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('profile_settings').update(op.patch).eq('user_id', op.userId);
    if (error) throw error;
  }
}

// Try now; queue when offline. A server refusal is returned as an error.
export async function send(op: Op) {
  const uid = await who();
  // With a non-empty queue, append so order is preserved (swipe → undo).
  if (net.online && queue().length === 0) {
    try {
      await run(op);
      return;
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      tell({ online: false });
    }
  }
  save([...queue(), { ...op, uid }]);
}

let flushing: Promise<void> | null = null;
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const uid = await who();
    let list = queue();
    // Nothing to send: done. (This used to return before the finally below and
    // left `flushing` set for good, so after one empty flush nothing ever went out.)
    if (!list.length || !net.online) {
      flushing = null;
      return;
    }
    tell({ sending: true });
    try {
      while (list.length) {
        const op = list[0];
        // Never send another account's work with this account; drop it.
        if (op.uid === uid) {
          try {
            await run(op);
          } catch (e) {
            if (isNetworkError(e)) {
              tell({ online: false });
              return;
            }
            // Refused by the server (e.g. the night was deleted): drop it and continue.
          }
        }
        list = list.slice(1);
        save(list);
      }
    } finally {
      tell({ sending: false });
      flushing = null;
    }
  })();
  return flushing;
}

// On sign-out: remove that account's read shelves (in case someone else uses the phone).
export function forgetCache(uid: string) {
  try {
    Storage.getAllKeysSync()
      .filter((k) => k.startsWith(`cache.${uid}.`))
      .forEach((k) => Storage.removeItemSync(k));
  } catch {}
}
