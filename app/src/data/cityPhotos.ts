import { Directory, File, Paths } from 'expo-file-system';
import { remember } from '@/lib/offline';

// A photo per city for the place picker: the lead image of the city's English
// Wikipedia article, with its author and licence from Wikimedia Commons (most are
// CC BY-SA, so the credit is shown on the card). Two requests per country, cached.
export type CityPhoto = { uri: string; credit: string };
type Stored = { remote: string; credit: string };

// City names in the database are local ("münchen"); these would land on the wrong
// English article (a disambiguation page, a surname), so they are named outright.
const ALIAS: Record<string, string> = {
  cork: 'Cork (city)',
  brussel: 'Brussels',
  gent: 'Ghent',
  roma: 'Rome',
  'new-york': 'New York City',
  austin: 'Austin, Texas',
  washington: 'Washington, D.C.',
  'ciudad-de-mexico': 'Mexico City',
};

// Wikimedia refuses the phone's default user agent (okhttp), for the API and the
// images alike, so both send this one. <Image> cannot be trusted to pass it on, so the
// photos are downloaded to the cache with it and shown from there.
const AGENT = 'afterhours-app/1.0 (https://kurtkurtkurt-del.github.io/afterhours/)';
const HEADERS = { 'User-Agent': AGENT, 'Api-User-Agent': AGENT };

type Page = { title: string; thumbnail?: { source: string }; pageimage?: string; pageprops?: Record<string, string> };

async function query(host: string, params: Record<string, string>) {
  // built by hand: React Native's URLSearchParams does not take an object
  const all = { format: 'json', formatversion: '2', origin: '*', ...params };
  const url = `https://${host}/w/api.php?` + Object.entries(all).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function fetchPhotos(cities: { id: string; name: string }[]): Promise<Record<string, Stored>> {
  const titleOf = new Map(cities.map((c) => [c.id, ALIAS[c.id] ?? c.name]));
  const data = await query('en.wikipedia.org', {
    action: 'query',
    titles: [...titleOf.values()].join('|'),
    prop: 'pageimages|pageprops',
    piprop: 'thumbnail|name',
    // Wikimedia only serves certain thumbnail widths (330, 500, 960…); others return 400
    pithumbsize: '500',
    redirects: '1',
  });
  const hop = new Map<string, string>();
  for (const n of [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])]) hop.set(n.from, n.to);
  const follow = (t: string) => {
    let x = t;
    for (let i = 0; i < 3 && hop.has(x); i++) x = hop.get(x)!;
    return x;
  };
  const pages = new Map<string, Page>((data.query?.pages ?? []).map((p: Page) => [p.title, p]));

  // author and licence of each file, in one call
  const files = [...pages.values()].filter((p) => p.pageimage && p.thumbnail).map((p) => `File:${p.pageimage}`);
  const credits = new Map<string, string>();
  if (files.length) {
    const meta = await query('commons.wikimedia.org', {
      action: 'query',
      titles: files.join('|'),
      prop: 'imageinfo',
      iiprop: 'extmetadata',
      iiextmetadatafilter: 'Artist|LicenseShortName',
    }).catch(() => null);
    for (const p of meta?.query?.pages ?? []) {
      const m = p.imageinfo?.[0]?.extmetadata ?? {};
      const artist = plain(m.Artist?.value ?? '');
      const licence = plain(m.LicenseShortName?.value ?? '');
      credits.set(String(p.title).replace(/^File:/, '').replace(/_/g, ' '), [artist, licence].filter(Boolean).join(' · '));
    }
  }

  const out: Record<string, Stored> = {};
  for (const [id, title] of titleOf) {
    const page = pages.get(follow(title));
    if (!page?.thumbnail || page.pageprops?.disambiguation !== undefined) continue;
    const file = (page.pageimage ?? '').replace(/_/g, ' ');
    out[id] = { remote: page.thumbnail.source, credit: credits.get(file) ?? 'Wikimedia Commons' };
  }
  return out;
}

const folder = () => {
  const dir = new Directory(Paths.cache, 'city-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

// The local copy of one photo, downloaded once.
async function local(id: string, remote: string): Promise<string | null> {
  const file = new File(folder(), `${id}.jpg`);
  if (file.exists && file.size > 0) return file.uri;
  try {
    const got = await File.downloadFileAsync(remote, file, { headers: HEADERS, idempotent: true });
    return got.uri;
  } catch {
    return null;
  }
}

export async function cityPhotos(cities: { id: string; name: string }[]): Promise<Record<string, CityPhoto>> {
  const key = cities.map((c) => c.id).sort().join(',');
  const stored = await remember('cityPhotos.v3', key, () => fetchPhotos(cities), 40);
  const out: Record<string, CityPhoto> = {};
  await Promise.all(
    Object.entries(stored).map(async ([id, s]) => {
      const uri = await local(id, s.remote);
      if (uri) out[id] = { uri, credit: s.credit };
    }),
  );
  return out;
}
