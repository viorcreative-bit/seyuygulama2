import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { baslik: string; geri?: () => void; sag?: React.ReactNode };

// Ekranların üst çubuğu: (varsa) geri düğmesi + başlık + sağ taraftaki eylem.
export default function Ust({ baslik, geri, sag }: Props) {
  return (
    <View style={styles.kap}>
      {geri ? (
        <Pressable onPress={geri} style={styles.geri} accessibilityRole="button" accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.metin} />
        </Pressable>
      ) : null}
      <Text style={styles.baslik} numberOfLines={1}>{baslik}</Text>
      {sag}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingHorizontal: spacing.l, paddingBottom: spacing.m },
  geri: {
    width: 42,
    height: 42,
    borderRadius: radius.tam,
    backgroundColor: colors.yuzey,
    borderWidth: 1,
    borderColor: colors.cizgi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslik: { flex: 1, fontSize: fontSize.buyuk, fontWeight: '800', color: colors.metin },
});
