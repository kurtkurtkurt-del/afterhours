import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line } from 'react-native-svg';
import { useAuth } from '@/auth/AuthContext';
import { friendAccept, friendRequest, peopleSearch, peopleSuggested, type Found, type Relation, type Suggested } from '@/data/friends';
import { refreshYours } from '@/data/yours';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Finding friends on yours: a search field on top with results while typing; when empty,
// three suggestion cards. Requests, accepts and the friend page all start here; yours reloads afterwards.

// ------------------------------------------------------------ search field

export function PeopleSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLang();
  return (
    <View style={styles.search}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Circle cx={7} cy={7} r={5} stroke={colors.mute} strokeWidth={1.5} fill="none" />
        <Line x1={10.8} y1={10.8} x2={14.5} y2={14.5} stroke={colors.mute} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('people.search')}
        placeholderTextColor={colors.meta}
        selectionColor={colors.spot}
        cursorColor={colors.paper}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('people.clear')}>
          <Text style={styles.clear}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------ request and accept

export function useConnect() {
  const { session, isAnonymous } = useAuth();
  const [after, setAfter] = useState<Record<string, Relation>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const member = !!session && !isAnonymous;
  const act = async (p: { id: string; handle: string }, relation: Relation) => {
    if (relation === 'friend') return router.push(`/friend/${p.id}`);
    if (relation === 'outgoing') return;
    if (!member) return router.push('/signup');
    setBusy(p.id);
    try {
      if (relation === 'incoming') {
        await friendAccept(p.id);
        setAfter((a) => ({ ...a, [p.id]: 'friend' }));
      } else {
        const r = await friendRequest(p.handle);
        setAfter((a) => ({ ...a, [p.id]: r === 'accepted' ? 'friend' : 'outgoing' }));
      }
      refreshYours();
    } catch {
      // network or rule failure: the button stays as it was and can be retried
    } finally {
      setBusy(null);
    }
  };
  return { after, busy, act, member };
}

export function ActionButton({ relation, busy, onPress, compact, wide }: { relation: Relation; busy: boolean; onPress: () => void; compact?: boolean; wide?: boolean }) {
  const { t } = useLang();
  const red = relation === 'none' || relation === 'incoming';
  const label = relation === 'none' ? t('people.add') : relation === 'incoming' ? t('people.accept') : relation === 'outgoing' ? t('people.asked') : t('people.friend');
  return (
    <Pressable onPress={onPress} disabled={busy || relation === 'outgoing'} hitSlop={6} style={({ pressed }) => [red ? styles.btnRed : styles.btnLine, compact && styles.btnCompact, wide && styles.btnWide, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator size="small" color={red ? colors.ink : colors.paper} /> : <Text style={red ? styles.btnTextRed : styles.btnTextLine}>{label}</Text>}
    </Pressable>
  );
}

export function Initial({ name }: { name: string }) {
  return (
    <View style={styles.initial}>
      <Text style={styles.initialText}>{name.charAt(0)}</Text>
    </View>
  );
}

export const openPerson = (handle: string, sample = false) => router.push({ pathname: '/person/[handle]', params: sample ? { handle, sample: '1' } : { handle } });

// ------------------------------------------------------------ results

export function PeopleResults({ query }: { query: string }) {
  const { t, tn, up } = useLang();
  const { after, busy, act } = useConnect();
  const [state, setState] = useState<{ q: string; rows: Found[] | null; error: boolean }>({ q: '', rows: null, error: false });
  const q = query.trim().replace(/^@/, '');
  useEffect(() => {
    if (q.length < 2) return;
    // debounce, and never let an older response overwrite a newer one
    let stale = false;
    const timer = setTimeout(() => {
      peopleSearch(q)
        .then((rows) => !stale && setState({ q, rows, error: false }))
        .catch(() => !stale && setState({ q, rows: null, error: true }));
    }, 280);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q]);

  if (q.length < 2) return <Text style={styles.note}>{up(t('people.short'))}</Text>;
  if (state.q !== q) return <Text style={styles.note}>{up(t('people.searching'))}</Text>;
  if (state.error) return <Text style={styles.note}>{up(t('people.error'))}</Text>;
  if (!state.rows?.length) return <Text style={styles.note}>{up(t('people.none'))}</Text>;

  return (
    <View style={styles.results}>
      {state.rows.map((p) => {
        const relation = after[p.id] ?? p.relation;
        const name = (p.display_name ?? p.handle).toLowerCase();
        const meta = [`@${p.handle}`, p.city_name, p.mutual ? tn('people.mutual', p.mutual) : null].filter(Boolean).join(' · ');
        return (
          <View key={p.id} style={styles.row}>
            <Pressable onPress={() => openPerson(p.handle)} accessibilityRole="button" style={({ pressed }) => [styles.rowOpen, pressed && styles.pressed]}>
              <Initial name={name} />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>{upperData(meta)}</Text>
              </View>
            </Pressable>
            <ActionButton relation={relation} busy={busy === p.id} onPress={() => act(p, relation)} />
          </View>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------ suggestions

// Without an account, or when nobody qualifies: three sample people with a "sample" note.
export const SAMPLES: Suggested[] = [
  { id: 'sample-1', handle: 'lena.k', display_name: 'lena', city_name: null, mutual: 2, reason: 'mutual' },
  { id: 'sample-2', handle: 'mert_', display_name: 'mert', city_name: 'münchen', mutual: 0, reason: 'city' },
  { id: 'sample-3', handle: 'jonas', display_name: 'jonas', city_name: null, mutual: 0, reason: 'new' },
];

export function PeopleSuggested() {
  const { t, tn, up } = useLang();
  const { session } = useAuth();
  const { after, busy, act, member } = useConnect();
  const [rows, setRows] = useState<Suggested[] | null>(null);
  const [sampleAdded, setSampleAdded] = useState<Record<string, boolean>>({});
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    peopleSuggested(3)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [uid]);

  const sample = !uid || (rows !== null && rows.length === 0);
  const list = sample ? SAMPLES : (rows ?? []);
  if (!sample && rows === null) return null;

  const reason = (p: Suggested) =>
    p.reason === 'mutual' ? tn('people.mutual', p.mutual) : p.reason === 'city' && p.city_name ? t('people.city', { city: p.city_name }) : t('people.new');

  return (
    <View style={styles.suggested}>
      <Text style={styles.section}>
        {up(t('people.suggested'))}
        {sample ? <Text style={styles.sectionNote}>{'  ·  '}{up(member ? t('people.sampleMember') : t('people.sample'))}</Text> : null}
      </Text>
      <View style={styles.cards}>
        {list.map((p) => {
          const name = (p.display_name ?? p.handle).toLowerCase();
          const relation: Relation = sample ? (sampleAdded[p.id] ? 'outgoing' : 'none') : (after[p.id] ?? 'none');
          return (
            <View key={p.id} style={styles.card}>
              <Pressable onPress={() => openPerson(p.handle, sample)} accessibilityRole="button" style={({ pressed }) => [styles.cardOpen, pressed && styles.pressed]}>
                <Initial name={name} />
                <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
                <Text style={styles.cardHandle} numberOfLines={1}>@{p.handle}</Text>
                <Text style={styles.cardReason} numberOfLines={2}>{reason(p)}</Text>
              </Pressable>
              <ActionButton
                compact
                relation={relation}
                busy={busy === p.id}
                // sample person: guests go to sign-up, members only see it marked
                onPress={() => (sample ? (member ? setSampleAdded((s) => ({ ...s, [p.id]: true })) : router.push('/signup')) : act(p, relation))}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: brand.left, marginBottom: 18, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, letterSpacing: -0.1, color: colors.paper, paddingVertical: 0 },
  clear: { fontFamily: fonts.regular, fontSize: 22, lineHeight: 24, color: colors.mute },
  note: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta, marginTop: 6, paddingHorizontal: brand.left },
  results: { paddingHorizontal: brand.left },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.ink3 },
  rowOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.4, color: colors.paper },
  rowMeta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 0.8, color: colors.mute },
  initial: { width: 46, height: 46, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontFamily: fonts.medium, fontSize: 18, color: colors.paper },
  suggested: { marginTop: 26 },
  section: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta, paddingHorizontal: brand.left },
  sectionNote: { color: colors.ink2 },
  cards: { flexDirection: 'row', gap: 8, paddingHorizontal: brand.left, marginTop: 12 },
  card: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, padding: 12, alignItems: 'center', gap: 4 },
  cardOpen: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  cardName: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.3, color: colors.paper, marginTop: 6 },
  cardHandle: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 0.4, color: colors.mute },
  cardReason: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.meta, textAlign: 'center', minHeight: 28, marginBottom: 6 },
  btnRed: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.spot, borderRadius: radius.pill, minWidth: 64, alignItems: 'center' },
  btnLine: { paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.paper, borderRadius: radius.pill, minWidth: 64, alignItems: 'center' },
  btnCompact: { alignSelf: 'stretch' },
  btnWide: { alignSelf: 'flex-start', paddingVertical: 11, paddingHorizontal: 22 },
  btnTextRed: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  btnTextLine: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  pressed: { opacity: 0.6 },
});
