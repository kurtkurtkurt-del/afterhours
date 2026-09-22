import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Backdrop from '@/components/Backdrop';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = { title: string };

// boş iç sayfa: aynı zemin, sol üstte "back", ortada sayfa adı.
export default function Page({ title }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Backdrop />
      <Pressable onPress={() => router.back()} hitSlop={16} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backText}>back</Text>
      </Pressable>
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  back: { position: 'absolute', top: brand.top, left: brand.left },
  pressed: { opacity: 0.6 },
  backText: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper },
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.medium, fontSize: brand.bigSize, letterSpacing: -0.6, color: colors.paper },
});
