import { useEffect, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { AfterhoursTap } from '../../modules/afterhours-tap';
import { useAuth } from '@/auth/AuthContext';
import { useProfile } from '@/data/profile';

// Tap phones to connect (owner, 28.10.2026). While afterhours is on screen the phone is an
// NFC card carrying a link to your page on the website, and a reader for the same card on
// other phones. Two phones with the app open: both open the other's profile (marked
// "tapped", the add button right there; nothing is added by itself). A phone without the
// app open, or an iPhone, reads the link and lands on the website. Android only; the
// native side is modules/afterhours-tap. Off for guests and when the setting is off.

const KEY = 'tap.on';
const listeners = new Set<() => void>();
const read = () => {
  try {
    return Storage.getItemSync(KEY) !== 'off';
  } catch {
    return true;
  }
};
let on = read();

export const tapSupported = () => {
  try {
    return !!AfterhoursTap?.isSupported();
  } catch {
    return false;
  }
};
export const useTapOn = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => on);
export function setTapOn(next: boolean) {
  on = next;
  try {
    Storage.setItemSync(KEY, next ? 'on' : 'off');
  } catch {}
  listeners.forEach((fn) => fn());
}

export const tapUrl = (handle: string) => `https://kurtkurtkurt-del.github.io/afterhours/p/?h=${encodeURIComponent(handle)}`;

// Mounted once, at the root.
export function TapBridge() {
  const { session, isAnonymous } = useAuth();
  const profile = useProfile();
  const enabled = useTapOn();
  const handle = !isAnonymous && session ? (profile?.handle ?? null) : null;

  useEffect(() => {
    if (!AfterhoursTap) return;
    try {
      AfterhoursTap.setCard(enabled && handle ? handle : null, enabled && handle ? tapUrl(handle) : null);
    } catch {}
  }, [enabled, handle]);

  useEffect(() => {
    if (!AfterhoursTap || !handle) return;
    let last = { who: '', at: 0 };
    const sub = AfterhoursTap.addListener('onTap', ({ handle: other }) => {
      const who = other.replace(/^@/, '').toLowerCase();
      // the same touch can arrive from both sides, and a hand held still keeps touching
      if (!who || who === handle.toLowerCase() || (who === last.who && Date.now() - last.at < 5000)) return;
      last = { who, at: Date.now() };
      router.push({ pathname: '/person/[handle]', params: { handle: who, tapped: '1' } });
    });
    return () => sub.remove();
  }, [handle]);

  return null;
}
