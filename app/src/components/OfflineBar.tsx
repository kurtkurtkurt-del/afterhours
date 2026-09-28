import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNet } from '@/lib/offline';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// çevrimdışıyken en üstte küçük bir satır: kaydedilenler gösteriliyor, kaç iş
// sırada bekliyor. bağlantı gelip sıra gönderilirken "gönderiliyor". başka
// zaman hiçbir şey çizmez.
export default function OfflineBar() {
  const { online, pending, sending } = useNet();
  const { t, tn, up } = useLang();
  const insets = useSafeAreaInsets();
  if (online && !sending) return null;
  const text = online ? t('offline.sending') : [t('offline.title'), pending ? tn('offline.pending', pending) : t('offline.saved')].join(' · ');
  return (
    <View style={[styles.wrap, { top: insets.top + 4 }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={styles.pill}>
        <View style={[styles.dot, online && styles.dotOn]} />
        <Text style={styles.text}>{up(text)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50, elevation: 50 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.ink3, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.mute },
  dotOn: { backgroundColor: colors.spot, borderColor: colors.spot },
  text: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.3, color: colors.paper },
});
