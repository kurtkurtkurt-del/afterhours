import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { PRIVACY_URL, TERMS_URL, acceptTerms, accountStatus, termsAccepted, termsKnown } from '@/data/safety';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';
import PillAction, { PillRow } from '@/components/PillAction';

// The first thing after signing in (guests too), and again when the terms change
// (TERMS_VERSION in data/safety.ts): 18 or older, the terms, the privacy notice,
// no tolerance for abuse. Nothing else of the app is usable until it is accepted;
// "not for me" signs out. Offline and never asked before: it waits for the network
// rather than locking someone out.
export default function TermsGate() {
  const { session, signOut } = useAuth();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const uid = session?.user.id ?? null;
  // Which account must be asked; the gate shows only for the one signed in now.
  const [askFor, setAskFor] = useState<string | null>(null);
  const ask = !!uid && askFor === uid;
  // A closed account (52_bans.sql) sees only that, with the reason, and can sign out.
  const [closed, setClosed] = useState<{ uid: string; reason: string | null } | null>(null);
  const shut = !!uid && closed?.uid === uid;
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    accountStatus().then((s) => live && setClosed(s?.banned ? { uid, reason: s.reason } : null));
    return () => {
      live = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || termsKnown(uid)) return;
    let live = true;
    termsAccepted(uid).then((ok) => live && setAskFor(ok === false ? uid : null));
    return () => {
      live = false;
    };
  }, [uid]);

  const accept = () => {
    if (!uid || !adult || busy) return;
    setBusy(true);
    setErr(null);
    acceptTerms(uid)
      .then(() => setAskFor(null))
      .catch((e) => setErr(String(e?.message ?? e).toLowerCase()))
      .finally(() => setBusy(false));
  };

  if (shut) {
    return (
      <Modal visible animationType="fade" onRequestClose={() => {}}>
        <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.title}>{t('closed.title')}</Text>
          <Text style={styles.body}>{t('closed.body')}</Text>
          {closed?.reason ? <Text style={styles.checkText}>“{closed.reason}”</Text> : null}
          <View style={{ flex: 1 }} />
          <PillAction icon="link" label={t('terms.read')} onPress={() => Linking.openURL(TERMS_URL)} />
          <View style={{ height: 24 }} />
          <Button label={t('closed.leave')} onPress={() => signOut()} />
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible={ask} animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>{t('terms.title')}</Text>
        <Text style={styles.body}>{t('terms.body')}</Text>
        <Text style={styles.body}>{t('terms.rules')}</Text>
        <View style={styles.links}>
          <PillRow>
            <PillAction icon="link" label={t('terms.read')} onPress={() => Linking.openURL(TERMS_URL)} />
            <PillAction icon="link" label={t('settings.privacy.link')} onPress={() => Linking.openURL(PRIVACY_URL)} />
          </PillRow>
        </View>
        <Pressable onPress={() => setAdult((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }} style={styles.check}>
          <View style={[styles.box, adult && styles.boxOn]}>{adult ? <Text style={styles.tick}>✓</Text> : null}</View>
          <Text style={styles.checkText}>{t('terms.adult')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <View style={!adult && styles.off}>
          <Button label={busy ? '…' : t('terms.accept')} onPress={accept} />
        </View>
        <View style={styles.leave}>
          <PillAction wide icon="out" label={t('terms.leave')} onPress={() => signOut()} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: brand.left },
  title: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: colors.paper, marginBottom: 18 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mute, marginBottom: 12 },
  links: { marginTop: 6, marginBottom: 26 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  box: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.spot, borderColor: colors.spot },
  tick: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  checkText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.paper },
  off: { opacity: 0.4 },
  err: { fontFamily: fonts.regular, fontSize: 13, color: colors.spotText, marginBottom: 10 },
  leave: { marginTop: 12 },
});
