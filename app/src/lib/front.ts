import { useSyncExternalStore } from 'react';
import type { About } from '@/data/about';
import type { Preview } from '@/data/previews';

// The card on top of the flow deck, for what stands beside the app on a computer
// (components/WebSides.web.tsx): its photo gives the sides their colour, its "who is this?"
// and its preview fill the right. The flow publishes it; nothing else writes here.
export type Front = {
  id: string;
  slug: string | null;
  title: string;
  venue: string | null;
  photo: string | null;
  ticketUrl: string | null;
  city: string | null;
  about: About | null;
  preview: Preview | null;
};

let front: Front | null = null;
const listeners = new Set<() => void>();
export function setFront(next: Front | null) {
  if (front?.id === next?.id && front?.about === next?.about && front?.preview === next?.preview) return;
  front = next;
  listeners.forEach((fn) => fn());
}
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const useFront = () => useSyncExternalStore(subscribe, () => front, () => front);

// The space key on a computer plays the top card's preview; the sides own the player.
const listen = new Set<() => void>();
export const onListenKey = (fn: () => void) => {
  listen.add(fn);
  return () => {
    listen.delete(fn);
  };
};
export const pressListen = () => listen.forEach((fn) => fn());
