import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Button from '@/components/Button';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { useAuth } from '@/auth/AuthContext';
import { coverUrl, GROUP_COLORS, groupSuggest, myGroups, why, type GroupRow, type Suggestion } from '@/data/groups';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Your groups: the live ones first, the once groups that are over at the end.
// On top, when there is one, a group to make: friends who kept the same nights.
export default function Groups() {
  const { t, up } = useLang();
  const { session, isAnonymous } = useAuth();
  const tick = useRefreshOnFocus();
  const [list, setList] = useState<GroupRow[] | null>(null);
  const [suggest, setSuggest] = useState<Suggestion[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const signedIn = !!session && !isAnonymous;

  useEffect(() => {
    if (!signedIn) return;
    myGroups().then(setList, (e) => {
      setList([]);
      setSaid(why(e));
    });
    groupSuggest().then(setSuggest, () => {});
  }, [tick, signedIn]);

  if (!signedIn) {
    return (
      <StaffPage title={t('groups.title')}>
        <Quiet text={t('groups.join.account')} />
        <View style={styles.buttons}>
          <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
        </View>
      </StaffPage>
    );
  }

  const names = suggest.slice(0, 3).map((s) => (s.name ?? s.handle ?? '').toLowerCase()).join(', ');
  return (
    <StaffPage title={t('groups.title')}>
      {suggest.length && list && list.length < 30 ? (
        <View style={styles.suggest}>
          <Text style={styles.suggestTitle}>{t('groups.suggest')}</Text>
          <Text style={styles.suggestText}>{t('groups.suggest.hint', { names, n: suggest[0].shared })}</Text>
          <Button label={t('groups.suggest.go')} onPress={() => router.push({ pathname: '/groups/new', params: { with: suggest.map((s) => s.user_id).join(',') } })} />
        </View>
      ) : null}

      <Said text={said} bad />
      {list && !list.length ? <Quiet text={t('groups.none')} /> : null}

      {/* The shelf (design 3B): every group a record sleeve, the last tile makes a new one. */}
      <View style={styles.shelf}>
        {list?.map((g) => (
          <Pressable key={g.id} onPress={() => router.push(`/groups/${g.id}`)} style={({ pressed }) => [styles.tile, g.archived && styles.over, pressed && styles.pressed]}>
            <View style={styles.sleeveWrap}>
              <View style={[styles.record, { backgroundColor: GROUP_COLORS[g.color] }]} />
              <View style={[styles.sleeve, { backgroundColor: GROUP_COLORS[g.color] }]}>
                {coverUrl(g.cover_path) ? <Image source={{ uri: coverUrl(g.cover_path)! }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                {!g.cover_path ? <Text style={styles.emoji}>{g.emoji}</Text> : null}
                {g.live ? <Text style={styles.live}>{up(t('groups.liveNow', { n: g.live }))}</Text> : null}
              </View>
            </View>
            <Text style={styles.name} numberOfLines={1}>{g.name}</Text>
            <Text style={styles.under} numberOfLines={1}>
              {g.archived ? up(t('groups.archived')) : [g.matches ? t('groups.matches', { n: g.matches }) : null, g.to_swipe ? t('groups.toSwipe', { n: g.to_swipe }) : null].filter(Boolean).join(' · ') || t('groups.members', { n: g.members })}
            </Text>
          </Pressable>
        ))}
        <View style={styles.tile}>
          <Pressable onPress={() => router.push('/groups/new')} style={({ pressed }) => [styles.newSleeve, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.newPlus}>+</Text>
          </Pressable>
          <Text style={styles.name}>{t('groups.new')}</Text>
          <Text style={[styles.under, styles.link]} onPress={() => router.push('/groups/join')}>{t('groups.join')}</Text>
        </View>
      </View>
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: 10, marginTop: 4, marginBottom: 6 },
  suggest: { borderWidth: 1, borderColor: colors.spot, borderRadius: radius.md, padding: 14, gap: 8, marginBottom: 18 },
  suggestTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.paper },
  suggestText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mute, marginBottom: 4 },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22, marginTop: 6 },
  tile: { width: '47%' },
  over: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  sleeveWrap: { aspectRatio: 1, marginBottom: 8 },
  // the record peeking out of the sleeve, on the right
  record: { position: 'absolute', top: '4%', bottom: '4%', right: -10, width: '92%', borderRadius: 999, opacity: 0.35 },
  sleeve: { flex: 1, borderRadius: radius.sm, overflow: 'hidden', justifyContent: 'flex-end', padding: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 3, height: 5 }, elevation: 6 },
  emoji: { fontSize: 44 },
  live: { position: 'absolute', top: 10, right: 10, fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.paper, backgroundColor: 'rgba(14,13,12,0.55)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  name: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3, color: colors.paper },
  under: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 2 },
  link: { textDecorationLine: 'underline' },
  newSleeve: { aspectRatio: 1, marginBottom: 8, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.mute, alignItems: 'center', justifyContent: 'center' },
  newPlus: { fontFamily: fonts.medium, fontSize: 40, color: colors.paper },
});
