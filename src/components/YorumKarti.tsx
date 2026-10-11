import { StyleSheet, Text, View } from 'react-native';
import { tarihYaz } from '../lib/talepler';
import { Yorum } from '../lib/yorumlar';
import { colors, fontSize, radius, spacing } from '../theme';
import { Yildizlar } from './Yildizlar';

export default function YorumKarti({ yorum, altinda }: { yorum: Yorum; altinda?: React.ReactNode }) {
  return (
    <View style={styles.kart}>
      <View style={styles.ust}>
        <Text style={styles.ad}>{yorum.musteri_ad}</Text>
        <Text style={styles.tarih}>{tarihYaz(yorum.olusturma_tarihi)}</Text>
      </View>
      <Yildizlar puan={yorum.yildiz} />
      {yorum.yorum ? <Text style={styles.metin}>{yorum.yorum}</Text> : null}
      {yorum.asci_cevabi ? (
        <View style={styles.cevap}>
          <Text style={styles.cevapBaslik}>Aşçının cevabı</Text>
          <Text style={styles.metin}>{yorum.asci_cevabi}</Text>
        </View>
      ) : null}
      {altinda}
    </View>
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: colors.beyaz, borderRadius: radius.m, padding: spacing.m, gap: 6 },
  ust: { flexDirection: 'row', justifyContent: 'space-between' },
  ad: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin },
  tarih: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.6 },
  metin: { fontSize: fontSize.normal, color: colors.metin, lineHeight: 23 },
  cevap: { backgroundColor: colors.krem, borderRadius: radius.s, padding: spacing.s + 4, gap: 2, marginTop: 4 },
  cevapBaslik: { fontSize: fontSize.kucuk, fontWeight: '700', color: colors.kirmizi },
});
