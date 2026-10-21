import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import Input from '@/components/Input';
import { dmSend, dmStart, why } from '@/data/dms';
import { friendsList, type FriendRow } from '@/data/friends';
import { nightUrl } from '@/lib/share';
import { dayLabel } from '@/data/when';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type NightLike = { slug: string; title: string; starts_at: string | null; venue_name?: string | null; city_name?: string | null };

// Nudge a friend about a night (12.10.2026): pick a friend by name, and they get a
// direct message with the act, the day and the link — and the push a message brings.
// Nothing new in the database: it is a direct message, so it lands in their messages.
export default function NudgeSheet({ open, night, onClose, onSent }: { open: boolean; night: NightLike; onClose: () => void; onSent: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  // the friends are read when the sheet opens; what was typed before is cleared then
  useEffect(() => {
    if (!open) return;
    let live = true;
    friendsList().then((l) => live && setFriends(l.filter((f) => f.status === 'accepted')), () => {});
    return () => {
      live = false;
    };
  }, [open]);
  const close = () => {
    setQuery('');
    setSaid(null);
    onClose();
  };
  const q = query.trim().toLowerCase().replace(/^@/, '');
  const shown = friends.filter((f) => !q || (f.handle ?? '').includes(q) || (f.display_name ?? '').toLowerCase().includes(q));

  const text = () => {
    const act = night.title.split(/\s+[-–:|]\s+/)[0].trim().toLowerCase() || night.title.toLowerCase();
    const d = night.starts_at ? new Date(night.starts_at) : null;
    const time = d && !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null;
    const when = [dayLabel(night.starts_at), time, (night.venue_name ?? night.city_name ?? '').toLowerCase() || null].filter(Boolean).join(' · ');
    return `${t('night.nudge.text', { act, when })}\n${nightUrl(night.slug)}`;
  };
  const pick = (f: FriendRow) => {
    if (!f.handle || busy) return;
    setBusy(f.other_id);
    setSaid(null);
    const name = (f.display_name ?? f.handle).toLowerCase();
    dmStart(f.handle)
      .then((thread) => dmSend(thread, text()))
      .then(() => {
        onSent(name);
        close();
      })
      .catch((e) => setSaid(why(e)))
      .finally(() => setBusy(null));
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title}>{t('night.nudge')}</Text>
        <Text style={styles.hint}>{t('night.nudge.hint')}</Text>
        <Input value={query} onChangeText={setQuery} placeholder={t('messages.new.who')} autoFocus autoCapitalize="none" autoCorrect={false} />
        <View style={styles.list}>
          {shown.slice(0, 8).map((f) => (
            <Pressable key={f.other_id} onPress={() => pick(f)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Avatar name={f.handle ?? f.display_name ?? '?'} size={34} />
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>{(f.display_name ?? f.handle ?? '').toLowerCase()}</Text>
                <Text style={styles.meta} numberOfLines={1}>@{f.handle}</Text>
              </View>
              <Text style={styles.go}>{busy === f.other_id ? '…' : `${t('night.nudge.verb')} →`}</Text>
            </Pressable>
          ))}
          {!shown.length ? <Text style={styles.note}>{friends.length ? t('messages.new.none') : t('messages.new.noFriends')}</Text> : null}
          {said ? <Text style={[styles.note, styles.bad]}>{said}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.36)' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingHorizontal: brand.left, paddingTop: 18, gap: 10 },
  title: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.5, color: colors.paper },
  hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mute, marginBottom: 2 },
  list: { minHeight: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.meta },
  go: { fontFamily: fonts.medium, fontSize: 13, color: colors.spotText },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mute, marginTop: 10 },
  bad: { color: colors.spotText },
});
