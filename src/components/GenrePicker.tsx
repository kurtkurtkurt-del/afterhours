import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAmbient } from '@/audio/AmbientContext';
import { genres } from '@/content/music';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// ses düğmesine basılı tutunca alttan açılan tür listesi. seçince kapanır ve çalar.
export default function GenrePicker() {
  const { pickerOpen, closePicker, genre, setGenre } = useAmbient();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={closePicker}>
      <Pressable style={styles.dim} onPress={closePicker} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.head}>sound</Text>
        {genres.map((g) => {
          const on = g.id === genre;
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                setGenre(g.id);
                closePicker();
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={[styles.label, on && styles.labelOn]}>{g.label}</Text>
              <View style={[styles.dot, on && styles.dotOn]} />
            </Pressable>
          );
        })}
        <Text style={styles.note}>ten tracks each · plays while you browse</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(22,21,18,0.6)' },
  sheet: { backgroundColor: colors.ink, borderTopWidth: 1, borderTopColor: colors.paper, paddingHorizontal: brand.left, paddingTop: 20 },
  head: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.4, color: colors.mute },
  labelOn: { color: colors.paper },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.mute },
  dotOn: { backgroundColor: colors.spot, borderColor: colors.spot },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 14 },
});
