import { useEffect, useMemo, useState } from 'react';
import { useTabReset } from '@/hooks/useTabReset';
import RangeSlider from '@/components/RangeSlider';
import { filterWhen, whenName, type When } from '@/data/when';
import { cityCentre } from '@/data/geo';
import { chooseCity, useHere } from '@/data/here';
import { useCities } from '@/data/cities';
import { useEventTypes } from '@/data/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Pill, { Chevron } from '@/components/Pill';
import PlacePicker from '@/components/PlacePicker';
import BigPicker from '@/components/BigPicker';
import WhenPicker from '@/components/WhenPicker';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import MapWeb, { type Pin } from '@/components/MapWeb';
import SoundCorner from '@/components/SoundCorner';
import { useTabBarSpace } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { fetchNear, type NearNight } from '@/data/near';
import { friendsKept } from '@/data/friends';
import { sparksNear, type NearSpark } from '@/data/sparks';
import { sparkOf } from '@/content/sparks';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Without a location: the selected city's centre, else Munich.
const CENTRES: Record<string, [number, number]> = {
  munchen: [48.137, 11.575],
  istanbul: [41.03, 28.98],
  berlin: [52.52, 13.405],
  wien: [48.208, 16.373],
  koln: [50.937, 6.96],
  ankara: [39.93, 32.85],
};

const two = (n: number) => String(n).padStart(2, '0');
const kmText = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
const distText = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// Map: location permission, Leaflet in a WebView, red radius circle, nights as small squares
// (red when a friend kept it). Tapping a square hides the slider and slides a card up in 300 ms.
export default function MapScreen() {
  const { session } = useAuth();
  const { t, tn, tx, up } = useLang();
  const tabSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const [me, setMe] = useState<[number, number] | null>(null);
  const [follow, setFollow] = useState<'me' | 'city'>('me');
  const [here, setHere] = useState<{ slug: string; name: string; centre: [number, number] } | null>(null);
  const [km, setKm] = useState(3); // drives the query and the circle; updated when the slider is released
  const [dragKm, setDragKm] = useState<number | null>(null); // large number shown while dragging
  const [when, setWhen] = useState<When | null>('tonight');
  const [rows, setRows] = useState<NearNight[]>([]);
  const [missing, setMissing] = useState(false);
  const [picked, setPicked] = useState<NearNight | null>(null);
  // Sparks you can see (your own, and those of your waves): gold diamonds; picked like a night.
  const [sparks, setSparks] = useState<NearSpark[]>([]);
  const [pickedSpark, setPickedSpark] = useState<NearSpark | null>(null);
  const anyPicked = !!(picked || pickedSpark);
  const [sheet, setSheet] = useState<'city' | 'type' | 'when' | null>(null);
  const [type, setType] = useState<string | null>(null);
  const { cities } = useCities();
  const types = useEventTypes();
  const insets = useSafeAreaInsets();
  const [keptBy, setKeptBy] = useState<Map<string, string[]>>(new Map());
  // Tapping the tab again resets the view and re-fits the circle, even after manual panning.
  const [fresh, setFresh] = useState(0);
  useTabReset('map', () => {
    setPicked(null);
    setPickedSpark(null);
    setSheet(null);
    setType(null);
    setFollow('me');
    setWhen('tonight');
    setKm(3);
    setDragKm(null);
    setFresh((n) => n + 1);
  });

  const current = useHere();
  const stored = current.city ?? 'munchen';
  const cityName = here?.name ?? current.name ?? stored;
  const fallbackCentre = CENTRES[stored] ?? CENTRES.munchen;
  const atCity = follow === 'city' || !me;
  const centre = !atCity && me ? me : (here?.centre ?? fallbackCentre);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      // No permission or no fix: the map stays on the city and "near me" is not offered.
      if (status !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setMe([pos.coords.latitude, pos.coords.longitude]);
      } catch {
        /* no fix */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // data/here.ts picks the city for every tab; only the centre is computed here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const centre = (await cityCentre(stored).catch(() => null)) ?? CENTRES[stored] ?? CENTRES.munchen;
      if (!cancelled) setHere({ slug: stored, name: current.name ?? stored, centre });
    })();
    return () => {
      cancelled = true;
    };
  }, [stored, current.name]);

  // Nights friends kept: red squares, names on the card.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    friendsKept(200)
      .then((fk) => {
        if (cancelled) return;
        const m = new Map<string, string[]>();
        fk.forEach((k) => {
          const names = m.get(k.id) ?? [];
          const n = k.friend.toLowerCase();
          if (!names.includes(n)) names.push(n);
          m.set(k.id, names);
        });
        setKeptBy(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  const [lat, lng] = centre;
  const shown = useMemo(
    () => (filterWhen(rows, when) as NearNight[]).filter((n) => !type || n.type_slug === type).sort((a, b) => a.distance_km - b.distance_km),
    [rows, when, type],
  );
  // nights per type around here, for the type picker
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (filterWhen(rows, when) as NearNight[]).forEach((n) => (c[n.type_slug] = (c[n.type_slug] ?? 0) + 1));
    return c;
  }, [rows, when]);
  const withFriends = shown.filter((n) => keptBy.has(n.id)).length;
  const pins = useMemo<Pin[]>(
    () => [
      ...shown.map((n) => ({ id: n.id, lat: n.lat, lng: n.lng, friends: keptBy.has(n.id) })),
      ...sparks.map((sp) => ({ id: sp.id, lat: sp.lat, lng: sp.lng, friends: false, spark: true })),
    ],
    [shown, keptBy, sparks],
  );
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    sparksNear(lat, lng, km).then((list) => {
      if (cancelled) return;
      setSparks(list);
      setPickedSpark((p) => (p ? (list.find((x) => x.id === p.id) ?? null) : null));
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, km, session]);
  useEffect(() => {
    let cancelled = false;
    fetchNear(lat, lng, km, 200)
      .catch(() => ({ rows: [] as NearNight[], missing: false }))
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        setMissing(r.missing);
        setPicked((p) => (p && r.rows.some((x) => x.id === p.id) ? p : null));
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, km]);

  // On tap: slider fades, card slides in (300 ms, ease-out); reversed on close.
  const open = useSharedValue(0);
  useEffect(() => {
    open.set(withTiming(anyPicked ? 1 : 0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [anyPicked, open]);
  const restStyle = useAnimatedStyle(() => ({ opacity: 1 - open.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: open.value, transform: [{ translateY: (1 - open.value) * 40 }] }));

  const whenLabel = when ? whenName(when, tx) : t('when.any');
  const typeLabel = type ? tx('type.' + type, types.find((ty) => ty.id === type)?.label ?? type) : t('type.all');
  const bigKm = dragKm ?? km;
  const pickedIndex = picked ? shown.findIndex((n) => n.id === picked.id) : -1;
  const pickedFriends = picked ? (keptBy.get(picked.id) ?? []) : [];
  const time = (iso: string | null) => {
    if (!iso) return t('deck.tba');
    const d = new Date(iso);
    return isNaN(d.getTime()) ? t('deck.tba') : `${two(d.getHours())}:${two(d.getMinutes())}`;
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <MapWeb
        key={fresh}
        lat={lat}
        lng={lng}
        km={km}
        liveKm={dragKm ?? undefined}
        me={me}
        pins={pins}
        picked={picked?.id ?? pickedSpark?.id ?? null}
        onPick={(id) => {
          setPicked(id ? (rows.find((r) => r.id === id) ?? null) : null);
          setPickedSpark(id ? (sparks.find((sp) => sp.id === id) ?? null) : null);
        }}
        pad={{ top: brand.top + 90, bottom: tabSpace + 150 }}
      />

      {/* As in the flow: where, big; what · when · near me as pills under it. */}
      <View style={[styles.head, { top: Math.max(brand.top, insets.top + 24) - 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => setSheet('city')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('filter.where')} style={({ pressed }) => [styles.city, pressed && { opacity: 0.6 }]}>
          <Svg width={14} height={18} viewBox="0 0 14 18">
            <Path d="M7 17s6-5.6 6-10A6 6 0 0 0 1 7c0 4.4 6 10 6 10Z" fill={colors.spot} />
            <Circle cx={7} cy={7} r={2.2} fill={colors.ink} />
          </Svg>
          <Text style={styles.cityText} numberOfLines={1}>{atCity ? cityName : t('map.nearMe')}</Text>
          <Chevron color={colors.paper} />
        </Pressable>
        <View style={styles.pills}>
          <Pill label={typeLabel} active={!!type} onPress={() => setSheet('type')} a11y={t('filter.what')} />
          <Pill label={whenLabel} active={!!when} onPress={() => setSheet('when')} a11y={t('filter.when')} />
          {me ? <Pill label={t('map.nearMe')} active={!atCity} chevron={false} onPress={() => { setFollow(atCity ? 'me' : 'city'); setPicked(null); setPickedSpark(null); }} a11y={t('map.nearMe')} /> : null}
        </View>
      </View>
      <SoundCorner />

      {/* Idle: large radius, counts, red slider. */}
      <Animated.View style={[styles.rest, { bottom: tabSpace + 8 }, restStyle]} pointerEvents={anyPicked ? 'none' : 'auto'}>
        <View style={styles.restRow}>
          <Text style={styles.big}>
            {bigKm < 1 ? Math.round(bigKm * 1000) : kmText(bigKm)}
            <Text style={styles.bigUnit}>{bigKm < 1 ? 'm' : 'km'}</Text>
          </Text>
          <View style={styles.counts}>
            <Text style={styles.jetMeta}>{up(missing ? t('map.notLive') : tn('map.nights', shown.length))}</Text>
            {withFriends > 0 ? <Text style={styles.jetRed}>{up(t('map.withFriends', { n: withFriends }))}</Text> : null}
            {sparks.length > 0 ? <Text style={styles.jetGold}>{up(tn('map.sparks', sparks.length))}</Text> : null}
          </View>
        </View>
        <RangeSlider
          min={0.5}
          max={30}
          value={km}
          width={width - brand.left * 2}
          showLabel={false}
          accent={colors.spot}
          format={(v) => kmText(v)}
          onChange={(v) => setDragKm(v)}
          onEnd={(v) => {
            setDragKm(null);
            setKm(Math.round(v * 10) / 10);
          }}
        />
      </Animated.View>

      {/* Selected night: caption with the red GO strip on the right. */}
      {picked ? (
        <Animated.View style={[styles.caption, { bottom: tabSpace + 4 }, cardStyle]}>
          <View style={styles.block}>
            <View style={styles.capTop}>
              <Text style={styles.jetMeta}>
                {up(t('map.of', { i: pickedIndex + 1, n: shown.length }))} · {upperData(distText(picked.distance_km))}
              </Text>
              <Pressable onPress={() => setPicked(null)} hitSlop={10}>
                <Text style={styles.change}>{t('word.close')}</Text>
              </Pressable>
            </View>
            <Text style={styles.capTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
              {(picked.venue_name ?? picked.title).toLowerCase()}
            </Text>
            <Text style={styles.jet} numberOfLines={1}>{upperData(picked.title)} · {tx('type.' + picked.type_slug, '') ? up(tx('type.' + picked.type_slug, '')) : upperData(picked.type_name)}</Text>
            <Text style={styles.jet}>
              {up(time(picked.starts_at))} · {upperData(distText(picked.distance_km))} · {up(t('map.walk', { n: Math.max(1, Math.round((picked.distance_km / 5) * 60)) }))}
            </Text>
            {pickedFriends.length ? <Text style={styles.jet} numberOfLines={1}>{up(tn('map.keptBy', pickedFriends.length, { names: upperData(pickedFriends.join(', ')) }))}</Text> : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.strip, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(`/night/${picked.slug}`)}
            accessibilityRole="button"
            accessibilityLabel={t('map.goLabel')}
          >
            <Text style={styles.stripText}>{up(t('map.go'))} →</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Selected spark: the same caption, gold where a night is red. */}
      {pickedSpark ? (
        <Animated.View style={[styles.caption, { bottom: tabSpace + 4 }, cardStyle]}>
          <View style={styles.block}>
            <View style={styles.capTop}>
              <Text style={styles.jetMeta}>
                {upperData('spark')} · {upperData(distText(pickedSpark.distance_km))}
              </Text>
              <Pressable onPress={() => setPickedSpark(null)} hitSlop={10}>
                <Text style={styles.change}>{t('word.close')}</Text>
              </Pressable>
            </View>
            <Text style={[styles.capTitle, styles.capGold]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
              {pickedSpark.title.toLowerCase()}
            </Text>
            <Text style={styles.jet} numberOfLines={1}>
              {up(t(sparkOf(pickedSpark.kind).label))} · {up(pickedSpark.mine ? t('map.yourSpark') : t('spark.hosting', { name: (pickedSpark.host_name ?? pickedSpark.host_handle ?? '').toLowerCase() }))}
            </Text>
            <Text style={styles.jet} numberOfLines={1}>
              {up(time(pickedSpark.starts_at))}
              {pickedSpark.place ? ` · ${upperData(pickedSpark.place)}` : ''} · {up(t('spark.going', { n: pickedSpark.going }))}
            </Text>
            {pickedSpark.my_answer === 'in' || pickedSpark.my_answer === 'out' ? (
              <Text style={styles.jetGold}>{up(t(pickedSpark.my_answer === 'in' ? 'spark.answered.in' : 'spark.answered.out'))}</Text>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.strip, styles.stripGold, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(`/spark/${pickedSpark.kind}?invite=${pickedSpark.id}`)}
            accessibilityRole="button"
            accessibilityLabel={t('map.goLabel')}
          >
            <Text style={styles.stripText}>{up(t('map.go'))} →</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <PlacePicker
        open={sheet === 'city'}
        cities={cities}
        selected={current.city}
        onSelect={(id) => {
          chooseCity(id, id ? (cities.find((c) => c.id === id)?.name ?? id) : null);
          setFollow('city');
          setPicked(null);
          setPickedSpark(null);
        }}
        onClose={() => setSheet(null)}
      />
      <BigPicker
        open={sheet === 'type'}
        title={t('filter.what')}
        options={[
          { id: '*', label: t('type.all'), count: Object.values(counts).reduce((a, n) => a + n, 0) },
          ...types.map((ty) => ({ id: ty.id, label: tx('type.' + ty.id, ty.label), count: counts[ty.id] ?? 0 })),
        ]}
        selected={type ?? '*'}
        onSelect={(id) => {
          setType(id === '*' ? null : id);
          setPicked(null);
        }}
        onClose={() => setSheet(null)}
      />
      <WhenPicker
        open={sheet === 'when'}
        rows={rows}
        selected={when}
        onSelect={(v) => {
          setWhen(v);
          setPicked(null);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const GOLD = '#E8B04B'; // sparks on the map (the same gold as their diamonds)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  head: { position: 'absolute', left: brand.left, right: brand.left, zIndex: 1 },
  city: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '72%' },
  cityText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, color: colors.paper, textShadowColor: 'rgba(14,13,12,0.6)', textShadowRadius: 8 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  subRow: { position: 'absolute', top: brand.top + 32, left: brand.left, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper },
  change: { fontFamily: fonts.regular, fontSize: 12, color: colors.paper, textDecorationLine: 'underline' },
  rest: { position: 'absolute', left: brand.left, right: brand.left },
  restRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 },
  big: { fontFamily: fonts.logo, fontSize: 64, lineHeight: 60, letterSpacing: -1.5, color: colors.paper },
  bigUnit: { fontSize: 28, letterSpacing: -0.5 },
  counts: { alignItems: 'flex-end', gap: 4, paddingBottom: 6 },
  jet: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.2, color: colors.paper },
  jetMeta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.meta },
  jetGold: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: GOLD },
  capGold: { color: GOLD },
  stripGold: { backgroundColor: GOLD },
  jetRed: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.spotText },
  caption: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.lg, overflow: 'hidden' },
  block: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: brand.left, paddingTop: 14, paddingBottom: 14, gap: 3 },
  capTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  capTitle: { fontFamily: fonts.logo, fontSize: 54, lineHeight: 46, letterSpacing: -1, color: colors.spotText, marginBottom: 10 },
  strip: { width: 56, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  stripText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, color: colors.ink, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
});
