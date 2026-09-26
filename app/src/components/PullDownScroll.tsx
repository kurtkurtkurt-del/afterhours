import { StyleSheet, View, useWindowDimensions, type ScrollViewProps } from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

const go = () => (router.canGoBack() ? router.back() : router.replace('/'));

const CLOSE = 120;   // bu kadar aşağı çekilince sayfa kapanır
const FLING = 900;   // ya da bu hızla

// dj ve gece sayfaları bir kart gibi açılır: en üstteyken aşağı çekince sayfa parmağı
// izler ve bırakınca kapanır. üstte ince bir tutamaç bunu belli eder.
// sayfa kaydırılmışken hareket kaydırmaya gider; tepeye gelince çekmeye döner.
export default function PullDownScroll({ children, style, ...rest }: ScrollViewProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const drag = useSharedValue(0);
  const armed = useSharedValue(0);
  const base = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
    },
  });

  const native = Gesture.Native();
  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-14, 14])
    .simultaneousWithExternalGesture(native)
    .onUpdate((e) => {
      if (scrollY.value <= 1) {
        if (armed.value === 0) {
          armed.set(1);
          base.set(e.translationY);
        }
        drag.set(Math.max(0, (e.translationY - base.value) * 0.85));
      } else {
        armed.set(0);
        drag.set(0);
      }
    })
    .onEnd((e) => {
      const d = drag.value;
      armed.set(0);
      if (d > CLOSE || (d > 24 && e.velocityY > FLING)) {
        drag.set(withTiming(height, { duration: 220 }, () => runOnJS(go)()));
      } else {
        drag.set(withSpring(0, { damping: 18, stiffness: 180 }));
      }
    });

  const move = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));
  const handleStyle = useAnimatedStyle(() => ({ opacity: drag.value > 0 ? 1 : 0.45 }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.wrap, move]}>
        <GestureDetector gesture={native}>
          <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={style} {...rest}>
            {children}
          </Animated.ScrollView>
        </GestureDetector>
        {/* tutamaç: "buradan aşağı çek" */}
        <View style={[styles.handleWrap, { top: insets.top + 8 }]} pointerEvents="none">
          <Animated.View style={[styles.handle, handleStyle]} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ink },
  handleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  handle: { width: 36, height: 3, backgroundColor: colors.paper },
});
