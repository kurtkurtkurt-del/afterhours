import type { ImageSourcePropType } from 'react-native';

// Sample DJ stories until DJs can post their own: a few frames each, shown for
// FRAME_MS apiece. Captions are the DJ's own words, so they stay untranslated.
export type StoryFrame = { image: ImageSourcePropType; caption: string };
export type Story = { dj: string; hoursAgo: number; frames: StoryFrame[] };

export const FRAME_MS = 5000;

export const stories: Story[] = [
  {
    dj: 'mara-volt',
    hoursAgo: 2,
    frames: [
      { image: require('../../assets/intro/concert.jpg'), caption: 'soundcheck at blitz. see you at 01:00' },
      { image: require('../../assets/djs/mara-volt.jpg'), caption: 'closing set tonight, bring earplugs' },
    ],
  },
  {
    dj: 'orbit-9',
    hoursAgo: 5,
    frames: [
      { image: require('../../assets/djs/orbit-9.jpg'), caption: 'new edit out friday' },
      { image: require('../../assets/djs/nachtfalter.jpg'), caption: 'b2b with nachtfalter next month' },
      { image: require('../../assets/djs/tuesday-club.jpg'), caption: 'thank you rote sonne' },
    ],
  },
];
