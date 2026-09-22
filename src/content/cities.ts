// şehirler ve bu haftaki gece sayıları. sahte veri; supabase gelince buradan okunur.
export type City = { id: string; name: string; nights: number };

export const cities: City[] = [
  { id: 'munich', name: 'münih', nights: 14 },
  { id: 'istanbul', name: 'istanbul', nights: 31 },
  { id: 'berlin', name: 'berlin', nights: 42 },
  { id: 'vienna', name: 'wien', nights: 9 },
  { id: 'cologne', name: 'köln', nights: 11 },
  { id: 'ankara', name: 'ankara', nights: 6 },
];

export const cityById = (id?: string) => cities.find((c) => c.id === id);
