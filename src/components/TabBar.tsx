import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme/tokens';

type ItemProps = PressableProps & { label: string; isFocused?: boolean; raised?: boolean };

// tek sekme: yazı ve altında bir nokta. seçili olan mürekkep, diğerleri soluk.
export function TabItem({ label, isFocused, raised, ...props }: ItemProps) {
  return (
    <Pressable {...props} style={[styles.item, raised && styles.raised]}>
      {raised ? (
        <View style={[styles.ring, isFocused && styles.ringOn]}>
          <Text style={[styles.label, isFocused && styles.labelRaisedOn]}>{label}</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.label, isFocused && styles.labelOn]}>{label}</Text>
          <View style={[styles.dot, isFocused && styles.dotOn]} />
        </>
      )}
    </Pressable>
  );
}

// alt panelin kabı. tetikleyiciler layout'ta durmak zorunda: expo-router onları
// doğrudan Tabs'ın çocukları arasında arar, ayrı bileşen içinde göremez.
export function TabBarFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>{children}</View>;
}

const RING = 64;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingVertical: 6 },
  raised: { marginTop: -RING / 2 - 12 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOn: { backgroundColor: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.ink2 },
  labelOn: { color: colors.ink },
  labelRaisedOn: { color: colors.paper },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.spot },
});
