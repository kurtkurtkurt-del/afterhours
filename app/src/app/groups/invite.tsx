import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import GroupInvitation from '@/components/GroupInvitation';
import { Said } from '@/components/StaffPage';
import { groupGet, groupInvite, inviteUrl, why, type Group } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Inviting: the same invitation people will see when they open it (10D), with the
// QR and the code under it, and the link to send. The code works for 14 days and 20 people.
export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    groupInvite(id).then(setCode, (e) => setSaid(why(e)));
    groupGet(id).then(setGroup, () => {});
  }, [id]);
  const send = () =>
    code && group && Share.share({ message: `${t('groups.invite.message', { name: group.name, code })}\n${inviteUrl(code)}` }).catch(() => {});
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <GroupInvitation
        emoji={group?.emoji ?? '✦'}
        name={group?.name ?? '…'}
        color={group?.color ?? 'red'}
        line={t('groups.invite.hint')}
        names={(group?.members ?? []).map((m) => m.name ?? m.handle ?? '?')}
      >
        <Said text={said} bad />
        {code ? (
          <View style={styles.card}>
            <View style={styles.qr}>
              <QRCode value={inviteUrl(code)} size={120} color={colors.ink} backgroundColor={colors.paper} />
            </View>
            <View style={styles.codeCol}>
              <Text style={styles.codeLabel}>{t('groups.join.code')}</Text>
              <Text style={styles.code} selectable>{code}</Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.foot, { paddingBottom: insets.bottom + 20 }]}>
          <Button label={t('groups.invite.share')} onPress={send} />
        </View>
      </GroupInvitation>
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: radius.lg, backgroundColor: colors.paper },
  qr: { padding: 4 },
  codeCol: { flex: 1, gap: 6 },
  codeLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.ink2 },
  code: { fontFamily: fonts.jet, fontSize: 22, letterSpacing: 3, color: colors.ink },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
