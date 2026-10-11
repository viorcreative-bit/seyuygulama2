import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import DurumRozeti from '../components/DurumRozeti';
import { Yildizlar } from '../components/Yildizlar';
import { supabase } from '../lib/supabase';
import { Talep, talebiIptalEt, taleplerim, tarihSaatYaz } from '../lib/talepler';
import { yorumYazilanTalepler } from '../lib/yorumlar';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  yorumYap: (t: Talep, asciAdi: string) => void;
  sikayetEt: (t: Talep, asciAdi: string) => void;
};

function Bilgi({ simge, yazi }: { simge: keyof typeof Ionicons.glyphMap; yazi: string }) {
  return (
    <View style={styles.bilgi}>
      <Ionicons name={simge} size={16} color={colors.metinSoluk} />
      <Text style={styles.bilgiYazi}>{yazi}</Text>
    </View>
  );
}

export default function Taleplerim({ yorumYap, sikayetEt }: Props) {
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
    <>
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
            <Bos mesaj="Henüz bir talebin yok. Ana sayfadan bir aşçı talep edebilirsin." simge="receipt-outline" />
          )
        }
        renderItem={({ item }) => {
          const asciAdi = adlar[item.asci_id] ?? 'Aşçı';
          return (
            <View style={styles.kart}>
              <View style={styles.kartUst}>
                <Text style={styles.ad} numberOfLines={1}>{asciAdi}</Text>
                <DurumRozeti durum={item.durum} />
              </View>
              <Bilgi simge="calendar-outline" yazi={tarihSaatYaz(item.tarih)} />
              <Bilgi simge="people-outline" yazi={`${item.kisi_sayisi} kişilik`} />
              <Bilgi simge="location-outline" yazi={item.semt} />

              {item.durum === 'tamamlandi' ? (
                yorumlar[item.id] ? (
                  <View style={styles.yorumSatir}>
                    <Text style={styles.bilgiYazi}>Yorumun:</Text>
                    <Yildizlar puan={yorumlar[item.id]} boyut={16} />
                  </View>
                ) : (
                  <View style={{ marginTop: spacing.s }}>
                    <Dugme yazi="Yorum Yap" onPress={() => yorumYap(item, asciAdi)} />
                  </View>
                )
              ) : null}

              <View style={styles.baglantilar}>
                {item.durum === 'kabul' || item.durum === 'tamamlandi' ? (
                  <Pressable onPress={() => sikayetEt(item, asciAdi)} accessibilityRole="button">
                    <Text style={styles.sikayet}>Şikayet et</Text>
                  </Pressable>
                ) : null}
                {item.durum === 'bekliyor' || item.durum === 'kabul' ? (
                  <Pressable onPress={() => iptal(item)} accessibilityRole="button">
                    <Text style={styles.iptal}>Talebi iptal et</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: 6 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s, marginBottom: 2 },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin, flex: 1 },
  bilgi: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  bilgiYazi: { fontSize: fontSize.kucuk + 1, color: colors.metinSoluk },
  yorumSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: 4 },
  baglantilar: { flexDirection: 'row', gap: spacing.l, marginTop: spacing.s },
  sikayet: { color: colors.metinSoluk, fontWeight: '600', fontSize: fontSize.kucuk + 1 },
  iptal: { color: colors.kirmiziAcik, fontWeight: '700', fontSize: fontSize.kucuk + 1 },
});
