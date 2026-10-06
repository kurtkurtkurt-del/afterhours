// The date filter on the deck, and the spark's own hours.
/* eslint-disable import/first -- jest.mock calls are hoisted above the imports anyway */
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../assets/sparks/derby.jpg', () => 1, { virtual: true });

import { filterWhen, isWhen, dayWhen } from '@/data/when';
import { sparkOf, sparkTimes } from '@/content/sparks';
import type { Night } from '@/data/deck';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const night = (date: Date | null): Night => ({ starts_at: date ? date.toISOString() : null }) as unknown as Night;
const keep = (when: Parameters<typeof filterWhen>[1], dates: (Date | null)[]) => filterWhen(dates.map(night), when).length;

describe('filterWhen', () => {
  // a wednesday evening
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(at(2026, 10, 7, 21, 0));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('tonight runs until eight in the morning, and keeps a night that began a little ago', () => {
    expect(keep('tonight', [at(2026, 10, 7, 23), at(2026, 10, 8, 3), at(2026, 10, 7, 17)])).toBe(3);
    expect(keep('tonight', [at(2026, 10, 8, 9), at(2026, 10, 7, 10)])).toBe(0);
  });

  it('tomorrow is eight to eight', () => {
    expect(keep('tomorrow', [at(2026, 10, 8, 22), at(2026, 10, 9, 4)])).toBe(2);
    expect(keep('tomorrow', [at(2026, 10, 8, 7), at(2026, 10, 9, 9)])).toBe(0);
  });

  it('the weekend is friday 18:00 to monday morning', () => {
    expect(keep('weekend', [at(2026, 10, 9, 22), at(2026, 10, 11, 23), at(2026, 10, 12, 5)])).toBe(3);
    expect(keep('weekend', [at(2026, 10, 9, 17), at(2026, 10, 12, 7)])).toBe(0);
  });

  it('a picked day is noon to eight the next morning', () => {
    const when = dayWhen(at(2026, 10, 10));
    expect(keep(when, [at(2026, 10, 10, 20), at(2026, 10, 11, 6)])).toBe(2);
    expect(keep(when, [at(2026, 10, 10, 11), at(2026, 10, 11, 9)])).toBe(0);
  });

  it('a night without a date never fits a window, but nothing chosen keeps everything', () => {
    expect(keep('month', [null])).toBe(0);
    expect(keep(null, [null, at(2027, 1, 1)])).toBe(2);
  });

  it('a stored day that has passed is not a choice any more', () => {
    expect(isWhen('weekend')).toBe(true);
    expect(isWhen(dayWhen(at(2026, 10, 9)))).toBe(true);
    expect(isWhen(dayWhen(at(2026, 10, 1)))).toBe(false);
    expect(isWhen('someday')).toBe(false);
  });
});

describe('sparkTimes', () => {
  it('offers the spark hour on the next days, today only while it is an hour away', () => {
    const derby = sparkOf('derby'); // 18:30
    const early = sparkTimes(derby, at(2026, 10, 7, 12));
    expect(early).toHaveLength(4);
    expect(early[0].getDate()).toBe(7);
    const late = sparkTimes(derby, at(2026, 10, 7, 18));
    expect(late[0].getDate()).toBe(8);
    expect(late.every((d) => d.getHours() === 18 && d.getMinutes() === 30)).toBe(true);
  });
});
