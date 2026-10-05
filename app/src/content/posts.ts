import type { ImageSourcePropType } from 'react-native';

// Sample posts for the "from past nights" feed on yours: what the feed will look like
// once people post their own photos from a night. Marked "sample" on screen. The words
// are written the way people would write them (Munich crowd: english, deutsch, türkçe
// mixed) and are not translated, like real posts. Photos: Unsplash, see CREDITS.md.
export type SampleComment = { who: string; text: string };
export type SamplePost = {
  id: string;
  who: string;        // a sample friend's name (content/friends.ts)
  venue: string;
  city: string;
  daysAgo: number;
  photo: ImageSourcePropType;
  caption: string;
  likes: number;
  comments: SampleComment[]; // the first two show, the rest behind "all n comments"
};

export const SAMPLE_POSTS: SamplePost[] = [
  {
    id: 'sp-1',
    who: 'jonas',
    venue: 'blitz',
    city: 'münchen',
    daysAgo: 1,
    photo: require('../../assets/feed/t1.jpg'),
    caption: '5:40 and he played the one track i have been looking for since march. still no id.',
    likes: 48,
    comments: [
      { who: 'mira', text: 'the one at 4 with the vocal?? i need it too' },
      { who: 'erdem', text: 'shazam said nothing, as usual' },
      { who: 'selin', text: 'next time we go together, no excuses' },
    ],
  },
  {
    id: 'sp-2',
    who: 'selin',
    venue: 'harry klein',
    city: 'münchen',
    daysAgo: 2,
    photo: require('../../assets/feed/a3.jpg'),
    caption: 'bu fotoğrafı kim çektiyse teşekkürler, hiçbirimiz hatırlamıyoruz',
    likes: 63,
    comments: [
      { who: 'pınar', text: 'ben çektim ve pişman değilim' },
      { who: 'deniz', text: 'saat 3 civarı, eminim' },
      { who: 'kaan', text: 'neden ben yokum bu fotoda' },
      { who: 'selin', text: '@kaan çünkü sen bardaydın' },
    ],
  },
  {
    id: 'sp-3',
    who: 'mira',
    venue: 'rooftop at the werksviertel',
    city: 'münchen',
    daysAgo: 4,
    photo: require('../../assets/feed/r2.jpg'),
    caption: 'last warm evening of the year. we stayed until they took the speakers away.',
    likes: 37,
    comments: [
      { who: 'anna', text: 'this light 🧡' },
      { who: 'lina', text: 'can we pretend it is still august' },
    ],
  },
  {
    id: 'sp-4',
    who: 'erdem',
    venue: 'rote sonne',
    city: 'münchen',
    daysAgo: 6,
    photo: require('../../assets/feed/t3.jpg'),
    caption: 'nebelmaschine auf 100. hab niemanden gesehen und es war perfekt.',
    likes: 52,
    comments: [
      { who: 'jonas', text: 'ich stand neben dir die ganze zeit lol' },
      { who: 'berk', text: 'sound war brutal heute' },
      { who: 'eda', text: 'nächsten freitag wieder?' },
    ],
  },
  {
    id: 'sp-5',
    who: 'pınar',
    venue: 'a garden in haidhausen',
    city: 'münchen',
    daysAgo: 9,
    photo: require('../../assets/feed/f3.jpg'),
    caption: "deniz'in doğum günü. ud çalan adamı kimse tanımıyordu ama herkes onu sevdi.",
    likes: 29,
    comments: [
      { who: 'deniz', text: 'en güzel doğum günüm, söz' },
      { who: 'eda', text: 'masadaki her şeyi ben yedim itiraf ediyorum' },
    ],
  },
  {
    id: 'sp-6',
    who: 'lina',
    venue: 'kong',
    city: 'münchen',
    daysAgo: 12,
    photo: require('../../assets/feed/h1.jpg'),
    caption: 'didn’t check my phone once. this is the only proof i was there.',
    likes: 41,
    comments: [
      { who: 'mira', text: 'iconic' },
      { who: 'anna', text: 'the pink lights in there are unreal' },
    ],
  },
  {
    id: 'sp-7',
    who: 'kaan',
    venue: 'bahnwärter thiel',
    city: 'münchen',
    daysAgo: 15,
    photo: require('../../assets/feed/w1.jpg'),
    caption: 'normal gets you nowhere. took that personally.',
    likes: 34,
    comments: [
      { who: 'berk', text: 'kapıda 40 dakika bekledik ama değdi' },
      { who: 'jonas', text: 'the sign is right' },
    ],
  },
  {
    id: 'sp-8',
    who: 'deniz',
    venue: 'tollwood',
    city: 'münchen',
    daysAgo: 21,
    photo: require('../../assets/feed/e1.jpg'),
    caption: 'konfeti hâlâ ceketimin cebinden çıkıyor.',
    likes: 58,
    comments: [
      { who: 'selin', text: 'benimkinden de 😭' },
      { who: 'erdem', text: 'that drop with the confetti, i screamed' },
      { who: 'pınar', text: 'gelecek yıl ön sıra' },
    ],
  },
  {
    id: 'sp-9',
    who: 'eda',
    venue: 'goldene bar',
    city: 'münchen',
    daysAgo: 26,
    photo: require('../../assets/feed/f2.jpg'),
    caption: 'to the friend who finally got the job. drinks were on her.',
    likes: 45,
    comments: [
      { who: 'anna', text: 'still can’t believe it, proud of you' },
      { who: 'kaan', text: 'next round is mine' },
    ],
  },
  {
    id: 'sp-10',
    who: 'berk',
    venue: 'p1',
    city: 'münchen',
    daysAgo: 33,
    photo: require('../../assets/feed/a2.jpg'),
    caption: 'üçümüz, saat dört, kimse eve gitmek istemiyor.',
    likes: 39,
    comments: [
      { who: 'deniz', text: 'sabah 7 kahvaltısı efsaneydi' },
      { who: 'mira', text: 'who is the guy in the back lol' },
      { who: 'berk', text: '@mira hiçbir fikrimiz yok' },
    ],
  },
];
