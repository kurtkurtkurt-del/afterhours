// Fallback cities and this week's night counts, used when the network is unavailable.
export type City = { id: string; name: string; nights: number };

export const cities: City[] = [
  { id: 'munchen', name: 'münchen', nights: 14 },
  { id: 'istanbul', name: 'istanbul', nights: 31 },
  { id: 'berlin', name: 'berlin', nights: 42 },
  { id: 'wien', name: 'wien', nights: 9 },
  { id: 'koln', name: 'köln', nights: 11 },
  { id: 'ankara', name: 'ankara', nights: 6 },
];

