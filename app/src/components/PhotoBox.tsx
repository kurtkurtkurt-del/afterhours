import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/Icon';
import { useT } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Small square photo (settings card, profile page). Without a photo: an icon and
// "your photo" inside a thin frame.
export default function PhotoBox({ uri, size, onError }: { uri: string | null; size: number; onError?: () => void }) {
  const t = useT();
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={onError} />
      ) : (
        <>
          <Icon name="photo" size={size > 60 ? 18 : 16} color={colors.mute} />
          {size > 60 ? <Text style={styles.text}>{t('account.photo')}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.mute, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  text: { fontFamily: fonts.medium, fontSize: 11, color: colors.mute },
});
