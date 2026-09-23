import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Storage from 'expo-sqlite/kv-store';
import Deck from '@/components/Deck';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { fetchDeck, swipe, type Night } from '@/data/deck';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// deste. şehrin kaydırılmamış geceleri; keep/let go hesap varsa veritabanına yazılır.
export default function FlowScreen() {
  const { session } = useAuth();
  const city = Storage.getItemSync('city');
  const cityName = Storage.getItemSync('city.name') ?? 'everywhere';
  const [nights, setNights] = useState<Night[] | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDeck(city)
      .then((rows) => {
        if (cancelled) return;
        setNights(rows);
        setLeft(rows.length);
      })
      .catch((e) => !cancelled && setError(String(e.message ?? e).toLowerCase()));
    return () => {
      cancelled = true;
    };
  }, [city, session?.user.id]);

  const onSwipe = useCallback(
    (night: Night, direction: 'left' | 'right') => {
      setLeft((n) => Math.max(0, n - 1));
      if (session) swipe(night.slug, direction).catch(() => {}); // hesapsızken sadece geçilir
    },
    [session],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>afterhours</Text>
      <SoundCorner />
      <Text style={styles.count}>
        {cityName} · {left} left
      </Text>
      <View style={styles.stage}>
        {error ? (
          <Text style={styles.note}>{error}</Text>
        ) : nights ? (
          <Deck nights={nights} onSwipe={onSwipe} />
        ) : (
          <Text style={styles.note}>loading the night…</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper, zIndex: 1 },
  count: { position: 'absolute', top: brand.top + 28, left: brand.left, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute, zIndex: 1 },
  stage: { flex: 1, marginTop: brand.top + 56, marginHorizontal: 14, marginBottom: TAB_BAR_SPACE - 14 },
  note: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute, textAlign: 'center', marginTop: 40 },
});
