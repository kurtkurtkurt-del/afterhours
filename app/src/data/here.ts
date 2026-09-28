import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';
import { fetchNear } from '@/data/near';
import { detectCity } from '@/data/geo';
import type { City } from '@/content/cities';

// bulunduğun şehir. bütün uygulama buradan okur (deste, harita, kayıt).
//
// kural: uygulama açılınca ve uzun aradan sonra öne gelince konum sorulur;
// bulunan şehir seçili şehir olur. elle başka şehir seçersen o geçerli kalır,
// ta ki gerçekten başka bir şehre geçene kadar (bulunan şehir değişince).
//
// şehir, ADINDAN değil yakındaki gecelerden bulunur: telefon ingilizceyken
// "Munich" der, listede "münchen" yazar ve adlar eşleşmez. en yakın gecelerin
// çoğu hangi şehirdeyse oradasın. gece yoksa adla eşlemeye düşülür.
const CITY = 'city';
const NAME = 'city.name';
const SEEN = 'city.here'; // en son konumdan bulunan şehir
const AGAIN = 30 * 60_000; // bu kadar arkada kalınca konum yeniden sorulur

export type Here = {
  city: string | null; // seçili şehir; null = her yer
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

// elle seçmek (deste, onboarding). null = her yer.
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
  // içeride taze konum hiç gelmeyebilir: 8 saniyede vazgeç
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
    // en yakın gecelerin çoğunluğu; eşitlikte en yakını olan
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

// konumdan şehri bul. force: süreyi beklemeden.
export function locate(cities: City[], force = false) {
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
      // açılışta hep bulunduğun şehir; sonra yalnız başka şehre geçtiysen
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

export function useHere() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

// sekmelerin kabuğunda bir kez: açılışta ve öne gelince konuma bakar.
// şehir listesi yalnız ad için gerekir; liste sonradan gelse de yeniden sorulmaz.
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
