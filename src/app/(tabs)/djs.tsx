import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import Knob from '@/components/Knob';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { BAND, LOCK, djs } from '@/content/djs';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const DEG_PER_MHZ = 60; // bir tam tur = 6 mhz

// radyo kadranı: düğmeyi çevir, frekans ilerlesin, bir dj'ye gelince ismi netleşsin.
export default function DjsScreen() {
  const startFreq = djs[2].freq;
  const angle = useSharedValue(0);
  const [freq, setFreq] = useState(startFreq);
  const [locked, setLocked] = useState<string | null>(djs[2].id);

  const onFreq = useCallback(
    (f: number) => {
      setFreq(f);
      const hit = djs.find((d) => Math.abs(d.freq - f) <= LOCK) ?? null;
      setLocked((prev) => {
        if (hit?.id !== prev) {
          if (hit) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          else Haptics.selectionAsync();
        }
        return hit?.id ?? null;
      });
    },
    [],
  );

  useAnimatedReaction(
    () => {
      const raw = startFreq + angle.value / DEG_PER_MHZ;
      const clamped = Math.min(BAND[1], Math.max(BAND[0], raw));
      return Math.round(clamped * 10) / 10;
    },
    (f, prev) => {
      if (f !== prev) runOnJS(onFreq)(f);
    },
    [onFreq],
  );

  const dj = locked ? djs.find((d) => d.id === locked) : null;
  // istasyona yakınlık: isim buna göre belirir
  const nearest = djs.reduce((a, b) => (Math.abs(b.freq - freq) < Math.abs(a.freq - freq) ? b : a));
  const closeness = Math.max(0, 1 - Math.abs(nearest.freq - freq) / 1.2);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>djs</Text>
      <SoundCorner />

      <View style={styles.readout}>
        <Text style={styles.freq}>{freq.toFixed(1)}</Text>
        <Text style={styles.mhz}>fm · münih</Text>
        <View style={styles.station}>
          {dj ? (
            <>
              <Text style={styles.name}>{dj.name}</Text>
              <Text style={styles.line}>{dj.genre} · {dj.where}</Text>
              <Text style={styles.line}>next · {dj.next}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.name, styles.ghost, { opacity: 0.25 + closeness * 0.5 }]}>{nearest.name}</Text>
              <Text style={styles.line}>{closeness > 0.5 ? 'almost there' : 'static'}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.knob}>
        <Knob angle={angle} />
        <Text style={styles.hint}>turn to tune</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper, zIndex: 1 },
  readout: { position: 'absolute', top: brand.top + 64, left: brand.left, right: brand.left },
  freq: { fontFamily: fonts.medium, fontSize: 96, lineHeight: 100, letterSpacing: -5, color: colors.paper, fontVariant: ['tabular-nums'] },
  mhz: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute, marginTop: 2 },
  station: { marginTop: 28, gap: 4, minHeight: 90 },
  name: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: colors.paper },
  ghost: { color: colors.mute },
  line: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute },
  knob: { position: 'absolute', left: 0, right: 0, bottom: TAB_BAR_SPACE + 4, alignItems: 'center', gap: 14 },
  hint: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute },
});
