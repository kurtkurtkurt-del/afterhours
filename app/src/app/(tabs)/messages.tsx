import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import KeyboardSafe from '@/components/KeyboardSafe';
import { Image } from 'expo-image';
import PullDownScroll from '@/components/PullDownScroll';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import SoundCorner from '@/components/SoundCorner';
import StoryStrip from '@/components/StoryStrip';
import { PeopleResults, PeopleSearch, SuggestedInRow, openPerson } from '@/components/People';
import { useAuth } from '@/auth/AuthContext';
import { friendsLive, type LiveFriend } from '@/data/checkin';
import { inbox, type Dm } from '@/data/messages';
import { dmStart, why } from '@/data/dms';
import { friendAccept, friendsList, type FriendRow } from '@/data/friends';
import { friendPhotos } from '@/data/photo';
import Avatar from '@/components/Avatar';
import Input from '@/components/Input';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useTabBarSpace } from '@/components/TabBar';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius, barStyle } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Tab = 'tonight' | 'people';

// Messages, a tab of its own since 12.10.2026 (design B in prototypes/messages-page.html;
// it was /rooms, which now redirects here). Stories on top. Then two tabs: tonight — your direct conversations,
// the friends who are out right now first with a red ring and where they are — and
// people — find someone (name or @handle), the requests waiting for you, your people as
// faces, who to add. Only direct messages live here since 12.10.2026: the group chats
// are in the groups (connect) and a night's room is on its night page.
export default function MessagesScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { t, up } = useLang();
  const tick = useRefreshOnFocus('cards');
  const [tab, setTab] = useState<Tab>('tonight');
  const [dms, setDms] = useState<Dm[] | null>(null);
  const [live, setLive] = useState<LiveFriend[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());
  const [query, setQuery] = useState('');
  // The new-conversation sheet: your confirmed friends, narrowed by what you type.
  const [picking, setPicking] = useState(false);
  const [who, setWho] = useState('');
  const [said, setSaid] = useState<string | null>(null);
  const uid = session?.user.id;

  const load = useCallback(() => {
    if (!uid) return;
    inbox().then((i) => setDms(i.dms), () => setDms([]));
    friendsLive().then(setLive, () => {});
    friendsList().then(setFriends, () => {});
    friendPhotos().then(setPhotos, () => {});
  }, [uid]);
  useEffect(load, [load, tick]);

  const pick = (f: FriendRow) => {
    if (!f.handle) return;
    setSaid(null);
    dmStart(f.handle)
      .then((id) => {
        setPicking(false);
        setWho('');
        router.push({ pathname: '/dm/[id]', params: { id, name: (f.display_name ?? f.handle ?? '').toLowerCase() } });
      })
      .catch((e) => setSaid(why(e)));
  };
  const accepted = friends.filter((f) => f.status === 'accepted');
  const requests = friends.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const q = who.trim().toLowerCase().replace(/^@/, '');
  const shownFriends = accepted.filter((f) => !q || (f.handle ?? '').includes(q) || (f.display_name ?? '').toLowerCase().includes(q));
  const liveOf = (id: string) => live.find((l) => l.friend_id === id);
  // out right now first, then by the last line
  const threads = [...(dms ?? [])].sort((a, b) => Number(!!liveOf(b.other_id)) - Number(!!liveOf(a.other_id)) || b.last_at.localeCompare(a.last_at));

  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      <PullDownScroll
        header={
          <View style={styles.band}>
            <Text style={styles.title}>{t('messages.title')}</Text>
            <SoundCorner />
          </View>
        }
        contentContainerStyle={[styles.body, { paddingBottom: tabSpace + insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stories}>
          <StoryStrip />
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(['tonight', 'people'] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[styles.tab, tab === k && styles.tabOn]}>
              <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
                {t(k === 'tonight' ? 'messages.tonight' : 'messages.people')}
                {k === 'people' && requests.length ? ` · ${requests.length}` : ''}
                {k === 'tonight' && live.length ? ` · ${live.length}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {!session ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('messages.title')}</Text>
            <Text style={styles.note}>{t('messages.new.noFriends')}</Text>
            <View style={styles.cta}>
              <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
            </View>
          </View>
        ) : null}

        {session && tab === 'tonight' ? (
          <>
            <Pressable onPress={() => (setPicking(true), setWho(''))} accessibilityRole="button" style={({ pressed }) => [styles.newRow, pressed && styles.pressed]}>
              <View style={styles.newMark}><Text style={[styles.newPlus, styles.onSpot]}>+</Text></View>
              <Text style={styles.newText}>{t('messages.new')}</Text>
            </Pressable>
            {dms === null ? <Text style={styles.note}>{t('rooms.loading')}</Text> : null}
            {dms && !dms.length ? <Text style={styles.note}>{t('messages.none')}</Text> : null}
            {threads.length ? (
              <View style={styles.panel}>
                <View style={styles.panelIn}>
                  {threads.map((d) => {
                    const out = liveOf(d.other_id);
                    const photo = photos.get(d.other_id);
                    return (
                      <Pressable key={d.id} onPress={() => router.push({ pathname: '/dm/[id]', params: { id: d.id, name: (d.name ?? d.handle ?? '').toLowerCase() } })} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                        <View style={[styles.face, out && styles.faceLive]}>
                          {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={d.handle ?? d.name ?? '?'} size={34} />}
                        </View>
                        <View style={styles.text}>
                          <Text style={styles.name} numberOfLines={1}>{(d.name ?? d.handle ?? '').toLowerCase()}</Text>
                          <Text style={[styles.meta, out && styles.metaLive]} numberOfLines={1}>
                            {out ? `${up(t('messages.outNow'))} · ${upperData(out.venue_name ?? out.title)}` : d.last_body ? `${d.last_mine ? t('posts.you') + ': ' : ''}${d.last_body}` : t('messages.quiet')}
                          </Text>
                        </View>
                        {d.unread ? <Text style={styles.count}>{d.unread}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {session && tab === 'people' ? (
          <>
            <View style={styles.search}>
              <PeopleSearch value={query} onChange={setQuery} />
            </View>
            {query.trim() ? (
              <PeopleResults query={query} />
            ) : (
              <>
                {requests.length ? (
                  <>
                    <Text style={[styles.section, styles.sectionLive]}>{up(`${t('messages.requests')} · ${requests.length}`)}</Text>
                    <View style={styles.panel}>
                      <View style={styles.panelIn}>
                        {requests.map((f) => (
                          <View key={f.other_id} style={styles.row}>
                            <Pressable onPress={() => f.handle && openPerson(f.handle)} style={styles.rowLeft} accessibilityRole="button">
                              <View style={styles.face}><Avatar name={f.handle ?? f.display_name ?? '?'} size={34} /></View>
                              <View style={styles.text}>
                                <Text style={styles.name} numberOfLines={1}>{(f.display_name ?? f.handle ?? '').toLowerCase()}</Text>
                                <Text style={styles.meta} numberOfLines={1}>@{f.handle}</Text>
                              </View>
                            </Pressable>
                            <Pressable onPress={() => friendAccept(f.other_id).then(load, (e) => setSaid(why(e)))} style={({ pressed }) => [styles.accept, pressed && styles.pressed]} accessibilityRole="button">
                              <Text style={styles.acceptText}>{t('people.accept')}</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                ) : null}

                <Text style={styles.section}>{up(`${t('messages.yourPeople')} · ${accepted.length}`)}</Text>
                <View style={styles.grid}>
                  {accepted.map((f) => {
                    const out = liveOf(f.other_id);
                    const photo = photos.get(f.other_id);
                    return (
                      <Pressable key={f.other_id} onPress={() => (f.handle ? openPerson(f.handle) : router.push(`/friend/${f.other_id}`))} style={({ pressed }) => [styles.cell, pressed && styles.pressed]} accessibilityRole="button">
                        <View style={[styles.bigFace, out && styles.faceLive]}>
                          {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={f.handle ?? f.display_name ?? '?'} size={56} />}
                        </View>
                        <Text style={styles.cellName} numberOfLines={1}>{(f.display_name ?? f.handle ?? '').toLowerCase()}</Text>
                        <Text style={[styles.cellState, out && styles.metaLive]} numberOfLines={1}>{out ? t('messages.outNow') : ' '}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={() => router.push('/friend/add')} style={({ pressed }) => [styles.cell, pressed && styles.pressed]} accessibilityRole="button">
                    <View style={[styles.bigFace, styles.faceAdd]}><Text style={styles.facePlus}>+</Text></View>
                    <Text style={styles.cellName}>{t('yours.add')}</Text>
                    <Text style={styles.cellState}> </Text>
                  </Pressable>
                </View>
                {!accepted.length ? <Text style={styles.note}>{t('messages.new.noFriends')}</Text> : null}

                {/* suggested people: the same rail as before (the component brings its own word and columns) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggested}>
                  <SuggestedInRow />
                </ScrollView>
              </>
            )}
          </>
        ) : null}

        {said ? <Text style={[styles.note, styles.bad]}>{said}</Text> : null}
      </PullDownScroll>

      {/* Who to write to: a friend, by name. */}
      <Modal visible={picking} animationType="slide" transparent onRequestClose={() => setPicking(false)}>
        <KeyboardSafe style={styles.lift}>
          <Pressable style={styles.scrim} onPress={() => setPicking(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>{t('messages.new')}</Text>
            <Input value={who} onChangeText={setWho} placeholder={t('messages.new.who')} autoFocus autoCapitalize="none" autoCorrect={false} />
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {shownFriends.slice(0, 8).map((f) => (
                <Pressable key={f.other_id} onPress={() => pick(f)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={styles.face}><Avatar name={f.handle ?? f.display_name ?? '?'} size={34} /></View>
                  <View style={styles.text}>
                    <Text style={styles.name} numberOfLines={1}>{(f.display_name ?? f.handle ?? '').toLowerCase()}</Text>
                    <Text style={styles.meta} numberOfLines={1}>@{f.handle}</Text>
                  </View>
                </Pressable>
              ))}
              {!shownFriends.length ? <Text style={styles.note}>{accepted.length ? t('messages.new.none') : t('messages.new.noFriends')}</Text> : null}
              {said ? <Text style={[styles.note, styles.bad]}>{said}</Text> : null}
            </ScrollView>
          </View>
        </KeyboardSafe>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // words on a red fill stay light whatever the ground does (try/light)
  onSpot: { color: colors.onSpot },
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 44, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  stories: { marginHorizontal: -brand.left, marginBottom: 6 },
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: radius.pill, backgroundColor: colors.ink3, marginTop: 10 },
  tab: { paddingHorizontal: 14, height: 32, borderRadius: radius.pill, justifyContent: 'center' },
  tabOn: { backgroundColor: colors.paper },
  tabText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  tabTextOn: { color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mute, marginTop: 12 },
  empty: { marginTop: 36 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  cta: { marginTop: 20 },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 24 },
  sectionLive: { color: colors.spotText },
  search: { marginTop: 14 },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 10 },
  newMark: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  newPlus: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 22, color: colors.paper },
  newText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  scrim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.36)' },
  lift: { flex: 1 },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingHorizontal: brand.left, paddingTop: 18, flexShrink: 1, gap: 12 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.5, color: colors.paper },
  sheetList: { minHeight: 120, flexShrink: 1 },
  bad: { color: colors.spotText },
  count: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.spot, color: colors.onSpot, fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 22, textAlign: 'center', overflow: 'hidden', marginRight: 8 },
  panel: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, overflow: 'hidden', marginTop: 8 },
  panelIn: { marginBottom: -1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  face: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink3 },
  faceLive: { borderWidth: 2, borderColor: colors.spot },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.meta },
  metaLive: { color: colors.spotText },
  accept: { height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.paper, justifyContent: 'center' },
  acceptText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, marginTop: 10 },
  cell: { width: '25%', alignItems: 'center', gap: 5 },
  bigFace: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink3 },
  faceAdd: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.mute },
  facePlus: { fontFamily: fonts.medium, fontSize: 24, color: colors.mute },
  cellName: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.paper, maxWidth: 80 },
  cellState: { fontFamily: fonts.regular, fontSize: 10, color: colors.meta },
  suggested: { marginTop: 18, gap: 10, paddingRight: brand.left },
});
