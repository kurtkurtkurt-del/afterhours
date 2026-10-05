import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { ActionButton, SAMPLES, useConnect } from '@/components/People';
import { Row, Section, Value } from '@/components/Row';
import { person, type Found, type PersonCard } from '@/data/friends';
import { useProfileExtra } from '@/data/profile';
import { LINKS } from '@/content/links';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Loaded = { card: PersonCard; found: Found | null } | null;

// Someone's public profile, opened from search results and suggestions:
// name, handle, city, bio, the text about them, friends in common, the add / accept
// button, and (for friends only) their links elsewhere.
export default function PersonScreen() {
  const { handle, sample } = useLocalSearchParams<{ handle: string; sample?: string }>();
  const extra = useProfileExtra(handle ?? null, 0, !!sample);
  const insets = useSafeAreaInsets();
  const { t, tn, up } = useLang();
  const { after, busy, act } = useConnect();
  const [state, setState] = useState<{ handle: string; data: Loaded } | null>(null);
  const [sampleAsked, setSampleAsked] = useState(false);

  const example = sample ? SAMPLES.find((p) => p.handle === handle) : undefined;
  useEffect(() => {
    if (example || !handle) return;
    let live = true;
    person(handle)
      .then((data) => live && setState({ handle, data }))
      .catch(() => live && setState({ handle, data: null }));
    return () => {
      live = false;
    };
  }, [handle, example]);

  const loaded = example || state?.handle === handle;
  const card = example
    ? { handle: example.handle, display_name: example.display_name, bio: null, city_name: example.city_name, created_at: '', is_friend: false, kept_count: null }
    : state?.data?.card;
  const found = state?.data?.found ?? null;
  const mutual = example?.mutual ?? found?.mutual ?? 0;
  const relation = example ? (sampleAsked ? 'outgoing' : 'none') : found ? (after[found.id] ?? found.relation) : card?.is_friend ? 'friend' : 'none';

  const since = card?.created_at ? new Date(card.created_at) : null;
  const sinceText = since && !isNaN(since.getTime()) ? `${String(since.getMonth() + 1).padStart(2, '0')}.${since.getFullYear()}` : null;
  const name = (card?.display_name ?? card?.handle ?? '').toLowerCase();

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
        {!loaded ? (
          <Text style={styles.note}>{up(t('person.loading'))}</Text>
        ) : !card ? (
          <Text style={styles.big}>{t('person.hidden')}</Text>
        ) : (
          <>
            <View style={styles.initial}>
              <Text style={styles.initialText}>{name.charAt(0)}</Text>
            </View>
            <Text style={styles.big}>{name}</Text>
            <Text style={styles.mono}>
              @{upperData(card.handle)}
              {card.city_name ? ` · ${upperData(card.city_name)}` : ''}
              {example ? ` · ${up(t('person.sample'))}` : ''}
            </Text>
            {card.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}
            {!example && extra?.about ? <Text style={styles.about}>{extra.about}</Text> : null}

            <View style={styles.action}>
              <ActionButton
                wide
                relation={relation}
                busy={!!found && busy === found.id}
                onPress={() => (example ? setSampleAsked(true) : found ? act(found, relation) : undefined)}
              />
            </View>

            <Section title={t('friend.together')} />
            <Row label={t('person.common')} right={<Value text={mutual ? tn('people.mutual', mutual) : '—'} />} />
            {card.city_name ? <Row label={t('person.city')} right={<Value text={card.city_name} />} /> : null}
            {sinceText ? <Row label={t('person.since')} right={<Value text={sinceText} />} /> : null}

            {!example && extra && LINKS.some((l) => extra.links[l.kind]) ? (
              <>
                <Section title={t('account.links')} />
                {LINKS.filter((l) => extra.links[l.kind]).map((l) => {
                  const v = extra.links[l.kind]!;
                  return <Row key={l.kind} label={l.label} right={<Value text={`${l.kind === 'website' ? v.replace(/^https?:\/\//, '') : l.prefix + v} ↗`} />} onPress={() => Linking.openURL(l.url(v)).catch(() => {})} />;
                })}
              </>
            ) : null}
          </>
        )}
      </PullDownScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  initial: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  initialText: { fontFamily: fonts.medium, fontSize: 30, color: colors.paper },
  big: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 6 },
  bio: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.paper, marginTop: 14 },
  about: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.mute, marginTop: 10 },
  action: { marginTop: 20 },
  note: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta },
});
