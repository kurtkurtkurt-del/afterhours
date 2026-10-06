import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';
import { fetchNear } from '@/data/near';
import { detectCity } from '@/data/geo';
import type { City } from '@/content/cities';

// The city you are in. The whole app reads it from here (deck, map, sign-up).
//
// The location is checked on launch and when returning after a long pause; the
// detected city becomes the selected one. A city picked by hand stays selected
// until you actually move to another city (the detected city changes).
//
// The city comes from nearby nights, not its NAME: an English phone says "Munich"
// while the list says "münchen". You are wherever most of the nearest nights are;
// without nights it falls back to matching the name.
const CITY = 'city';
const NAME = 'city.name';
const SEEN = 'city.here'; // city last detected from the location
const AGAIN = 30 * 60_000; // check the location again after this long in the background

type Here = {
  city: string | null; // selected city; null = everywhere
  name: string | null;
  coords: [number, number] | null;
  from: 'location' | 'choice' | 'saved';
};

const read = (key: string) => {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value) Storage.setItemSync(key, value);
    else Storage.removeItemSync(key);
  } catch {}
};

let state: Here = { city: read(CITY), name: read(NAME), coords: null, from: 'saved' };
const listeners = new Set<() => void>();
const tell = (next: Partial<Here>) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
};

// Picked by hand (deck, onboarding). null = everywhere.
export function chooseCity(slug: string | null, name?: string | null) {
  write(CITY, slug);
  write(NAME, slug ? (name ?? slug) : null);
  tell({ city: slug, name: slug ? (name ?? slug) : null, from: 'choice' });
}

async function position(): Promise<[number, number] | null> {
  const perm = await Location.getForegroundPermissionsAsync();
  const granted = perm.granted || (perm.canAskAgain && (await Location.requestForegroundPermissionsAsync()).granted);
  if (!granted) return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
  if (last) return [last.coords.latitude, last.coords.longitude];
  // Indoors a fresh fix may never come: give up after 8 s.
  const fresh = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    new Promise<null>((done) => setTimeout(() => done(null), 8000)),
  ]);
  return fresh ? [fresh.coords.latitude, fresh.coords.longitude] : null;
}

async function cityAt([lat, lng]: [number, number], cities: City[]): Promise<{ slug: string; name: string } | null> {
  const near = await fetchNear(lat, lng, 60, 30).catch(() => null);
  const rows = near?.rows ?? [];
  if (rows.length) {
    // Majority of the nearest nights; ties go to the one with the closest night.
    const votes = new Map<string, { n: number; first: number; name: string }>();
    rows.forEach((r, i) => {
      const v = votes.get(r.city_slug) ?? { n: 0, first: i, name: r.city_name };
      v.n += 1;
      votes.set(r.city_slug, v);
    });
    const [slug, v] = [...votes.entries()].sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)[0];
    const listed = cities.find((c) => c.id === slug);
    return { slug, name: listed?.name ?? v.name.toLowerCase() };
  }
  const hit = await detectCity(lat, lng, cities);
  return hit ? { slug: hit.id, name: hit.name } : null;
}

let running: Promise<void> | null = null;
let lastRun = 0;
let firstRun = true;

// Find the city from the location. force: skip the interval.
function locate(cities: City[], force = false) {
  if (running) return running;
  if (!force && Date.now() - lastRun < AGAIN) return Promise.resolve();
  running = (async () => {
    try {
      const coords = await position();
      if (!coords) return;
      tell({ coords });
      const found = await cityAt(coords, cities);
      lastRun = Date.now();
      if (!found) return;
      const moved = read(SEEN) !== found.slug;
      write(SEEN, found.slug);
      // On launch always the current city; later only if you moved to another city.
      if (firstRun || moved || state.from !== 'choice') {
        write(CITY, found.slug);
        write(NAME, found.name);
        tell({ city: found.slug, name: found.name, from: 'location' });
      }
      firstRun = false;
    } finally {
      running = null;
    }
  })();
  return running;
}

// The city right now, outside React (the warm-up in data/warm.ts).
export const currentCity = () => state.city;

export function useHere() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

// Called once in the tabs shell: checks the location on launch and on foreground.
// The city list is only needed for names; a late list does not trigger another lookup.
export function useFollowLocation(cities: City[]) {
  const list = useRef(cities);
  useEffect(() => {
    list.current = cities;
  }, [cities]);
  useEffect(() => {
    locate(list.current, true).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') locate(list.current).catch(() => {});
    });
    return () => sub.remove();
  }, []);
}
