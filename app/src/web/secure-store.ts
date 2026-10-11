// Web stand-in for expo-secure-store. A browser has no keychain; localStorage is the closest.
export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export async function deleteItemAsync(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
