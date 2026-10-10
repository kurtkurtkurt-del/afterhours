import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Icon from '@/components/Icon';
import { useTabBarSpace } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { inbox } from '@/data/messages';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// The way to messages (11.10.2026, design D in prototypes/messaging.html): a red round
// button at the bottom right, above the tab bar, on yours and people; what is new on it
// as a paper badge. It opens the messages page (rooms and group chats in one list).
export default function MessagesButton() {
  const { session } = useAuth();
  const { t } = useLang();
  const tabSpace = useTabBarSpace();
  const [unread, setUnread] = useState(0);
  const uid = session?.user.id;
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      inbox().then((i) => live && setUnread(i.unread), () => {});
      return () => {
        live = false;
      };
    }, [uid]),
  );
  if (!uid) return null;
  return (
    <Pressable onPress={() => router.push('/rooms')} accessibilityRole="button" accessibilityLabel={t('messages.a11y')} style={({ pressed }) => [styles.btn, { bottom: tabSpace + 12 }, pressed && styles.pressed]}>
      <Icon name="chat" size={22} color={colors.paper} />
      {unread > 0 ? <Text style={styles.count}>{unread > 99 ? '99+' : unread}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { position: 'absolute', right: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8, zIndex: 3 },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.paper, color: colors.ink, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 20, textAlign: 'center', overflow: 'hidden' },
  pressed: { opacity: 0.8 },
});
