import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import Rozet, { Ton } from '../components/Rozet';
import { KURUMSAL_DURUM_ADI, KurumsalDurum, OGUN_ADI, OzetliTalep, kurumsalTaleplerim, tekrarYazisi } from '../lib/kurumsal';
import { tarihSaatYaz } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

export const DURUM_TONU: Record<KurumsalDurum, Ton> = { acik: 'sari', secildi: 'kirmizi', tamamlandi: 'beyaz', iptal: 'soluk' };

function Bilgi({ simge, yazi }: { simge: keyof typeof Ionicons.glyphMap; yazi: string }) {
  return (
    <View style={styles.bilgi}>
      <Ionicons name={simge} size={16} color={colors.metinSoluk} />
      <Text style={styles.bilgiYazi}>{yazi}</Text>
    </View>
  );
}

type Props = { ac: (id: string) => void; olustur: () => void };

// Müşteri hesabının kurumsal talepleri (Taleplerim sekmesinin "Kurumsal" bölümü).
export default function KurumsalTaleplerim({ ac, olustur }: Props) {
  const { oturum } = useAuth();
  const [liste, setListe] = useState<OzetliTalep[] | null>(null);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      setListe(await kurumsalTaleplerim(oturum!.user.id));
      setHata('');
    } catch {
      setHata('Kurumsal talepler yüklenemedi. İnternetini kontrol edip tekrar dene.');
    }
  }, [oturum]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  return (
    <FlatList
      data={liste ?? []}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: spacing.l, paddingTop: 0, gap: spacing.m }}
      ListHeaderComponent={<Dugme yazi="Yeni Kurumsal Talep" onPress={olustur} />}
      ListEmptyComponent={
        hata ? (
          <Bos mesaj={hata} simge="cloud-offline-outline" />
        ) : !liste ? (
          <Bos yukleniyor />
        ) : (
          <Bos mesaj="Henüz kurumsal talebin yok. Şirketin için toplu yemek talebi açıp aşçılardan teklif alabilirsin." simge="business-outline" />
        )
      }
      renderItem={({ item: t }) => (
        <Pressable onPress={() => ac(t.id)} style={({ pressed }) => [styles.kart, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <View style={styles.kartUst}>
            <Text style={styles.ad} numberOfLines={1}>{t.sirket_adi}</Text>
            <Rozet yazi={KURUMSAL_DURUM_ADI[t.durum]} ton={DURUM_TONU[t.durum]} />
          </View>
          <Bilgi simge="calendar-outline" yazi={`${tarihSaatYaz(t.baslangic_tarihi)} · ${tekrarYazisi(t)}`} />
          <Bilgi simge="people-outline" yazi={`${t.kisi_sayisi} kişi · ${OGUN_ADI[t.ogun]}`} />
          <Bilgi simge="location-outline" yazi={t.semt} />
          {t.durum === 'acik' ? (
            <View style={styles.teklifSatir}>
              <Ionicons name="pricetag" size={16} color={colors.sari} />
              <Text style={styles.teklifYazi}>{t.teklifSayisi > 0 ? `${t.teklifSayisi} teklif geldi` : 'Henüz teklif yok'}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: 6 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s, marginBottom: 2 },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin, flex: 1 },
  bilgi: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  bilgiYazi: { fontSize: fontSize.kucuk + 1, color: colors.metinSoluk, flex: 1 },
  teklifSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: 4 },
  teklifYazi: { fontSize: fontSize.kucuk + 1, fontWeight: '700', color: colors.sari },
});
