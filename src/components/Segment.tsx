import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props<T extends string> = { secenekler: { deger: T; yazi: string; rozet?: number }[]; secili: T; degisti: (d: T) => void };

// İki üç seçenekli geçiş düğmesi (örn. Bireysel | Kurumsal).
export default function Segment<T extends string>({ secenekler, secili, degisti }: Props<T>) {
  return (
    <View style={styles.kap}>
      {secenekler.map((s) => {
        const acik = s.deger === secili;
        return (
          <Pressable key={s.deger} onPress={() => degisti(s.deger)} style={[styles.oge, acik && styles.acik]} accessibilityRole="tab" accessibilityState={{ selected: acik }}>
            <Text style={[styles.yazi, acik && { color: colors.koyuMetin }]}>{s.yazi}</Text>
            {s.rozet ? (
              <View style={[styles.rozet, acik && { backgroundColor: colors.koyuMetin }]}>
                <Text style={[styles.rozetYazi, acik && { color: colors.sari }]}>{s.rozet > 9 ? '9+' : s.rozet}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: {
    flexDirection: 'row',
    backgroundColor: colors.yuzey,
    borderRadius: radius.tam,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: 4,
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  oge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.tam },
  acik: { backgroundColor: colors.sari },
  yazi: { fontSize: fontSize.kucuk + 1, fontWeight: '700', color: colors.metin },
  rozet: { minWidth: 20, height: 20, borderRadius: radius.tam, backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  rozetYazi: { fontSize: 11, fontWeight: '800', color: colors.metin },
});
