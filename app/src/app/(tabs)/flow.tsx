import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Storage from 'expo-sqlite/kv-store';
import Deck, { type DeckHandle } from '@/components/Deck';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
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
import { useEventTypes } from '@/data/types';
import { fetchDeck, resetSwipes, swipe, unswipe, type Night } from '@/data/deck';
import { filterWhen, whens, type When } from '@/data/when';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The deck, with city / type / time pickers on top. Keep and let go are saved when signed in.
export default function FlowScreen() {
  const { session } = useAuth();
  const { cities } = useCities();
  const types = useEventTypes();
  const { t, tx, up } = useLang();

  const here = useHere();
  const city = here.city;
  const [type, setType] = useState<string | null>(() => Storage.getItemSync('type'));
  const [when, setWhen] = useState<When | null>(() => {
    const v = Storage.getItemSync('when');
    return whens.some((w) => w.id === v) ? (v as When) : null;
  });
  const [sheet, setSheet] = useState<'city' | 'type' | 'when' | null>(null);
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
  const nights = result.key === key && result.rows ? filterWhen(result.rows, when) : null;
  const error = result.key === key ? result.error : null;

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
    (night: Night, direction: 'left' | 'right') => {
      setSwiped((n) => n + 1);
      if (session) swipe(night.slug, direction).catch(() => {}); // guests just move on
    },
    [session],
  );
  const onUndo = useCallback(
    (night: Night) => {
      setSwiped((n) => Math.max(0, n - 1));
      if (session) unswipe(night.id, night.slug).catch(() => {});
    },
    [session],
  );
  const onReset = useCallback(() => {
    setSwiped(0);
    (session ? resetSwipes() : Promise.resolve()).catch(() => {}).then(() => setReloads((n) => n + 1));
  }, [session]);

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

  const pickWhen = (id: string) => {
    const v = id === '*' ? null : (id as When);
    setSwiped(0);
    setWhen(v);
    if (v) Storage.setItemSync('when', v);
    else Storage.removeItemSync('when');
  };

  const cityLabel = city ? (cities.find((c) => c.id === city)?.name ?? here.name ?? city) : t('filter.everywhere');
  const typeLabel = type ? tx('type.' + type, types.find((ty) => ty.id === type)?.label ?? type) : t('type.all');
  const whenLabel = when ? tx('when.' + when, when) : t('when.any');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.head, { top: Math.max(brand.top, insets.top + 24) }]} onLayout={(e) => setHeadBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        <Pressable onPress={() => setSheet('city')} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.pick}>{cityLabel}</Text>
        </Pressable>
        <Text style={styles.sep}>·</Text>
        <Pressable onPress={() => setSheet('type')} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.pick}>{typeLabel}</Text>
        </Pressable>
        <Text style={styles.sep}>·</Text>
        <Pressable onPress={() => setSheet('when')} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.pick}>{whenLabel}</Text>
        </Pressable>
      </View>
      <SoundCorner />
      {swiped > 0 && (
        <Pressable onPress={() => deck.current?.undo()} hitSlop={10} style={styles.undo}>
          <Text style={styles.undoText}>{t('flow.undo')}</Text>
        </Pressable>
      )}

      <View style={styles.stage}>
        {error ? (
          <Text style={styles.note}>{error === 'offline' ? up(t('offline.empty')) : upperData(error)}</Text>
        ) : nights ? (
          <Deck ref={deck} key={`${city}/${type}/${when}/${reloads}`} nights={nights} friendsOf={friendsOf} bottom={tabSpace + 4} top={(headBottom || Math.max(brand.top, insets.top + 24) + 30) + 14} onSwipe={onSwipe} onUndo={onUndo} onReset={onReset} />
        ) : (
          <Text style={styles.note}>{up(t('flow.loading'))}</Text>
        )}
      </View>

      <PickerSheet
        open={sheet === 'city'}
        title={t('filter.where')}
        options={[{ id: '*', label: t('filter.everywhere') }, ...cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))]}
        selected={city ?? '*'}
        onSelect={pickCity}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'type'}
        title={t('filter.what')}
        options={[{ id: '*', label: t('type.all') }, ...types.map((ty) => ({ id: ty.id, label: tx('type.' + ty.id, ty.label) }))]}
        selected={type ?? '*'}
        onSelect={pickType}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'when'}
        title={t('filter.when')}
        options={[{ id: '*', label: t('when.any') }, ...whens.map((w) => ({ id: w.id, label: tx('when.' + w.id, w.label) }))]}
        selected={when ?? '*'}
        onSelect={pickWhen}
        onClose={() => setSheet(null)}
        note={t('filter.whenNote', { any: t('when.any') })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  // Ink pill so the pickers stay legible over the photo.
  head: { position: 'absolute', left: brand.left, right: 110, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, zIndex: 1, backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' },
  pick: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 0.8, color: colors.paper, textDecorationLine: 'underline' },
  sep: { fontFamily: fonts.jet, fontSize: 10.5, color: colors.meta },
  pressed: { opacity: 0.6 },
  undo: { position: 'absolute', right: brand.left, top: brand.top + 34, zIndex: 1, backgroundColor: colors.ink, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  undoText: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.2, color: colors.paper, textDecorationLine: 'underline' },
  stage: { flex: 1 },
  note: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, textAlign: 'center', marginTop: 40 },
});
