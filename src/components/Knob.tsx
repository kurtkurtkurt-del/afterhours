import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

type Props = { size?: number; angle: SharedValue<number> };

// eski radyo ayar düğmesi: krom bilezik, kaburgalı bakalit gövde, kubbe kapak,
// tepede krem işaret. parmak merkez etrafında döndükçe "angle" derece olarak birikir.
export default function Knob({ size = 230, angle }: Props) {
  const r = size / 2;
  const start = useSharedValue(0);
  const base = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      start.set(Math.atan2(e.y - r, e.x - r));
      base.set(angle.get());
    })
    .onUpdate((e) => {
      let d = Math.atan2(e.y - r, e.x - r) - start.get();
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      angle.set(base.get() + (d * 180) / Math.PI);
    });

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  // 36 kaburga: her biri aydınlık ve gölgeli yüzden oluşur, döndükçe ışık oynar
  const ribs = Array.from({ length: 36 }, (_, i) => (i * 360) / 36);
  const rib = (a: number, r1: number, r2: number) => {
    const w = 3.2; // derece cinsinden yarım genişlik
    const p = (deg: number, rad: number) => [115 + Math.cos((deg * Math.PI) / 180) * rad, 115 + Math.sin((deg * Math.PI) / 180) * rad];
    const [x1, y1] = p(a - w, r1), [x2, y2] = p(a + w, r1), [x3, y3] = p(a + w, r2), [x4, y4] = p(a - w, r2);
    return `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}L${x4} ${y4}Z`;
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }}>
        {/* sabit: gölge ve krom bilezik */}
        <Svg width={size} height={size} viewBox="0 0 230 230" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="shadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0.7" stopColor="#000" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#e8e2d6" />
              <Stop offset="0.35" stopColor="#8f887c" />
              <Stop offset="0.5" stopColor="#f2ede4" />
              <Stop offset="0.7" stopColor="#6d665b" />
              <Stop offset="1" stopColor="#c9c2b5" />
            </LinearGradient>
          </Defs>
          <Ellipse cx="115" cy="124" rx="112" ry="108" fill="url(#shadow)" />
          <Circle cx="115" cy="115" r="110" fill="url(#chrome)" />
          <Circle cx="115" cy="115" r="110" fill="none" stroke="#2a2621" strokeWidth="1" />
          <Circle cx="115" cy="115" r="102" fill="#0f0c0a" />
        </Svg>

        {/* dönen: kaburgalı gövde ve kapak */}
        <Animated.View style={[StyleSheet.absoluteFill, spin]}>
          <Svg width={size} height={size} viewBox="0 0 230 230">
            <Defs>
              <RadialGradient id="body" cx="40%" cy="35%" r="70%">
                <Stop offset="0" stopColor="#7d4f34" />
                <Stop offset="0.6" stopColor="#4a2d1e" />
                <Stop offset="1" stopColor="#1e120c" />
              </RadialGradient>
              <RadialGradient id="cap" cx="38%" cy="32%" r="72%">
                <Stop offset="0" stopColor="#b8825f" />
                <Stop offset="0.45" stopColor="#7a4e33" />
                <Stop offset="1" stopColor="#3b2416" />
              </RadialGradient>
              <RadialGradient id="gloss" cx="35%" cy="25%" r="45%">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {/* kaburgalar: aydınlık yüz, sonra gölgeli yüz */}
            <G>
              {ribs.map((a) => (
                <Path key={`l${a}`} d={rib(a - 2.4, 78, 100)} fill="#8a5a3c" />
              ))}
              {ribs.map((a) => (
                <Path key={`d${a}`} d={rib(a + 2.4, 78, 100)} fill="#2b1a11" />
              ))}
            </G>
            <Circle cx="115" cy="115" r="80" fill="url(#body)" />
            <Circle cx="115" cy="115" r="80" fill="none" stroke="#150d09" strokeWidth="1.5" />
            <Circle cx="115" cy="115" r="56" fill="url(#cap)" />
            <Circle cx="115" cy="115" r="56" fill="url(#gloss)" />
            <Circle cx="115" cy="115" r="56" fill="none" stroke="#2a1a12" strokeWidth="1" />
            {/* işaret: krem çizgi, gövdeden kapağın içine */}
            <Line x1="115" y1="40" x2="115" y2="74" stroke="#f3f1ec" strokeWidth="3.5" strokeLinecap="round" />
            <Circle cx="115" cy="115" r="4" fill="#150d09" />
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
