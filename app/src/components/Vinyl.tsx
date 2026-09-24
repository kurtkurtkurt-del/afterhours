import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

type Props = { size: number; label: number; spinning: boolean };

// plak: koyu disk, ince oluklar, ortada etiket olarak fotoğraf. çalarken döner.
export default function Vinyl({ size, label, spinning }: Props) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (spinning) rot.set(withRepeat(withTiming(rot.get() + 360, { duration: 2400, easing: Easing.linear }), -1, false));
    else cancelAnimation(rot);
    return () => cancelAnimation(rot);
  }, [spinning, rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const r = size / 2;
  const labelSize = size * 0.38;
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle cx={r} cy={r} r={r - 1} fill="#0e0d0b" />
        {[0.92, 0.84, 0.76, 0.68, 0.6, 0.52].map((k) => (
          <Circle key={k} cx={r} cy={r} r={r * k} fill="none" stroke="#1f1d1a" strokeWidth={1} />
        ))}
        <Circle cx={r} cy={r} r={r * 0.44} fill="#1a1816" />
      </Svg>
      <View style={[styles.label, { width: labelSize, height: labelSize, borderRadius: labelSize / 2, left: r - labelSize / 2, top: r - labelSize / 2 }]}>
        <Image source={label} style={StyleSheet.absoluteFill} />
        <View style={styles.hole} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', overflow: 'hidden', backgroundColor: '#2a2825', alignItems: 'center', justifyContent: 'center' },
  hole: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0e0d0b' },
});
