import Storage from 'expo-sqlite/kv-store';

// The accent: red by default, picked in settings → app. spot fills (buttons, the dot,
// live rings), spotText is the same colour readable as small text on ink, rgb feeds
// the see-through tints. Read once at start: every StyleSheet below is built from it,
// so a new pick reloads the app (data/accent.ts).
export const ACCENTS = {
  red: { spot: '#D7261E', spotText: '#F0443A', rgb: '215,38,30' },
  green: { spot: '#1E9E57', spotText: '#3CC878', rgb: '30,158,87' },
  yellow: { spot: '#E5B000', spotText: '#F5C838', rgb: '229,176,0' },
  blue: { spot: '#2D6BE0', spotText: '#5C8FF0', rgb: '45,107,224' },
  pink: { spot: '#DD3B8A', spotText: '#F065A8', rgb: '221,59,138' },
} as const;
export type AccentId = keyof typeof ACCENTS;
const readAccent = (): AccentId => {
  try {
    const v = Storage.getItemSync('accent');
    return v && v in ACCENTS ? (v as AccentId) : 'red';
  } catch {
    return 'red';
  }
};
export const accentId: AccentId = readAccent();
const accent = ACCENTS[accentId];
// A see-through version of the accent: tint(0.12) → 'rgba(…,0.12)'.
export const tint = (alpha: number) => `rgba(${accent.rgb},${alpha})`;

// Ink on paper. No pure white, no pure black.
export const colors = {
  paper: '#F3F1EC',
  paper2: '#FAF9F6',
  ink: '#0E0D0C',
  ink2: '#6C6961',
  rule: '#D9D5CC',
  spot: accent.spot,         // the accent: live · kept · on; fills, borders, the dot in the logo
  spotText: accent.spotText, // accent TEXT on ink (spot is unreadable at small sizes)
  ink3: '#2A2724',     // hairline: divider on dark backgrounds
  mute: '#A9A59C',     // muted text and icons on dark backgrounds
  meta: '#7F7B73',     // small uppercase meta lines
} as const;

// Corner radii: small squares (initials, marks) xs · inner buttons, chips sm ·
// buttons, panels, cards md · bottom sheets, large cards lg · pill buttons pill.
export const radius = {
  xs: 5,
  sm: 9,
  md: 14,
  lg: 24,
  pill: 999,
} as const;

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  jet: 'JetBrainsMono_400Regular',  // mono details: poster captions, the map card (10–11 px)
  mono: 'InterTight_400Regular',    // small uppercase lines use the same family
  logo: 'ArchivoLogo',              // the name only: Archivo, width 62, weight 900 (assets/fonts)
} as const;

// Intro timing, ms.
export const intro = {
  hold: 300,       // paper holds empty
  photoIn: 1400,   // photo fades in
  wordDelay: 900,  // name starts to appear
  word: 800,       // name fade duration
  leaveAt: 3200,   // move to the next screen
} as const;
