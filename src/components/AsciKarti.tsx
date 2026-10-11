import { StyleSheet, Text, View } from 'react-native';
import { Asci } from '../data/ornekAscilar';
import { colors, fontSize, radius, spacing } from '../theme';

function basHarfler(ad: string) {
  return ad
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR');
}

export default function AsciKarti({ asci }: { asci: Asci }) {
  return (
    <View style={styles.kart}>
      {/* Gerçek fotoğraflar 4. aşamada eklenecek; şimdilik baş harfler */}
      <View style={styles.foto}>
        <Text style={styles.fotoYazi}>{basHarfler(asci.ad)}</Text>
      </View>
      <Text style={styles.ad} numberOfLines={1}>{asci.ad}</Text>
      <Text style={styles.uzmanlik} numberOfLines={1}>{asci.uzmanlik}</Text>
      <Text style={styles.puan}>
        ★ {asci.puan.toLocaleString('tr-TR', { minimumFractionDigits: 1 })}
        <Text style={styles.yorum}>  ({asci.yorumSayisi} yorum)</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    width: 170,
    backgroundColor: colors.beyaz,
    borderRadius: radius.m,
    padding: spacing.m,
    alignItems: 'center',
    shadowColor: colors.metin,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  foto: {
    width: 84,
    height: 84,
    borderRadius: radius.tam,
    backgroundColor: colors.kirmizi,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  fotoYazi: { color: colors.sari, fontSize: fontSize.buyuk, fontWeight: '700' },
  ad: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin },
  uzmanlik: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.7, marginTop: 2 },
  puan: { marginTop: spacing.s, fontSize: fontSize.normal, fontWeight: '700', color: '#B8860B' },
  yorum: { fontSize: 12, fontWeight: '400', color: colors.metin, opacity: 0.7 },
});
