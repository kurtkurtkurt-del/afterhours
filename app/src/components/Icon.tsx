import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'flow' | 'djs' | 'yours' | 'map' | 'account' | 'settings' | 'photo' | 'chat';
type Props = { name: IconName; size?: number; color: string; strokeWidth?: number; filled?: boolean; hole?: string };

// 1.5 px line icons on a 24 grid. filled: the solid version of the tab icons (the open tab,
// as on Instagram); inner details are cut out in hole, the colour behind the icon.
export default function Icon({ name, size = 22, color, strokeWidth = 1.5, filled = false, hole = '#0E0D0C' }: Props) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const f = filled ? { ...p, fill: color } : p;
  const cut = { ...p, stroke: hole, fill: hole };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'flow' && (
        <>
          <Rect x={7} y={4} width={12} height={16} rx={filled ? 2 : 0} {...f} />
          <Path d="M4 8v11a1 1 0 0 0 1 1h9" {...p} />
        </>
      )}
      {name === 'djs' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...f} />
          <Circle cx={12} cy={12} r={1.6} {...(filled ? cut : p)} />
          <Path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5" {...(filled ? { ...p, stroke: hole } : p)} />
        </>
      )}
      {name === 'yours' && (
        <>
          <Circle cx={9} cy={8.5} r={3} {...f} />
          <Path d={filled ? 'M3.5 19a5.5 5.5 0 0 1 11 0z' : 'M3.5 19a5.5 5.5 0 0 1 11 0'} {...f} />
          <Circle cx={16.5} cy={9.5} r={2.4} {...f} />
          <Path d={filled ? 'M15.5 14.2a4.6 4.6 0 0 1 5 4.8h-4.6z' : 'M15.5 14.2a4.6 4.6 0 0 1 5 4.8'} {...f} />
        </>
      )}
      {name === 'map' && (
        <>
          <Path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" {...f} />
          <Circle cx={12} cy={10} r={2.2} {...(filled ? cut : p)} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3.2} {...p} />
          <Circle cx={12} cy={12} r={7.5} {...p} />
          <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" {...p} />
        </>
      )}
      {name === 'chat' && (
        <>
          <Path d="M4 5h16v11H11l-4.5 3.5V16H4z" {...p} />
          <Path d="M8 9.5h8M8 12.5h5" {...p} />
        </>
      )}
      {name === 'photo' && (
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={2} {...p} />
          <Circle cx={9} cy={9} r={1.6} {...p} />
          <Path d="M20.5 15l-4.5-4.5L6 20.5" {...p} />
        </>
      )}
      {name === 'account' && (
        <>
          <Circle cx={12} cy={8.5} r={3.5} {...p} />
          <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...p} />
        </>
      )}
    </Svg>
  );
}
