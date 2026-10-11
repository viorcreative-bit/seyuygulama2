import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Yalnızca gösterir (1-5 yıldız).
export function Yildizlar({ puan, boyut = 18 }: { puan: number; boyut?: number }) {
  const dolu = Math.round(puan);
  return (
    <Text style={{ fontSize: boyut, letterSpacing: 2 }} accessibilityLabel={`5 üzerinden ${puan} yıldız`}>
      <Text style={{ color: colors.sari }}>{'★'.repeat(dolu)}</Text>
      <Text style={{ color: colors.cizgi }}>{'★'.repeat(5 - dolu)}</Text>
    </Text>
  );
}

// Dokunarak 1-5 yıldız seçtirir.
export function YildizSec({ deger, degisti }: { deger: number; degisti: (n: number) => void }) {
  return (
    <View style={styles.satir}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => degisti(n)} accessibilityRole="button" accessibilityLabel={`${n} yıldız`} hitSlop={6}>
          <Text style={[styles.yildiz, { color: n <= deger ? colors.sari : colors.cizgi }]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  yildiz: { fontSize: 48 },
});
