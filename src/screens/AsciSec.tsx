import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import Ekran from '../components/Ekran';
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
    <Ekran baslik="Aşçı seç" geri={geri}>
      <FlatList
        data={liste ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.l, paddingTop: 0, gap: spacing.m }}
        ListHeaderComponent={<Text style={styles.soru}>Hangi aşçıdan talep edelim?</Text>}
        ListEmptyComponent={
          hata ? (
            <Bos mesaj={hata} simge="cloud-offline-outline" />
          ) : !liste ? (
            <Bos yukleniyor />
          ) : (
            <Bos mesaj="Henüz kayıtlı aşçı yok." />
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => sec(item.id)} style={({ pressed }) => [styles.satir, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            {item.foto ? (
              <Image source={{ uri: item.foto }} style={styles.foto} />
            ) : (
              <View style={[styles.foto, styles.fotoBos]}>
                <Text style={styles.fotoYazi}>{item.ad[0]?.toLocaleUpperCase('tr-TR')}</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.ad}>{item.ad}</Text>
              <Text style={styles.uzmanlik}>{item.uzmanlik}</Text>
              {item.puan != null && item.yorumSayisi > 0 ? (
                <View style={styles.puan}>
                  <Ionicons name="star" size={13} color={colors.sari} />
                  <Text style={styles.puanYazi}>
                    {item.puan.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} ({item.yorumSayisi})
                  </Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.metinSoluk} />
          </Pressable>
        )}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  soru: { fontSize: fontSize.normal, color: colors.metinSoluk, marginBottom: spacing.s },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.yuzey,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.m,
  },
  foto: { width: 60, height: 60, borderRadius: radius.tam },
  fotoBos: { backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  fotoYazi: { color: colors.sari, fontSize: fontSize.baslik, fontWeight: '800' },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin },
  uzmanlik: { fontSize: fontSize.kucuk, color: colors.metinSoluk },
  puan: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  puanYazi: { fontSize: 13, fontWeight: '700', color: colors.metin },
});
