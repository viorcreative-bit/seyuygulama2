import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Asci, vitrindenKarta, yeniAscilar } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';

// "Hemen Aşçı Talep Et" butonundan sonra, talep için aşçı seçilen ekran.
export default function AsciSec({ sec, geri }: { sec: (id: string) => void; geri: () => void }) {
  const [liste, setListe] = useState<Asci[] | null>(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    yeniAscilar()
      .then((l) => setListe(l.map(vitrindenKarta)))
      .catch(() => setHata('Aşçılar yüklenemedi. İnternetini kontrol edip tekrar dene.'));
  }, []);

  return (
    <View style={styles.kap}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <Text style={styles.baslik}>Hangi aşçıdan talep edelim?</Text>
      {hata ? <Text style={styles.bos}>{hata}</Text> : null}
      {!liste && !hata ? <ActivityIndicator size="large" color={colors.kirmizi} style={{ marginTop: 40 }} /> : null}
      {liste && liste.length === 0 ? <Text style={styles.bos}>Henüz kayıtlı aşçı yok.</Text> : null}
      <FlatList
        data={liste ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
        renderItem={({ item }) => (
          <Pressable onPress={() => sec(item.id)} style={styles.satir} accessibilityRole="button">
            {item.foto ? (
              <Image source={{ uri: item.foto }} style={styles.foto} />
            ) : (
              <View style={[styles.foto, styles.fotoBos]}>
                <Text style={styles.fotoYazi}>{item.ad[0]?.toLocaleUpperCase('tr-TR')}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.ad}>{item.ad}</Text>
              <Text style={styles.uzmanlik}>{item.uzmanlik}</Text>
            </View>
            <Text style={styles.ok}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, marginTop: spacing.m, marginHorizontal: spacing.l },
  bos: { textAlign: 'center', marginTop: 40, color: colors.metin, fontSize: fontSize.normal, paddingHorizontal: spacing.l },
  satir: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, backgroundColor: colors.beyaz, borderRadius: radius.m, padding: spacing.m },
  foto: { width: 56, height: 56, borderRadius: radius.tam },
  fotoBos: { backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  fotoYazi: { color: colors.sari, fontSize: fontSize.baslik, fontWeight: '700' },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '700', color: colors.metin },
  uzmanlik: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.7 },
  ok: { fontSize: 28, color: colors.kirmizi },
});
