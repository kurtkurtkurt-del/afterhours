import { reloadAppAsync } from 'expo';
import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

const BACK = 'restart.back';

// Draws the app again from the start: a new ground or accent is read once at launch
// (theme/tokens.ts). DevSettings.reload did this only in development — in the release
// app "now" changed nothing (owner, 22.10.2026); reloadAppAsync works in both. `back`:
// the page to land on again afterwards (the start screen takes it, app/index.tsx).
export function restart(back?: string) {
  try {
    if (back) Storage.setItemSync(BACK, back);
  } catch {}
  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  reloadAppAsync('appearance').catch(() => {});
}

export function takeBack(): string | null {
  try {
    const v = Storage.getItemSync(BACK);
    if (v) Storage.removeItemSync(BACK);
    return v;
  } catch {
    return null;
  }
}
