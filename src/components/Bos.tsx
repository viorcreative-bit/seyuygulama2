import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

type Props = { yukleniyor?: boolean; mesaj?: string; simge?: keyof typeof Ionicons.glyphMap };

// Liste yüklenirken, boşken veya hata varken gösterilen ortak durum.
export default function Bos({ yukleniyor, mesaj, simge = 'restaurant-outline' }: Props) {
  return (
    <View style={styles.kap}>
      {yukleniyor ? (
        <ActivityIndicator size="large" color={colors.sari} />
      ) : (
        <>
          <Ionicons name={simge} size={44} color={colors.cizgi} />
          <Text style={styles.yazi}>{mesaj}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { alignItems: 'center', gap: spacing.m, paddingVertical: 56, paddingHorizontal: spacing.l },
  yazi: { color: colors.metinSoluk, fontSize: fontSize.normal, textAlign: 'center' },
});
