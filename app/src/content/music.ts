// Background music: 10 clips per genre (60 s, 64 kbps AAC), streamed from Supabase's "sound"
// bucket (21_sound.sql). The files live under sound/ in the repo, outside the bundle, and are
// uploaded with backend/tools/upload-sound.mjs. Sources and licences are in CREDITS.md.
export type Genre = 'house' | 'techno' | 'rap';

export const genres: { id: Genre; label: string }[] = [
  { id: 'house', label: 'house' },
  { id: 'techno', label: 'techno' },
  { id: 'rap', label: 'rap' },
];

const BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound`;
const ten = (g: Genre) => Array.from({ length: 10 }, (_, i) => ({ uri: `${BASE}/${g}/${String(i + 1).padStart(2, '0')}.m4a` }));

export const tracks: Record<Genre, { uri: string }[]> = { house: ten('house'), techno: ten('techno'), rap: ten('rap') };
