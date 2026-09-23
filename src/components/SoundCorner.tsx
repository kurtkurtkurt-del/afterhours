import { StyleSheet, View } from 'react-native';
import SoundToggle from '@/components/SoundToggle';
import { useAmbient } from '@/audio/AmbientContext';
import { brand } from '@/theme/layout';

// sağ üst köşe, geri tuşuyla aynı hizada. iç sayfaların hepsinde. basılı tutunca tür listesi.
type Props = { tone?: 'paper' | 'ink' };

export default function SoundCorner({ tone = 'paper' }: Props) {
  const { on, toggle, openPicker } = useAmbient();
  return (
    <View style={styles.corner}>
      <SoundToggle on={on} onPress={toggle} onLongPress={openPicker} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', top: brand.top, right: brand.left, zIndex: 1 },
});
