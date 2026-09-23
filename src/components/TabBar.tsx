import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabList, TabTrigger } from 'expo-router/ui';
import { colors, fonts } from '@/theme/tokens';

type ItemProps = PressableProps & { label: string; isFocused?: boolean; raised?: boolean };

// tek sekme: yazı ve altında bir nokta. seçili olan mürekkep, diğerleri soluk.
function Item({ label, isFocused, raised, ...props }: ItemProps) {
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

// alt panel: flow · djs · [yours] · map · account
export default function TabBar() {
  const insets = useSafeAreaInsets();
  return (
    <TabList asChild>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
        <TabTrigger name="flow" href="/flow" asChild><Item label="flow" /></TabTrigger>
        <TabTrigger name="djs" href="/djs" asChild><Item label="djs" /></TabTrigger>
        <TabTrigger name="yours" href="/yours" asChild><Item label="yours" raised /></TabTrigger>
        <TabTrigger name="map" href="/map" asChild><Item label="map" /></TabTrigger>
        <TabTrigger name="account" href="/account" asChild><Item label="account" /></TabTrigger>
      </View>
    </TabList>
  );
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
