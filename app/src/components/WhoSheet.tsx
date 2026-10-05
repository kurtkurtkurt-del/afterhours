import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

export type Coming = { name: string; photo?: string; live?: string; handle?: string | null; kept?: boolean; answer?: 'in' | 'maybe' | 'out' | null };
type Props = {
  open: boolean;
  title: string;            // the night
  people: Coming[];         // friends who kept it
  answer: string | null;    // yours: in · maybe · out
  onAnswer: (a: 'in' | 'maybe' | 'out') => void;
  onPerson?: (p: Coming) => void;
  onClose: () => void;
};

// "who's coming?": your friends on this night — who answered (coming first) and who
// kept it — each with their face, their answer and what they are up to (out right
// now in red); under them your own answer, which your friends see (32_rsvp.sql).
export default function WhoSheet({ open, title, people, answer, onAnswer, onPerson, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tn, up } = useLang();
  const answers: { id: 'in' | 'maybe' | 'out'; label: string }[] = [
    { id: 'in', label: t('who.in') },
    { id: 'maybe', label: t('who.maybe') },
    { id: 'out', label: t('who.not') },
  ];
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
        <View style={styles.grip} />
        <Text style={styles.kicker}>{up(t('who.coming'))}</Text>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.count}>
          {up(tn('yours.coming', people.filter((p) => p.answer === 'in').length))} · {up(tn('yours.friendsKept', people.filter((p) => p.kept).length))}
        </Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {people.map((p) => (
            <Pressable key={p.name} onPress={() => onPerson?.(p)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.face, p.live && styles.faceLive]}>
                {p.photo ? <Image source={{ uri: p.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Avatar name={p.handle ?? p.name} size={44} />}
              </View>
              <View style={styles.who}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={[styles.state, p.live && styles.live]} numberOfLines={1}>
                  {[p.live ? `${up(t('yours.live'))} · ${p.live}` : null, p.kept ? t('deck.keptIt') : null].filter(Boolean).join(' · ') || t('who.answered')}
                </Text>
              </View>
              {p.answer ? (
                <View style={[styles.tag, p.answer === 'in' && styles.tagIn, p.answer === 'maybe' && styles.tagMaybe]}>
                  <Text style={[styles.tagText, p.answer === 'in' && styles.tagTextIn]}>{t(`who.state.${p.answer}`)}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.kicker}>{up(t('deck.you'))}</Text>
        <View style={styles.answers}>
          {answers.map((a) => {
            const on = answer === a.id;
            return (
              <Pressable key={a.id} onPress={() => onAnswer(a.id)} style={({ pressed }) => [styles.answer, on && (a.id === 'in' ? styles.answerIn : styles.answerOn), pressed && styles.pressed]}>
                <Text style={[styles.answerText, on && styles.answerTextOn]} numberOfLines={1}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>{t('who.friendsSee')}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.6)' },
  sheet: { backgroundColor: colors.ink, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.ink3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: brand.left, paddingTop: 10, maxHeight: '82%' },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 14 },
  kicker: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.meta, marginTop: 6 },
  title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 27, letterSpacing: -0.6, color: colors.paper, marginTop: 6 },
  count: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.spotText, marginTop: 6, marginBottom: 10 },
  list: { flexGrow: 0, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.ink3 },
  face: { width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  faceLive: { borderColor: colors.spot },
  who: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3, color: colors.paper },
  state: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta },
  live: { color: colors.spotText },
  tag: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3 },
  tagIn: { backgroundColor: colors.spot, borderColor: colors.spot },
  tagMaybe: { borderColor: colors.paper },
  tagText: { fontFamily: fonts.medium, fontSize: 12, color: colors.mute },
  tagTextIn: { color: colors.ink },
  answers: { flexDirection: 'row', gap: 8, marginTop: 10 },
  answer: { flex: 1, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  answerOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  answerIn: { backgroundColor: colors.spot, borderColor: colors.spot },
  answerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper },
  answerTextOn: { color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 14 },
  pressed: { opacity: 0.6 },
});
