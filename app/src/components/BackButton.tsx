import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// geçmiş yoksa ana ekrana döner
const go = () => (router.canGoBack() ? router.back() : router.replace('/'));

const EDGE = 24;   // sol kenarda hareketi yakalayan şeridin genişliği
const PULL = 70;   // bu kadar sağa çekilince geri gider

// geri, iki yoldan:
// 1. sol kenardan sağa kaydırmak (her yerden, başparmakla). çekerken kenarda kırmızı çizgi belirir.
// 2. alt solda, başparmağın olduğu yerde, altı çizili küçük "back" — sayfadaki "change" ve "close"
//    bağlantılarıyla aynı dilde; kutu yok, çerçeve yok.
// çoğu sayfa bunu üstteki bandın içinde çağırır; konum pencere yüksekliğinden hesaplanır,
// çağrıldığı yerden bağımsız alt solda çıkar.
// lift: altta sabit bir şey varsa (oda sayfasındaki yazma alanı gibi) o kadar yukarıda durur.
// inline: akışın içinde normal bir satır (kayıt formunun altı gibi).
type Props = { tone?: 'paper' | 'ink'; lift?: number; inline?: boolean };

export default function BackButton({ tone = 'paper', lift = 0, inline = false }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const button = (
    <Pressable
      onPress={go}
      hitSlop={{ top: 14, bottom: 14, left: 24, right: 24 }}
      accessibilityRole="button"
      accessibilityLabel="back"
      style={({ pressed }) => [inline ? styles.inline : [styles.fixed, { top: height - insets.bottom - 30 - lift }], pressed && styles.pressed]}
    >
      <Text style={[styles.text, tone === 'ink' && styles.textInk]}>back</Text>
    </Pressable>
  );
  if (inline) return button;
  return (
    <>
      <EdgeBack />
      {button}
    </>
  );
}

// sol kenardan sağa çekince geri. sayfanın en üstünde, ekran boyu ince bir şerit.
export function EdgeBack() {
  const { height } = useWindowDimensions();
  const pull = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      pull.set(Math.max(0, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX > PULL || e.velocityX > 700) runOnJS(go)();
      pull.set(withTiming(0, { duration: 200 }));
    });
  const line = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [0, PULL], [0, 1], Extrapolation.CLAMP),
    transform: [{ scaleY: interpolate(pull.value, [0, PULL], [0.3, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.edge, { height }]} collapsable={false}>
        <Animated.View style={[styles.line, line]} pointerEvents="none" />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fixed: { position: 'absolute', left: brand.left, zIndex: 20, elevation: 20 },
  inline: { alignSelf: 'flex-start', paddingVertical: 6 },
  pressed: { opacity: 0.6 },
  text: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper, textDecorationLine: 'underline' },
  textInk: { color: colors.ink },
  edge: { position: 'absolute', top: 0, left: 0, width: EDGE, zIndex: 19, elevation: 19 },
  line: { position: 'absolute', top: '20%', bottom: '20%', left: 0, width: 3, backgroundColor: colors.spot },
});
