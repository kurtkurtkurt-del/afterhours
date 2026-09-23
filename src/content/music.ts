// arka plan müziği: tür başına 10 kesit (60 sn, 64 kbps aac). sırayla çalar, sonda başa döner.
// kaynak ve lisanslar CREDITS.md içinde.
export type Genre = 'house' | 'techno' | 'rap';

export const genres: { id: Genre; label: string }[] = [
  { id: 'house', label: 'house' },
  { id: 'techno', label: 'techno' },
  { id: 'rap', label: 'rap' },
];

export const tracks: Record<Genre, number[]> = {
  house: [
    require('../../assets/audio/house/01.m4a'),
    require('../../assets/audio/house/02.m4a'),
    require('../../assets/audio/house/03.m4a'),
    require('../../assets/audio/house/04.m4a'),
    require('../../assets/audio/house/05.m4a'),
    require('../../assets/audio/house/06.m4a'),
    require('../../assets/audio/house/07.m4a'),
    require('../../assets/audio/house/08.m4a'),
    require('../../assets/audio/house/09.m4a'),
    require('../../assets/audio/house/10.m4a'),
  ],
  techno: [
    require('../../assets/audio/techno/01.m4a'),
    require('../../assets/audio/techno/02.m4a'),
    require('../../assets/audio/techno/03.m4a'),
    require('../../assets/audio/techno/04.m4a'),
    require('../../assets/audio/techno/05.m4a'),
    require('../../assets/audio/techno/06.m4a'),
    require('../../assets/audio/techno/07.m4a'),
    require('../../assets/audio/techno/08.m4a'),
    require('../../assets/audio/techno/09.m4a'),
    require('../../assets/audio/techno/10.m4a'),
  ],
  rap: [
    require('../../assets/audio/rap/01.m4a'),
    require('../../assets/audio/rap/02.m4a'),
    require('../../assets/audio/rap/03.m4a'),
    require('../../assets/audio/rap/04.m4a'),
    require('../../assets/audio/rap/05.m4a'),
    require('../../assets/audio/rap/06.m4a'),
    require('../../assets/audio/rap/07.m4a'),
    require('../../assets/audio/rap/08.m4a'),
    require('../../assets/audio/rap/09.m4a'),
    require('../../assets/audio/rap/10.m4a'),
  ],
};
