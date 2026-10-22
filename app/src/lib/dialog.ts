import { useSyncExternalStore } from 'react';
import { Alert, type AlertButton, type AlertOptions } from 'react-native';

// Every question the app asks, in its own sheet (components/DialogHost.tsx) instead of the
// system's grey box (owner, 22.10.2026: "nowhere in the app"). installDialogs() points
// Alert.alert here at start, so every call — the 39 there were and any new one — draws the
// same way on Android, iOS and the web. One at a time; the next waits its turn.
export type Dialog = { id: number; title: string; body?: string; buttons: AlertButton[]; onDismiss?: () => void };

let queue: Dialog[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((fn) => fn());

export function showDialog(title: string, body?: string, buttons?: AlertButton[], options?: AlertOptions) {
  queue = [...queue, { id: ++seq, title, body: body || undefined, buttons: buttons?.length ? buttons : [], onDismiss: options?.onDismiss }];
  tell();
}

// The sheet is gone before the button's work starts: a picker or a new sheet opened while
// a Modal is still closing locks Android (account photo, 27.09.2026).
export function closeDialog(id: number, then?: () => void) {
  queue = queue.filter((d) => d.id !== id);
  tell();
  if (then) setTimeout(then, 260);
}

export function useDialog(): Dialog | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => queue[0] ?? null,
  );
}

let installed = false;
export function installDialogs() {
  if (installed) return;
  installed = true;
  Alert.alert = showDialog;
}
