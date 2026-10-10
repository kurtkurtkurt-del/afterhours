import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PullDownScroll from '@/components/PullDownScroll';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton, { EdgeBack } from '@/components/BackButton';
import Button from '@/components/Button';
import SoundCorner from '@/components/SoundCorner';
import { useAuth } from '@/auth/AuthContext';
import { type CardRow } from '@/data/checkin';
import { inbox, roomUnread, type GroupChat } from '@/data/messages';
import GroupBadge from '@/components/GroupBadge';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const two = (n: number) => String(n).padStart(2, '0');
const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  return { h: Math.floor(ms / 3600_000), m: two(Math.floor((ms % 3600_000) / 60_000)) };
};
const ddmm = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}`;
};

// Messages (11.10.2026): your afterhours rooms and your group chats in one list. Open
// rooms first with the time left in red and what is new; then the groups, each with its
// last line; frozen rooms below, dimmed. Tapping a row opens the room or the chat. The
// route keeps its old name, /rooms.
export default function RoomsScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { t, tn, up } = useLang();
  const tick = useRefreshOnFocus('cards');
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [chats, setChats] = useState<GroupChat[]>([]);
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    let live = true;
    inbox()
      .then((i) => {
        if (!live) return;
        setCards(i.rooms);
        setChats(i.groups);
      })
      .catch(() => live && setCards([]));
    return () => {
      live = false;
    };
  }, [uid, tick]);

  const list = uid ? cards : [];
  // Open rooms first (least time left on top), then frozen ones (newest on top).
  const open = (list ?? []).filter((c) => !c.frozen && left(c.freeze_at)).sort((a, b) => a.freeze_at.localeCompare(b.freeze_at));
  const frozen = (list ?? []).filter((c) => !open.includes(c)).sort((a, b) => b.checked_at.localeCompare(a.checked_at));

  const row = (c: CardRow, live: boolean) => {
    const remaining = live ? left(c.freeze_at) : null;
    return (
      <Pressable key={c.slug} onPress={() => router.push(`/room/${c.slug}`)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={[styles.mark, live && styles.markLive]} />
        <View style={styles.text}>
          <Text style={[styles.name, !live && styles.dim]} numberOfLines={1}>
            {c.title.toLowerCase()}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[ddmm(c.starts_at ?? c.checked_at), upperData(c.venue_name ?? c.city_name), up(tn('rooms.said', c.post_count))].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {live && roomUnread(c) ? <Text style={styles.count}>{roomUnread(c)}</Text> : null}
        <Text style={live ? styles.time : styles.sealed}>{remaining ? up(t('room.left', remaining)) : up(t('room.sealed'))}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <EdgeBack />
      <PullDownScroll
        header={
          <View style={styles.band}>
            <Text style={styles.title}>{t('messages.title')}</Text>
            <SoundCorner />
          </View>
        }
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.about}>{t('messages.about')}</Text>

        {list === null ? <Text style={styles.note}>{t('rooms.loading')}</Text> : null}

        {list && list.length === 0 && chats.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('rooms.empty')}</Text>
            <Text style={styles.note}>{t('rooms.empty.note')}</Text>
            {!session ? (
              <View style={styles.cta}>
                <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
              </View>
            ) : null}
          </View>
        ) : null}

        {open.length ? (
          <>
            <Text style={[styles.section, styles.sectionLive]}>{up(`${t('rooms.open')} · ${open.length}`)}</Text>
            <View style={styles.panel}>
              <View style={styles.panelIn}>{open.map((c) => row(c, true))}</View>
            </View>
          </>
        ) : null}

        {chats.length ? (
          <>
            <Text style={styles.section}>{up(`${t('messages.groups')} · ${chats.length}`)}</Text>
            <View style={styles.panel}>
              <View style={styles.panelIn}>
                {chats.map(({ g, last, unread }) => (
                  <Pressable key={g.id} onPress={() => router.push({ pathname: '/groups/chat', params: { id: g.id } })} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <GroupBadge emoji={g.emoji} color={g.color} cover={g.cover_path} size={34} />
                    <View style={styles.text}>
                      <Text style={styles.name} numberOfLines={1}>{g.name.toLowerCase()}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{last ? `${last.mine ? t('posts.you') : (last.name ?? '').toLowerCase()}: ${last.body}` : t('messages.quiet')}</Text>
                    </View>
                    {unread ? <Text style={styles.count}>{unread}</Text> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {frozen.length ? (
          <>
            <Text style={styles.section}>{up(`${t('rooms.frozen')} · ${frozen.length}`)}</Text>
            <View style={styles.panel}>
              <View style={styles.panelIn}>{frozen.map((c) => row(c, false))}</View>
            </View>
          </>
        ) : null}

        <View style={styles.back}>
          <BackButton inline />
        </View>
      </PullDownScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 44, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  body: { paddingTop: brand.top + 56, paddingHorizontal: brand.left },
  about: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mute },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mute, marginTop: 8 },
  empty: { marginTop: 36 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  cta: { marginTop: 20 },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 28 },
  sectionLive: { color: colors.spotText },
  count: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.spot, color: colors.paper, fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 22, textAlign: 'center', overflow: 'hidden', marginRight: 8 },
  panel: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, overflow: 'hidden', marginTop: 10 },
  panelIn: { marginBottom: -1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  mark: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.mute },
  markLive: { backgroundColor: colors.spot, borderColor: colors.spot },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2, color: colors.paper },
  dim: { color: colors.mute },
  meta: { fontFamily: fonts.regular, fontSize: 10.5, letterSpacing: 1.2, color: colors.meta },
  time: { fontFamily: fonts.jet, fontSize: 12, letterSpacing: 0.6, color: colors.spotText },
  sealed: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.meta },
  back: { marginTop: 32 },
});
