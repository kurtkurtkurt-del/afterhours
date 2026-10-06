// Sparks that read the world: fixtures for the derby, the forecast for the rest.

jest.mock('@/lib/offline', () => ({ remember: (_g: string, _k: string, work: () => Promise<unknown>) => work() }));
jest.mock('../../assets/sparks/derby.jpg', () => 1, { virtual: true });

import { dayScore, sparkHint } from '@/data/sparkHints';
import { sparkOf } from '@/content/sparks';

const answer = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
const now = new Date('2026-10-06T10:00:00Z');

afterEach(() => {
  (global.fetch as jest.Mock | undefined)?.mockReset?.();
});

describe('dayScore', () => {
  const d = (tmax: number, rain: number) => ({ date: '2026-10-10', tmax, rain });
  it('prefers a warm dry day for the grill and refuses a cold or wet one', () => {
    expect(dayScore('grill', d(24, 0), 3)).toBeGreaterThan(dayScore('grill', d(15, 30), 3));
    expect(dayScore('grill', d(9, 0), 3)).toBeLessThan(0);
    expect(dayScore('grill', d(25, 80), 3)).toBeLessThan(0);
  });
  it('likes a mild day for the hike, and a weekend more', () => {
    expect(dayScore('hike', d(18, 0), 3)).toBeGreaterThan(dayScore('hike', d(30, 0), 3));
    expect(dayScore('hike', d(18, 0), 6)).toBeGreaterThan(dayScore('hike', d(18, 0), 3));
    expect(dayScore('hike', d(35, 0), 6)).toBeLessThan(0);
  });
});

describe('sparkHint', () => {
  it('puts the best forecast days first for the grill', async () => {
    global.fetch = jest.fn(() =>
      answer({
        daily: {
          time: ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'],
          temperature_2m_max: [20, 11, 26, 22],
          precipitation_probability_max: [10, 0, 0, 70],
        },
      }),
    ) as jest.Mock;
    const h = await sparkHint(sparkOf('grill'), 'munchen', null, now);
    expect(h).not.toBeNull();
    expect(h!.times.map((t) => t.getDate())).toEqual([8, 6]);
    expect(h!.notes[0]).toEqual({ tmax: 26, rain: 0 });
  });

  it('uses the real next match for the derby, half an hour before kick-off', async () => {
    global.fetch = jest.fn(() =>
      answer({
        events: [
          { strTimestamp: '2026-10-10T13:30:00', strEvent: 'Augsburg vs Bayern Munich', strLeague: 'German Bundesliga', strHomeTeam: 'Augsburg', strAwayTeam: 'Bayern Munich' },
          { strTimestamp: '2026-10-30T18:00:00', strEvent: 'Too Far vs Away', strLeague: 'x' },
        ],
      }),
    ) as jest.Mock;
    const h = await sparkHint(sparkOf('derby'), 'munchen', null, now);
    expect(h!.title).toBe('augsburg vs bayern munich');
    expect(h!.times).toHaveLength(1);
    expect(h!.times[0].toISOString()).toBe('2026-10-10T13:00:00.000Z');
    expect(h!.notes[0]).toEqual({ match: 'augsburg vs bayern munich · german bundesliga' });
  });

  it('puts a derby between two of the city’s own teams first', async () => {
    const byTeam: Record<string, unknown[]> = {
      '133804': [{ strTimestamp: '2026-10-08T17:00:00', strEvent: 'Galatasaray vs Rize', strHomeTeam: 'Galatasaray', strAwayTeam: 'Rize' }],
      '133807': [{ strTimestamp: '2026-10-12T17:00:00', strEvent: 'Fenerbahçe vs Beşiktaş', strHomeTeam: 'Fenerbahçe', strAwayTeam: 'Beşiktaş' }],
      '133794': [{ strTimestamp: '2026-10-12T17:00:00', strEvent: 'Fenerbahçe vs Beşiktaş', strHomeTeam: 'Fenerbahçe', strAwayTeam: 'Beşiktaş' }],
    };
    global.fetch = jest.fn((url: string) => answer({ events: byTeam[/id=(\d+)/.exec(url)![1]] })) as jest.Mock;
    const h = await sparkHint(sparkOf('derby'), 'istanbul', null, now);
    expect(h!.title).toBe('fenerbahçe vs beşiktaş');
    expect(h!.times).toHaveLength(2); // the same match from both teams counts once
  });

  it('gives nothing (the plain hours) when the source fails or the city is unknown', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network request failed'))) as jest.Mock;
    expect(await sparkHint(sparkOf('grill'), 'munchen', null, now)).toBeNull();
    expect(await sparkHint(sparkOf('derby'), 'munchen', null, now)).toBeNull();
    expect(await sparkHint(sparkOf('hike'), 'nowhere', null, now)).toBeNull();
  });
});
