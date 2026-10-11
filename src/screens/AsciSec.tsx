import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AsciKarti from '../components/AsciKarti';
import Bos from '../components/Bos';
import Ekran from '../components/Ekran';
import { UZMANLIKLAR } from '../data/secenekler';
import { Vitrin, enSevilenAscilar, vitrindenKarta, yeniAscilar } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';

type SimgeAdi = React.ComponentProps<typeof Ionicons>['name'];
const KATEGORI_SIMGE: Record<string, SimgeAdi> = {
  'Türk mutfağı': 'restaurant',
  Ege: 'leaf',
  Antep: 'flame',
  Karadeniz: 'boat',
  Vegan: 'nutrition',
  Diyet: 'heart',
  'Çocuk yemekleri': 'happy',
  'Deniz ürünleri': 'fish',
  'Tatlı ve pasta': 'ice-cream',
};

// "Hemen Aşçı Talep Et" butonundan sonra, talep için aşçı seçilen ekran.
// Önce öne çıkan aşçılar ve yemek kategorileri görünür; kategoriye dokununca o kategorinin aşçıları listelenir.
export default function AsciSec({ sec, geri }: { sec: (id: string) => void; geri: () => void }) {
  const [tumu, setTumu] = useState<Vitrin[] | null>(null);
  const [oneCikanlar, setOneCikanlar] = useState<Vitrin[]>([]);
  const [hata, setHata] = useState('');
  // null: ana görünüm, '' : tüm aşçılar, aksi hâlde seçilen kategori
  const [kategori, setKategori] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const karoGenislik = (width - spacing.l * 2 - spacing.m) / 2;

  useEffect(() => {
    Promise.all([yeniAscilar(), enSevilenAscilar()])
      .then(([hepsi, sevilen]) => {
        setTumu(hepsi);
        // Henüz yeterli yorumu olan yoksa en iyi puanlı ilk aşçılar öne çıkar.
        const yedek = [...hepsi]
          .sort((a, b) => (Number(b.ortalama_puan) || 0) - (Number(a.ortalama_puan) || 0) || b.yorum_sayisi - a.yorum_sayisi)
          .slice(0, 6);
        setOneCikanlar(sevilen.length > 0 ? sevilen : yedek);
      })
      .catch(() => setHata('Aşçılar yüklenemedi. İnternetini kontrol edip tekrar dene.'));
  }, []);

  const sayi = (k: string) => (tumu ?? []).filter((v) => v.uzmanliklar.includes(k)).length;

  // ---- Kategori (liste) görünümü
  if (kategori !== null) {
    const liste = (tumu ?? []).filter((v) => kategori === '' || v.uzmanliklar.includes(kategori)).map(vitrindenKarta);
    return (
      <Ekran baslik={kategori || 'Tüm aşçılar'} geri={() => setKategori(null)}>
        <FlatList
          data={liste}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.l, paddingTop: 0, gap: spacing.m }}
          ListHeaderComponent={<Text style={styles.soru}>Hangi aşçıdan talep edelim?</Text>}
          ListEmptyComponent={<Bos mesaj="Bu kategoride henüz aşçı yok." />}
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

  // ---- Ana görünüm: öne çıkanlar + kategoriler
  return (
    <Ekran baslik="Aşçı seç" geri={geri}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        {hata ? (
          <Bos mesaj={hata} simge="cloud-offline-outline" />
        ) : !tumu ? (
          <Bos yukleniyor />
        ) : tumu.length === 0 ? (
          <Bos mesaj="Henüz kayıtlı aşçı yok." />
        ) : (
          <>
            <Text style={styles.bolum}>Öne çıkan aşçılar</Text>
            <FlatList
              horizontal
              data={oneCikanlar}
              keyExtractor={(a) => a.id}
              renderItem={({ item }) => <AsciKarti asci={vitrindenKarta(item)} genislik={170} onPress={() => sec(item.id)} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.l }}
              ItemSeparatorComponent={() => <View style={{ width: spacing.m }} />}
            />

            <Text style={styles.bolum}>Yemek kategorileri</Text>
            <View style={styles.karolar}>
              {UZMANLIKLAR.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKategori(k)}
                  style={({ pressed }) => [styles.karo, { width: karoGenislik }, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${k}, ${sayi(k)} aşçı`}
                >
                  <View style={styles.karoSimge}>
                    <Ionicons name={KATEGORI_SIMGE[k] ?? 'restaurant'} size={22} color={colors.koyuMetin} />
                  </View>
                  <Text style={styles.karoAd} numberOfLines={1}>{k}</Text>
                  <Text style={styles.karoSayi}>{sayi(k)} aşçı</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setKategori('')}
                style={({ pressed }) => [styles.karo, styles.karoTumu, { width: karoGenislik }, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <View style={[styles.karoSimge, { backgroundColor: colors.kirmizi }]}>
                  <Ionicons name="people" size={22} color={colors.sari} />
                </View>
                <Text style={styles.karoAd}>Tüm aşçılar</Text>
                <Text style={styles.karoSayi}>{tumu.length} aşçı</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin, marginTop: spacing.m, marginBottom: spacing.m, marginHorizontal: spacing.l },
  karolar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, paddingHorizontal: spacing.l },
  karo: {
    backgroundColor: colors.yuzey,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.m,
    gap: 4,
  },
  karoTumu: { borderColor: colors.sari },
  karoSimge: {
    width: 44,
    height: 44,
    borderRadius: radius.tam,
    backgroundColor: colors.sari,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  karoAd: { fontSize: fontSize.normal, fontWeight: '800', color: colors.metin },
  karoSayi: { fontSize: 12, color: colors.metinSoluk },
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
