import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export type Ton = 'sari' | 'kirmizi' | 'beyaz' | 'cizgili' | 'soluk';

const TONLAR: Record<Ton, { zemin: string; yazi: string; cerceve: string }> = {
  sari: { zemin: colors.sari, yazi: colors.koyuMetin, cerceve: colors.sari },
  kirmizi: { zemin: colors.kirmizi, yazi: colors.metin, cerceve: colors.kirmizi },
  beyaz: { zemin: colors.metin, yazi: colors.koyuMetin, cerceve: colors.metin },
  cizgili: { zemin: 'transparent', yazi: colors.kirmiziAcik, cerceve: colors.kirmiziAcik },
  soluk: { zemin: 'transparent', yazi: colors.metinSoluk, cerceve: colors.cizgi },
};

// Küçük renkli etiket.
export default function Rozet({ yazi, ton = 'sari' }: { yazi: string; ton?: Ton }) {
  const t = TONLAR[ton];
  return (
    <View style={[styles.rozet, { backgroundColor: t.zemin, borderColor: t.cerceve }]}>
      <Text style={[styles.yazi, { color: t.yazi }]}>{yazi}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rozet: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.tam, borderWidth: 1, alignSelf: 'flex-start' },
  yazi: { fontSize: 13, fontWeight: '700' },
});
