import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { UPDATE_URL, minAppVersion, versionBelow } from '@/data/safety';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Asked once at launch, signed in or not: the server names the oldest version it
// still answers (78_min_version.sql). A build below it would fail call by call, so it
// sees only this door to the download page. Offline, the question is skipped and the
// app runs as it did; it asks again next launch.
export default function UpdateGate() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [old, setOld] = useState(false);

  useEffect(() => {
    const mine = Constants.expoConfig?.version;
    if (!mine) return;
    let live = true;
    minAppVersion().then((floor) => live && floor && setOld(versionBelow(mine, floor)));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Modal visible={old} animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>{t('update.title')}</Text>
        <Text style={styles.body}>{t('update.body')}</Text>
        <View style={{ flex: 1 }} />
        <Button label={t('update.go')} onPress={() => Linking.openURL(UPDATE_URL)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: brand.left },
  title: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: colors.paper, marginBottom: 18 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mute, marginBottom: 12 },
});
