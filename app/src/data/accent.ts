import { Alert, DevSettings } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { accentId, type AccentId } from '@/theme/tokens';

// The accent colour (theme/tokens.ts ACCENTS). Every StyleSheet is built from it when
// the app starts, so a new pick is stored and the app reloads to draw itself again.
// DevSettings.reload works in Expo Go and in release builds alike.
export const currentAccent = (): AccentId => accentId;
export function chooseAccent(id: AccentId, words: { title: string; body: string; go: string; later: string }) {
  if (id === accentId) return;
  try {
    Storage.setItemSync('accent', id);
  } catch {
    return;
  }
  Alert.alert(words.title, words.body, [
    { text: words.later, style: 'cancel' },
    { text: words.go, onPress: () => DevSettings.reload('accent') },
  ]);
}
