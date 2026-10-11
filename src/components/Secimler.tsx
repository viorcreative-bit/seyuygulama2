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
            <Text style={[styles.yazi, acik && { color: colors.koyuMetin }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  etiket: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.tam,
    backgroundColor: colors.yuzey,
    borderWidth: 1,
    borderColor: colors.cizgi,
  },
  acik: { backgroundColor: colors.sari, borderColor: colors.sari },
  yazi: { fontSize: fontSize.kucuk, fontWeight: '600', color: colors.metin },
});
