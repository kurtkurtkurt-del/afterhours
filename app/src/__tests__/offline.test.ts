// The offline layer: reads fall back to the shelf, writes wait in order.

const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k: string) => mockStore.get(k) ?? null,
    setItemSync: (k: string, v: string) => mockStore.set(k, v),
    removeItemSync: (k: string) => mockStore.delete(k),
    getAllKeysSync: () => [...mockStore.keys()],
  },
}));

let mockNet: ((s: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | null = null;
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: (fn: typeof mockNet) => (mockNet = fn) },
}));

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { onAuthStateChange: jest.fn() },
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: () => ({ delete: () => ({ eq: async () => ({ error: null }) }), update: () => ({ eq: async () => ({ error: null }) }) }),
  },
}));

import { cachedRead, isNetworkError, OfflineError, send, startOffline } from '@/lib/offline';

const netDown = () => Object.assign(new Error('Network request failed'), {});
const flushAll = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => {
  startOffline();
});
beforeEach(() => {
  mockRpc.mockReset();
  mockNet?.({ isConnected: true, isInternetReachable: true });
});

describe('isNetworkError', () => {
  it('tells a lost connection from a refusal', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError({ name: 'AuthRetryableFetchError' })).toBe(true);
    expect(isNetworkError(new Error('permission denied for function'))).toBe(false);
  });
});

describe('cachedRead', () => {
  it('stores a good answer and shows it again when the network fails', async () => {
    const first = await cachedRead('deck', 'munchen', async () => [1, 2, 3]);
    expect(first).toEqual({ value: [1, 2, 3], stale: false });
    const again = await cachedRead('deck', 'munchen', async () => {
      throw netDown();
    });
    expect(again).toEqual({ value: [1, 2, 3], stale: true });
  });

  it('says offline when nothing was ever stored', async () => {
    mockNet?.({ isConnected: true, isInternetReachable: true });
    await expect(
      cachedRead('deck', 'never', async () => {
        throw netDown();
      }),
    ).rejects.toBeInstanceOf(OfflineError);
  });

  it('passes a refusal from the server through', async () => {
    await expect(
      cachedRead('deck', 'refused', async () => {
        throw new Error('permission denied');
      }),
    ).rejects.toThrow('permission denied');
  });

  it('drops the oldest entry from a full shelf', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1000);
    await cachedRead('small', 'a', async () => 'a', 2);
    now.mockReturnValue(2000);
    await cachedRead('small', 'b', async () => 'b', 2);
    now.mockReturnValue(3000);
    await cachedRead('small', 'c', async () => 'c', 2);
    now.mockRestore();
    const shelf = JSON.parse(mockStore.get('cache.out.small') ?? '{}');
    expect(Object.keys(shelf).sort()).toEqual(['b', 'c']);
  });
});

describe('send', () => {
  it('goes straight out when online', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await send({ kind: 'swipe', slug: 'x', direction: 'right' });
    expect(mockRpc).toHaveBeenCalledWith('swipe_set', { p_slug: 'x', p_direction: 'right' });
    expect(mockStore.get('outbox')).toBeUndefined();
  });

  it('queues while offline and sends in order when the connection returns', async () => {
    mockNet?.({ isConnected: false, isInternetReachable: false });
    await send({ kind: 'swipe', slug: 'a', direction: 'right' });
    await send({ kind: 'swipe', slug: 'b', direction: 'left' });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(JSON.parse(mockStore.get('outbox') ?? '[]')).toHaveLength(2);

    mockRpc.mockResolvedValue({ error: null });
    mockNet?.({ isConnected: true, isInternetReachable: true });
    await flushAll();
    await flushAll();
    expect(mockRpc.mock.calls.map((c) => c[1].p_slug)).toEqual(['a', 'b']);
    expect(mockStore.get('outbox')).toBeUndefined();
  });

  it('drops an operation the server refuses and goes on with the rest', async () => {
    mockNet?.({ isConnected: false, isInternetReachable: false });
    await send({ kind: 'swipe', slug: 'gone', direction: 'right' });
    await send({ kind: 'swipe', slug: 'next', direction: 'right' });
    mockRpc.mockResolvedValueOnce({ error: { message: 'no such night' } }).mockResolvedValue({ error: null });
    mockNet?.({ isConnected: true, isInternetReachable: true });
    await flushAll();
    await flushAll();
    expect(mockRpc.mock.calls.map((c) => c[1].p_slug)).toEqual(['gone', 'next']);
    expect(mockStore.get('outbox')).toBeUndefined();
  });

  it('a refusal while online is thrown, not queued', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'no such night' } });
    await expect(send({ kind: 'swipe', slug: 'x', direction: 'right' })).rejects.toEqual({ message: 'no such night' });
    expect(mockStore.get('outbox')).toBeUndefined();
  });
});
