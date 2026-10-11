import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Dugme from '../components/Dugme';
import { DURUM_ADI, Durum, GelenTalep, durumDegistir, gelenTalepler, tarihSaatYaz } from '../lib/talepler';
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

type Props = { geri: () => void; sikayetEt: (t: GelenTalep) => void };

export default function GelenTalepler({ geri, sikayetEt }: Props) {
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
    <View style={styles.kap}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <Text style={styles.baslik}>Gelen Talepler</Text>
      {hata ? <Text style={styles.bos}>{hata}</Text> : null}
      {!liste && !hata ? <ActivityIndicator size="large" color={colors.kirmizi} style={{ marginTop: 40 }} /> : null}
      {liste && liste.length === 0 ? <Text style={styles.bos}>Henüz sana gelen bir talep yok.</Text> : null}
      <FlatList
        data={liste ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
        renderItem={({ item: t }) => {
          const tarihGecti = new Date(t.tarih).getTime() <= Date.now();
          return (
            <View style={styles.kart}>
              <View style={styles.kartUst}>
                <Text style={styles.ad}>{t.musteri_ad}</Text>
                <View style={[styles.rozet, t.durum === 'bekliyor' && { backgroundColor: colors.sari }, t.durum === 'kabul' && { backgroundColor: colors.kirmizi }]}>
                  <Text style={[styles.rozetYazi, t.durum === 'kabul' && { color: colors.sari }]}>{DURUM_ADI[t.durum]}</Text>
                </View>
              </View>
              <Text style={styles.tarih}>{tarihSaatYaz(t.tarih)} · {t.kisi_sayisi} kişilik</Text>
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
                    <Dugme yazi="Reddet" ikincil onPress={() => onayla(t, 'red')} pasif={islemde === t.id} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, marginTop: spacing.m, marginHorizontal: spacing.l },
  bos: { textAlign: 'center', marginTop: 40, color: colors.metin, fontSize: fontSize.normal, paddingHorizontal: spacing.l },
  kart: { backgroundColor: colors.beyaz, borderRadius: radius.m, padding: spacing.m, gap: 4 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '700', color: colors.metin, flex: 1 },
  rozet: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.tam, borderWidth: 1, borderColor: colors.cizgi, backgroundColor: colors.beyaz },
  rozetYazi: { fontSize: 13, fontWeight: '700', color: colors.metin },
  tarih: { fontSize: fontSize.normal, fontWeight: '600', color: colors.kirmizi, marginBottom: 4 },
  satir: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 21 },
  satirEtiket: { fontWeight: '700' },
  vurgu: { fontWeight: '700', color: colors.kirmizi },
  butonlar: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
  sikayet: { marginTop: spacing.s, color: colors.metin, opacity: 0.6, fontWeight: '600', fontSize: fontSize.kucuk + 1 },
  ipucu: { marginTop: spacing.s, fontSize: 13, color: colors.metin, opacity: 0.6 },
});
