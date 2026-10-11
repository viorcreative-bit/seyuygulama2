import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function AsciKarti({ asci, onPress }: { asci: Asci; onPress?: () => void }) {
  return (
    <Pressable style={styles.kart} onPress={onPress} disabled={!onPress} accessibilityRole="button">
      {asci.foto ? (
        <Image source={{ uri: asci.foto }} style={styles.foto} />
      ) : (
        <View style={[styles.foto, styles.fotoBos]}>
          <Text style={styles.fotoYazi}>{basHarfler(asci.ad)}</Text>
        </View>
      )}
      <Text style={styles.ad} numberOfLines={1}>{asci.ad}</Text>
      <Text style={styles.uzmanlik} numberOfLines={1}>{asci.uzmanlik}</Text>
      {asci.puan != null && asci.yorumSayisi > 0 ? (
        <Text style={styles.puan}>
          ★ {asci.puan.toLocaleString('tr-TR', { minimumFractionDigits: 1 })}
          <Text style={styles.yorum}>  ({asci.yorumSayisi} yorum)</Text>
        </Text>
      ) : (
        <Text style={styles.yorum}>Yeni aşçı</Text>
      )}
    </Pressable>
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
    marginBottom: spacing.s,
  },
  fotoBos: { backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  fotoYazi: { color: colors.sari, fontSize: fontSize.buyuk, fontWeight: '700' },
  ad: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin },
  uzmanlik: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.7, marginTop: 2 },
  puan: { marginTop: spacing.s, fontSize: fontSize.normal, fontWeight: '700', color: colors.altin },
  yorum: { fontSize: 12, fontWeight: '400', color: colors.metin, opacity: 0.7 },
});
