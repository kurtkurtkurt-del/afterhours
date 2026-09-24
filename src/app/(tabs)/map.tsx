import { useEffect, useMemo, useState } from 'react';
import RangeSlider from '@/components/RangeSlider';
import { filterWhen, whens, type When } from '@/data/when';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapWeb, { type Pin } from '@/components/MapWeb';
import Storage from 'expo-sqlite/kv-store';
import SoundCorner from '@/components/SoundCorner';
import { useTabBarSpace } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { fetchNear, type NearNight } from '@/data/near';
import { swipe } from '@/data/deck';
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

const short: Record<string, string> = { rave: 'rv', 'club-night': 'cn', konzert: 'kz', festival: 'fs', meetup: 'mu', hausparty: 'hp' };

// harita: konum izni, webview içinde leaflet + carto karoları (anahtarsız), yakındaki geceler kare pin.
export default function MapScreen() {
  const { session } = useAuth();
  const tabSpace = useTabBarSpace();
  const [me, setMe] = useState<[number, number] | null>(null);
  const [follow, setFollow] = useState<'me' | 'city'>('me'); // harita merkezi: ben mi, seçili şehir mi
  const [denied, setDenied] = useState(false);
  const [km, setKm] = useState(3); // ağ isteği ve zoom bunu izler; sürgü bırakılınca değişir
  const [when, setWhen] = useState<When | null>(null);
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<NearNight[]>([]);
  const [missing, setMissing] = useState(false);
  const [picked, setPicked] = useState<NearNight | null>(null);
  const [kept, setKept] = useState<Record<string, boolean>>({});

  const city = Storage.getItemSync('city') ?? 'munchen';
  const cityCentre = CENTRES[city] ?? CENTRES.munchen;
  const centre = follow === 'me' && me ? me : cityCentre;

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
        if (!cancelled) setDenied(true); // izin var ama konum alınamadı: şehir merkezi
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [lat, lng] = centre;
  const shown = useMemo(() => filterWhen(rows, when) as NearNight[], [rows, when]); // filtre türü daraltmaz, aynı satırlar
  const pins = useMemo<Pin[]>(() => shown.map((n) => ({ id: n.id, lat: n.lat, lng: n.lng, code: short[n.type_slug] ?? n.type_slug.slice(0, 2) })), [shown]);
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

  const keep = (n: NearNight) => {
    setKept((k) => ({ ...k, [n.slug]: true }));
    if (session) swipe(n.slug, 'right').catch(() => {});
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <MapWeb lat={lat} lng={lng} km={km} me={me} pins={pins} picked={picked?.id ?? null} onPick={(id) => setPicked(id ? (rows.find((r) => r.id === id) ?? null) : null)} />

      <View style={styles.band} pointerEvents="box-none">
        <Text style={styles.title}>map</Text>
        <SoundCorner />
      </View>

      {/* zaman aralığı */}
      <View style={styles.chips}>
        {[{ id: null as When | null, label: 'any time' }, ...whens.map((w) => ({ id: w.id as When | null, label: w.label }))].map((w) => (
          <Pressable key={w.id ?? 'any'} onPress={() => setWhen(w.id)} style={[styles.chip, when === w.id && styles.chipOn]}>
            <Text style={[styles.chipText, when === w.id && styles.chipTextOn]}>{w.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* merkez: konumum / şehir merkezi, ve sayı */}
      <View style={styles.centreRow}>
        <Pressable onPress={() => setFollow('me')} disabled={!me} style={[styles.chip, follow === 'me' && me && styles.chipOn, !me && styles.chipOff]}>
          <Text style={[styles.chipText, follow === 'me' && me && styles.chipTextOn]}>{me ? 'near me' : denied ? 'location off' : 'locating…'}</Text>
        </Pressable>
        <Pressable onPress={() => setFollow('city')} style={[styles.chip, (follow === 'city' || !me) && styles.chipOn]}>
          <Text style={[styles.chipText, (follow === 'city' || !me) && styles.chipTextOn]}>{city} centre</Text>
        </Pressable>
        <Text style={styles.count}>
          {missing ? 'not live yet' : `${shown.length} ${follow === 'city' || !me ? `in ${city}` : 'near you'}`}
        </Text>
      </View>

      {/* alt: yarıçap sürgüsü */}
      {!picked && (
        <View style={[styles.slider, { bottom: tabSpace + 6 }]}>
          <RangeSlider
            min={0.5}
            max={30}
            value={km}
            width={width - brand.left * 2}
            format={(v) => (v < 1 ? `${Math.round(v * 100) * 10} m` : `${v < 10 ? v.toFixed(1) : Math.round(v)} km`)}
            onChange={() => {}}
            onEnd={(v) => setKm(Math.round(v * 10) / 10)}
          />
        </View>
      )}

      {/* seçili gece */}
      {picked && (
        <View style={[styles.sheet, { bottom: tabSpace + 4 }]}>
          <Text style={styles.mono}>
            {picked.type_name} · {picked.distance_km < 1 ? `${Math.round(picked.distance_km * 1000)} m` : `${picked.distance_km.toFixed(1)} km`}
          </Text>
          <Text style={styles.sheetTitle} numberOfLines={2}>{picked.title.toLowerCase()}</Text>
          <Text style={styles.mono}>{picked.meta}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => keep(picked)} style={[styles.btn, kept[picked.slug] && styles.btnOn]}>
              <Text style={[styles.btnText, kept[picked.slug] && styles.btnTextOn]}>{kept[picked.slug] ? 'kept' : 'keep'}</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/night/${picked.slug}`)} style={[styles.btn, styles.btnLine]}>
              <Text style={[styles.btnText, styles.btnTextLine]}>open</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36 },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  chips: { position: 'absolute', top: brand.top + 40, left: brand.left, right: brand.left, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  slider: { position: 'absolute', left: brand.left, right: brand.left, backgroundColor: colors.ink, paddingVertical: 10, paddingHorizontal: 0 },
  centreRow: { position: 'absolute', top: brand.top + 112, left: brand.left, right: brand.left, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.mute, backgroundColor: colors.ink },
  chipOff: { opacity: 0.5 },
  chipOn: { borderColor: colors.paper, backgroundColor: colors.paper },
  chipText: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  chipTextOn: { color: colors.ink },
  count: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.mute, marginLeft: 6 },
  sheet: { position: 'absolute', left: brand.left, right: brand.left, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.paper, padding: 14, gap: 6 },
  sheetTitle: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 22, letterSpacing: -0.5, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.paper },
  btnOn: { backgroundColor: colors.spot },
  btnLine: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.paper },
  btnText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  btnTextOn: { color: colors.paper },
  btnTextLine: { color: colors.paper },
});
