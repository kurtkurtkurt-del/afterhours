import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors, fonts, intro } from '@/theme/tokens';

type Props = { onDone: () => void };

// kâğıt geceye açılır, ortada isim belirir.
export default function Intro({ onDone }: Props) {
  const photo = useSharedValue(0);
  const word = useSharedValue(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    photo.set(withDelay(intro.hold, withTiming(1, { duration: intro.photoIn })));
    word.set(withDelay(intro.wordDelay, withTiming(1, { duration: intro.word })));
    const bar = setTimeout(() => setDark(true), intro.hold + intro.photoIn * 0.5);
    const leave = setTimeout(onDone, intro.leaveAt);
    return () => {
      clearTimeout(bar);
      clearTimeout(leave);
    };
  }, [photo, word, onDone]);

  const photoStyle = useAnimatedStyle(() => ({ opacity: photo.value }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value }));

  return (
    <Pressable style={styles.root} onPress={onDone}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image source={require('../../assets/intro/concert.jpg')} style={styles.photo} resizeMode="cover" />
        <View style={styles.tint} />
      </Animated.View>
      <Animated.Text style={[styles.word, wordStyle]}>afterhours</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, opacity: 0.35 },
  word: { fontFamily: fonts.medium, fontSize: 30, letterSpacing: -0.6, color: colors.paper },
});
