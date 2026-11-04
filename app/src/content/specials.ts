import type { Key } from '@/i18n';

// Specialties (owner, 22.10.2026; fifty of them since 03.11.2026, most still empty): decks of
// one occasion — halloween, new year, pride, christmas… — under the groups on connect. Each is played like the friends'
// deck; around it, motifs of the occasion (components/Motifs.tsx). The nights come from
// the listings by their names (data/specials.ts), from every city, yours first.
export type SpecialId =
  | 'halloween'
  | 'newyear'
  | 'july4'
  | 'oktoberfest'
  | 'valentines'
  | 'carnival'
  | 'mardigras'
  | 'womensday'
  | 'stpatricks'
  | 'nowruz'
  | 'equinox'
  | 'holi'
  | 'aprilfools'
  | 'easter'
  | 'april23'
  | 'kingsday'
  | 'mayday'
  | 'cincodemayo'
  | 'eurovision'
  | 'may19'
  | 'mothersday'
  | 'clfinal'
  | 'pride'
  | 'midsummer'
  | 'fathersday'
  | 'fullmoon'
  | 'bastille'
  | 'tomorrowland'
  | 'swissday'
  | 'nottinghill'
  | 'august30'
  | 'burningman'
  | 'ravetheplanet'
  | 'fashionweek'
  | 'filmfestival'
  | 'republicday'
  | 'dayofthedead'
  | 'diwali'
  | 'guyfawkes'
  | 'november10'
  | 'thanksgiving'
  | 'blackfriday'
  | 'christmas'
  | 'boxingday'
  | 'chinesenewyear'
  | 'eid'
  | 'ramadan'
  | 'friday13'
  | 'superbowl'
  | 'worldcup';
// The set of motifs drawn around it (components/Motifs.tsx); 'plain' is the shared one.
export type MotifSet = 'halloween' | 'newyear' | 'july4' | 'oktoberfest' | 'plain';

export type Special = {
  id: SpecialId;
  label: Key;
  // Postgres regex on the title (case-insensitive, \m \M = word edges: "nye" is not "kanye").
  match: string;
  // When it happens, for the order of the row and "back in …" on an empty deck.
  month: number; // 1–12
  day: number;
  // The colours of its cover and of the room around its deck.
  ground: string;
  deep: string;
  ink: string; // words on the cover
  accents: string[];
  motif: MotifSet;
};

export const specials: Special[] = [
  {
    id: 'halloween',
    label: 'special.halloween',
    motif: 'halloween',
    match: '(hallowe.?en|helloween|samhain|cadılar bayram)',
    month: 10,
    day: 31,
    ground: '#E0711F',
    deep: '#2A1238',
    ink: '#FFF3E4',
    accents: ['#F59A2E', '#7B3FA0', '#F6E7C8'],
  },
  {
    id: 'newyear',
    label: 'special.newyear',
    motif: 'newyear',
    match: '(silvester|new.?year|\\mnye\\M|yılbaşı|neujahr|hogmanay)',
    month: 12,
    day: 31,
    ground: '#14182B',
    deep: '#05060D',
    ink: '#FFF6DE',
    accents: ['#E8B04B', '#F4E3B0', '#C9CED8', '#E2574C'],
  },
  {
    id: 'july4',
    label: 'special.july4',
    motif: 'july4',
    match: '(4th of july|fourth of july|independence day|\\mjuly 4)',
    month: 7,
    day: 4,
    ground: '#1F3A93',
    deep: '#0E1C4D',
    ink: '#FFFFFF',
    accents: ['#C8102E', '#FFFFFF', '#8FB2F2'],
  },
  {
    id: 'oktoberfest',
    label: 'special.oktoberfest',
    motif: 'oktoberfest',
    match: '(oktoberfest|octoberfest|\\mwiesn|bierfest)',
    month: 9,
    day: 20,
    ground: '#1E6FB8',
    deep: '#0D3A63',
    ink: '#FFFFFF',
    accents: ['#FFFFFF', '#D9A441', '#7FB4E6'],
  },
  // the rest (03.11.2026): the plain motifs, a palette each; their nights arrive as the listings name them
  { id: 'valentines', label: 'special.valentines', motif: 'plain', match: '(valentine|valentinstag|sevgililer)', month: 2, day: 14, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'carnival', label: 'special.carnival', motif: 'plain', match: '(carnival|karneval|fasching|carnaval|karnaval)', month: 2, day: 16, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'mardigras', label: 'special.mardigras', motif: 'plain', match: '(mardi gras|fat tuesday)', month: 2, day: 17, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'womensday', label: 'special.womensday', motif: 'plain', match: '(women.?s day|frauentag|kadınlar günü|8 march|8\. märz)', month: 3, day: 8, ground: '#2B9C7F', deep: '#0D3A31', ink: '#F0FFF8', accents: ['#B5F0DC', '#FFD166', '#F28CB1'] },
  { id: 'stpatricks', label: 'special.stpatricks', motif: 'plain', match: '(st\.? ?patrick|paddy.?s day)', month: 3, day: 17, ground: '#5E4AE3', deep: '#1C1446', ink: '#F3F0FF', accents: ['#C7BEFF', '#FFD166', '#8FE3FF'] },
  { id: 'nowruz', label: 'special.nowruz', motif: 'plain', match: '(nowruz|nevruz|newroz|norooz)', month: 3, day: 21, ground: '#D9A441', deep: '#4A3410', ink: '#FFF8E8', accents: ['#FFE8A8', '#F3F1EC', '#E2574C'] },
  { id: 'equinox', label: 'special.equinox', motif: 'plain', match: '(equinox|tagundnachtgleiche|ekinoks)', month: 3, day: 20, ground: '#1F6FE0', deep: '#0B2552', ink: '#EEF4FF', accents: ['#9CC3FF', '#F3F1EC', '#FFD166'] },
  { id: 'holi', label: 'special.holi', motif: 'plain', match: '(\mholi\M|festival of colou?rs)', month: 3, day: 14, ground: '#D8428F', deep: '#4A0F30', ink: '#FFEEF6', accents: ['#FFB3D9', '#FFD166', '#8FE3FF'] },
  { id: 'aprilfools', label: 'special.aprilfools', motif: 'plain', match: '(april fool|1\. april)', month: 4, day: 1, ground: '#2A2724', deep: '#0E0D0C', ink: '#F3F1EC', accents: ['#D7261E', '#E8B04B', '#CFCBC2'] },
  { id: 'easter', label: 'special.easter', motif: 'plain', match: '(easter|ostern|paskalya|oster)', month: 4, day: 5, ground: '#1F6FE0', deep: '#0B2552', ink: '#EEF4FF', accents: ['#9CC3FF', '#F3F1EC', '#FFD166'] },
  { id: 'april23', label: 'special.april23', motif: 'plain', match: '(23 nisan|çocuk bayram|23 april)', month: 4, day: 23, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'kingsday', label: 'special.kingsday', motif: 'plain', match: '(king.?s ?day|koningsdag)', month: 4, day: 27, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'mayday', label: 'special.mayday', motif: 'plain', match: '(may ?day|1\. mai|tanz in den mai|1 mayıs|walpurgis)', month: 5, day: 1, ground: '#5E4AE3', deep: '#1C1446', ink: '#F3F0FF', accents: ['#C7BEFF', '#FFD166', '#8FE3FF'] },
  { id: 'cincodemayo', label: 'special.cincodemayo', motif: 'plain', match: '(cinco de mayo)', month: 5, day: 5, ground: '#D8428F', deep: '#4A0F30', ink: '#FFEEF6', accents: ['#FFB3D9', '#FFD166', '#8FE3FF'] },
  { id: 'eurovision', label: 'special.eurovision', motif: 'plain', match: '(eurovision|\mesc\M)', month: 5, day: 16, ground: '#D9A441', deep: '#4A3410', ink: '#FFF8E8', accents: ['#FFE8A8', '#F3F1EC', '#E2574C'] },
  { id: 'may19', label: 'special.may19', motif: 'plain', match: '(19 mayıs|gençlik ve spor)', month: 5, day: 19, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'mothersday', label: 'special.mothersday', motif: 'plain', match: '(mother.?s day|muttertag|anneler günü)', month: 5, day: 10, ground: '#2B9C7F', deep: '#0D3A31', ink: '#F0FFF8', accents: ['#B5F0DC', '#FFD166', '#F28CB1'] },
  { id: 'clfinal', label: 'special.clfinal', motif: 'plain', match: '(champions league|ucl final)', month: 5, day: 30, ground: '#5E4AE3', deep: '#1C1446', ink: '#F3F0FF', accents: ['#C7BEFF', '#FFD166', '#8FE3FF'] },
  { id: 'pride', label: 'special.pride', motif: 'plain', match: '(\mpride\M|\mcsd\M|christopher street)', month: 6, day: 28, ground: '#2B9C7F', deep: '#0D3A31', ink: '#F0FFF8', accents: ['#B5F0DC', '#FFD166', '#F28CB1'] },
  { id: 'midsummer', label: 'special.midsummer', motif: 'plain', match: '(midsummer|mittsommer|midsommar|solstice|sonnenwende|gündönümü|juhannus)', month: 6, day: 21, ground: '#1F6FE0', deep: '#0B2552', ink: '#EEF4FF', accents: ['#9CC3FF', '#F3F1EC', '#FFD166'] },
  { id: 'fathersday', label: 'special.fathersday', motif: 'plain', match: '(father.?s day|vatertag|babalar günü)', month: 6, day: 14, ground: '#2A2724', deep: '#0E0D0C', ink: '#F3F1EC', accents: ['#D7261E', '#E8B04B', '#CFCBC2'] },
  { id: 'fullmoon', label: 'special.fullmoon', motif: 'plain', match: '(full ?moon|vollmond|dolunay)', month: 6, day: 30, ground: '#D9A441', deep: '#4A3410', ink: '#FFF8E8', accents: ['#FFE8A8', '#F3F1EC', '#E2574C'] },
  { id: 'bastille', label: 'special.bastille', motif: 'plain', match: '(bastille|14 juillet|fête nationale)', month: 7, day: 14, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'tomorrowland', label: 'special.tomorrowland', motif: 'plain', match: '(tomorrowland)', month: 7, day: 18, ground: '#D8428F', deep: '#4A0F30', ink: '#FFEEF6', accents: ['#FFB3D9', '#FFD166', '#8FE3FF'] },
  { id: 'swissday', label: 'special.swissday', motif: 'plain', match: '(1\. august|bundesfeier|swiss national)', month: 8, day: 1, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'nottinghill', label: 'special.nottinghill', motif: 'plain', match: '(notting hill)', month: 8, day: 30, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'august30', label: 'special.august30', motif: 'plain', match: '(30 ağustos|zafer bayram)', month: 8, day: 30, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'burningman', label: 'special.burningman', motif: 'plain', match: '(burning man|burner)', month: 8, day: 31, ground: '#2A2724', deep: '#0E0D0C', ink: '#F3F1EC', accents: ['#D7261E', '#E8B04B', '#CFCBC2'] },
  { id: 'ravetheplanet', label: 'special.ravetheplanet', motif: 'plain', match: '(rave the planet|love ?parade)', month: 8, day: 8, ground: '#2B9C7F', deep: '#0D3A31', ink: '#F0FFF8', accents: ['#B5F0DC', '#FFD166', '#F28CB1'] },
  { id: 'fashionweek', label: 'special.fashionweek', motif: 'plain', match: '(fashion ?week|moda haftası)', month: 9, day: 12, ground: '#5E4AE3', deep: '#1C1446', ink: '#F3F0FF', accents: ['#C7BEFF', '#FFD166', '#8FE3FF'] },
  { id: 'filmfestival', label: 'special.filmfestival', motif: 'plain', match: '(film ?fest|filmfest|berlinale|cannes|film festivali)', month: 9, day: 5, ground: '#D9A441', deep: '#4A3410', ink: '#FFF8E8', accents: ['#FFE8A8', '#F3F1EC', '#E2574C'] },
  { id: 'republicday', label: 'special.republicday', motif: 'plain', match: '(29 ekim|cumhuriyet bayram|republic day)', month: 10, day: 29, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'dayofthedead', label: 'special.dayofthedead', motif: 'plain', match: '(day of the dead|d[ií]a de (los )?muertos)', month: 11, day: 2, ground: '#1F6FE0', deep: '#0B2552', ink: '#EEF4FF', accents: ['#9CC3FF', '#F3F1EC', '#FFD166'] },
  { id: 'diwali', label: 'special.diwali', motif: 'plain', match: '(diwali|deepavali)', month: 11, day: 1, ground: '#D8428F', deep: '#4A0F30', ink: '#FFEEF6', accents: ['#FFB3D9', '#FFD166', '#8FE3FF'] },
  { id: 'guyfawkes', label: 'special.guyfawkes', motif: 'plain', match: '(bonfire night|guy fawkes)', month: 11, day: 5, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'november10', label: 'special.november10', motif: 'plain', match: '(10 kasım|atatürk.?ü anma)', month: 11, day: 10, ground: '#2A2724', deep: '#0E0D0C', ink: '#F3F1EC', accents: ['#D7261E', '#E8B04B', '#CFCBC2'] },
  { id: 'thanksgiving', label: 'special.thanksgiving', motif: 'plain', match: '(thanksgiving|friendsgiving)', month: 11, day: 26, ground: '#B5172C', deep: '#3A0710', ink: '#FFF0EC', accents: ['#F2B8C6', '#FFD166', '#FFF0EC'] },
  { id: 'blackfriday', label: 'special.blackfriday', motif: 'plain', match: '(black friday)', month: 11, day: 27, ground: '#2B9C7F', deep: '#0D3A31', ink: '#F0FFF8', accents: ['#B5F0DC', '#FFD166', '#F28CB1'] },
  { id: 'christmas', label: 'special.christmas', motif: 'plain', match: '(christmas|x-?mas|weihnacht|\mnoel\M|yule|wichteln)', month: 12, day: 24, ground: '#5E4AE3', deep: '#1C1446', ink: '#F3F0FF', accents: ['#C7BEFF', '#FFD166', '#8FE3FF'] },
  { id: 'boxingday', label: 'special.boxingday', motif: 'plain', match: '(boxing day|2\. weihnachtstag)', month: 12, day: 26, ground: '#D9A441', deep: '#4A3410', ink: '#FFF8E8', accents: ['#FFE8A8', '#F3F1EC', '#E2574C'] },
  { id: 'chinesenewyear', label: 'special.chinesenewyear', motif: 'plain', match: '(lunar new year|chinese new year|chinesisches neujahr|tết|seollal)', month: 1, day: 29, ground: '#E86A2B', deep: '#3D1A0C', ink: '#FFF4E6', accents: ['#FFD166', '#6CCBD6', '#F28CB1'] },
  { id: 'eid', label: 'special.eid', motif: 'plain', match: '(\meid\M|bayram gecesi|ramazan bayram|kurban bayram|zuckerfest)', month: 3, day: 30, ground: '#1F6FE0', deep: '#0B2552', ink: '#EEF4FF', accents: ['#9CC3FF', '#F3F1EC', '#FFD166'] },
  { id: 'ramadan', label: 'special.ramadan', motif: 'plain', match: '(ramadan|ramazan|iftar)', month: 3, day: 1, ground: '#D8428F', deep: '#4A0F30', ink: '#FFEEF6', accents: ['#FFB3D9', '#FFD166', '#8FE3FF'] },
  { id: 'friday13', label: 'special.friday13', motif: 'plain', match: '(friday the 13|freitag der 13|13\. cuma)', month: 6, day: 13, ground: '#2A2724', deep: '#0E0D0C', ink: '#F3F1EC', accents: ['#D7261E', '#E8B04B', '#CFCBC2'] },
  { id: 'superbowl', label: 'special.superbowl', motif: 'plain', match: '(super ?bowl)', month: 2, day: 8, ground: '#5E4AE3', deep: '#1C1446', ink: '#F3F0FF', accents: ['#C7BEFF', '#FFD166', '#8FE3FF'] },
  { id: 'worldcup', label: 'special.worldcup', motif: 'plain', match: '(world cup|weltmeisterschaft|\mwm\M|dünya kupası|public viewing)', month: 6, day: 11, ground: '#2B9C7F', deep: '#0D3A31', ink: '#F0FFF8', accents: ['#B5F0DC', '#FFD166', '#F28CB1'] },
];

export const specialOf = (id: SpecialId) => specials.find((s) => s.id === id)!;

// The next time it happens (today counts until the day is over).
export function nextDate(s: Special, now = new Date()) {
  const y = now.getFullYear();
  const day = new Date(y, s.month - 1, s.day);
  const end = new Date(y, s.month - 1, s.day + 1);
  return now < end ? day : new Date(y + 1, s.month - 1, s.day);
}

// Soonest occasion first.
export const bySoonest = (list: Special[], now = new Date()) => [...list].sort((a, b) => nextDate(a, now).getTime() - nextDate(b, now).getTime());
