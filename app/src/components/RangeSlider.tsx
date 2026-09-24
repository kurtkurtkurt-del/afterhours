import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/tokens';

type Props = { min: number; max: number; value: number; onChange: (v: number) => void; onEnd: (v: number) => void; format: (v: number) => string; width: number };

const KNOB = 18;

// tek tutamaçlı sürgü, logaritmik: küçük mesafeler hassas, büyükler hızlı.
// sürüklerken onChange (etiket için), bırakınca onEnd (ağ isteği için).
export default function RangeSlider({ min, max, value, onChange, onEnd, format, width }: Props) {
  const track = width - KNOB;
  const toPos = (v: number) => ((Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))) * track;
  const toVal = (p: number) => Math.exp(Math.log(min) + (Math.min(track, Math.max(0, p)) / track) * (Math.log(max) - Math.log(min)));
  const x = useSharedValue(toPos(value));
  const start = useSharedValue(0);
  // sürüklerken geçici etiket; bırakınca gerçek değer görünür
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const label = dragLabel ?? format(value);

  useEffect(() => {
    x.set(toPos(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, width]);

  const report = (p: number, end: boolean) => {
    const v = toVal(p);
    setDragLabel(end ? null : format(v));
    onChange(v);
    if (end) onEnd(v);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.set(x.get());
    })
    .onUpdate((e) => {
      const p = Math.min(track, Math.max(0, start.get() + e.translationX));
      x.set(p);
      runOnJS(report)(p, false);
    })
    .onEnd(() => {
      runOnJS(report)(x.get(), true);
    });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + KNOB / 2 }));

  return (
    <View style={{ width }}>
      <Text style={styles.label}>{label}</Text>
      <GestureDetector gesture={pan}>
        <View style={styles.hit}>
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fill]} />
          <Animated.View style={[styles.knob, knob]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.paper, marginBottom: 6, fontVariant: ['tabular-nums'] },
  hit: { height: 32, justifyContent: 'center' },
  track: { position: 'absolute', left: KNOB / 2, right: KNOB / 2, height: 1, backgroundColor: colors.mute },
  fill: { position: 'absolute', left: KNOB / 2, height: 1.5, backgroundColor: colors.paper },
  knob: { position: 'absolute', width: KNOB, height: KNOB, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.ink },
});
