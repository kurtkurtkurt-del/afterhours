import type { Spark } from '@/content/sparks';
import { remember } from '@/lib/offline';

// Sparks that read the world: the derby is the real next match of the city's team,
// the grill and the hike go first to the days the forecast likes. Two free sources
// without keys: TheSportsDB (fixtures, public test key "3") and Open-Meteo (the
// forecast). Anything missing falls back to the spark's own hour on the next days.
export type SparkHint = {
  times: Date[];     // first one is the suggestion
  title?: string;    // derby: "bayern munich vs dortmund"
  // one per time: the match (derby) or the forecast for that day
  notes: ({ match: string } | { tmax: number; rain: number })[];
};

// The teams whose matches make a derby night, per city slug.
const TEAMS: Record<string, string[]> = {
  munchen: ['133664'], // bayern munich
  istanbul: ['133804', '133807', '133794'], // galatasaray, fenerbahçe, beşiktaş
};
const CENTRES: Record<string, [number, number]> = {
  munchen: [48.137, 11.575],
  istanbul: [41.015, 28.979],
};

type Match = { at: Date; title: string; league: string; teams: string[] };
type Day = { date: string; tmax: number; rain: number };

const getJson = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
};

async function nextMatches(city: string): Promise<Match[]> {
  const ids = TEAMS[city];
  if (!ids) return [];
  const lists = await Promise.all(
    ids.map((id) =>
      remember('fixtures', id, () => getJson(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${id}`), 2, { ttl: 6 * 3600_000 })
        .then((d) => (d?.events ?? []) as { strTimestamp?: string; strEvent?: string; strLeague?: string; strHomeTeam?: string; strAwayTeam?: string }[])
        .catch(() => []),
    ),
  );
  const seen = new Set<string>();
  const out: Match[] = [];
  lists.flat().forEach((e) => {
    if (!e.strTimestamp || !e.strEvent || seen.has(e.strEvent)) return;
    seen.add(e.strEvent);
    const at = new Date(/[zZ+]/.test(e.strTimestamp.slice(10)) ? e.strTimestamp : `${e.strTimestamp}Z`);
    if (Number.isNaN(at.getTime())) return;
    out.push({ at, title: e.strEvent.toLowerCase(), league: (e.strLeague ?? '').toLowerCase(), teams: [e.strHomeTeam ?? '', e.strAwayTeam ?? ''] });
  });
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

async function forecast(at: [number, number]): Promise<Day[]> {
  const [lat, lng] = at.map((n) => Math.round(n * 100) / 100);
  const d = await remember('forecast', `${lat},${lng}`, () =>
    getJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_probability_max&timezone=auto&forecast_days=7`), 2, { ttl: 3 * 3600_000 });
  const days = d?.daily;
  if (!days?.time) return [];
  return (days.time as string[]).map((date, i) => ({ date, tmax: Number(days.temperature_2m_max[i]), rain: Number(days.precipitation_probability_max[i] ?? 0) }));
}

// How much a day suits the spark: dry first, then warm enough (the grill, a rooftop,
// above all a night swim) or mild (the hike, the sunrise); weekends a little more.
// Below zero: not worth suggesting. Sparks indoors are not scored (0).
export function dayScore(kind: Spark['kind'], d: Day, weekday: number): number {
  if (Number.isNaN(d.tmax)) return 0;
  const dry = 1 - Math.min(100, Math.max(0, d.rain)) / 100;
  const weekend = weekday === 0 || weekday === 6 ? 0.15 : 0;
  if (kind === 'grill') {
    if (d.tmax < 12 || d.rain > 60) return -1;
    return dry + Math.min(1, (d.tmax - 12) / 14) + weekend;
  }
  if (kind === 'hike') {
    if (d.rain > 60 || d.tmax < 2 || d.tmax > 32) return -1;
    return dry + (1 - Math.min(1, Math.abs(d.tmax - 18) / 14)) + weekend * 2;
  }
  if (kind === 'sunrise') {
    // A sky without rain matters most; a weekend morning is when the night ends.
    if (d.rain > 50 || d.tmax < -5) return -1;
    return dry * 2 + weekend * 2;
  }
  if (kind === 'rooftop') {
    if (d.tmax < 14 || d.rain > 50) return -1;
    return dry + Math.min(1, (d.tmax - 14) / 12) + weekend;
  }
  if (kind === 'swim') {
    if (d.tmax < 22 || d.rain > 40) return -1;
    return dry + Math.min(1, (d.tmax - 22) / 8) + weekend;
  }
  return 0;
}

const atHour = (date: string, spark: Spark) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, spark.hour, spark.minute);
};

export async function sparkHint(spark: Spark, city: string | null, coords: [number, number] | null, now = new Date()): Promise<SparkHint | null> {
  try {
    if (spark.kind === 'derby') {
      // The next matches in the coming ten days, at kick-off (the spark starts
      // half an hour before). A derby between two of the city's teams comes first.
      const soon = (await nextMatches(city ?? '')).filter((m) => m.at.getTime() - now.getTime() > 90 * 60_000 && m.at.getTime() - now.getTime() < 10 * 86400_000);
      if (!soon.length) return null;
      const big = soon.find((m) => isLocalDerby(m, city));
      const pick = (big ? [big, ...soon.filter((m) => m !== big)] : soon).slice(0, 4);
      return {
        title: pick[0].title,
        times: pick.map((m) => new Date(m.at.getTime() - 30 * 60_000)),
        notes: pick.map((m) => ({ match: [m.title, m.league].filter(Boolean).join(' · ') })),
      };
    }
    // Only the sparks outdoors read the forecast; the rest keep their own hour.
    if (!['grill', 'hike', 'sunrise', 'rooftop', 'swim'].includes(spark.kind)) return null;
    const at = coords ?? CENTRES[city ?? ''];
    if (!at) return null;
    const days = await forecast(at);
    const ranked = days
      .map((d) => ({ d, when: atHour(d.date, spark) }))
      .filter(({ when }) => when.getTime() - now.getTime() > 60 * 60_000)
      .map((x) => ({ ...x, score: dayScore(spark.kind, x.d, x.when.getDay()) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    if (!ranked.length) return null;
    return {
      times: ranked.map((x) => x.when),
      notes: ranked.map((x) => ({ tmax: Math.round(x.d.tmax), rain: Math.round(x.d.rain) })),
    };
  } catch {
    return null;
  }
}

// Two of the city's own teams against each other.
const NAMES: Record<string, string[]> = {
  istanbul: ['galatasaray', 'fenerbahçe', 'beşiktaş'],
};
function isLocalDerby(m: Match, city: string | null) {
  const names = NAMES[city ?? ''] ?? [];
  return m.teams.filter((t) => names.includes(t.toLowerCase())).length === 2;
}
