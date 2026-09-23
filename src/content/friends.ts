// sahte arkadaşlar, geceler ve eşleşmeler. gerçek veri: friendships, friends_kept(), check-in.
export type Friend = { id: string; name: string; handle: string; live?: string; kept: number; seen: string };
export type NightCard = { id: string; title: string; venue: string; when: string; photo: number; friends: string[] };
export type Match = { friend: string; night: string };

const P = [
  require('../../assets/djs/mara-volt.jpg'),
  require('../../assets/djs/levent-ok.jpg'),
  require('../../assets/djs/nachtfalter.jpg'),
  require('../../assets/djs/ines-okur.jpg'),
  require('../../assets/djs/tuesday-club.jpg'),
  require('../../assets/djs/dilan-k.jpg'),
  require('../../assets/djs/orbit-9.jpg'),
  require('../../assets/djs/selin.jpg'),
];

export const friends: Friend[] = [
  { id: 'erdem', name: 'erdem', handle: 'erdem_k', live: 'rote sonne', kept: 4, seen: 'now' },
  { id: 'mira', name: 'mira', handle: 'mira.v', live: 'blitz', kept: 6, seen: 'now' },
  { id: 'lina', name: 'lina', handle: 'lina', kept: 2, seen: '1h' },
  { id: 'kaan', name: 'kaan', handle: 'kaan__', kept: 1, seen: 'tue' },
  { id: 'jonas', name: 'jonas', handle: 'jns', live: 'blitz', kept: 9, seen: 'now' },
  { id: 'eda', name: 'eda', handle: 'eda.s', kept: 3, seen: '3h' },
  { id: 'deniz', name: 'deniz', handle: 'dnz', kept: 5, seen: 'yesterday' },
  { id: 'anna', name: 'anna', handle: 'anna_b', kept: 0, seen: 'mon' },
  { id: 'selin', name: 'selin', handle: 'selin_k', live: 'harry klein', kept: 7, seen: 'now' },
  { id: 'berk', name: 'berk', handle: 'brk', kept: 2, seen: 'sat' },
  { id: 'pinar', name: 'pınar', handle: 'pnr', kept: 3, seen: '2h' },
  { id: 'arda', name: 'arda', handle: 'arda.o', kept: 1, seen: 'wed' },
  { id: 'zeynep', name: 'zeynep', handle: 'zey', kept: 8, seen: '20m' },
  { id: 'ilke', name: 'ilke', handle: 'ilke', kept: 2, seen: 'sun' },
  { id: 'ceren', name: 'ceren', handle: 'crn', kept: 4, seen: 'fri' },
  { id: 'can', name: 'can', handle: 'can_', kept: 0, seen: 'thu' },
];

export const nights: NightCard[] = [
  { id: 'blitz', title: 'blitz all night', venue: 'blitz · museumsinsel', when: 'tonight · 23:00', photo: P[1], friends: ['mira', 'jonas', 'lina', 'zeynep'] },
  { id: 'hk', title: 'harry klein closing', venue: 'harry klein', when: 'tonight · 22:00', photo: P[0], friends: ['selin', 'eda'] },
  { id: 'rs', title: 'rote sonne · tuesday club', venue: 'rote sonne', when: 'tonight · 23:30', photo: P[4], friends: ['erdem'] },
  { id: 'bt', title: 'bahnwärter thiel open air', venue: 'bahnwärter thiel', when: 'sat · 20:00', photo: P[5], friends: ['deniz', 'berk', 'ceren'] },
  { id: 'kk', title: 'kadıköy alt kat', venue: 'karaköy', when: 'sat · 23:00', photo: P[3], friends: ['pinar', 'arda'] },
  { id: 'muffat', title: 'muffathalle · konzert', venue: 'muffathalle', when: 'sun · 20:00', photo: P[6], friends: ['lina', 'ilke'] },
  { id: 'pimp', title: 'pimpernel late', venue: 'pimpernel', when: 'sun · 01:00', photo: P[7], friends: ['zeynep'] },
  { id: 'szene', title: 'szene · nachtfalter', venue: 'address at check-in', when: 'next fri', photo: P[2], friends: ['jonas', 'mira', 'can'] },
];

export const matches: Match[] = [
  { friend: 'lina', night: 'blitz' },
  { friend: 'selin', night: 'hk' },
  { friend: 'deniz', night: 'bt' },
];

export const friendById = (id: string) => friends.find((f) => f.id === id)!;
export const nightById = (id: string) => nights.find((n) => n.id === id)!;
