// The nights of the list you opened one from (the flow's classic or poster view): on the night
// page a swipe sideways goes to the one before or after it (owner, 28.10.2026). Kept in memory
// only; opening a night from anywhere else leaves it out of the sequence.
let seq: string[] = [];

export const setNightSeq = (slugs: string[]) => {
  seq = slugs.filter(Boolean);
};
export function nightAround(slug: string) {
  const i = seq.indexOf(slug);
  if (i < 0) return null;
  return { prev: seq[i - 1] ?? null, next: seq[i + 1] ?? null, i, n: seq.length };
}
