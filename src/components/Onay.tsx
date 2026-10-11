import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = { secili: boolean; degisti: (b: boolean) => void; children: React.ReactNode };

// Onay kutusu (checkbox) ve yanında açıklama.
export default function Onay({ secili, degisti, children }: Props) {
  return (
    <View style={styles.satir}>
      <Pressable
        onPress={() => degisti(!secili)}
        style={[styles.kutu, secili && styles.kutuSecili]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: secili }}
        hitSlop={8}
      >
        {secili ? <Ionicons name="checkmark" size={18} color={colors.koyuMetin} /> : null}
      </Pressable>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', gap: spacing.s + 4, alignItems: 'flex-start' },
  kutu: {
    width: 26,
    height: 26,
    borderRadius: radius.s / 2,
    borderWidth: 2,
    borderColor: colors.sari,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  kutuSecili: { backgroundColor: colors.sari },
});
