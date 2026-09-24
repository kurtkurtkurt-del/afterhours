import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { type IconName } from '@/components/Icon';
import { colors } from '@/theme/tokens';

// seçenek 2, "yüzen hap": kenarlardan boşluklu, kâğıt çerçeveli, mürekkep dolgulu.
// ortadaki sekme dolu kâğıt dairede. başka bir tasarıma geçmek = bu dosyayı değiştirmek;
// tetikleyiciler (tabs)/_layout.tsx içinde kalır.

export const TAB_BAR_SPACE = 100; // sayfaların altta bırakması gereken boşluk (inset hariç)
// inset dahil: çentikli telefonlarda çubuk daha yukarıda durur
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_SPACE + insets.bottom;
}

type ItemProps = PressableProps & { icon: IconName; isFocused?: boolean; raised?: boolean };

export function TabItem({ icon, isFocused, raised, ...props }: ItemProps) {
  return (
    <Pressable {...props} hitSlop={8} accessibilityRole="tab" accessibilityLabel={icon} accessibilityState={{ selected: !!isFocused }} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
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
