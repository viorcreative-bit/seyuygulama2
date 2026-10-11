import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import { Yildizlar } from '../components/Yildizlar';
import YorumKarti from '../components/YorumKarti';
import { supabase } from '../lib/supabase';
import { Yorum, asciYorumlari, cevapYaz } from '../lib/yorumlar';
import { colors, fontSize, radius, spacing } from '../theme';

// Aşçının aldığı yorumları gördüğü ve (bir kez) cevap yazdığı ekran.
export default function AsciYorumlari() {
  const { oturum } = useAuth();
  const uid = oturum!.user.id;
  const [liste, setListe] = useState<Yorum[] | null>(null);
  const [ozet, setOzet] = useState<{ puan: number | null; sayi: number }>({ puan: null, sayi: 0 });
  const [hata, setHata] = useState('');
  const [yazilan, setYazilan] = useState<Record<string, string>>({});
  const [gonderilen, setGonderilen] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const [l, v] = await Promise.all([
        asciYorumlari(uid),
        supabase.from('asci_vitrini').select('ortalama_puan, yorum_sayisi').eq('id', uid).maybeSingle(),
      ]);
      setListe(l);
      setOzet({ puan: v.data?.ortalama_puan != null ? Number(v.data.ortalama_puan) : null, sayi: v.data?.yorum_sayisi ?? 0 });
      setHata('');
    } catch {
      setHata('Yorumlar yüklenemedi. İnternetini kontrol edip tekrar dene.');
    }
  }, [uid]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const gonder = (y: Yorum) => {
    const metin = (yazilan[y.id] ?? '').trim();
    if (!metin) return;
    Alert.alert('Cevabı gönder', 'Her yoruma yalnızca bir kez cevap yazabilirsin ve sonradan değiştiremezsin. Göndermek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          setGonderilen(y.id);
          try {
            await cevapYaz(y.id, metin);
            await yukle();
          } catch {
            Alert.alert('Cevap gönderilemedi', 'Bu yoruma daha önce cevap yazılmış olabilir. Lütfen tekrar dene.');
            await yukle();
          } finally {
            setGonderilen(null);
          }
        },
      },
    ]);
  };

  return (
    <Ekran baslik="Yorumlarım">
      <FlatList
        data={liste ?? []}
        keyExtractor={(y) => y.id}
        contentContainerStyle={{ padding: spacing.l, paddingTop: 0, gap: spacing.m }}
        ListHeaderComponent={
          ozet.puan != null ? (
            <View style={styles.ozet}>
              <Text style={styles.puan}>{ozet.puan.toLocaleString('tr-TR', { minimumFractionDigits: 1 })}</Text>
              <View style={{ gap: 2 }}>
                <Yildizlar puan={ozet.puan} boyut={22} />
                <Text style={styles.ozetYazi}>{ozet.sayi} yorum</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          hata ? (
            <Bos mesaj={hata} simge="cloud-offline-outline" />
          ) : !liste ? (
            <Bos yukleniyor />
          ) : (
            <Bos mesaj="Henüz yorum almadın." simge="star-outline" />
          )
        }
        renderItem={({ item }) => (
          <YorumKarti
            yorum={item}
            altinda={
              item.asci_cevabi ? null : (
                <View style={{ gap: spacing.s, marginTop: spacing.s }}>
                  <Girdi
                    style={styles.girdi}
                    value={yazilan[item.id] ?? ''}
                    onChangeText={(t) => setYazilan((o) => ({ ...o, [item.id]: t }))}
                    placeholder="Bu yoruma cevap yaz"
                    multiline
                    maxLength={1000}
                  />
                  <Dugme
                    yazi="Cevapla"
                    onPress={() => gonder(item)}
                    yukleniyor={gonderilen === item.id}
                    pasif={!(yazilan[item.id] ?? '').trim()}
                  />
                </View>
              )
            }
          />
        )}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  ozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.yuzey,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  puan: { fontSize: 44, fontWeight: '800', color: colors.sari },
  ozetYazi: { fontSize: fontSize.kucuk, color: colors.metinSoluk },
  girdi: { minHeight: 70, fontSize: fontSize.normal, borderRadius: radius.s },
});
