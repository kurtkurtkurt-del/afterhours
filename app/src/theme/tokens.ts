// Ink on paper. No pure white, no pure black.
export const colors = {
  paper: '#F3F1EC',
  paper2: '#FAF9F6',
  ink: '#0E0D0C',
  ink2: '#6C6961',
  rule: '#D9D5CC',
  spot: '#D7261E',     // red: live · kept · on; fills, borders, the dot in the logo
  spotText: '#F0443A', // red TEXT on ink (spot is unreadable at small sizes)
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
