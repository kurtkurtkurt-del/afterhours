import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

export type Option = { id: string; label: string; extra?: string };
type Props = {
  open: boolean;
  title: string;
  options: Option[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  note?: string;
};

// alttan açılan liste. mürekkep zemin, üstte kâğıt çizgi, seçili satırda spot nokta.
export default function PickerSheet({ open, title, options, selected, onSelect, onClose, note }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.head}>{title}</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {options.map((o) => {
            const on = o.id === selected;
            return (
              <Pressable
                key={o.id}
                onPress={() => {
                  onSelect(o.id);
                  onClose();
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
                <View style={styles.right}>
                  {o.extra ? <Text style={styles.extra}>{o.extra}</Text> : null}
                  <View style={[styles.dot, on && styles.dotOn]} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.6)' },
  sheet: { backgroundColor: colors.ink, borderTopWidth: 1, borderTopColor: colors.paper, paddingHorizontal: brand.left, paddingTop: 20, maxHeight: '70%' },
  head: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginBottom: 6 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.4, color: colors.mute },
  labelOn: { color: colors.paper },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  extra: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.mute },
  dotOn: { backgroundColor: colors.spot, borderColor: colors.spot },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 14 },
});
