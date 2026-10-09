import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Avatar from '@/components/Avatar';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// What a post shares, real or sample: the double tap that likes it (with a heart that
// blooms over the photo), the heart and speech marks, and the sheet of who liked it.

// Two taps within 280 ms like it; a single tap does nothing (the photo is not a button).
export function DoubleTap({ onDouble, children }: { onDouble: () => void; children: ReactNode }) {
  const last = useRef(0);
  const [scale] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));
  const bloom = () => {
    scale.setValue(0.3);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      Animated.delay(260),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.25, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  };
  return (
    <Pressable
      onPress={() => {
        const now = Date.now();
        if (now - last.current < 280) {
          last.current = 0;
          bloom();
          onDouble();
        } else last.current = now;
      }}
    >
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.burst, { opacity, transform: [{ scale }] }]}>
        <Heart size={96} filled color={colors.paper} />
      </Animated.View>
    </Pressable>
  );
}

export function Heart({ size = 26, filled, color }: { size?: number; filled?: boolean; color?: string }) {
  const c = color ?? (filled ? colors.spot : colors.paper);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={filled ? c : 'none'} stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function Speech({ size = 25 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z" fill="none" stroke={colors.paper} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

// "n likes", tappable when there is anyone to show.
export function LikesLine({ n, onPress }: { n: number; onPress: () => void }) {
  const { t } = useLang();
  if (n <= 0) return null;
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityHint={t('post.likers')}>
      <Text style={styles.likes}>{t('post.likes', { n })}</Text>
    </Pressable>
  );
}

export type Liker = { key: string; name: string; you?: boolean };

// Who liked it, from the bottom, newest first. load runs when the sheet opens; a tap on
// a name opens that person. more: likes the list does not name (samples).
export function LikersSheet({ open, onClose, load, onPerson, more = 0 }: { open: boolean; onClose: () => void; load: () => Promise<Liker[]>; onPerson: (l: Liker) => void; more?: number }) {
  const { t } = useLang();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Liker[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    load().then(
      (l) => {
        if (!live) return;
        setFailed(false);
        setList(l);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [open, load]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('word.close')} />
        <View style={[styles.sheet, { maxHeight: height * 0.6, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.grab} />
          <Text style={styles.title}>{t('post.likers')}</Text>
          {list === null && !failed ? <ActivityIndicator color={colors.mute} style={{ marginVertical: 24 }} /> : null}
          {failed ? <Text style={styles.quiet}>{t('offline.title')}</Text> : null}
          <ScrollView contentContainerStyle={styles.list}>
            {(list ?? []).map((l) => (
              <Pressable key={l.key} onPress={() => onPerson(l)} disabled={l.you} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Avatar name={l.name} size={36} />
                <Text style={styles.name} numberOfLines={1}>{l.you ? t('deck.you') : l.name}</Text>
                <Heart size={16} filled />
              </Pressable>
            ))}
            {more > 0 ? <Text style={styles.quiet}>{t('post.likers.more', { n: more })}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const postStyles = StyleSheet.create({
  likes: { fontFamily: fonts.semibold, fontSize: 14, color: colors.paper },
});

const styles = StyleSheet.create({
  burst: { alignItems: 'center', justifyContent: 'center' },
  likes: postStyles.likes,
  wrap: { flex: 1, justifyContent: 'flex-end' },
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.55)' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 10 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper, textAlign: 'center', marginBottom: 8 },
  list: { paddingHorizontal: brand.left, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  quiet: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute, textAlign: 'center', marginVertical: 12 },
  pressed: { opacity: 0.6 },
});
