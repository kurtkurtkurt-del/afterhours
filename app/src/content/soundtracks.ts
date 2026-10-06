import type { AudioSource } from 'expo-audio';

// Music for the places that play something of their own, each with its own tracks
// so nothing repeats across the app: 45-second excerpts bundled in assets/music
// (sources and licences in CREDITS.md and the credits screen). The background
// music is separate (content/music.ts).

// DJ clips (the record rack): AurosonMusic, tropical house.
export const clipTracks: AudioSource[] = [
  require('../../assets/music/clips-01.m4a'),
  require('../../assets/music/clips-02.m4a'),
  require('../../assets/music/clips-03.m4a'),
  require('../../assets/music/clips-04.m4a'),
  require('../../assets/music/clips-05.m4a'),
  require('../../assets/music/clips-06.m4a'),
];

// "Listen" on the now-playing card: Elijah_K, nu-disco.
export const listenTracks: AudioSource[] = [
  require('../../assets/music/listen-01.m4a'),
  require('../../assets/music/listen-02.m4a'),
  require('../../assets/music/listen-03.m4a'),
  require('../../assets/music/listen-04.m4a'),
];

// A DJ's recorded sets on the DJ page: Elijah_K, funky house.
export const setTracks: AudioSource[] = [
  require('../../assets/music/sets-01.m4a'),
  require('../../assets/music/sets-02.m4a'),
  require('../../assets/music/sets-03.m4a'),
  require('../../assets/music/sets-04.m4a'),
  require('../../assets/music/sets-05.m4a'),
  require('../../assets/music/sets-06.m4a'),
];
