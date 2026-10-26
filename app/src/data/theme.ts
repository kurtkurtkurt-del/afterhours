import { Alert } from 'react-native';
import { restart } from '@/lib/restart';
import Storage from 'expo-sqlite/kv-store';
import { themeId, type ThemeId } from '@/theme/tokens';

// Light or dark ground (theme/tokens.ts). Like the accent, every StyleSheet is built
// from it when the app starts, so a new pick is stored and the app reloads.
export const currentTheme = (): ThemeId => themeId;
export function chooseTheme(id: ThemeId, words: { title: string; body: string; go: string; later: string }) {
  if (id === themeId) return;
  try {
    Storage.setItemSync('theme', id);
  } catch {
    return;
  }
  Alert.alert(words.title, words.body, [
    { text: words.later, style: 'cancel' },
    { text: words.go, onPress: () => restart('/settings?section=app') },
  ]);
}
