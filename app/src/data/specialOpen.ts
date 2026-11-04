import type { SpecialId } from '@/content/specials';

// The all-specialties page (app/specials.tsx) picks an occasion; the connect tab, which
// owns the deck viewer, opens it when it comes back into focus (03.11.2026).
let pending: SpecialId | null = null;
export const askSpecial = (id: SpecialId) => {
  pending = id;
};
export const takeSpecial = () => {
  const id = pending;
  pending = null;
  return id;
};
