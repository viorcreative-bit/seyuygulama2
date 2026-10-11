import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Asci, tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';

function basHarfler(ad: string) {
  return ad
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR');
}

type Props = { asci: Asci; onPress?: () => void; genislik: number };

// Fotoğraf ağırlıklı aşçı kartı: üstte büyük fotoğraf, altta sarı bilgi şeridi.
export default function AsciKarti({ asci, onPress, genislik }: Props) {
  const puanVar = asci.puan != null && asci.yorumSayisi > 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.kart, { width: genislik }, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <View style={{ height: genislik * 0.85 }}>
        {asci.foto ? (
          <Image source={{ uri: asci.foto }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoBos]}>
            <Text style={styles.fotoYazi}>{basHarfler(asci.ad)}</Text>
          </View>
        )}
        <View style={styles.puanRozeti}>
          <Ionicons name="star" size={13} color={colors.sari} />
          <Text style={styles.puanYazi}>
            {puanVar ? (asci.puan as number).toLocaleString('tr-TR', { minimumFractionDigits: 1 }) : 'Yeni'}
          </Text>
        </View>
      </View>
      <View style={styles.serit}>
        <Text style={styles.ad} numberOfLines={1}>{asci.ad}</Text>
        <Text style={styles.altYazi} numberOfLines={1}>{asci.uzmanlik}</Text>
        <View style={styles.altSatir}>
          <Text style={styles.altYazi}>{puanVar ? `${asci.yorumSayisi} yorum` : 'Henüz yorum yok'}</Text>
          {asci.fiyat != null ? <Text style={styles.fiyat}>{tl(asci.fiyat)}'den</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: { borderRadius: radius.m, overflow: 'hidden', backgroundColor: colors.sari },
  foto: { width: '100%', height: '100%' },
  fotoBos: { backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  fotoYazi: { color: colors.sari, fontSize: 44, fontWeight: '800' },
  puanRozeti: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.zemin,
    borderRadius: radius.tam,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  puanYazi: { color: colors.metin, fontSize: 12, fontWeight: '800' },
  serit: { padding: spacing.s + 4, gap: 1 },
  ad: { fontSize: fontSize.normal, fontWeight: '800', color: colors.koyuMetin },
  altYazi: { fontSize: 12, color: colors.koyuMetin, opacity: 0.75 },
  altSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  fiyat: { fontSize: 12, fontWeight: '800', color: colors.koyuMetin },
});
