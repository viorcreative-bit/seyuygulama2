import { StyleSheet, Text, View } from 'react-native';
import { DURUM_ADI, Durum } from '../lib/talepler';
import { colors, radius } from '../theme';

const RENK: Record<Durum, { zemin: string; yazi: string; cerceve: string }> = {
  bekliyor: { zemin: colors.sari, yazi: colors.koyuMetin, cerceve: colors.sari },
  kabul: { zemin: colors.kirmizi, yazi: colors.metin, cerceve: colors.kirmizi },
  tamamlandi: { zemin: colors.metin, yazi: colors.koyuMetin, cerceve: colors.metin },
  red: { zemin: 'transparent', yazi: colors.kirmiziAcik, cerceve: colors.kirmiziAcik },
  iptal: { zemin: 'transparent', yazi: colors.metinSoluk, cerceve: colors.cizgi },
};

// Talep durumunu renkli bir etiket olarak gösterir.
export default function DurumRozeti({ durum }: { durum: Durum }) {
  const r = RENK[durum];
  return (
    <View style={[styles.rozet, { backgroundColor: r.zemin, borderColor: r.cerceve }]}>
      <Text style={[styles.yazi, { color: r.yazi }]}>{DURUM_ADI[durum]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rozet: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.tam, borderWidth: 1 },
  yazi: { fontSize: 13, fontWeight: '700' },
});
