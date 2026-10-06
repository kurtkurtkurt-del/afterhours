import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { LinkKind } from '@/data/profile';

// Small line marks for the networks in LINKS, drawn in one colour on a 24 grid.
export default function LinkIcon({ kind, size = 20, color }: { kind: LinkKind; size?: number; color: string }) {
  const line = { stroke: color, strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {kind === 'instagram' && (
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={5} {...line} />
          <Circle cx={12} cy={12} r={4} {...line} />
          <Circle cx={17.2} cy={6.8} r={1.1} fill={color} />
        </>
      )}
      {kind === 'tiktok' && <Path d="M13.5 3.5v11.2a3.7 3.7 0 1 1-3.7-3.7M13.5 3.5c.4 2.6 2.3 4.4 5 4.6" {...line} />}
      {kind === 'spotify' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...line} />
          <Path d="M7.5 9.6c3-1 6.6-.7 9.2.8M8.1 12.6c2.5-.7 5.2-.4 7.3.8M8.7 15.4c1.9-.5 3.8-.3 5.4.6" {...line} />
        </>
      )}
      {kind === 'soundcloud' && (
        <Path d="M10 17.5V8.8a5 5 0 0 1 8.8 2.9 2.9 2.9 0 0 1-.3 5.8H10M7.2 17.5v-6.5M4.5 17.5v-4" {...line} />
      )}
      {kind === 'x' && <Path d="M5 4.5l14 15M19 4.5l-14 15" {...line} />}
      {kind === 'website' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...line} />
          <Path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.3 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.3-3.4-8.5s1-6.1 3.4-8.5" {...line} />
        </>
      )}
    </Svg>
  );
}
