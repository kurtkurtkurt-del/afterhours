import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { type IconName } from '@/components/Icon';
import { useLang } from '@/i18n';
import { tabPressedAgain } from '@/hooks/useTabReset';
import { colors } from '@/theme/tokens';

// "Floating pill": inset from the edges, paper border, ink fill; the middle tab sits in a
// filled paper circle. The triggers stay in (tabs)/_layout.tsx, so a new design only
// touches this file.

export const TAB_BAR_SPACE = 100; // space pages leave at the bottom (excluding the inset)
// Including the inset: the bar sits higher on phones with a home indicator.
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_SPACE + insets.bottom;
}

type ItemProps = PressableProps & { icon: IconName; isFocused?: boolean; raised?: boolean };

export function TabItem({ icon, isFocused, raised, onPress, ...props }: ItemProps) {
  const { tx } = useLang();
  return (
    <Pressable
      {...props}
      // Pressing the open tab again resets it to its start.
      onPress={(e) => {
        if (isFocused) tabPressedAgain(icon);
        onPress?.(e);
      }}
      hitSlop={8} accessibilityRole="tab" accessibilityLabel={tx('tab.' + icon, icon)} accessibilityState={{ selected: !!isFocused }} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      {raised ? (
        <View style={styles.mid}>
          <Icon name={icon} color={colors.ink} />
        </View>
      ) : (
        <Icon name={icon} color={isFocused ? colors.paper : colors.mute} />
      )}
    </Pressable>
  );
}

export function TabBarFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <View style={styles.pill}>{children}</View>
    </View>
  );
}

const MID = 44;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.paper,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  item: { alignItems: 'center', justifyContent: 'center', minWidth: 44, height: MID },
  pressed: { opacity: 0.6 },
  mid: { width: MID, height: MID, borderRadius: MID / 2, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
});
