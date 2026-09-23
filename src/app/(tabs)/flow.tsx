import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import Deck from '@/components/Deck';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { useCities } from '@/data/cities';
import { useEventTypes } from '@/data/types';
import { fetchDeck, swipe, type Night } from '@/data/deck';
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

  // sonuç, hangi seçim için geldiğiyle birlikte saklanır; seçim değişince eskisi
  // kendiliğinden "yükleniyor" sayılır, ayrıca sıfırlamaya gerek kalmaz
  const key = `${city}/${type}/${session?.user.id ?? ''}`;
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

  const onSwipe = useCallback(
    (night: Night, direction: 'left' | 'right') => {
      if (session) swipe(night.slug, direction).catch(() => {}); // hesapsızken sadece geçilir
    },
    [session],
  );

  const pickCity = (id: string) => {
    const v = id === '*' ? null : id;
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
    setType(v);
    if (v) Storage.setItemSync('type', v);
    else Storage.removeItemSync('type');
  };

  const pickWhen = (id: string) => {
    const v = id === '*' ? null : (id as When);
    setWhen(v);
    if (v) Storage.setItemSync('when', v);
    else Storage.removeItemSync('when');
  };

  const cityLabel = city ? (cities.find((c) => c.id === city)?.name ?? city) : 'everywhere';
  const typeLabel = type ? (types.find((t) => t.id === type)?.label ?? type) : 'all nights';
  const whenLabel = when ? (whens.find((w) => w.id === when)?.label ?? when) : 'any time';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.head}>
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

      <View style={styles.stage}>
        {error ? (
          <Text style={styles.note}>{error}</Text>
        ) : nights ? (
          <Deck key={`${city}/${type}/${when}`} nights={nights} onSwipe={onSwipe} onOpen={(n) => router.push(`/night/${n.slug}`)} />
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
        options={[{ id: '*', label: 'any time' }, ...whens]}
        selected={when ?? '*'}
        onSelect={pickWhen}
        onClose={() => setSheet(null)}
        note="nights without a fixed date only show under any time"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  head: { position: 'absolute', top: brand.top, left: brand.left, right: 96, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, zIndex: 1 },
  pick: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3, color: colors.paper, textDecorationLine: 'underline', textDecorationColor: colors.mute },
  sep: { fontFamily: fonts.regular, fontSize: 16, color: colors.mute },
  pressed: { opacity: 0.6 },
  stage: { flex: 1, marginTop: brand.top + 60, marginHorizontal: 14, marginBottom: TAB_BAR_SPACE - 14 },
  note: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, textAlign: 'center', marginTop: 40 },
});
