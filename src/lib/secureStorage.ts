import 'expo-sqlite/localStorage/install';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

// oturum saklama: anahtar cihazın güvenli deposunda (keystore), veri aes ile
// şifrelenip sqlite localStorage'a yazılır. secure store 2 kb sınırını böyle aşarız.
// supabase'in önerdiği "large secure store" deseni.
export class LargeSecureStore {
  // anahtar depo anahtarı başına bir kez üretilir; sonraki yazmalar tek adımdır,
  // iki yazma üst üste gelse de anahtar ile şifreli veri birbirinden kopmaz
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
  // anahtar sabit olduğu için sayaç her yazmada rastgele: ilk 16 bayt sayaç, gerisi veri
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
    // bütünlük yerine basit bir tutarlılık: oturum json'dur; değilse yok say
    return text.startsWith('{') ? text : null;
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
    this.keys.delete(key);
    await SecureStore.deleteItemAsync(key);
  }
}
