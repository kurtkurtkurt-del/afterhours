import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { type IconName } from '@/components/Icon';
import { usePhoto } from '@/data/photo';
import { useLang } from '@/i18n';
import { tabPressedAgain } from '@/hooks/useTabReset';
import { colors } from '@/theme/tokens';

// A full-width bar on the bottom edge, ink with a hairline on top, five icons with no
// labels. The flow, in the middle, is a red card tilted a little that rises out of the bar
// (design 2 of prototypes/nav-bar.html, owner, 26.10.2026): the deck is what the app is
// for. The other open tab's icon is solid with a red dot under it; the account tab is your
// photo, ringed when open. The triggers stay in (tabs)/_layout.tsx.

const BAR = 52;
// Android: the system navigation bar is hidden (root _layout), so the inset is 0 and the
// icons sat in the strip where a swipe brings the system bar back. The bar keeps that
// strip as empty ink and puts its icons above it.
const LIFT = Platform.OS === 'android' ? 22 : 0;
// How far the flow card rises above the bar; pages keep that clear too, so the card never
// sits on a page's own buttons (the flow's keep and let go are right above it).
const RISE = 24;
const CARD = 56;
export const TAB_BAR_SPACE = BAR + 8 + LIFT + RISE - 6; // space pages leave at the bottom (excluding the inset)
// Including the inset: the bar grows by the home indicator's height.
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_SPACE + insets.bottom;
}

type ItemProps = PressableProps & { icon: IconName; isFocused?: boolean };

export function TabItem({ icon, isFocused, onPress, ...props }: ItemProps) {
  const { tx } = useLang();
  return (
    <Pressable
      {...props}
      // Pressing the open tab again resets it to its start.
      onPress={(e) => {
        if (isFocused) tabPressedAgain(icon);
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityLabel={tx('tab.' + icon, icon)}
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.item, icon === 'flow' && styles.itemFlow, pressed && styles.pressed]}
    >
      {icon === 'flow' ? (
        <View style={[styles.card, isFocused && styles.cardOn]}>
          <View style={styles.cardIcon}>
            <Icon name="flow" size={26} color={colors.onSpot} filled={!!isFocused} strokeWidth={1.8} />
          </View>
        </View>
      ) : (
        <>
          {icon === 'account' ? <Avatar on={!!isFocused} /> : <Icon name={icon} size={26} color={colors.paper} filled={!!isFocused} strokeWidth={1.7} />}
          {isFocused ? <View style={styles.dot} /> : null}
        </>
      )}
    </Pressable>
  );
}

// Your photo in the account slot; the outline person when there is none.
function Avatar({ on }: { on: boolean }) {
  const { photo } = usePhoto();
  return (
    <View style={[styles.ring, on && styles.ringOn]}>
      {photo ? <Image source={{ uri: photo }} style={styles.face} /> : <Icon name="account" size={24} color={colors.paper} filled={on} strokeWidth={1.7} />}
    </View>
  );
}

export function TabBarFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    // The frame is as tall as the risen card, so a tap on the card's top half lands (Android
    // does not pass touches outside a parent); only the card takes touches up there.
    <View style={[styles.frame, { paddingBottom: insets.bottom + LIFT }]} pointerEvents="box-none">
      <View style={[styles.bar, { height: BAR + insets.bottom + LIFT }]} pointerEvents="none" />
      <View style={styles.row} pointerEvents="box-none">{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink3 },
  row: { height: BAR + RISE, flexDirection: 'row', alignItems: 'flex-end' },
  item: { flex: 1, height: BAR, alignItems: 'center', justifyContent: 'center' },
  itemFlow: { height: BAR + RISE, justifyContent: 'flex-start' },
  // the flow card: red, tilted, ringed in the ground's colour so it reads as lifted off the bar
  card: { width: CARD, height: CARD, borderRadius: 20, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: colors.ink, transform: [{ rotate: '-6deg' }], shadowColor: colors.spot, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  cardOn: { transform: [{ rotate: '-6deg' }, { scale: 1.04 }] },
  cardIcon: { transform: [{ rotate: '6deg' }] },
  dot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.spot },
  pressed: { opacity: 0.6 },
  ring: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.paper },
  face: { width: 24, height: 24, borderRadius: 12 },
});
