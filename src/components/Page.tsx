import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Backdrop from '@/components/Backdrop';
import BackButton from '@/components/BackButton';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = { title: string };

// boş iç sayfa: aynı zemin, sol üstte geri, ortada sayfa adı.
export default function Page({ title }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Backdrop />
      <BackButton />
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.medium, fontSize: brand.bigSize, letterSpacing: -0.6, color: colors.paper },
});
