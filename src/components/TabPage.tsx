import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SoundCorner from '@/components/SoundCorner';
import { colors, fonts } from '@/theme/tokens';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { brand } from '@/theme/layout';

type Props = { title: string; children?: ReactNode };

// sekme sayfası: mürekkep zemin, sol üstte sekme adı, sağ üstte ses.
export default function TabPage({ title, children }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>{title}</Text>
      <SoundCorner />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { flex: 1, paddingTop: brand.top + 48, paddingHorizontal: brand.left, paddingBottom: TAB_BAR_SPACE },
});
