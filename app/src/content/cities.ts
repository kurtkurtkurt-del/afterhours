// Fallback cities and this week's night counts, used when the network is unavailable.
// country: the name in its own language; countrySlug: ISO 3166 alpha-2, lower case.
export type City = { id: string; name: string; nights: number; country: string; countrySlug: string };

export const cities: City[] = [
  { id: 'munchen', name: 'münchen', nights: 14, country: 'Deutschland', countrySlug: 'de' },
  { id: 'istanbul', name: 'istanbul', nights: 31, country: 'Türkiye', countrySlug: 'tr' },
  { id: 'berlin', name: 'berlin', nights: 42, country: 'Deutschland', countrySlug: 'de' },
  { id: 'wien', name: 'wien', nights: 9, country: 'Österreich', countrySlug: 'at' },
  { id: 'koln', name: 'köln', nights: 11, country: 'Deutschland', countrySlug: 'de' },
  { id: 'ankara', name: 'ankara', nights: 6, country: 'Türkiye', countrySlug: 'tr' },
];

