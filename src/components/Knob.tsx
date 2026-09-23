import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, RadialGradient, Stop } from 'react-native-svg';

type Props = { size?: number; angle: SharedValue<number>; onTurn?: (deltaDeg: number) => void };

// eski tip bakalit ayar düğmesi. parmak merkez etrafında döndükçe "angle" derece olarak birikir.
export default function Knob({ size = 220, angle }: Props) {
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
      // -π..π sarmalını aç: parmak sıfır çizgisini geçince zıplamasın
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      angle.set(base.get() + (d * 180) / Math.PI);
    });

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  const knurls = Array.from({ length: 48 }, (_, i) => (i * 360) / 48);

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }}>
        {/* sabit kısım: tabla ve gölge halkası */}
        <Svg width={size} height={size} viewBox="0 0 220 220" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="plate" cx="50%" cy="45%" r="55%">
              <Stop offset="0" stopColor="#3a2b20" />
              <Stop offset="1" stopColor="#1c1512" />
            </RadialGradient>
          </Defs>
          <Circle cx="110" cy="110" r="108" fill="url(#plate)" />
          <Circle cx="110" cy="110" r="108" fill="none" stroke="#0d0a08" strokeWidth="2" />
        </Svg>
        {/* dönen kısım */}
        <Animated.View style={[StyleSheet.absoluteFill, spin]}>
          <Svg width={size} height={size} viewBox="0 0 220 220">
            <Defs>
              <RadialGradient id="body" cx="42%" cy="38%" r="65%">
                <Stop offset="0" stopColor="#8a5a3c" />
                <Stop offset="0.55" stopColor="#5a3826" />
                <Stop offset="1" stopColor="#2a1a12" />
              </RadialGradient>
              <RadialGradient id="cap" cx="40%" cy="35%" r="70%">
                <Stop offset="0" stopColor="#a9765a" />
                <Stop offset="0.6" stopColor="#6b4630" />
                <Stop offset="1" stopColor="#3a2418" />
              </RadialGradient>
            </Defs>
            {/* tırtıklı kenar */}
            <G stroke="#1a110c" strokeWidth="3" strokeLinecap="round">
              {knurls.map((a) => {
                const rad = (a * Math.PI) / 180;
                return (
                  <Line
                    key={a}
                    x1={110 + Math.cos(rad) * 92}
                    y1={110 + Math.sin(rad) * 92}
                    x2={110 + Math.cos(rad) * 102}
                    y2={110 + Math.sin(rad) * 102}
                  />
                );
              })}
            </G>
            <Circle cx="110" cy="110" r="90" fill="url(#body)" />
            <Circle cx="110" cy="110" r="90" fill="none" stroke="#1a110c" strokeWidth="1.5" />
            <Circle cx="110" cy="110" r="58" fill="url(#cap)" />
            <Circle cx="110" cy="110" r="58" fill="none" stroke="#2a1a12" strokeWidth="1" />
            {/* işaret çizgisi: krem, düğmenin tepesinden kapağa */}
            <Line x1="110" y1="26" x2="110" y2="62" stroke="#f3f1ec" strokeWidth="3" strokeLinecap="round" />
            <Circle cx="110" cy="110" r="5" fill="#1a110c" />
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
