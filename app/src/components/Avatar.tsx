import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme/tokens';

// A drawn face for people without a photograph: the same name always gets the same
// face (background, skin, hair style and colour are picked from the name). Flat
// shapes on a 64 grid, muted colours that sit on ink. The parent clips the corners.
const BG = ['#3B3A5C', '#5C3B3E', '#2F4A43', '#4E432C', '#36404F', '#523850', '#2E4757', '#5A4A3A'];
const SKIN = ['#F1D3BC', '#E3B48F', '#C68E66', '#9A6646', '#6E4630'];
const HAIR = ['#1E1A17', '#3E2A1E', '#7A4A26', '#C9A15A', '#B4472E', '#D9D2C5'];
const SHIRT = [colors.spot, '#F3F1EC', '#E8B04B', '#6C6961', '#2A2724'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export default function Avatar({ name, size }: { name: string; size: number }) {
  const h = hash(name || '?');
  const bg = BG[h % BG.length];
  const skin = SKIN[(h >>> 3) % SKIN.length];
  const hair = HAIR[(h >>> 6) % HAIR.length];
  const shirt = SHIRT[(h >>> 9) % SHIRT.length];
  const style = (h >>> 12) % 5;
  const glasses = (h >>> 15) % 4 === 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} fill={bg} />
      {/* long hair falls behind the shoulders */}
      {style === 1 ? <Path d="M17 30c0-12 6-19 15-19s15 7 15 19v20H17Z" fill={hair} /> : null}
      {/* shoulders */}
      <Path d="M10 64c1-11 10-17 22-17s21 6 22 17Z" fill={shirt} />
      <Rect x={27} y={39} width={10} height={10} rx={3} fill={skin} />
      {/* head */}
      <Ellipse cx={32} cy={30} rx={11} ry={13} fill={skin} />
      {/* hair on top */}
      {style === 0 ? <Path d="M20.5 27c0-9 5-14 11.5-14S43.5 18 43.5 27c-3-4-7-6-11.5-6S23.5 23 20.5 27Z" fill={hair} /> : null}
      {style === 1 ? <Path d="M20.5 30c0-11 5-17 11.5-17s11.5 6 11.5 17c-2-6-6-9-11.5-9S22.5 24 20.5 30Z" fill={hair} /> : null}
      {style === 2 ? (
        <>
          <Circle cx={32} cy={13} r={6} fill={hair} />
          <Path d="M21 27c0-8 5-12.5 11-12.5S43 19 43 27c-3-3.5-6.5-5-11-5S24 23.5 21 27Z" fill={hair} />
        </>
      ) : null}
      {style === 3 ? (
        <>
          {[22, 27, 32, 37, 42].map((x, i) => (
            <Circle key={x} cx={x} cy={i % 2 ? 17 : 19} r={5.2} fill={hair} />
          ))}
          <Circle cx={20} cy={24} r={4} fill={hair} />
          <Circle cx={44} cy={24} r={4} fill={hair} />
        </>
      ) : null}
      {style === 4 ? <Path d="M21 25c1-7 5-10 11-10s10 3 11 10c-4-2-7-3-11-3s-7 1-11 3Z" fill={hair} /> : null}
      {/* face */}
      <Circle cx={27.5} cy={31} r={1.4} fill="#1E1A17" />
      <Circle cx={36.5} cy={31} r={1.4} fill="#1E1A17" />
      <Path d={(h >>> 18) % 2 ? 'M28.5 36.5c2 2 5 2 7 0' : 'M29 37h6'} stroke="#1E1A17" strokeWidth={1.4} strokeLinecap="round" fill="none" />
      {glasses ? (
        <Path d="M23.5 31a4 4 0 1 0 8 0a4 4 0 1 0-8 0M32.5 31a4 4 0 1 0 8 0a4 4 0 1 0-8 0M31.5 31h1" stroke="#1E1A17" strokeWidth={1.2} fill="none" />
      ) : null}
    </Svg>
  );
}
