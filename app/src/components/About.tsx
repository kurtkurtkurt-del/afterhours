import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { About } from '@/data/about';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The "who is this?" button on a card: red into gold, with a spark, so it reads as
// something extra on the card rather than part of the poster.
export function AskButton({ onPress, style }: { onPress: () => void; style?: object }) {
  const { t } = useLang();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('about.ask')} style={({ pressed }) => [style, pressed && styles.pressed]}>
      <LinearGradient colors={[colors.spot, '#E8B04B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ask}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M12 1.5c.6 4.9 2.8 7.9 10.5 10.5-7.7 2.6-9.9 5.6-10.5 10.5C11.4 17.6 9.2 14.6 1.5 12 9.2 9.4 11.4 6.4 12 1.5Z" fill={colors.paper} />
        </Svg>
        <Text style={styles.askText}>{t('about.ask')}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// The sheet: what they are, who they are, two facts, where it comes from; close or
// keep from here. It covers the lower part of the screen; the card stays above it.
export function AboutSheet({ about, onClose, onKeep }: { about: About | null; onClose: () => void; onKeep?: () => void }) {
  const { t, up } = useLang();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const host = about ? about.source_url.replace(/^https:\/\/(www\.)?/, '').split('/')[0] : '';
  return (
    <Modal visible={!!about} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('word.close')} />
        {about ? (
          <View style={[styles.sheet, { maxHeight: height * 0.74 }]}>
            <View style={styles.grab} />
            <ScrollView contentContainerStyle={styles.in} showsVerticalScrollIndicator={false}>
              <Text style={styles.kicker}>{up(about.kicker)}</Text>
              <Text style={styles.name}>{about.name.toLowerCase()}</Text>
              {about.who ? <Text style={styles.who}>{about.who}</Text> : null}
              {about.facts.length ? (
                <View style={styles.facts}>
                  {about.facts.map((f, i) => (
                    <View key={i} style={styles.fact}>
                      <Text style={styles.factNo}>{String(i + 1).padStart(2, '0')}</Text>
                      <Text style={styles.factText}>{f}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.src}>
                <Text style={styles.srcText} onPress={() => Linking.openURL(about.source_url).catch(() => {})}>
                  {up(t('about.source'))}: <Text style={styles.srcLink}>{host}</Text>
                </Text>
                <Text style={styles.srcText}>{up(t('about.ai'))}</Text>
              </View>
            </ScrollView>
            <View style={[styles.btns, { paddingBottom: insets.bottom + 14 }]}>
              <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnLine, pressed && styles.pressed]}>
                <Text style={styles.btnText}>{t('word.close')}</Text>
              </Pressable>
              {onKeep ? (
                <Pressable onPress={onKeep} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.btnRed, pressed && styles.pressed]}>
                  <Text style={styles.btnText}>{t('word.keep')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ask: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 14, borderRadius: radius.pill, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  askText: { fontFamily: fonts.semibold, fontSize: 13.5, letterSpacing: -0.1, color: colors.paper },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,12,0.55)' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginTop: 9 },
  in: { paddingHorizontal: brand.left + 4, paddingTop: 16, paddingBottom: 18 },
  kicker: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.mute },
  name: { fontFamily: fonts.logo, fontSize: 42, lineHeight: 42, letterSpacing: -0.8, color: colors.paper, marginTop: 8 },
  who: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.paper, marginTop: 14 },
  facts: { marginTop: 18, gap: 12 },
  fact: { flexDirection: 'row', gap: 10 },
  factNo: { width: 22, fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.spotText, paddingTop: 3 },
  factText: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: '#d9d5cc' },
  src: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.ink3 },
  srcText: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.meta },
  srcLink: { color: colors.mute, textDecorationLine: 'underline' },
  btns: { flexDirection: 'row', gap: 10, paddingHorizontal: brand.left + 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.ink3 },
  btn: { flex: 1, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnLine: { borderWidth: 1, borderColor: colors.ink3 },
  btnRed: { backgroundColor: colors.spot },
  btnText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  pressed: { opacity: 0.7 },
});
