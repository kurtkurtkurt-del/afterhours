import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import Avatar from '@/components/Avatar';
import type { Layout, Placed } from '@/lib/islands';
import { colors, fonts } from '@/theme/tokens';

// Your people, drawn (design A of prototypes/people-map.html, the floating islands): every
// circle of friends a soft island of its own colour, you in the middle on a red one, your
// friends as faces, everyone else a blurred disc. Drag to wander; a tap names what is under the
// finger (onTap). The same drawing, small and still, is the card on the messages page.

export const ISLAND = ['#D7261E', '#2D6BE0', '#1E9E57', '#E5B000', '#DD3B8A', '#7B4FD6', '#E0711F', '#1A9BB0'];
const PAD = 170;

type Props = {
  layout: Layout;
  width: number;
  height: number;
  photos: Map<string, string>;
  live: Set<string>;
  myPhoto: string | null;
  interactive?: boolean;
  scale?: number;
  onTap?: (n: Placed) => void;
};
export type PeopleMapHandle = { home: () => void; zoom: (by: number) => void };

// The scale at which you and your friends (and the first of the crowd) fit a small card.
export function fitScale(l: Layout, width: number, height: number) {
  let far = 1;
  for (const n of l.nodes) if (n.w <= 2) far = Math.max(far, Math.hypot(n.x, n.y) + n.r + 18);
  return Math.max(0.22, Math.min(0.55, (Math.min(width, height * 1.6) / 2 - 10) / far));
}

const PeopleMap = forwardRef<PeopleMapHandle, Props>(function PeopleMap({ layout, width, height, photos, live, myPhoto, interactive = true, scale = 1, onTap }, ref) {
  const box = useMemo(() => {
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    for (const n of layout.nodes) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    return { x0: x0 - PAD, y0: y0 - PAD, w: x1 - x0 + PAD * 2, h: y1 - y0 + PAD * 2 };
  }, [layout]);
  // where you sit on screen: the middle, a little above it. tx/ty: where the drawing's top left
  // corner is on screen; sc: its scale (two fingers, or the + and − buttons, 0.35 to 2.4)
  const homeX = width / 2 + box.x0 * scale, homeY = height * 0.46 + box.y0 * scale;
  const tx = useSharedValue(homeX), ty = useSharedValue(homeY), sc = useSharedValue(scale);
  const MIN = 0.35, MAX = 2.4;
  useImperativeHandle(ref, () => ({
    home: () => {
      tx.set(withTiming(homeX, { duration: 420 }));
      ty.set(withTiming(homeY, { duration: 420 }));
      sc.set(withTiming(scale, { duration: 420 }));
    },
    // zoom about the middle of the screen
    zoom: (by: number) => {
      const s0 = sc.get(), s1 = Math.max(MIN, Math.min(MAX, s0 * by)), fx = width / 2, fy = height / 2;
      tx.set(withTiming(fx - (fx - tx.get()) * (s1 / s0), { duration: 260 }));
      ty.set(withTiming(fy - (fy - ty.get()) * (s1 / s0), { duration: 260 }));
      sc.set(withTiming(s1, { duration: 260 }));
    },
  }), [homeX, homeY, scale, width, height, tx, ty, sc]);

  const tapAt = (x: number, y: number) => {
    const k = sc.get();
    const wx = (x - tx.get()) / k + box.x0, wy = (y - ty.get()) / k + box.y0;
    let best: Placed | null = null, bd = 1e9;
    for (const n of layout.nodes) { const d = Math.hypot(n.x - wx, n.y - wy); if (d < bd) { bd = d; best = n; } }
    if (best && bd < best.r + 14) onTap?.(best);
  };
  const pan = Gesture.Pan()
    .minDistance(6)
    .onChange((e) => {
      tx.set(tx.get() + e.changeX);
      ty.set(ty.get() + e.changeY);
    })
    .onEnd((e) => {
      tx.set(withDecay({ velocity: e.velocityX }));
      ty.set(withDecay({ velocity: e.velocityY }));
    });
  const pinch = Gesture.Pinch().onChange((e) => {
    const s0 = sc.get(), s1 = Math.max(MIN, Math.min(MAX, s0 * e.scaleChange));
    // the point under the fingers stays under them
    tx.set(e.focalX - (e.focalX - tx.get()) * (s1 / s0));
    ty.set(e.focalY - (e.focalY - ty.get()) * (s1 / s0));
    sc.set(s1);
  });
  const tap = Gesture.Tap().maxDistance(10).onEnd((e) => runOnJS(tapAt)(e.x, e.y));
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: sc.get() }] }));

  const X = (n: Placed) => n.x - box.x0, Y = (n: Placed) => n.y - box.y0;
  const content = (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, transformOrigin: 'top left' }, moved]} pointerEvents="none">
      <Svg width={box.w} height={box.h}>
        <Defs>
          {ISLAND.map((c, i) => (
            <RadialGradient key={`g${i}`} id={`g${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={0.2} />
              <Stop offset="0.6" stopColor={c} stopOpacity={0.09} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
          {ISLAND.map((c, i) => (
            <RadialGradient key={`b${i}`} id={`b${i}`} cx="45%" cy="40%" r="60%">
              <Stop offset="0" stopColor={c} stopOpacity={0.55} />
              <Stop offset="0.55" stopColor={c} stopOpacity={0.32} />
              <Stop offset="1" stopColor={c} stopOpacity={0.14} />
            </RadialGradient>
          ))}
          <RadialGradient id="gme" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.spot} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.spot} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* the islands: a soft disc under everyone, coloured by their circle */}
        {layout.nodes.map((n) =>
          n.w === 0 ? <Circle key={`i${n.id}`} cx={X(n)} cy={Y(n)} r={130} fill="url(#gme)" /> : <Circle key={`i${n.id}`} cx={X(n)} cy={Y(n)} r={n.w === 1 ? 100 : 82} fill={`url(#g${n.island % ISLAND.length})`} />,
        )}
        {layout.lines.map((l) => {
          const a = layout.byId.get(l.a)!, b = layout.byId.get(l.b)!;
          return l.kind === 'you' ? (
            <Line key={`${l.a}|${l.b}`} x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={colors.spot} strokeOpacity={0.75} strokeWidth={2} />
          ) : (
            <Line key={`${l.a}|${l.b}`} x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} stroke={colors.paper} strokeOpacity={l.kind === 'bridge' ? 0.42 : 0.3} strokeWidth={l.kind === 'bridge' ? 1.6 : 1.5} strokeDasharray={l.kind === 'bridge' ? '6 5' : '3 4'} />
          );
        })}
        {/* the crowd: a blurred disc each, a white edge */}
        {layout.nodes.filter((n) => n.w >= 2).map((n) => (
          <Circle key={n.id} cx={X(n)} cy={Y(n)} r={n.r} fill={`url(#b${n.island % ISLAND.length})`} stroke={colors.card} strokeWidth={2} opacity={n.dim ? 0.35 : 1} />
        ))}
      </Svg>
      {/* you and your friends: faces */}
      {layout.nodes.filter((n) => n.w <= 1).map((n) => {
        const out = live.has(n.id);
        const photo = n.w === 0 ? myPhoto : photos.get(n.id);
        const name = n.w === 0 ? null : (n.n ?? n.h ?? '').toLowerCase();
        return (
          <View key={n.id} style={[s.face, { left: X(n) - n.r - 3, top: Y(n) - n.r - 3, width: n.r * 2 + 6 }, n.dim && { opacity: 0.4 }]}>
            <View style={[s.ring, { width: n.r * 2 + 6, height: n.r * 2 + 6, borderRadius: n.r + 3 }, (n.w === 0 || out) && s.ringRed]}>
              <View style={[s.clip, { width: n.r * 2, height: n.r * 2, borderRadius: n.r }]}>
                {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={name || 'you'} size={n.r * 2} />}
              </View>
            </View>
            {name ? <Text style={s.name} numberOfLines={1}>{name}</Text> : null}
            {out ? <Text style={s.out}>OUT NOW</Text> : null}
          </View>
        );
      })}
    </Animated.View>
  );
  if (!interactive) return <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">{content}</View>;
  return (
    <GestureDetector gesture={Gesture.Race(Gesture.Simultaneous(pan, pinch), tap)}>
      <View style={{ width, height, overflow: 'hidden' }} collapsable={false}>{content}</View>
    </GestureDetector>
  );
});
export default PeopleMap;

const s = StyleSheet.create({
  face: { position: 'absolute', alignItems: 'center' },
  ring: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  ringRed: { backgroundColor: colors.spot },
  clip: { overflow: 'hidden', backgroundColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 4, fontFamily: fonts.semibold, fontSize: 11.5, color: colors.paper, maxWidth: 90 },
  out: { fontFamily: fonts.jet, fontSize: 7.5, letterSpacing: 1, color: colors.spotText, marginTop: 1 },
});
