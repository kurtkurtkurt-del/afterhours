import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { Quiet, Said } from '@/components/StaffPage';
import { friendsList, type FriendRow } from '@/data/friends';
import { groupAdd, groupGet, why, type Group } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts, radius, barStyle } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Adding a friend to a group, on its own page (flow 1, owner 03.11.2026): the friends
// who are not in yet as faces, a tap picks, "add" puts them in at once. The ones already
// in are shown dimmed. Anyone who is not a friend comes in with the link (invite).
export default function AddFriend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    groupGet(id).then(setGroup, (e) => setSaid(why(e)));
    friendsList().then((l) => setFriends(l.filter((r) => r.status === 'accepted')), () => setFriends([]));
  }, [id]);
  const inGroup = new Set(group?.members.map((m) => m.id) ?? []);
  const toggle = (who: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(who)) n.delete(who);
      else n.add(who);
      return n;
    });
  const add = () => {
    if (!picked.size) return router.back();
    setBusy(true);
    groupAdd(id, [...picked])
      .then(() => router.back())
      .catch((e) => {
        setSaid(why(e));
        setBusy(false);
      });
  };
  const top = Math.max(brand.top, insets.top + 24);
  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      <View style={[styles.head, { paddingTop: top - 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={({ pressed }) => [styles.round, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('word.back')}>
          <Text style={styles.roundText}>‹</Text>
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.title}>{t('groups.friend.add')}</Text>
          <Text style={styles.under} numberOfLines={1}>{group ? `${group.name.toLowerCase()} · ${t('groups.friend.hint')}` : ''}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}>
        <Said text={said} bad />
        <View style={styles.grid}>
          {(friends ?? []).map((r) => {
            const name = (r.display_name ?? r.handle ?? '?').toLowerCase();
            const already = inGroup.has(r.other_id);
            const on = picked.has(r.other_id);
            return (
              <Pressable key={r.other_id} onPress={already ? undefined : () => toggle(r.other_id)} style={styles.cell} accessibilityRole="checkbox" accessibilityState={{ checked: on || already, disabled: already }}>
                <View style={[styles.dot, on && styles.dotOn, already && styles.dotIn]}>
                  <Text style={[styles.letter, on && styles.letterOn]}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.name, already && styles.nameIn]} numberOfLines={1}>{already ? `${name} · ${t('groups.plan.in')}` : on ? `${name} ✓` : name}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.replace({ pathname: '/groups/invite', params: { id } })} style={styles.cell} accessibilityRole="button">
            <View style={[styles.dot, styles.dotLink]}>
              <Text style={styles.plus}>+</Text>
            </View>
            <Text style={[styles.name, styles.link]} numberOfLines={1}>{t('groups.friend.link')}</Text>
          </Pressable>
        </View>
        {friends && !friends.some((r) => !inGroup.has(r.other_id)) ? <Quiet text={t('groups.friend.none')} /> : null}
        <Text style={styles.note}>{t('groups.friend.note')}</Text>
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 20 }]}>
        <Button label={busy ? '…' : picked.size ? t('groups.friend.done', { n: picked.size }) : t('word.done')} onPress={busy ? undefined : add} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: brand.left, paddingBottom: 8 },
  round: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 20, color: colors.paper },
  pressed: { opacity: 0.6 },
  headText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.5, color: colors.paper },
  under: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  body: { paddingHorizontal: brand.left, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20, paddingVertical: 10 },
  cell: { width: '33.33%', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  dot: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: colors.spot },
  dotIn: { opacity: 0.4 },
  dotLink: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.mute },
  letter: { fontFamily: fonts.semibold, fontSize: 22, color: colors.paper },
  letterOn: { color: colors.onSpot },
  plus: { fontFamily: fonts.regular, fontSize: 26, color: colors.mute },
  name: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper, textAlign: 'center' },
  nameIn: { color: colors.mute },
  link: { color: colors.mute, textDecorationLine: 'underline' },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mute, marginTop: 10 },
  foot: { position: 'absolute', left: brand.left, right: brand.left, bottom: 0, paddingTop: 10, backgroundColor: colors.ink, borderRadius: radius.md },
});
