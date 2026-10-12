import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Preview } from '@/data/previews';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Listen to the artist (12.10.2026, design D in prototypes/listen.html): a paper pill
// under "who is this?" on the card; a tap plays the 30 second preview from Apple and the
// poster dims under a big ring that fills with the seconds, the track name and the
// source. Another tap, the ✕ or a swipe stops it. The player itself is useTrack in the
// deck (one at a time, the ambient music hushed meanwhile).

export function ListenButton({ onPress, playing, style }: { onPress: () => void; playing: boolean; style?: object }) {
  const { t } = useLang();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('listen.a11y')} style={({ pressed }) => [style, pressed && styles.pressed]}>
      <View style={[styles.pill, playing && styles.pillOn]}>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Path d="M9 18V5l12-2v13" stroke={playing ? colors.paper : colors.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={6} cy={18} r={3} fill={playing ? colors.paper : colors.ink} />
          <Circle cx={18} cy={16} r={3} fill={playing ? colors.paper : colors.ink} />
        </Svg>
        <Text style={[styles.pillText, playing && styles.pillTextOn]}>{t(playing ? 'listen.playing' : 'listen.button')}</Text>
      </View>
    </Pressable>
  );
}

const RING = 84;
const STROKE = 5;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;
const two = (n: number) => String(n).padStart(2, '0');
const mmss = (s: number) => `${Math.floor(s / 60)}:${two(Math.floor(s % 60))}`;

// The poster while a preview plays: dimmed, the ring, the track, the source.
export function ListenOverlay({ preview, elapsed, duration, onStop }: { preview: Preview; elapsed: number; duration: number; onStop: () => void }) {
  const { t, up } = useLang();
  const total = duration > 0 ? duration : 30;
  const done = Math.min(1, Math.max(0, elapsed / total));
  return (
    <View style={styles.overlay}>
      <Pressable onPress={onStop} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('listen.stop')} />
      <Pressable onPress={onStop} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel={t('listen.stop')}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <Pressable onPress={onStop} style={styles.ringBox} accessibilityRole="button" accessibilityLabel={t('listen.stop')}>
        <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(243,241,236,0.22)" strokeWidth={STROKE} fill="none" />
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.spot} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - done)} transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />
        </Svg>
        <View style={styles.pause}>
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
      </Pressable>
      <View style={styles.words} pointerEvents="box-none">
        <Text style={styles.track} numberOfLines={1}>{preview.track.toLowerCase()}</Text>
        <Pressable onPress={preview.link ? () => Linking.openURL(preview.link!) : undefined} hitSlop={6}>
          <Text style={styles.line} numberOfLines={1}>
            {up(`${preview.artist} · ${mmss(elapsed)} / ${mmss(total)} · ${t('listen.source.apple')}`)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.paper, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  pillOn: { backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.ink3 },
  pillText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.ink },
  pillTextOn: { color: colors.paper },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,12,0.74)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(14,13,12,0.75)', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper },
  ringBox: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  pause: { position: 'absolute', flexDirection: 'row', gap: 6 },
  bar: { width: 7, height: 24, borderRadius: 2, backgroundColor: colors.paper },
  words: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'center' },
  track: { fontFamily: fonts.logo, fontSize: 22, letterSpacing: -0.5, color: colors.paper, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 },
  line: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.2, color: colors.mute, marginTop: 4 },
});
