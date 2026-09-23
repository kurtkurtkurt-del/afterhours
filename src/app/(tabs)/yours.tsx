import { StyleSheet, Text } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import TabPage from '@/components/TabPage';
import { useAuth } from '@/auth/AuthContext';
import { colors, fonts } from '@/theme/tokens';

// arkadaş sekmesi. yer tutucu; seçilen şehri gösterir.
export default function YoursScreen() {
  const city = Storage.getItemSync('city.name');
  const { session } = useAuth();
  return (
    <TabPage title="yours">
      {city && <Text style={styles.city}>{city}</Text>}
      <Text style={styles.city}>{session ? session.user.email : 'not signed in'}</Text>
    </TabPage>
  );
}

const styles = StyleSheet.create({
  city: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
});
