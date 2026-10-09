import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import { useReport } from '@/components/ReportSheet';
import GroupInvitation from '@/components/GroupInvitation';
import StaffPage, { Field, Quiet, Said } from '@/components/StaffPage';
import { useAuth } from '@/auth/AuthContext';
import { groupJoin, groupPeek, why, type Peek } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import PillAction, { PillRow } from '@/components/PillAction';

// Joining by code: from a link (?code=…) or typed in. Once the code is known the
// screen becomes the invitation (design 10D): who is in, an empty place for you,
// what they are up to, and "come too".
export default function Join() {
  const { code: given } = useLocalSearchParams<{ code?: string }>();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { session, isAnonymous } = useAuth();
  const [code, setCode] = useState((given ?? '').toUpperCase());
  const [peek, setPeek] = useState<Peek | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const signedIn = !!session && !isAnonymous;
  const reporting = useReport();

  const show = (c: string) => groupPeek(c).then((p) => (p ? setPeek(p) : setSaid(t('groups.join.closed'))), (e) => setSaid(why(e)));
  const look = (c: string) => {
    setSaid(null);
    setPeek(null);
    show(c);
  };
  // From a link: look at once.
  useEffect(() => {
    if (given && signedIn) show(given);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [given, signedIn]);

  const join = () => groupJoin(code).then((g) => router.replace(`/groups/${g}`), (e) => setSaid(why(e)));

  if (!signedIn) {
    return (
      <StaffPage title={t('groups.join.title')}>
        <Quiet text={t('groups.join.account')} />
        <View style={styles.gap}>
          <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
        </View>
      </StaffPage>
    );
  }
  if (peek) {
    const line = peek.owner ? t('groups.join.calls', { name: peek.owner.toLowerCase() }) : t('groups.members', { n: peek.members });
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <GroupInvitation emoji={peek.emoji} name={peek.name} color={peek.color} line={line} names={peek.names ?? []}>
          <Text style={styles.about}>
            {peek.plan_title ? t('groups.join.plan', { title: peek.plan_title.toLowerCase() }) : t('groups.join.about')}
          </Text>
          <Said text={said} bad />
          <View style={[styles.foot, { paddingBottom: insets.bottom + 20 }]}>
            {peek.mine ? (
              <Button label={t('groups.join.mine')} onPress={() => router.replace(`/groups/${peek.id}`)} />
            ) : peek.open ? (
              <Button label={t('groups.join.come')} onPress={join} />
            ) : (
              <Quiet text={t('groups.join.closed')} />
            )}
            {signedIn && !peek.mine ? (
              <View style={styles.report}>
                <PillRow center>
                  <PillAction small icon="flag" label={t('report.group')} onPress={() => reporting.ask('group', peek.id)} />
                </PillRow>
              </View>
            ) : null}
          </View>
        </GroupInvitation>
        <BackButton />
        {reporting.sheet}
      </View>
    );
  }
  return (
    <StaffPage title={t('groups.join.title')}>
      <Field label={t('groups.join.code')} value={code} onChangeText={(c) => setCode(c.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={8} autoCapitalize="characters" onSubmitEditing={() => look(code)} />
      <View style={styles.gap}>
        <Button label={t('groups.join.look')} onPress={() => look(code)} />
      </View>
      <Said text={said} bad />
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  gap: { marginTop: 16 },
  about: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.paper, textAlign: 'center' },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  report: { marginTop: 14 },
});
