import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props<T extends string> = { secenekler: { deger: T; yazi: string }[]; secili: T; degisti: (d: T) => void };

// Tek seçimli etiketler (yalnızca biri seçilir).
export default function TekSecim<T extends string>({ secenekler, secili, degisti }: Props<T>) {
  return (
    <View style={styles.sar}>
      {secenekler.map((s) => {
        const acik = s.deger === secili;
        return (
          <Pressable key={s.deger} onPress={() => degisti(s.deger)} style={[styles.etiket, acik && styles.acik]} accessibilityRole="radio" accessibilityState={{ selected: acik }}>
            <Text style={[styles.yazi, acik && { color: colors.koyuMetin }]}>{s.yazi}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  etiket: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.tam, backgroundColor: colors.yuzey, borderWidth: 1, borderColor: colors.cizgi },
  acik: { backgroundColor: colors.sari, borderColor: colors.sari },
  yazi: { fontSize: fontSize.kucuk, fontWeight: '600', color: colors.metin },
});
