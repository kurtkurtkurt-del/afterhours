import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import Storage from 'expo-sqlite/kv-store';
import Deck, { isCard, isSpark, openSpark, type DeckEntry, type DeckHandle, type SparkEntry } from '@/components/Deck';
import { SPARKS, sparkIn, sparkOf } from '@/content/sparks';
import { sparkAnswer, sparkInbox, type SparkInvite } from '@/data/sparks';
import BigPicker from '@/components/BigPicker';
import WhenPicker from '@/components/WhenPicker';
import PlacePicker from '@/components/PlacePicker';
import SoundCorner from '@/components/SoundCorner';
import Pill, { Chevron } from '@/components/Pill';
import { useTabBarSpace } from '@/components/TabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DeckFriend } from '@/components/CardFace';
import { friendsKept, type FriendKept } from '@/data/friends';
import { friendsLive, type LiveFriend } from '@/data/checkin';
import { useAuth } from '@/auth/AuthContext';
import { useCities } from '@/data/cities';
import { chooseCity, useHere } from '@/data/here';
import { useTabReset } from '@/hooks/useTabReset';
import { OfflineError, onBackOnline } from '@/lib/offline';
import { typeCounts, useEventTypes } from '@/data/types';
import { fetchDeck, resetSwipes, swipe, unswipe, type Night } from '@/data/deck';
import { aboutFor, type About } from '@/data/about';
import { AboutSheet } from '@/components/About';
import { filterWhen, isWhen, whenName, type When } from '@/data/when';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Panel = 'tickets' | 'spark';

// Spark panel: only sparks, no ticketed nights. Friends' invites first, then the
// sparks to start yourself (derby, grill, hike), dealt from a different one each time.
// In a city with its own versions (Munich), the cards carry its places.
function sparkDeck(invites: SparkInvite[], seed: number, city: string | null): DeckEntry[] {
  const out: DeckEntry[] = invites.map((inv): SparkEntry => ({ id: 'invite:' + inv.id, spark: sparkIn(sparkOf(inv.kind), city), invite: inv }));
  SPARKS.forEach((_, i) => {
    const spark = sparkIn(SPARKS[(i + seed) % SPARKS.length], city);
    out.push({ id: `spark:${spark.kind}`, spark });
  });
  return out;
}

// Height of the button row under the deck (buttons + the room around them).
const ACTIONS = 92;

// The deck, with city / type / time pickers on top. Keep and let go are saved when signed in.
export default function FlowScreen() {
  const { session } = useAuth();
  const { cities } = useCities();
  const types = useEventTypes();
  const { t, tx, up, lang } = useLang();

  const here = useHere();
  const city = here.city;
  const [type, setType] = useState<string | null>(() => Storage.getItemSync('type'));
  const [when, setWhen] = useState<When | null>(() => {
    const v = Storage.getItemSync('when');
    return isWhen(v) ? v : null;
  });
  const [sheet, setSheet] = useState<'city' | 'type' | 'when' | null>(null);
  const [panel, setPanel] = useState<Panel>(() => (['spark', 'scene'].includes(Storage.getItemSync('panel') ?? '') ? 'spark' : 'tickets')); // 'scene' was its first name
  // nights per type in this city, for the type picker
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const deck = useRef<DeckHandle>(null);
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const [swiped, setSwiped] = useState(0);
  // Bottom edge of the picker chip; the poster starts below it (the chip wraps in Turkish).
  const [headBottom, setHeadBottom] = useState(0);
  const [reloads, setReloads] = useState(0);
  // Back online: retry if the deck is empty or never loaded (a dealt deck is left alone).
  const failed = useRef(false);
  useEffect(() => onBackOnline(() => failed.current && setReloads((n) => n + 1)), []);
  // Tapping the tab again closes the picker and deals the deck from the start.
  useTabReset('flow', () => {
    setSheet(null);
    setSwiped(0);
    setReloads((n) => n + 1);
  });

  // The result is stored with the selection it belongs to, so a changed selection
  // reads as loading without an explicit reset.
  const key = `${city}/${type}/${session?.user.id ?? ''}/${reloads}`;
  const [result, setResult] = useState<{ key: string; rows: Night[] | null; error: string | null }>({ key: '', rows: null, error: null });
  const error = result.key === key ? result.error : null;

  // Invites from friends (spark panel only, signed in only).
  const [invites, setInvites] = useState<{ key: string; list: SparkInvite[] }>({ key: '', list: [] });
  // "who is this?": the texts for the nights in this deck, and the one open in the sheet.
  const [abouts, setAbouts] = useState<Map<string, About>>(new Map());
  const [reading, setReading] = useState<About | null>(null);
  useEffect(() => {
    const ids = result.rows?.map((n) => n.id) ?? [];
    let live = true;
    aboutFor(ids, lang).then((m) => live && setAbouts(m));
    return () => {
      live = false;
    };
  }, [result.rows, lang]);
  useEffect(() => {
    if (panel !== 'spark' || !session) return;
    let live = true;
    sparkInbox().then((list) => live && setInvites({ key, list }));
    return () => {
      live = false;
    };
  }, [panel, session, key]);
  const signedIn = !!session;
  const nights = useMemo<DeckEntry[] | null>(() => {
    if (panel === 'spark') {
      if (signedIn && invites.key !== key) return null; // wait for the inbox so invites land on top
      return sparkDeck(invites.key === key ? invites.list : [], reloads, city);
    }
    return result.key === key && result.rows ? filterWhen(result.rows, when) : null;
  }, [result, key, when, panel, signedIn, invites, reloads, city]);

  useEffect(() => {
    let cancelled = false;
    // Time filtering is client-side: fetch wider, filter here.
    fetchDeck(city, type, 120)
      .then((rows) => {
        failed.current = rows.length === 0;
        if (!cancelled) setResult({ key, rows, error: null });
      })
      .catch((e) => {
        failed.current = true;
        if (!cancelled) setResult({ key, rows: null, error: e instanceof OfflineError ? 'offline' : String(e.message ?? e).toLowerCase() });
      });
    return () => {
      cancelled = true;
    };
  }, [city, type, key]);

  useEffect(() => {
    let live = true;
    typeCounts(city).then((c) => live && setCounts(c), () => live && setCounts(null));
    return () => {
      live = false;
    };
  }, [city]);

  // Nights your friends kept: squares in the caption, live friends in red.
  const [fk, setFk] = useState<FriendKept[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([friendsKept(200).catch(() => [] as FriendKept[]), friendsLive().catch(() => [] as LiveFriend[])]).then(([k, l]) => {
      if (cancelled) return;
      setFk(k);
      setLiveIds(new Set(l.map((x) => (x.handle ?? x.display_name ?? '').toLowerCase())));
    });
    return () => {
      cancelled = true;
    };
  }, [session, reloads]);
  const friendsOf = useMemo(() => {
    const by = new Map<string, DeckFriend[]>();
    fk.forEach((k) => {
      const name = k.friend.toLowerCase();
      const list = by.get(k.id) ?? [];
      if (!list.some((f) => f.name === name)) list.push({ name, live: liveIds.has(name) });
      by.set(k.id, list);
    });
    return (n: Night) => by.get(n.id) ?? [];
  }, [fk, liveIds]);

  const onSwipe = useCallback(
    (entry: DeckEntry, direction: 'left' | 'right') => {
      setSwiped((n) => n + 1);
      if (isSpark(entry)) {
        // a friend's invite: right = in, left = out. A spark: right opens its page, where "create it" is.
        if (entry.invite) {
          if (session) sparkAnswer(entry.invite.id, direction === 'right' ? 'in' : 'out').catch(() => {});
        } else if (direction === 'right') openSpark(entry);
        return;
      }
      if (session && !isCard(entry)) swipe(entry.slug, direction).catch(() => {}); // guests just move on
    },
    [session],
  );
  const onUndo = useCallback(
    (entry: DeckEntry) => {
      setSwiped((n) => Math.max(0, n - 1));
      if (isSpark(entry)) {
        if (entry.invite && session) sparkAnswer(entry.invite.id, 'waiting').catch(() => {});
        return;
      }
      if (session && !isCard(entry)) unswipe(entry.id, entry.slug).catch(() => {});
    },
    [session],
  );
  const pickPanel = (p: Panel) => {
    if (p === panel) return;
    setSwiped(0);
    setPanel(p);
    Storage.setItemSync('panel', p);
  };
  const onReset = useCallback(() => {
    setSwiped(0);
    // The spark panel only deals its sparks again; the ticket swipes are left alone.
    if (panel === 'spark') return setReloads((n) => n + 1);
    (session ? resetSwipes() : Promise.resolve()).catch(() => {}).then(() => setReloads((n) => n + 1));
  }, [session, panel]);

  const pickCity = (id: string) => {
    const v = id === '*' ? null : id;
    setSwiped(0);
    chooseCity(v, v ? (cities.find((c) => c.id === v)?.name ?? v) : null);
  };
  const pickType = (id: string) => {
    const v = id === '*' ? null : id;
    setSwiped(0);
    setType(v);
    if (v) Storage.setItemSync('type', v);
    else Storage.removeItemSync('type');
  };

  const pickWhen = (v: When | null) => {
    setSwiped(0);
    setWhen(v);
    if (v) Storage.setItemSync('when', v);
    else Storage.removeItemSync('when');
  };

  const cityLabel = city ? (cities.find((c) => c.id === city)?.name ?? here.name ?? city) : t('filter.everywhere');
  const typeLabel = type ? tx('type.' + type, types.find((ty) => ty.id === type)?.label ?? type) : t('type.all');
  const whenLabel = when ? whenName(when, tx) : t('when.any');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Where, big; under it tickets · spark; under that, on tickets, what and when. */}
      <View style={[styles.head, { top: Math.max(brand.top, insets.top + 24) - 8 }]} onLayout={(e) => setHeadBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        <Pressable onPress={() => setSheet('city')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('filter.where')} style={({ pressed }) => [styles.city, pressed && styles.pressed]}>
          <Svg width={14} height={18} viewBox="0 0 14 18">
            <Path d="M7 17s6-5.6 6-10A6 6 0 0 0 1 7c0 4.4 6 10 6 10Z" fill={colors.spot} />
            <Circle cx={7} cy={7} r={2.2} fill={colors.ink} />
          </Svg>
          <Text style={styles.cityText} numberOfLines={1}>{cityLabel}</Text>
          <Chevron color={colors.paper} />
        </Pressable>
        <View style={[styles.pills, styles.switchRow]}>
          <View style={styles.panels} accessibilityRole="tablist">
            {(['tickets', 'spark'] as const).map((p) => (
              <Pressable key={p} onPress={() => pickPanel(p)} hitSlop={4} accessibilityRole="tab" accessibilityState={{ selected: panel === p }} style={[styles.panel, panel === p && styles.panelOn]}>
                {p === 'spark' ? <View style={[styles.panelDot, panel === p && styles.panelDotOn]} /> : null}
                <Text style={[styles.panelText, panel === p && styles.panelTextOn]}>{t(p === 'tickets' ? 'flow.tickets' : 'flow.spark')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {panel === 'tickets' ? (
          <View style={styles.pills}>
            <Pill label={typeLabel} active={!!type} onPress={() => setSheet('type')} a11y={t('filter.what')} />
            <Pill label={whenLabel} active={!!when} onPress={() => setSheet('when')} a11y={t('filter.when')} />
          </View>
        ) : null}
      </View>
      <SoundCorner />

      <View style={styles.stage}>
        {error && panel === 'tickets' ? (
          <Text style={styles.note}>{error === 'offline' ? up(t('offline.empty')) : upperData(error)}</Text>
        ) : nights ? (
          <Deck ref={deck} key={`${panel}/${city}/${type}/${when}/${reloads}`} nights={nights} friendsOf={friendsOf} bottom={tabSpace + ACTIONS} top={(headBottom || Math.max(brand.top, insets.top + 24) + 30) + 14} onSwipe={onSwipe} onUndo={onUndo} onReset={onReset} hasAbout={(e) => abouts.has(e.id)} onAbout={(e) => setReading(abouts.get(e.id) ?? null)} />
        ) : (
          <Text style={styles.note}>{up(t('flow.loading'))}</Text>
        )}

        {/* Under the card, with room around them: let go, undo, keep. The same as a swipe. */}
        {nights && nights.length > swiped ? (
          <View style={[styles.actions, { bottom: tabSpace + 14 }]}>
            <Pressable onPress={() => deck.current?.swipe('left')} accessibilityRole="button" accessibilityLabel={t('word.letgo')} style={({ pressed }) => [styles.act, pressed && styles.pressed]}>
              <Svg width={22} height={22} viewBox="0 0 22 22">
                <Path d="M5 5l12 12M17 5L5 17" stroke={colors.paper} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
            <Pressable onPress={() => deck.current?.undo()} disabled={swiped === 0} accessibilityRole="button" accessibilityLabel={t('flow.undo')} style={({ pressed }) => [styles.act, styles.actSmall, swiped === 0 && styles.actOff, pressed && styles.pressed]}>
              <Svg width={18} height={18} viewBox="0 0 14 14">
                <Path d="M5 3 2 6l3 3M2 6h6.5a3.5 3.5 0 0 1 0 7H6" stroke={colors.paper} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Pressable>
            <Pressable onPress={() => deck.current?.swipe('right')} accessibilityRole="button" accessibilityLabel={t('word.keep')} style={({ pressed }) => [styles.act, styles.actKeep, pressed && styles.pressed]}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={colors.paper} />
              </Svg>
            </Pressable>
          </View>
        ) : null}
      </View>

      <PlacePicker open={sheet === 'city'} cities={cities} selected={city} onSelect={(id) => pickCity(id ?? '*')} onClose={() => setSheet(null)} />
      <BigPicker
        open={sheet === 'type'}
        title={t('filter.what')}
        options={[
          { id: '*', label: t('type.all'), count: counts ? Object.values(counts).reduce((a, n) => a + n, 0) : undefined },
          ...types.map((ty) => ({ id: ty.id, label: tx('type.' + ty.id, ty.label), count: counts ? (counts[ty.id] ?? 0) : undefined })),
        ]}
        selected={type ?? '*'}
        onSelect={pickType}
        onClose={() => setSheet(null)}
      />
      <AboutSheet
        about={reading}
        onClose={() => setReading(null)}
        onKeep={() => {
          // Close first, then throw the card right, so the keep animation is seen.
          setReading(null);
          setTimeout(() => deck.current?.swipe('right'), 280);
        }}
      />
      <WhenPicker open={sheet === 'when'} rows={result.key === key && result.rows ? result.rows : []} selected={when} onSelect={pickWhen} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  // Ink pill so the pickers stay legible over the photo.
  head: { position: 'absolute', left: brand.left, right: brand.left, zIndex: 1 },
  city: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '72%' },
  cityText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, color: colors.paper, textShadowColor: 'rgba(14,13,12,0.6)', textShadowRadius: 8 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pressed: { opacity: 0.6 },
  // tickets · spark: a lighter track than the filter pills, so it reads on the dark top
  switchRow: { marginTop: 4 },
  panels: { flexDirection: 'row', height: 34, padding: 3, borderRadius: radius.pill, backgroundColor: colors.ink3, borderWidth: 1, borderColor: '#4a4640' },
  panel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radius.pill },
  panelOn: { backgroundColor: colors.paper },
  panelDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.spot },
  panelDotOn: { backgroundColor: colors.spot },
  panelText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.paper, opacity: 0.75 },
  panelTextOn: { color: colors.ink, opacity: 1 },
  actions: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 },
  act: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: colors.ink3, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  actSmall: { width: 46, height: 46, borderRadius: 23 },
  actOff: { opacity: 0.35 },
  actKeep: { backgroundColor: colors.spot, borderColor: colors.spot },
  stage: { flex: 1 },
  note: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, textAlign: 'center', marginTop: 40 },
});
