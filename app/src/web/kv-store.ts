// Web stand-in for expo-sqlite/kv-store: the same sync and async calls on localStorage.
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const Storage = {
  getItemSync: (key: string): string | null => safe(() => localStorage.getItem(key), null),
  setItemSync: (key: string, value: string) => safe(() => localStorage.setItem(key, value), undefined),
  removeItemSync: (key: string) => safe(() => localStorage.removeItem(key), undefined),
  getItem: async (key: string) => Storage.getItemSync(key),
  setItem: async (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: async (key: string) => Storage.removeItemSync(key),
  clear: async () => safe(() => localStorage.clear(), undefined),
};

export default Storage;
