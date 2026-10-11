import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

// Koyu temaya uygun metin kutusu.
const Girdi = forwardRef<TextInput, TextInputProps>(function Girdi({ style, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.metinSoluk}
      selectionColor={colors.sari}
      keyboardAppearance="dark"
      {...props}
      style={[styles.girdi, props.multiline && styles.cokSatir, style]}
    />
  );
});

export default Girdi;

const styles = StyleSheet.create({
  girdi: {
    minWidth: 0,
    backgroundColor: colors.yuzey,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.cizgi,
    paddingHorizontal: spacing.m,
    paddingVertical: 14,
    fontSize: fontSize.normal + 2,
    color: colors.metin,
  },
  cokSatir: { textAlignVertical: 'top', paddingTop: 14 },
});
