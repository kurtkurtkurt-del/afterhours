import { Dimensions, Platform } from 'react-native';

// The web app on a computer (owner, 26.10.2026: "the PWA does not sit on a computer"):
// a phone screen stretched to 1440 px wide was the whole UI at the wrong size. On a wide
// window the app now stands in a phone-wide column in the middle (public/index.html draws
// the column and the ground around it), and every screen is told the window is that wide,
// so cards, the deck and the sheets size themselves as on a phone. Phones and narrow
// windows are untouched. Imported once, first, by the root layout.
export const FRAME = 440; // the column, px
export const FRAME_FROM = 700; // windows at least this wide get the column

const frame = <T extends { width: number }>(d: T): T => (d && d.width >= FRAME_FROM ? { ...d, width: FRAME } : d);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const get = Dimensions.get.bind(Dimensions);
  // a stable object per real size, so useWindowDimensions does not re-render for nothing
  let seen: { from: unknown; to: unknown } = { from: null, to: null };
  Dimensions.get = ((key: 'window' | 'screen') => {
    const d = get(key);
    if (key !== 'window') return d;
    if (seen.from !== d) seen = { from: d, to: frame(d) };
    return seen.to;
  }) as typeof Dimensions.get;
  const add = Dimensions.addEventListener.bind(Dimensions);
  Dimensions.addEventListener = ((type: 'change', handler: (e: { window: { width: number }; screen: unknown }) => void) =>
    add(type, (e: { window: { width: number }; screen: unknown }) => handler({ ...e, window: Dimensions.get('window') }))) as typeof Dimensions.addEventListener;
  document.documentElement.classList.toggle('framed', window.innerWidth >= FRAME_FROM);
  window.addEventListener('resize', () => document.documentElement.classList.toggle('framed', window.innerWidth >= FRAME_FROM));
}
