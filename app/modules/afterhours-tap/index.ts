import { requireOptionalNativeModule } from 'expo';

// Tap phones to connect (android/…/AfterhoursTapModule.kt). Null where there is no native
// side: iPhones, the web, an old build.
export type TapEvent = { handle: string; role: 'read' | 'card' };
type Native = {
  isSupported(): boolean;
  isEnabled(): boolean;
  setCard(handle: string | null, url: string | null): void;
  addListener(event: 'onTap', fn: (e: TapEvent) => void): { remove(): void };
};

export const AfterhoursTap = requireOptionalNativeModule<Native>('AfterhoursTap');
