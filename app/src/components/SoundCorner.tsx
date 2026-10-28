import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SoundToggle from '@/components/SoundToggle';
import { useAmbient } from '@/audio/AmbientContext';
import { brand } from '@/theme/layout';

// Top right corner, aligned with the back button, on every inner page. Long press opens the genre list.
type Props = { tone?: 'paper' | 'ink' | 'photo' };

export default function SoundCorner({ tone = 'paper' }: Props) {
  const { on, toggle, openPicker } = useAmbient();
  // the same top as the pages' headers (max(brand.top, inset + 24)), so it never sits over them
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.corner, { top: Math.max(brand.top, insets.top + 24) }]}>
      <SoundToggle on={on} onPress={toggle} onLongPress={openPicker} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', top: brand.top, right: brand.left, zIndex: 1 },
});
