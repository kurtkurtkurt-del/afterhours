import { Pressable, StyleSheet, Text, View } from 'react-native';
import { langNames, langs, useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// dil seçimi: en de tr. kutu yok; seçili olan kâğıt, diğerleri soluk.
export default function LangRow() {
  const { lang, setLang, t } = useLang();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('lang.label')}>
      {langs.map((code) => {
        const on = code === lang;
        return (
          <Pressable
            key={code}
            onPress={() => setLang(code)}
            hitSlop={{ top: 14, bottom: 14, left: 9, right: 9 }}
            accessibilityRole="radio"
            accessibilityLabel={langNames[code]}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={[styles.code, on && styles.on]}>{code}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  pressed: { opacity: 0.6 },
  code: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 16, letterSpacing: 0.2, color: colors.mute },
  on: { color: colors.paper },
});
