import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'flow' | 'djs' | 'yours' | 'map' | 'account' | 'settings';
type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

// 24'lük ızgarada 1.5 piksel çizgi ikonlar. köşesiz, dolgusuz.
export default function Icon({ name, size = 22, color, strokeWidth = 1.5 }: Props) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'flow' && (
        <>
          <Rect x={7} y={4} width={12} height={16} {...p} />
          <Path d="M4 8v11a1 1 0 0 0 1 1h9" {...p} />
        </>
      )}
      {name === 'djs' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Circle cx={12} cy={12} r={1.6} {...p} />
          <Path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5" {...p} />
        </>
      )}
      {name === 'yours' && (
        <>
          <Circle cx={9} cy={8.5} r={3} {...p} />
          <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...p} />
          <Circle cx={16.5} cy={9.5} r={2.4} {...p} />
          <Path d="M15.5 14.2a4.6 4.6 0 0 1 5 4.8" {...p} />
        </>
      )}
      {name === 'map' && (
        <>
          <Path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" {...p} />
          <Circle cx={12} cy={10} r={2.2} {...p} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3.2} {...p} />
          <Circle cx={12} cy={12} r={7.5} {...p} />
          <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" {...p} />
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
