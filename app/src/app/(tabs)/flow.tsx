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
import { useEventTypes } from '@/data/types';
import { fetchDeck, resetSwipes, swipe, unswipe, type Night } from '@/data/deck';
import { filterWhen, whens, type When } from '@/data/when';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// deste. üstte şehir ve tür seçici; keep/let go hesap varsa veritabanına yazılır.
export default function FlowScreen() {
  const { session } = useAuth();
  const { cities } = useCities();
  const types = useEventTypes();

  const [city, setCity] = useState<string | null>(() => Storage.getItemSync('city'));
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
  const [reloads, setReloads] = useState(0);

  // sonuç, hangi seçim için geldiğiyle birlikte saklanır; seçim değişince eskisi
  // kendiliğinden "yükleniyor" sayılır, ayrıca sıfırlamaya gerek kalmaz
  const key = `${city}/${type}/${session?.user.id ?? ''}/${reloads}`;
  const [result, setResult] = useState<{ key: string; rows: Night[] | null; error: string | null }>({ key: '', rows: null, error: null });
  const nights = result.key === key && result.rows ? filterWhen(result.rows, when) : null;
  const error = result.key === key ? result.error : null;

  useEffect(() => {
    let cancelled = false;
    // zaman filtresi sunucuda yok; daha geniş çekilip burada elenir
    fetchDeck(city, type, 120)
      .then((rows) => !cancelled && setResult({ key, rows, error: null }))
      .catch((e) => !cancelled && setResult({ key, rows: null, error: String(e.message ?? e).toLowerCase() }));
    return () => {
      cancelled = true;
    };
  }, [city, type, key]);

  // arkadaşların tuttuğu geceler: kartın altyazısında kareler; canlı olanlar kırmızı
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
      if (session) swipe(night.slug, direction).catch(() => {}); // hesapsızken sadece geçilir
    },
    [session],
  );
  const onUndo = useCallback(
    (night: Night) => {
      setSwiped((n) => Math.max(0, n - 1));
      if (session) unswipe(night.id).catch(() => {});
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
    setCity(v);
    if (v) {
      Storage.setItemSync('city', v);
      Storage.setItemSync('city.name', cities.find((c) => c.id === v)?.name ?? v);
    } else {
      Storage.removeItemSync('city');
      Storage.removeItemSync('city.name');
    }
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

  const cityLabel = city ? (cities.find((c) => c.id === city)?.name ?? city) : 'everywhere';
  const typeLabel = type ? (types.find((t) => t.id === type)?.label ?? type) : 'all nights';
  const whenLabel = when ? (whens.find((w) => w.id === when)?.label ?? when) : 'any night';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.head, { top: Math.max(brand.top, insets.top + 24) }]}>
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
          <Text style={styles.undoText}>undo</Text>
        </Pressable>
      )}

      <View style={styles.stage}>
        {error ? (
          <Text style={styles.note}>{error}</Text>
        ) : nights ? (
          <Deck ref={deck} key={`${city}/${type}/${when}/${reloads}`} nights={nights} friendsOf={friendsOf} bottom={tabSpace + 4} onSwipe={onSwipe} onUndo={onUndo} onReset={onReset} />
        ) : (
          <Text style={styles.note}>loading the night…</Text>
        )}
      </View>

      <PickerSheet
        open={sheet === 'city'}
        title="where"
        options={[{ id: '*', label: 'everywhere' }, ...cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))]}
        selected={city ?? '*'}
        onSelect={pickCity}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'type'}
        title="what"
        options={[{ id: '*', label: 'all nights' }, ...types]}
        selected={type ?? '*'}
        onSelect={pickType}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'when'}
        title="when"
        options={[{ id: '*', label: 'any night' }, ...whens]}
        selected={when ?? '*'}
        onSelect={pickWhen}
        onClose={() => setSheet(null)}
        note="nights without a fixed date only show under any night"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  // fotoğrafın üstünde okunsun diye mürekkep şerit; friends' deck'teki "ist · 03/24" çipiyle aynı dil
  head: { position: 'absolute', left: brand.left, right: 110, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, zIndex: 1, backgroundColor: colors.ink, paddingVertical: 5, paddingHorizontal: 8, alignSelf: 'flex-start' },
  pick: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 0.8, color: colors.paper, textDecorationLine: 'underline' },
  sep: { fontFamily: fonts.jet, fontSize: 10.5, color: colors.meta },
  pressed: { opacity: 0.6 },
  undo: { position: 'absolute', right: brand.left, top: brand.top + 34, zIndex: 1, backgroundColor: colors.ink, paddingVertical: 4, paddingHorizontal: 8 },
  undoText: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.2, color: colors.paper, textDecorationLine: 'underline' },
  stage: { flex: 1 },
  note: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, textAlign: 'center', marginTop: 40 },
});
