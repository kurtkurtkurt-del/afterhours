import 'expo-sqlite/localStorage/install';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

// Session storage: the key lives in the device keystore, the data is AES-encrypted
// into SQLite localStorage. This works around SecureStore's 2 KB limit.
// Supabase's recommended "large secure store" pattern.
export class LargeSecureStore {
  // One key per storage key, generated once; later writes are a single step,
  // so two overlapping writes cannot separate the key from its ciphertext.
  private keys = new Map<string, Promise<Uint8Array>>();
  private keyFor(key: string) {
    let k = this.keys.get(key);
    if (!k) {
      k = (async () => {
        const hex = await SecureStore.getItemAsync(key);
        if (hex) return aesjs.utils.hex.toBytes(hex);
        const fresh = Crypto.getRandomValues(new Uint8Array(32));
        await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(fresh));
        return fresh;
      })();
      this.keys.set(key, k);
    }
    return k;
  }
  // The key is fixed, so the counter is random per write: first 16 bytes counter, then data.
  private async encrypt(key: string, value: string) {
    const k = await this.keyFor(key);
    const iv = Crypto.getRandomValues(new Uint8Array(16));
    const cipher = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(iv));
    return aesjs.utils.hex.fromBytes(iv) + aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
  }
  private async decrypt(key: string, value: string) {
    const hex = await SecureStore.getItemAsync(key);
    if (!hex || value.length < 34) return null;
    const iv = aesjs.utils.hex.toBytes(value.slice(0, 32));
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hex), new aesjs.Counter(iv));
    const text = aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value.slice(32))));
    // A simple consistency check instead of integrity: the session is JSON, otherwise ignore it.
    return text.startsWith('{') ? text : null;
  }
  async getItem(key: string) {
    const v = localStorage.getItem(key);
    if (!v) return null;
    try {
      return await this.decrypt(key, v);
    } catch {
      return null; // key lost: the session is dropped and the user signs in again
    }
  }
  async setItem(key: string, value: string) {
    localStorage.setItem(key, await this.encrypt(key, value));
  }
  async removeItem(key: string) {
    localStorage.removeItem(key);
    this.keys.delete(key);
    await SecureStore.deleteItemAsync(key);
  }
}
