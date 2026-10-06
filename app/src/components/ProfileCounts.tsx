import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Two counts under a profile's links: the nights kept and the people. Each opens its
// list (app/list/[kind].tsx). handle null = you. A count that is not visible is "—".
export default function ProfileCounts({ handle, events, people, mine }: { handle: string | null; events: number | null; people: number | null; mine: boolean }) {
  const { t, up } = useLang();
  const open = (kind: 'events' | 'people') => router.push({ pathname: '/list/[kind]', params: handle ? { kind, handle } : { kind } });
  const box = (kind: 'events' | 'people', n: number | null, label: string) => (
    <Pressable onPress={() => open(kind)} accessibilityRole="button" style={({ pressed }) => [styles.box, pressed && styles.pressed]}>
      <Text style={styles.n}>{n === null ? '—' : n}</Text>
      <Text style={styles.label}>{up(label)}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {box('events', events, t('profile.events'))}
      {box('people', people, t(mine ? 'profile.people.mine' : 'profile.people.theirs'))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 },
  box: { minWidth: 120, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink3 },
  n: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  label: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.4, color: colors.mute, marginTop: 2 },
  pressed: { opacity: 0.7 },
});
