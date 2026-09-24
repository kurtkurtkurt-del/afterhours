// arka plan müziği: tür başına 10 kesit (60 sn, 64 kbps aac), supabase'in "sound" deposundan
// akar (21_sound.sql). dosyalar repo'da sound/ altında durur, pakete girmez;
// backend/tools/upload-sound.mjs ile depoya konur. kaynak ve lisanslar CREDITS.md içinde.
export type Genre = 'house' | 'techno' | 'rap';

export const genres: { id: Genre; label: string }[] = [
  { id: 'house', label: 'house' },
  { id: 'techno', label: 'techno' },
  { id: 'rap', label: 'rap' },
];

const BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sound`;
const ten = (g: Genre) => Array.from({ length: 10 }, (_, i) => ({ uri: `${BASE}/${g}/${String(i + 1).padStart(2, '0')}.m4a` }));

export const tracks: Record<Genre, { uri: string }[]> = { house: ten('house'), techno: ten('techno'), rap: ten('rap') };
