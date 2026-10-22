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

// Ink on paper. No pure white, no pure black. Two grounds, picked in settings → app
// (data/theme.ts) and read once at start like the accent: dark (the original night
// look) and light. The names keep their roles in both — ink is the ground, paper the
// words on it — only the values change.
export type ThemeId = 'dark' | 'light';
const readTheme = (): ThemeId => {
  try {
    const v = Storage.getItemSync('theme');
    return v === 'dark' || v === 'light' ? v : 'light';
  } catch {
    return 'light';
  }
};
export const themeId: ThemeId = readTheme();
const light = themeId === 'light';

export const colors = {
  paper: light ? '#1F1D1A' : '#F3F1EC',
  paper2: light ? '#2A2724' : '#FAF9F6',
  ink: light ? '#FBFAF7' : '#0E0D0C',
  ink2: light ? '#8A867D' : '#6C6961',
  rule: light ? '#E6E2DA' : '#D9D5CC',
  spot: accent.spot,         // the accent: live · kept · on; fills, borders, the dot in the logo
  spotText: light ? accent.spot : accent.spotText, // accent TEXT on the ground
  ink3: light ? '#E9E5DD' : '#2A2724',     // hairline on the ground
  mute: light ? '#7A766E' : '#A9A59C',     // muted text and icons on the ground
  meta: light ? '#9A958C' : '#7F7B73',     // small uppercase meta lines
  // The same in both themes. A photo is a dark poster object: its scrim stays ink-dark
  // and the words on it stay light. Words on a red fill stay light too.
  poster: '#0E0D0C',
  onPhoto: '#F6F4EF',
  onPhotoMute: '#CFCBC2',
  onPhotoMeta: '#ABA79E',
  onPhotoRule: 'rgba(246,244,239,0.28)',
  onPhotoSpot: accent.spotText,
  onSpot: '#FBFAF7',
  sleeve: light ? '#E6E2DA' : '#1F1D1A', // an empty photo frame
  card: light ? '#FFFFFF' : '#171512',   // a card that stands off the ground (the ticket on the night page)
  edge: light ? 'rgba(31,29,26,0.22)' : 'rgba(243,241,236,0.16)', // a visible outline or perforation on the ground
} as const;

// The ground as a see-through veil: ground(0.8) → the ground colour at 80%.
export const ground = (alpha: number) => (light ? `rgba(251,250,247,${alpha})` : `rgba(14,13,12,${alpha})`);
// The words' colour as a see-through tint on the ground: a quiet fill behind a pill, a chosen row.
export const paperTint = (alpha: number) => (light ? `rgba(31,29,26,${alpha})` : `rgba(243,241,236,${alpha})`);
// A dark scrim over a photo, the same in both themes.
export const scrim = (alpha: number) => `rgba(14,13,12,${alpha})`;
// Status bar words: dark on the light ground, light on the dark one.
export const barStyle: 'dark' | 'light' = light ? 'dark' : 'light';
// Backdrop photos (intro, city, the flow) sit under the ground at this strength.
export const veil = light ? 0.74 : 0.35;

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
