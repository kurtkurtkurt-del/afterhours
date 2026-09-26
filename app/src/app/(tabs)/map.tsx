import { useEffect, useMemo, useState } from 'react';
import RangeSlider from '@/components/RangeSlider';
import { filterWhen, whens, type When } from '@/data/when';
import { cityCentre, detectCity } from '@/data/geo';
import { useCities } from '@/data/cities';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import MapWeb, { type Pin } from '@/components/MapWeb';
import PickerSheet from '@/components/PickerSheet';
import Storage from 'expo-sqlite/kv-store';
import SoundCorner from '@/components/SoundCorner';
import { useTabBarSpace } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { fetchNear, type NearNight } from '@/data/near';
import { friendsKept } from '@/data/friends';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// konum yoksa seçili şehrin merkezi; o da yoksa münih
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

// harita: konum izni, webview içinde leaflet, kırmızı yarıçap çemberi, geceler küçük kareler
// (arkadaşın tuttuğu kırmızı). kareye dokununca sürgü söner, kart 300ms'de alttan kayar.
export default function MapScreen() {
  const { session } = useAuth();
  const tabSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const [me, setMe] = useState<[number, number] | null>(null);
  const [follow, setFollow] = useState<'me' | 'city'>('me');
  const { cities } = useCities();
  const [here, setHere] = useState<{ slug: string; name: string; centre: [number, number] } | null>(null);
  const [denied, setDenied] = useState(false);
  const [km, setKm] = useState(3); // ağ isteği ve çember bunu izler; sürgü bırakılınca değişir
  const [dragKm, setDragKm] = useState<number | null>(null); // sürüklerken büyük rakam
  const [when, setWhen] = useState<When | null>('tonight');
  const [rows, setRows] = useState<NearNight[]>([]);
  const [missing, setMissing] = useState(false);
  const [picked, setPicked] = useState<NearNight | null>(null);
  const [sheet, setSheet] = useState(false);
  const [keptBy, setKeptBy] = useState<Map<string, string[]>>(new Map());

  const stored = Storage.getItemSync('city') ?? 'munchen';
  const cityName = here?.name ?? stored;
  const fallbackCentre = CENTRES[stored] ?? CENTRES.munchen;
  const atCity = follow === 'city' || !me;
  const centre = !atCity && me ? me : (here?.centre ?? fallbackCentre);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setDenied(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setMe([pos.coords.latitude, pos.coords.longitude]);
      } catch {
        if (!cancelled) setDenied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // konum gelince bulunduğun şehri bul ve merkezini hesapla
  const meLat = me?.[0];
  const meLng = me?.[1];
  useEffect(() => {
    if (meLat === undefined || meLng === undefined || cities.length === 0) return;
    let cancelled = false;
    (async () => {
      const c = await detectCity(meLat, meLng, cities);
      const slug = c?.id ?? stored;
      const name = c?.name ?? stored;
      const centre = (await cityCentre(slug).catch(() => null)) ?? CENTRES[slug] ?? fallbackCentre;
      if (!cancelled) setHere({ slug, name, centre });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLat, meLng, cities.length]);

  // arkadaşların tuttuğu geceler: kareyi kırmızı yapar, kartta isimleri yazar
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
  const shown = useMemo(() => (filterWhen(rows, when) as NearNight[]).slice().sort((a, b) => a.distance_km - b.distance_km), [rows, when]);
  const withFriends = shown.filter((n) => keptBy.has(n.id)).length;
  const pins = useMemo<Pin[]>(() => shown.map((n) => ({ id: n.id, lat: n.lat, lng: n.lng, friends: keptBy.has(n.id) })), [shown, keptBy]);
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

  // dokununca: sürgü söner, kart kayarak gelir (300ms, ease-out); kapatınca tersi
  const open = useSharedValue(0);
  useEffect(() => {
    open.set(withTiming(picked ? 1 : 0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [picked, open]);
  const restStyle = useAnimatedStyle(() => ({ opacity: 1 - open.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: open.value, transform: [{ translateY: (1 - open.value) * 40 }] }));

  const whenLabel = when ? (whens.find((w) => w.id === when)?.label ?? when) : 'any night';
  const placeLabel = atCity ? `${cityName} centre` : 'near me';
  const bigKm = dragKm ?? km;
  const pickedIndex = picked ? shown.findIndex((n) => n.id === picked.id) : -1;
  const pickedFriends = picked ? (keptBy.get(picked.id) ?? []) : [];
  const time = (iso: string | null) => {
    if (!iso) return 'tba';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? 'tba' : `${two(d.getHours())}:${two(d.getMinutes())}`;
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <MapWeb
        lat={lat}
        lng={lng}
        km={km}
        liveKm={dragKm ?? undefined}
        me={me}
        pins={pins}
        picked={picked?.id ?? null}
        onPick={(id) => setPicked(id ? (rows.find((r) => r.id === id) ?? null) : null)}
        pad={{ top: brand.top + 90, bottom: tabSpace + 150 }}
      />

      <View style={styles.band} pointerEvents="box-none">
        <Text style={styles.title}>map.</Text>
        <View style={styles.subRow}>
          <Text style={styles.sub}>{whenLabel} · {placeLabel}</Text>
          <Pressable onPress={() => setSheet(true)} hitSlop={10}>
            <Text style={styles.change}>change</Text>
          </Pressable>
        </View>
        <SoundCorner />
      </View>

      {/* dinlenirken: büyük yarıçap, sayılar, kırmızı sürgü */}
      <Animated.View style={[styles.rest, { bottom: tabSpace + 8 }, restStyle]} pointerEvents={picked ? 'none' : 'auto'}>
        <View style={styles.restRow}>
          <Text style={styles.big}>
            {bigKm < 1 ? Math.round(bigKm * 1000) : kmText(bigKm)}
            <Text style={styles.bigUnit}>{bigKm < 1 ? 'm' : 'km'}</Text>
          </Text>
          <View style={styles.counts}>
            <Text style={styles.jetMeta}>{missing ? 'not live yet' : `${shown.length} nights`}</Text>
            {withFriends > 0 ? <Text style={styles.jetRed}>{withFriends} with friends</Text> : null}
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

      {/* seçili gece: afiş altyazısı, sağda kırmızı GO şeridi */}
      {picked ? (
        <Animated.View style={[styles.caption, { bottom: tabSpace + 4 }, cardStyle]}>
          <View style={styles.block}>
            <View style={styles.capTop}>
              <Text style={styles.jetMeta}>
                {pickedIndex + 1} of {shown.length} · {distText(picked.distance_km)}
              </Text>
              <Pressable onPress={() => setPicked(null)} hitSlop={10}>
                <Text style={styles.change}>close</Text>
              </Pressable>
            </View>
            <Text style={styles.capTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
              {(picked.venue_name ?? picked.title).toLowerCase()}
            </Text>
            <Text style={styles.jet} numberOfLines={1}>{picked.title} · {picked.type_name}</Text>
            <Text style={styles.jet}>
              {time(picked.starts_at)} · {distText(picked.distance_km)} · {Math.max(1, Math.round((picked.distance_km / 5) * 60))} min walk
            </Text>
            {pickedFriends.length ? <Text style={styles.jet} numberOfLines={1}>{pickedFriends.join(', ')} kept it</Text> : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.strip, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(`/night/${picked.slug}`)}
            accessibilityRole="button"
            accessibilityLabel="go to the night"
          >
            <Text style={styles.stripText}>go →</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* change: zaman ve merkez */}
      <PickerSheet
        open={sheet}
        title="when · where"
        options={[
          { id: 'w:any', label: 'any night', extra: !when ? 'on' : undefined },
          ...whens.map((w) => ({ id: `w:${w.id}`, label: w.label, extra: when === w.id ? 'on' : undefined })),
          { id: 'c:me', label: me ? 'near me' : denied ? 'near me · location off' : 'near me · locating…', extra: !atCity ? 'on' : undefined },
          { id: 'c:city', label: `${cityName} centre`, extra: atCity ? 'on' : undefined },
        ]}
        selected={null}
        onSelect={(id) => {
          if (id === 'w:any') setWhen(null);
          else if (id.startsWith('w:')) setWhen(id.slice(2) as When);
          else if (id === 'c:me' && me) setFollow('me');
          else if (id === 'c:city') setFollow('city');
          setPicked(null);
        }}
        onClose={() => setSheet(false)}
        note="the circle is how far you would walk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 80 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  subRow: { position: 'absolute', top: brand.top + 32, left: brand.left, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper },
  change: { fontFamily: fonts.regular, fontSize: 12, color: colors.paper, textDecorationLine: 'underline' },
  rest: { position: 'absolute', left: brand.left, right: brand.left },
  restRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 },
  big: { fontFamily: fonts.logo, fontSize: 64, lineHeight: 60, letterSpacing: -1.5, color: colors.paper },
  bigUnit: { fontSize: 28, letterSpacing: -0.5 },
  counts: { alignItems: 'flex-end', gap: 4, paddingBottom: 6 },
  jet: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.paper },
  jetMeta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.meta },
  jetRed: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.spotText },
  caption: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'stretch' },
  block: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: brand.left, paddingTop: 14, paddingBottom: 14, gap: 3 },
  capTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  capTitle: { fontFamily: fonts.logo, fontSize: 54, lineHeight: 46, letterSpacing: -1, color: colors.spotText, marginBottom: 10 },
  strip: { width: 56, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  stripText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
});
