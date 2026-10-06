// The waves: rows from waves_kept() become one card per night and wave.
/* eslint-disable import/first -- jest.mock calls are hoisted above the imports anyway */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/offline', () => ({}));
jest.mock('@/data/deck', () => ({ posterUrl: ({ poster_no }: { poster_no: number | null }) => `poster-${poster_no}` }));

import { waveCards, type WaveKept } from '@/data/waves';

const row = (over: Partial<WaveKept>): WaveKept => ({
  wave: 2,
  via: ['Lina', 'Tarık'],
  kept_at: '2026-10-01T10:00:00Z',
  id: 'n1',
  slug: 'n1-slug',
  title: 'Blitz',
  poster_no: 4,
  type_name: 'Club Night',
  venue_name: 'Blitz Club',
  city_slug: 'munchen',
  starts_at: '2026-10-10T21:00:00Z',
  image_url: null,
  ticket_url: null,
  ...over,
});

describe('waveCards', () => {
  it('makes one card per night, named after the first chain', () => {
    const cards = waveCards([row({}), row({ via: ['Ece', 'Mira'] }), row({ id: 'n2', slug: 'n2' })], 2);
    expect(cards.map((c) => c.key)).toEqual(['n1', 'n2']);
    expect(cards[0].via).toEqual({ wave: 2, path: ['lina', 'tarık'] });
    expect(cards[0].kind).toBe('club night');
  });

  it('keeps the waves apart', () => {
    const rows = [row({}), row({ id: 'n3', wave: 3, via: ['a', 'b', 'c'] })];
    expect(waveCards(rows, 2).map((c) => c.key)).toEqual(['n1']);
    expect(waveCards(rows, 3).map((c) => c.key)).toEqual(['n3']);
  });

  it('draws a poster only without a photograph, and marks a ticket', () => {
    const [drawn] = waveCards([row({})], 2);
    expect(drawn.poster).toBe('poster-4');
    const [shot] = waveCards([row({ image_url: 'https://x/y.jpg', ticket_url: 'https://t' })], 2);
    expect(shot.poster).toBeNull();
    expect(shot.source).toBe('ticket');
  });

  it('keys a card by the night id, so undo can take the swipe back', () => {
    expect(waveCards([row({ id: 'uuid-1' })], 2)[0].key).toBe('uuid-1');
  });
});