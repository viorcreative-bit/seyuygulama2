import { useCallback, useEffect, useState } from 'react';
import Dugme from '../components/Dugme';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Yildizlar } from '../components/Yildizlar';
import { supabase } from '../lib/supabase';
import { yorumYazilanTalepler } from '../lib/yorumlar';
import { DURUM_ADI, Durum, Talep, talebiIptalEt, taleplerim, tarihSaatYaz } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

const rozet: Record<Durum, { zemin: string; yazi: string }> = {
  bekliyor: { zemin: colors.sari, yazi: colors.metin },
  kabul: { zemin: colors.kirmizi, yazi: colors.sari },
  red: { zemin: colors.beyaz, yazi: colors.kirmizi },
  tamamlandi: { zemin: colors.metin, yazi: colors.krem },
  iptal: { zemin: colors.beyaz, yazi: colors.metin },
};

type Props = {
  geri: () => void;
  yorumYap: (t: Talep, asciAdi: string) => void;
  sikayetEt: (t: Talep, asciAdi: string) => void;
};

export default function Taleplerim({ geri, yorumYap, sikayetEt }: Props) {
  const [liste, setListe] = useState<Talep[] | null>(null);
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [hata, setHata] = useState('');
  const [yorumlar, setYorumlar] = useState<Record<string, number>>({});

  const yukle = useCallback(async () => {
    try {
      const l = await taleplerim();
      const idler = [...new Set(l.map((t) => t.asci_id))];
      if (idler.length) {
        const { data } = await supabase.from('asci_vitrini').select('id, ad').in('id', idler);
        setAdlar(Object.fromEntries((data ?? []).map((a: { id: string; ad: string }) => [a.id, a.ad])));
      }
      setYorumlar(await yorumYazilanTalepler(l.filter((t) => t.durum === 'tamamlandi').map((t) => t.id)));
      setListe(l);
      setHata('');
    } catch {
      setHata('Talepler yüklenemedi. İnternetini kontrol edip tekrar dene.');
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const iptal = (t: Talep) =>
    Alert.alert('Talebi iptal et', 'Bu talebi iptal etmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await talebiIptalEt(t.id);
            yukle();
          } catch {
            Alert.alert('İptal edilemedi', 'Lütfen tekrar dene.');
          }
        },
      },
    ]);

  return (
    <View style={styles.kap}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <Text style={styles.baslik}>Taleplerim</Text>
      {hata ? <Text style={styles.bos}>{hata}</Text> : null}
      {!liste && !hata ? <ActivityIndicator size="large" color={colors.kirmizi} style={{ marginTop: 40 }} /> : null}
      {liste && liste.length === 0 ? <Text style={styles.bos}>Henüz bir talebin yok.</Text> : null}
      <FlatList
        data={liste ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
        renderItem={({ item }) => (
          <View style={styles.kart}>
            <View style={styles.kartUst}>
              <Text style={styles.ad}>{adlar[item.asci_id] ?? 'Aşçı'}</Text>
              <View style={[styles.rozet, { backgroundColor: rozet[item.durum].zemin }]}>
                <Text style={[styles.rozetYazi, { color: rozet[item.durum].yazi }]}>{DURUM_ADI[item.durum]}</Text>
              </View>
            </View>
            <Text style={styles.bilgi}>{tarihSaatYaz(item.tarih)} · {item.kisi_sayisi} kişi</Text>
            <Text style={styles.bilgi}>{item.semt}</Text>
            {item.durum === 'tamamlandi' ? (
              yorumlar[item.id] ? (
                <View style={styles.yorumSatir}>
                  <Text style={styles.bilgi}>Yorumun:</Text>
                  <Yildizlar puan={yorumlar[item.id]} boyut={16} />
                </View>
              ) : (
                <View style={{ marginTop: spacing.s }}>
                  <Dugme yazi="Yorum Yap" onPress={() => yorumYap(item, adlar[item.asci_id] ?? 'Aşçı')} />
                </View>
              )
            ) : null}
            {item.durum === 'kabul' || item.durum === 'tamamlandi' ? (
              <Pressable onPress={() => sikayetEt(item, adlar[item.asci_id] ?? 'Aşçı')} accessibilityRole="button">
                <Text style={styles.sikayet}>Şikayet et</Text>
              </Pressable>
            ) : null}
            {item.durum === 'bekliyor' || item.durum === 'kabul' ? (
              <Pressable onPress={() => iptal(item)} accessibilityRole="button">
                <Text style={styles.iptal}>Talebi iptal et</Text>
              </Pressable>
            ) : null}
          </View>
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
  kart: { backgroundColor: colors.beyaz, borderRadius: radius.m, padding: spacing.m, gap: 4 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '700', color: colors.metin, flex: 1 },
  rozet: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.tam, borderWidth: 1, borderColor: colors.cizgi },
  rozetYazi: { fontSize: 13, fontWeight: '700' },
  bilgi: { fontSize: fontSize.kucuk + 1, color: colors.metin, opacity: 0.8 },
  yorumSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: 4 },
  sikayet: { marginTop: spacing.s, color: colors.metin, opacity: 0.6, fontWeight: '600', fontSize: fontSize.kucuk + 1 },
  iptal: { marginTop: spacing.s, color: colors.kirmizi, fontWeight: '700', fontSize: fontSize.kucuk + 1 },
});
