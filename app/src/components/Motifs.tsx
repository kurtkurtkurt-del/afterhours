import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { Special, SpecialId } from '@/content/specials';

// The motifs of the specialties (content/specials.ts), drawn by hand in a 100 × 100 box:
// pumpkins, bats, a web and the moon for halloween; bursts, confetti and sparkles for new
// year; stars, stripes and bursts for the fourth of july; the bavarian diamonds, pretzels
// and a mug for oktoberfest. MotifField scatters them over a cover or around a deck.

type Name = 'pumpkin' | 'bat' | 'web' | 'moon' | 'burst' | 'confetti' | 'sparkle' | 'star' | 'stripes' | 'lozenge' | 'pretzel' | 'mug';

const star5 = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.42 : r;
    return `${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

function Drawing({ name, c }: { name: Name; c: string[] }) {
  const [a, b, d = a, e = b] = c;
  switch (name) {
    case 'pumpkin':
      return (
        <G>
          <Path d="M49 30 C48 21 52 14 59 11" stroke="#5E7D32" strokeWidth={6} strokeLinecap="round" fill="none" />
          <Ellipse cx={34} cy={60} rx={24} ry={30} fill={a} />
          <Ellipse cx={66} cy={60} rx={24} ry={30} fill={a} />
          <Ellipse cx={50} cy={60} rx={22} ry={32} fill={a} />
          <Path d="M50 29 C42 42 42 78 50 91 M50 29 C58 42 58 78 50 91 M32 33 C22 48 24 76 34 89 M68 33 C78 48 76 76 66 89" stroke={b} strokeOpacity={0.35} strokeWidth={2} fill="none" />
          <Path d="M31 52 L39 41 L45 54 Z M55 54 L61 41 L69 52 Z" fill={b} />
          <Path d="M29 66 L36 72 L42 66 L50 73 L58 66 L64 72 L71 66 L66 80 L34 80 Z" fill={b} />
        </G>
      );
    case 'bat':
      return (
        <Path
          d="M50 44 C47 38 43 37 40 40 C34 31 20 30 6 39 C16 41 21 48 22 56 C27 49 33 49 37 54 C41 49 46 51 50 58 C54 51 59 49 63 54 C67 49 73 49 78 56 C79 48 84 41 94 39 C80 30 66 31 60 40 C57 37 53 38 50 44 Z M45 41 L43 32 L49 37 Z M55 41 L57 32 L51 37 Z"
          fill={a}
        />
      );
    case 'web': {
      const rays = [0, 15, 30, 45, 60, 75, 90].map((deg) => (deg * Math.PI) / 180);
      const rings = [22, 42, 62, 82];
      return (
        <G stroke={a} strokeWidth={1.2} fill="none" strokeOpacity={0.85}>
          {rays.map((r, i) => (
            <Line key={i} x1={0} y1={0} x2={100 * Math.cos(r)} y2={100 * Math.sin(r)} />
          ))}
          {rings.map((rad) => (
            <Path
              key={rad}
              d={rays
                .map((r, i) => {
                  const x = rad * Math.cos(r);
                  const y = rad * Math.sin(r);
                  if (i === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
                  const m = (r + rays[i - 1]) / 2;
                  return `Q${((rad - 7) * Math.cos(m)).toFixed(1)} ${((rad - 7) * Math.sin(m)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ')}
            />
          ))}
          <Line x1={58} y1={58} x2={58} y2={78} />
          <Circle cx={58} cy={82} r={4} fill={a} />
        </G>
      );
    }
    case 'moon':
      return <Path d="M62 12 A38 38 0 1 0 88 78 A30 30 0 1 1 62 12 Z" fill={a} />;
    case 'burst':
      return (
        <G>
          {Array.from({ length: 14 }, (_, i) => {
            const r = (i * 2 * Math.PI) / 14;
            const col = i % 2 ? b : a;
            return (
              <G key={i}>
                <Line x1={50 + 12 * Math.cos(r)} y1={50 + 12 * Math.sin(r)} x2={50 + (i % 2 ? 34 : 40) * Math.cos(r)} y2={50 + (i % 2 ? 34 : 40) * Math.sin(r)} stroke={col} strokeWidth={2.4} strokeLinecap="round" />
                <Circle cx={50 + 46 * Math.cos(r)} cy={50 + 46 * Math.sin(r)} r={i % 2 ? 1.8 : 2.6} fill={col} />
              </G>
            );
          })}
          <Circle cx={50} cy={50} r={4} fill={a} />
        </G>
      );
    case 'confetti':
      return (
        <G>
          {[
            [12, 18, 20, a], [38, 8, -30, b], [70, 16, 45, d], [86, 40, 10, e], [20, 52, 60, b], [52, 44, -15, a],
            [78, 70, 35, b], [30, 82, -50, d], [60, 88, 20, a], [8, 76, 5, e],
          ].map(([x, y, rot, col], i) =>
            i % 3 === 2 ? (
              <Circle key={i} cx={x as number} cy={y as number} r={3} fill={col as string} />
            ) : (
              <Rect key={i} x={(x as number) - 5} y={(y as number) - 2} width={10} height={4} rx={1} fill={col as string} transform={`rotate(${rot} ${x} ${y})`} />
            ),
          )}
        </G>
      );
    case 'sparkle':
      return <Path d="M50 6 C53 38 62 47 94 50 C62 53 53 62 50 94 C47 62 38 53 6 50 C38 47 47 38 50 6 Z" fill={a} />;
    case 'star':
      return <Polygon points={star5(50, 53, 46)} fill={a} />;
    case 'stripes':
      return (
        <G>
          {Array.from({ length: 7 }, (_, i) => (
            <Rect key={i} x={0} y={i * (100 / 7)} width={100} height={100 / 7 + 0.5} fill={i % 2 ? b : a} />
          ))}
        </G>
      );
    case 'lozenge': {
      // the bavarian diamonds: a lattice of rotated squares, blue and white
      const cells = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const x = col * 20 + (row % 2 ? 10 : 0);
          const y = row * 20;
          cells.push(<Polygon key={`${row}-${col}`} points={`${x},${y + 10} ${x + 10},${y} ${x + 20},${y + 10} ${x + 10},${y + 20}`} fill={(row + col) % 2 ? b : a} />);
        }
      }
      return <G>{cells}</G>;
    }
    case 'pretzel':
      return (
        <G>
          <Path
            d="M50 70 C36 84 12 76 13 54 C14 33 36 26 50 44 C64 26 86 33 87 54 C88 76 64 84 50 70 M50 44 C42 56 34 66 26 82 M50 44 C58 56 66 66 74 82"
            stroke={a}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {[[24, 48], [36, 38], [64, 38], [77, 50], [30, 66], [70, 66], [50, 60]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.6} fill={b} />
          ))}
        </G>
      );
    case 'mug':
      return (
        <G>
          <Path d="M66 42 h9 a9 9 0 0 1 9 9 v16 a9 9 0 0 1 -9 9 h-9" stroke={a} strokeWidth={7} fill="none" />
          <Path d="M22 34 h46 v52 a7 7 0 0 1 -7 7 h-32 a7 7 0 0 1 -7 -7 Z" fill={a} />
          <Path d="M33 44 v40 M45 44 v40 M57 44 v40" stroke={b} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={28} cy={33} r={9} fill={b} />
          <Circle cx={42} cy={28} r={11} fill={b} />
          <Circle cx={57} cy={30} r={10} fill={b} />
          <Circle cx={66} cy={36} r={7} fill={b} />
        </G>
      );
  }
}

function Motif({ name, size, colors, rotate = 0, opacity = 1 }: { name: Name; size: number; colors: string[]; rotate?: number; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: `${rotate}deg` }], opacity }}>
      <Drawing name={name} c={colors} />
    </Svg>
  );
}

// x, y: the motif's centre as a share of the box; s: its size as a share of the shorter side.
type Spot = { m: Name; x: number; y: number; s: number; r?: number; o?: number; c?: number[] };

// Where the motifs sit. "cover": a square; "room": a screen around a deck, so they keep to
// the edges and the bands above and below the card.
const LAYOUTS: Record<SpecialId, { cover: Spot[]; room: Spot[] }> = {
  halloween: {
    cover: [
      { m: 'moon', x: 0.8, y: 0.2, s: 0.3, c: [2] },
      { m: 'web', x: 0.16, y: 0.16, s: 0.34, c: [2], o: 0.6 },
      { m: 'pumpkin', x: 0.74, y: 0.54, s: 0.42, c: [0, 3] },
      { m: 'bat', x: 0.36, y: 0.36, s: 0.24, r: -12, c: [3] },
      { m: 'bat', x: 0.56, y: 0.2, s: 0.15, r: 10, c: [3] },
    ],
    // two bands: under the header and over the card, and between the card and its caption
    room: [
      { m: 'web', x: 0.18, y: 0.24, s: 0.36, c: [2], o: 0.45 },
      { m: 'moon', x: 0.82, y: 0.22, s: 0.2, c: [2], o: 0.95 },
      { m: 'bat', x: 0.46, y: 0.2, s: 0.12, r: -10, c: [1] },
      { m: 'bat', x: 0.63, y: 0.26, s: 0.08, r: 12, c: [1] },
      { m: 'bat', x: 0.32, y: 0.29, s: 0.07, r: -18, c: [1] },
      { m: 'pumpkin', x: 0.2, y: 0.67, s: 0.26, c: [0, 3] },
      { m: 'pumpkin', x: 0.8, y: 0.69, s: 0.2, c: [0, 3] },
      { m: 'bat', x: 0.5, y: 0.64, s: 0.1, r: 8, c: [1] },
    ],
  },
  newyear: {
    cover: [
      { m: 'burst', x: 0.72, y: 0.3, s: 0.56, c: [0, 1] },
      { m: 'burst', x: 0.22, y: 0.2, s: 0.3, c: [2, 0], o: 0.85 },
      { m: 'sparkle', x: 0.42, y: 0.48, s: 0.14, c: [1] },
      { m: 'sparkle', x: 0.9, y: 0.66, s: 0.1, c: [1] },
      { m: 'confetti', x: 0.5, y: 0.66, s: 0.7, c: [0, 3, 2, 1], o: 0.9 },
    ],
    room: [
      { m: 'burst', x: 0.2, y: 0.21, s: 0.36, c: [0, 1], o: 0.9 },
      { m: 'burst', x: 0.8, y: 0.23, s: 0.28, c: [2, 0], o: 0.85 },
      { m: 'sparkle', x: 0.5, y: 0.18, s: 0.07, c: [1] },
      { m: 'sparkle', x: 0.62, y: 0.29, s: 0.05, c: [0] },
      { m: 'confetti', x: 0.25, y: 0.67, s: 0.38, c: [0, 3, 2, 1] },
      { m: 'confetti', x: 0.75, y: 0.68, s: 0.38, r: 40, c: [3, 0, 1, 2] },
      { m: 'burst', x: 0.5, y: 0.66, s: 0.16, c: [3, 0], o: 0.75 },
    ],
  },
  july4: {
    cover: [
      { m: 'stripes', x: 0.5, y: 0.86, s: 1.0, c: [0, 1], o: 0.95 },
      { m: 'burst', x: 0.7, y: 0.32, s: 0.5, c: [0, 1] },
      { m: 'star', x: 0.2, y: 0.22, s: 0.2, c: [1] },
      { m: 'star', x: 0.38, y: 0.12, s: 0.1, c: [1] },
      { m: 'star', x: 0.12, y: 0.46, s: 0.1, c: [1] },
      { m: 'sparkle', x: 0.44, y: 0.42, s: 0.1, c: [2] },
    ],
    room: [
      { m: 'burst', x: 0.2, y: 0.21, s: 0.34, c: [0, 1] },
      { m: 'burst', x: 0.8, y: 0.23, s: 0.3, c: [1, 2] },
      { m: 'star', x: 0.5, y: 0.17, s: 0.06, c: [1] },
      { m: 'star', x: 0.38, y: 0.28, s: 0.04, c: [1] },
      { m: 'star', x: 0.63, y: 0.29, s: 0.05, c: [1] },
      { m: 'stripes', x: 0.2, y: 0.68, s: 0.28, r: -8, c: [0, 1] },
      { m: 'stripes', x: 0.8, y: 0.68, s: 0.26, r: 8, c: [0, 1] },
      { m: 'star', x: 0.5, y: 0.67, s: 0.08, c: [1] },
    ],
  },
  oktoberfest: {
    cover: [
      { m: 'lozenge', x: 0.5, y: 0.08, s: 1.0, c: [0, 2], o: 0.9 },
      { m: 'mug', x: 0.7, y: 0.6, s: 0.48, c: [1, 0] },
      { m: 'pretzel', x: 0.3, y: 0.5, s: 0.38, r: -14, c: [3, 0] },
    ],
    room: [
      { m: 'lozenge', x: 0.15, y: 0.21, s: 0.3, c: [0, 2], o: 0.5 },
      { m: 'lozenge', x: 0.85, y: 0.21, s: 0.3, c: [0, 2], o: 0.5 },
      { m: 'pretzel', x: 0.5, y: 0.21, s: 0.16, c: [3, 0] },
      { m: 'mug', x: 0.2, y: 0.68, s: 0.24, r: -10, c: [1, 0] },
      { m: 'mug', x: 0.8, y: 0.68, s: 0.24, r: 10, c: [1, 0] },
      { m: 'pretzel', x: 0.5, y: 0.67, s: 0.12, r: 12, c: [3, 0] },
    ],
  },
};

// A pretzel's brown sits beside the theme's own colours (index 3 in oktoberfest).
const extra: Record<SpecialId, string[]> = { halloween: ['#2A1238'], newyear: [], july4: [], oktoberfest: ['#A8622A'] };

// memo: a field is pure in its props; the connect page re-renders often and the four covers must not redraw with it
function MotifFieldInner({ special, width, height, kind }: { special: Special; width: number; height: number; kind: 'cover' | 'room' }) {
  const palette = [...special.accents, ...extra[special.id]];
  const short = Math.min(width, height);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {LAYOUTS[special.id][kind].map((p, i) => {
        const size = p.s * short;
        return (
          <View key={i} style={{ position: 'absolute', left: p.x * width - size / 2, top: p.y * height - size / 2 }}>
            <Motif name={p.m} size={size} rotate={p.r} opacity={p.o} colors={(p.c ?? [0, 1]).map((k) => palette[k] ?? palette[0])} />
          </View>
        );
      })}
    </View>
  );
}

const MotifField = memo(MotifFieldInner);
export default MotifField;
