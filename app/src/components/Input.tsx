import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

// Single-line field for photo backgrounds: no fill, no box, a thin paper underline.
export default function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.ink2}
      selectionColor={colors.spot}
      cursorColor={colors.paper}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
    fontFamily: fonts.regular,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.paper,
    paddingVertical: 0,
  },
});
