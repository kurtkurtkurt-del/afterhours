import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

// oturum saklama: anahtar cihazın güvenli deposunda (keystore), veri aes ile
// şifrelenip sqlite localStorage'a yazılır. secure store 2 kb sınırını böyle aşarız.
// supabase'in önerdiği "large secure store" deseni.
export class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const k = Crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(1));
    const enc = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(k));
    return aesjs.utils.hex.fromBytes(enc);
  }
  private async decrypt(key: string, value: string) {
    const hex = await SecureStore.getItemAsync(key);
    if (!hex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }
  async getItem(key: string) {
    const v = localStorage.getItem(key);
    if (!v) return null;
    try {
      return await this.decrypt(key, v);
    } catch {
      return null; // anahtar kayıpsa oturum düşer, yeniden giriş istenir
    }
  }
  async setItem(key: string, value: string) {
    localStorage.setItem(key, await this.encrypt(key, value));
  }
  async removeItem(key: string) {
    localStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
