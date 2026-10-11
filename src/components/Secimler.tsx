import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { secenekler: readonly string[]; secili: string[]; degisti: (yeni: string[]) => void };

// Birden fazla seçilebilen küçük etiketler.
export default function Secimler({ secenekler, secili, degisti }: Props) {
  const degistir = (s: string) =>
    degisti(secili.includes(s) ? secili.filter((x) => x !== s) : [...secili, s]);
  return (
    <View style={styles.sar}>
      {secenekler.map((s) => {
        const acik = secili.includes(s);
        return (
          <Pressable key={s} onPress={() => degistir(s)} style={[styles.etiket, acik && styles.acik]}>
            <Text style={[styles.yazi, acik && { color: colors.sari }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  etiket: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.tam,
    backgroundColor: colors.beyaz,
    borderWidth: 1,
    borderColor: '#E5D9BF',
  },
  acik: { backgroundColor: colors.kirmizi, borderColor: colors.kirmizi },
  yazi: { fontSize: fontSize.kucuk, fontWeight: '600', color: colors.metin },
});
