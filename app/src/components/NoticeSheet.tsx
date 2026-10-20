import { useEffect, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { myNotices, noticesSeen, type Notice } from '@/data/safety';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// What the staff did to your things (53_trust.sql), told once: a hidden comment or
// post, a removed message, a cleared profile, a new role, a dj page let through or
// taken down. Read on start and on return; "got it" marks them seen.
export default function NoticeSheet() {
  const { session, isAnonymous } = useAuth();
  const { t, tx } = useLang();
  const insets = useSafeAreaInsets();
  // Outside the navigator: read again whenever the app comes back to the front.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTick((n) => n + 1));
    return () => sub.remove();
  }, []);
  const uid = session && !isAnonymous ? session.user.id : null;
  const [list, setList] = useState<Notice[]>([]);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    myNotices().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, [uid, tick]);
  const close = () => {
    setList([]);
    noticesSeen().catch(() => {});
  };
  const line = (n: Notice) => {
    const v = { ...n.data, role: tx('notice.role.' + (n.data.role ?? ''), n.data.role ?? ''), what: tx('notice.what.' + (n.data.what ?? ''), n.data.what ?? '') };
    return tx('notice.' + n.kind, n.kind, v);
  };
  return (
    <Modal visible={!!uid && list.length > 0} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.dim}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.head}>{t('notice.title')}</Text>
          {list.map((n) => (
            <View key={n.id} style={styles.item}>
              <Text style={styles.text}>{line(n)}</Text>
              {n.data.text ? <Text style={styles.quote} numberOfLines={2}>“{n.data.text}”</Text> : null}
            </View>
          ))}
          <View style={{ marginTop: 18 }}>
            <Button label={t('notice.ok')} onPress={close} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.ink, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.ink3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: brand.left, paddingTop: 18 },
  head: { fontFamily: fonts.medium, fontSize: 20, letterSpacing: -0.4, color: colors.paper, marginBottom: 8 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3, gap: 4 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.paper },
  quote: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
});
