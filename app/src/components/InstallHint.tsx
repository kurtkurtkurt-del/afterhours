import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Web only, iPhone only: opened in Safari rather than from the home screen, a small card
// says how to add the app — share, then "add to home screen" — because only then does it
// open full screen with its own sign-in. Once closed it stays closed (22.10.2026).
const KEY = 'install.hint';

const wanted = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const iphone = /iPhone|iPad|iPod/.test(nav.userAgent);
  const standalone = nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  let closed = false;
  try {
    closed = Storage.getItemSync(KEY) === '1';
  } catch {}
  return iphone && !standalone && !closed;
};

export default function InstallHint() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!wanted()) return;
    const id = setTimeout(() => setOn(true), 2500);
    return () => clearTimeout(id);
  }, []);
  if (!on) return null;
  const close = () => {
    try {
      Storage.setItemSync(KEY, '1');
    } catch {}
    setOn(false);
  };
  return (
    <Animated.View entering={FadeInUp.duration(320)} exiting={FadeOutUp.duration(220)} style={[styles.wrap, { top: insets.top + 10 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.words}>
          <Text style={styles.title}>{t('install.title')}</Text>
          <Text style={styles.body}>{t('install.body')}</Text>
        </View>
        <Pressable onPress={close} accessibilityRole="button" hitSlop={10} style={({ pressed }) => [styles.ok, pressed && { opacity: 0.6 }]}>
          <Text style={styles.okText}>{t('install.ok')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  words: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.paper },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, color: colors.mute },
  ok: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.spot },
  okText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSpot },
});
