import * as Crypto from 'expo-crypto';

// The photos bucket is public, so the address is the lock (M-14): 128 random bits, not a
// time anyone could count through. A short cache, so a removed photo does not live on for a year.
export function photoName(): string {
  return Array.from(Crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}
export const PHOTO_CACHE = '3600';
