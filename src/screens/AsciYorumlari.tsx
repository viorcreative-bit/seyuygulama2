import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { Yildizlar } from '../components/Yildizlar';
import YorumKarti from '../components/YorumKarti';
import { supabase } from '../lib/supabase';
import { Yorum, asciYorumlari, cevapYaz } from '../lib/yorumlar';
import { colors, fontSize, radius, spacing } from '../theme';

// Aşçının aldığı yorumları gördüğü ve (bir kez) cevap yazdığı ekran.
export default function AsciYorumlari({ geri }: { geri: () => void }) {
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
    <View style={styles.kap}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <Text style={styles.baslik}>Yorumlarım</Text>
      {ozet.puan != null ? (
        <View style={styles.ozet}>
          <Yildizlar puan={ozet.puan} boyut={22} />
          <Text style={styles.ozetYazi}>
            {ozet.puan.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} · {ozet.sayi} yorum
          </Text>
        </View>
      ) : null}
      {hata ? <Text style={styles.bos}>{hata}</Text> : null}
      {!liste && !hata ? <ActivityIndicator size="large" color={colors.kirmizi} style={{ marginTop: 40 }} /> : null}
      {liste && liste.length === 0 ? <Text style={styles.bos}>Henüz yorum almadın.</Text> : null}
      <FlatList
        data={liste ?? []}
        keyExtractor={(y) => y.id}
        contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
        renderItem={({ item }) => (
          <YorumKarti
            yorum={item}
            altinda={
              item.asci_cevabi ? null : (
                <View style={{ gap: spacing.s, marginTop: spacing.s }}>
                  <TextInput
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
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, marginTop: spacing.m, marginHorizontal: spacing.l },
  ozet: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginHorizontal: spacing.l, marginTop: spacing.s },
  ozetYazi: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin },
  bos: { textAlign: 'center', marginTop: 40, color: colors.metin, fontSize: fontSize.normal, paddingHorizontal: spacing.l },
  girdi: {
    backgroundColor: colors.krem,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.s + 4,
    fontSize: fontSize.normal,
    color: colors.metin,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
