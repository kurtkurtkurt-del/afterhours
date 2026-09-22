import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, fonts, intro } from '@/theme/tokens';

type Props = { onDone: () => void };

const CLOCK = 132; // saatin çapı, px
const SPECKS = 110; // toz tanesi sayısı
const TICKS = 12;

type Speck = { x: number; y: number; delay: number; drift: number; spin: number; size: number };

// deterministik rastgelelik: her açılışta aynı toz
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSpecks(): Speck[] {
  const rnd = mulberry(7);
  return Array.from({ length: SPECKS }, () => {
    const a = rnd() * Math.PI * 2;
    const r = (0.25 + rnd() * 0.75) * (CLOCK / 2);
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      delay: rnd() * 0.35,
      drift: (rnd() - 0.5) * 90,
      spin: (rnd() - 0.5) * 720,
      size: 1.5 + rnd() * 2.5,
    };
  });
}

function Dust({ speck, progress, fall }: { speck: Speck; progress: SharedValue<number>; fall: number }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - speck.delay) / (1 - speck.delay)));
    const g = t * t; // yerçekimi
    return {
      opacity: progress.value === 0 ? 0 : interpolate(t, [0, 0.8, 1], [1, 1, 0]),
      transform: [
        { translateX: speck.x + speck.drift * t },
        { translateY: speck.y + g * fall },
        { rotate: `${speck.spin * t}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.speck, { width: speck.size, height: speck.size }, style]} />;
}

// saat hızlanarak döner, toza ayrılıp yere dökülür; arkada gece, ortada "join now".
export default function Intro({ onDone }: Props) {
  const { height } = useWindowDimensions();
  const specks = useMemo(() => makeSpecks(), []);
  const fall = height / 2 + CLOCK; // tozun düşeceği mesafe: ekranın altına kadar

  const clock = useSharedValue(0);
  const spin = useSharedValue(0);
  const dust = useSharedValue(0);
  const photo = useSharedValue(0);
  const box = useSharedValue(0);
  const [dark, setDark] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    clock.set(
      withSequence(
        withTiming(1, { duration: intro.clockIn }),
        withDelay(intro.burstAt - intro.clockIn, withTiming(0, { duration: 120 })),
      ),
    );
    spin.set(withDelay(
      intro.spinStart,
      withTiming(1, { duration: intro.spin, easing: Easing.in(Easing.cubic) }),
    ));
    dust.set(withDelay(intro.burstAt, withTiming(1, { duration: intro.dust, easing: Easing.linear })));
    photo.set(withDelay(intro.burstAt + 100, withTiming(1, { duration: intro.photoIn })));
    box.set(withDelay(intro.boxAt, withTiming(1, { duration: intro.box, easing: Easing.out(Easing.cubic) })));

    const bar = setTimeout(() => setDark(true), intro.burstAt + 600);
    const end = setTimeout(() => setEnded(true), intro.boxAt + intro.box);
    return () => {
      clearTimeout(bar);
      clearTimeout(end);
    };
  }, [clock, spin, dust, photo, box]);

  // ekrana dokunulursa sona atla
  const skip = useCallback(() => {
    if (ended) return;
    [clock, spin, dust, photo, box].forEach(cancelAnimation);
    clock.set(0);
    spin.set(1);
    dust.set(1);
    photo.set(withTiming(1, { duration: 300 }));
    box.set(withTiming(1, { duration: 300 }));
    setDark(true);
    setEnded(true);
  }, [ended, clock, spin, dust, photo, box]);

  const clockStyle = useAnimatedStyle(() => ({ opacity: clock.value }));
  const minuteStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * intro.turns * 360}deg` }],
  }));
  const hourStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(spin.value * intro.turns * 360) / 12}deg` }],
  }));
  const photoStyle = useAnimatedStyle(() => ({ opacity: photo.value }));
  const boxStyle = useAnimatedStyle(() => ({
    opacity: box.value,
    transform: [{ scale: 0.96 + box.value * 0.04 }],
  }));

  return (
    <Pressable style={styles.root} onPress={skip}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image source={require('../../assets/intro/concert.jpg')} style={styles.photo} resizeMode="cover" />
        <View style={styles.tint} />
      </Animated.View>

      <View style={styles.centre} pointerEvents="none">
        <Animated.View style={[styles.clock, clockStyle]}>
          {Array.from({ length: TICKS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                i % 3 === 0 && styles.tickMajor,
                { transform: [{ rotate: `${(i * 360) / TICKS}deg` }, { translateY: -CLOCK / 2 + 9 }] },
              ]}
            />
          ))}
          <Animated.View style={[styles.hand, styles.hour, hourStyle]} />
          <Animated.View style={[styles.hand, styles.minute, minuteStyle]} />
          <View style={styles.pin} />
        </Animated.View>

        {specks.map((s, i) => (
          <Dust key={i} speck={s} progress={dust} fall={fall} />
        ))}
      </View>

      <Animated.View style={[styles.centre, boxStyle]} pointerEvents={ended ? 'box-none' : 'none'}>
        <Text style={styles.name}>afterhours</Text>
        <Pressable onPress={onDone} style={({ pressed }) => [styles.box, pressed && styles.boxPressed]}>
          <Text style={styles.join}>join now</Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const HOUR_LEN = CLOCK * 0.27;
const MINUTE_LEN = CLOCK * 0.4;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  photo: { width: '100%', height: '100%' },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, opacity: 0.35 },
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  clock: {
    width: CLOCK,
    height: CLOCK,
    borderRadius: CLOCK / 2,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { position: 'absolute', width: 1.5, height: 7, backgroundColor: colors.ink },
  tickMajor: { height: 11, width: 2 },
  hand: { position: 'absolute', backgroundColor: colors.ink, transformOrigin: 'bottom' },
  hour: { width: 3, height: HOUR_LEN, top: CLOCK / 2 - 1.5 - HOUR_LEN },
  minute: { width: 2, height: MINUTE_LEN, top: CLOCK / 2 - 1.5 - MINUTE_LEN },
  pin: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  speck: { position: 'absolute', backgroundColor: colors.ink },
  name: { fontFamily: fonts.medium, fontSize: 30, letterSpacing: -0.6, color: colors.paper, marginBottom: 28 },
  box: { backgroundColor: colors.paper2, paddingHorizontal: 30, paddingVertical: 14 },
  boxPressed: { backgroundColor: colors.paper },
  join: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2, color: colors.ink },
});
