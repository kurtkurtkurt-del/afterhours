import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { openPerson } from '@/components/People';
import { friendsList, kept, personKept, personPeople, type PersonPerson } from '@/data/friends';
import type { Night } from '@/data/deck';
import { dayLabel } from '@/data/when';
import { useShelf } from '@/lib/offline';
import { upperData, useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The lists under a profile, opened from its counts: the nights kept (events) or the
// people. No handle = yours. Pulling down from the top closes it, like the other cards.
export default function ListScreen() {
  const { kind, handle } = useLocalSearchParams<{ kind: 'events' | 'people'; handle?: string }>();
  const insets = useSafeAreaInsets();
  const { t, up } = useLang();
  const [nights, setNights] = useState<Night[] | null>(null);
  const [people, setPeople] = useState<PersonPerson[] | null>(null);
  const fresh = useShelf('kept', 'friends', 'personKept', 'personPeople');

  useEffect(() => {
    let live = true;
    if (kind === 'events') {
      (handle ? personKept(handle) : kept()).then((l) => live && setNights(l)).catch(() => live && setNights([]));
    } else {
      (handle
        ? personPeople(handle)
        : friendsList().then((l) => l.filter((f) => f.status === 'accepted').map((f) => ({ handle: f.handle, display_name: f.display_name }))))
        .then((l) => live && setPeople(l))
        .catch(() => live && setPeople([]));
    }
    return () => {
      live = false;
    };
  }, [kind, handle, fresh]);

  const title = kind === 'events' ? t('profile.events') : t(handle ? 'profile.people.theirs' : 'profile.people.mine');
  const list = kind === 'events' ? nights : people;
  const empty = handle ? t('profile.list.hidden') : kind === 'events' ? t('profile.events.empty') : t('profile.people.empty');

  const band = (
    <View style={styles.band}>
      <BackButton />
      <SoundCorner />
    </View>
  );
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PullDownScroll header={band} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        {handle ? <Text style={styles.meta}>@{upperData(handle)}</Text> : null}

        {list === null ? (
          <Text style={styles.note}>{up(t('person.loading'))}</Text>
        ) : list.length === 0 ? (
          <Text style={styles.note}>{empty}</Text>
        ) : kind === 'events' ? (
          nights!.map((n) => (
            <Pressable key={n.id} onPress={() => router.push(`/night/${n.slug}`)} style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
              <View style={styles.main}>
                <Text style={styles.lineTitle} numberOfLines={1}>{n.title.toLowerCase()}</Text>
                <Text style={styles.small} numberOfLines={1}>{up(dayLabel(n.starts_at))} · {upperData(n.venue_name ?? n.city_name)}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))
        ) : (
          people!.map((p, i) => (
            <Pressable key={p.handle ?? i} disabled={!p.handle} onPress={() => p.handle && openPerson(p.handle)} style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
              <View style={styles.face}>
                <Text style={styles.faceText}>{(p.display_name ?? p.handle ?? '·').charAt(0).toLowerCase()}</Text>
              </View>
              <View style={styles.main}>
                <Text style={styles.lineTitle} numberOfLines={1}>{(p.display_name ?? p.handle ?? '').toLowerCase()}</Text>
                {p.handle ? <Text style={styles.small}>@{upperData(p.handle)}</Text> : null}
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))
        )}
      </PullDownScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  title: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 6 },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.mute, marginTop: 22 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  main: { flex: 1, gap: 3 },
  lineTitle: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3, color: colors.paper },
  small: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
  arrow: { fontFamily: fonts.medium, fontSize: 16, color: colors.mute },
  face: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  pressed: { opacity: 0.7 },
});
