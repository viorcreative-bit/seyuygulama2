import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import DurumRozeti from '../components/DurumRozeti';
import Ekran from '../components/Ekran';
import { Durum, GelenTalep, durumDegistir, gelenTalepler, tarihSaatYaz } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

const SIRA: Record<Durum, number> = { bekliyor: 0, kabul: 1, tamamlandi: 2, red: 3, iptal: 4 };

function Satir({ etiket, deger, vurgu }: { etiket: string; deger: string; vurgu?: boolean }) {
  if (!deger) return null;
  return (
    <Text style={styles.satir}>
      <Text style={styles.satirEtiket}>{etiket}: </Text>
      <Text style={vurgu ? styles.vurgu : undefined}>{deger}</Text>
    </Text>
  );
}

type Props = { sikayetEt: (t: GelenTalep) => void };

export default function GelenTalepler({ sikayetEt }: Props) {
  const [liste, setListe] = useState<GelenTalep[] | null>(null);
  const [hata, setHata] = useState('');
  const [islemde, setIslemde] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const l = await gelenTalepler();
      l.sort((a, b) => SIRA[a.durum] - SIRA[b.durum] || a.tarih.localeCompare(b.tarih));
      setListe(l);
      setHata('');
    } catch {
      setHata('Talepler yüklenemedi. İnternetini kontrol edip tekrar dene.');
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const degistir = async (t: GelenTalep, durum: 'kabul' | 'red' | 'tamamlandi') => {
    setIslemde(t.id);
    try {
      await durumDegistir(t.id, durum);
      await yukle();
    } catch {
      Alert.alert('İşlem yapılamadı', 'Talep iptal edilmiş veya değişmiş olabilir. Liste yenileniyor.');
      await yukle();
    } finally {
      setIslemde(null);
    }
  };

  const onayla = (t: GelenTalep, durum: 'kabul' | 'red') =>
    Alert.alert(
      durum === 'kabul' ? 'Talebi kabul et' : 'Talebi reddet',
      durum === 'kabul'
        ? `${t.musteri_ad} adlı müşterinin talebini kabul etmek istiyor musun? Kabul edince açık adresini göreceksin.`
        : `${t.musteri_ad} adlı müşterinin talebini reddetmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: durum === 'kabul' ? 'Kabul Et' : 'Reddet', style: durum === 'red' ? 'destructive' : 'default', onPress: () => degistir(t, durum) },
      ],
    );

  return (
    <Ekran baslik="Gelen Talepler">
      <FlatList
        data={liste ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.l, paddingTop: 0, gap: spacing.m }}
        ListEmptyComponent={
          hata ? (
            <Bos mesaj={hata} simge="cloud-offline-outline" />
          ) : !liste ? (
            <Bos yukleniyor />
          ) : (
            <Bos mesaj="Henüz sana gelen bir talep yok." simge="receipt-outline" />
          )
        }
        renderItem={({ item: t }) => {
          const tarihGecti = new Date(t.tarih).getTime() <= Date.now();
          return (
            <View style={styles.kart}>
              <View style={styles.kartUst}>
                <Text style={styles.ad} numberOfLines={1}>{t.musteri_ad}</Text>
                <DurumRozeti durum={t.durum} />
              </View>
              <View style={styles.tarihSatir}>
                <Ionicons name="calendar" size={18} color={colors.sari} />
                <Text style={styles.tarih}>{tarihSaatYaz(t.tarih)} · {t.kisi_sayisi} kişilik</Text>
              </View>
              <Satir etiket="Semt" deger={t.semt} />
              {t.adres ? <Satir etiket="Açık adres" deger={t.adres} vurgu /> : null}
              <Satir etiket="Mutfak" deger={t.mutfak_tercihleri.join(', ')} />
              <Satir etiket="İstenen yemekler" deger={t.istenen_yemekler} />
              <Satir etiket="Alerjiler" deger={t.alerjiler} vurgu />
              <Satir etiket="Notlar" deger={t.notlar} />

              {t.durum === 'kabul' || t.durum === 'tamamlandi' ? (
                <Pressable onPress={() => sikayetEt(t)} accessibilityRole="button">
                  <Text style={styles.sikayet}>Şikayet et</Text>
                </Pressable>
              ) : null}
              {t.durum === 'bekliyor' ? (
                <View style={styles.butonlar}>
                  <View style={{ flex: 1 }}>
                    <Dugme yazi="Kabul Et" onPress={() => onayla(t, 'kabul')} yukleniyor={islemde === t.id} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Dugme yazi="Reddet" tehlike onPress={() => onayla(t, 'red')} pasif={islemde === t.id} />
                  </View>
                </View>
              ) : null}
              {t.durum === 'kabul' ? (
                tarihGecti ? (
                  <View style={{ marginTop: spacing.s }}>
                    <Dugme yazi="Hizmet Tamamlandı" onPress={() => degistir(t, 'tamamlandi')} yukleniyor={islemde === t.id} />
                  </View>
                ) : (
                  <Text style={styles.ipucu}>Hizmet tarihinden sonra "Tamamlandı" olarak işaretleyebilirsin.</Text>
                )
              ) : null}
            </View>
          );
        }}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: 4 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin, flex: 1 },
  tarihSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginVertical: 4 },
  tarih: { fontSize: fontSize.normal, fontWeight: '700', color: colors.sari },
  satir: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 21 },
  satirEtiket: { fontWeight: '700', color: colors.metinSoluk },
  vurgu: { fontWeight: '700', color: colors.sari },
  butonlar: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
  sikayet: { marginTop: spacing.s, color: colors.metinSoluk, fontWeight: '600', fontSize: fontSize.kucuk + 1 },
  ipucu: { marginTop: spacing.s, fontSize: 13, color: colors.metinSoluk },
});
