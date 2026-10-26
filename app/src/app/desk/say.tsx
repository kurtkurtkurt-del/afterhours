import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import StaffPage, { Field, Quiet, Said, staffStyles } from '@/components/StaffPage';
import { myVenues, venuePush, venueStats, type MyVenue, type VenueStats } from '@/data/venues';
import { serverText } from '@/lib/serverText';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// A word from the room to its people: one line, one push, once a day (venue_push).
export default function Say() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  const { t, up } = useLang();
  const [room, setRoom] = useState<MyVenue | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    if (!venue) return;
    myVenues().then((l) => setRoom(l.find((r) => r.id === venue) ?? null), () => {});
    venueStats(venue).then(setStats, () => {});
  }, [venue]);
  const send = () => {
    if (!venue || busy) return;
    setBusy(true);
    setSaid(null);
    venuePush(venue, line)
      .then((n) => {
        setSaid({ text: t('desk.say.sent', { n }) });
        setLine('');
        venueStats(venue).then(setStats, () => {});
      })
      .catch((e) => setSaid({ text: serverText(e), bad: true }))
      .finally(() => setBusy(false));
  };
  const last = stats?.last_push ? new Date(stats.last_push) : null;
  return (
    <StaffPage title={t('desk.say')}>
      <Text style={styles.who}>{up(room?.name ?? '…')}</Text>
      <Quiet text={t('desk.say.hint')} />
      {stats ? <Text style={styles.reach}>{up(t('desk.say.who', { n: stats.reach }))}{last ? ` · ${up(t('desk.say.last', { when: `${String(last.getDate()).padStart(2, '0')}.${String(last.getMonth() + 1).padStart(2, '0')} ${String(last.getHours()).padStart(2, '0')}:${String(last.getMinutes()).padStart(2, '0')}` }))}` : ''}</Text> : null}
      <Field label={t('desk.say.field')} value={line} onChangeText={setLine} maxLength={140} multiline autoCapitalize="sentences" />
      <Text style={styles.count}>{line.length}/140</Text>
      {/* how it lands: the room as the title, the line under it */}
      {line.trim().length >= 3 ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{(room?.name ?? '').toLowerCase()}</Text>
          <Text style={styles.previewBody}>{line.trim()}</Text>
        </View>
      ) : null}
      <Said text={said?.text ?? null} bad={said?.bad} />
      <View style={staffStyles.save}>
        <Button label={busy ? '…' : t('desk.say.send')} kind="red" onPress={busy || line.trim().length < 3 ? undefined : send} />
      </View>
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  who: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spotText, marginBottom: 14 },
  reach: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.mute, marginTop: 10 },
  count: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1, color: colors.meta, textAlign: 'right', marginTop: 6 },
  preview: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: colors.ink3, gap: 3 },
  previewTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.paper },
  previewBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.paper },
});
