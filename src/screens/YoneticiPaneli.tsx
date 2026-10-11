import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Dugme from '../components/Dugme';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import {
  SIKAYET_DURUMU, SikayetDurumu, YonetimAsci, YonetimSikayet,
  asciOnayla, sikayetGuncelle, yonetimAscilari, yonetimSikayetleri,
} from '../lib/yonetim';
import { colors, fontSize, radius, spacing } from '../theme';

type Sekme = 'ascilar' | 'sikayetler';

export default function YoneticiPaneli({ geri }: { geri: () => void }) {
  const [sekme, setSekme] = useState<Sekme>('ascilar');
  const [ascilar, setAscilar] = useState<YonetimAsci[] | null>(null);
  const [sikayetler, setSikayetler] = useState<YonetimSikayet[] | null>(null);
  const [hata, setHata] = useState('');
  const [islemde, setIslemde] = useState<string | null>(null);
  const [notlar, setNotlar] = useState<Record<string, string>>({});

  const yukle = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([yonetimAscilari(), yonetimSikayetleri()]);
      setAscilar(a);
      setSikayetler(s);
      setHata('');
    } catch {
      setHata('Veriler yüklenemedi. Yönetici yetkin olmayabilir ya da internetin kopmuş olabilir.');
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const onayDegistir = (a: YonetimAsci, onayli: boolean) =>
    Alert.alert(
      onayli ? 'Aşçıyı onayla' : 'Onayı kaldır',
      onayli
        ? `${a.ad} müşterilere görünür olacak ve talep alabilecek.`
        : `${a.ad} müşterilere görünmeyecek ve yeni talep alamayacak. Mevcut talepleri etkilenmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: onayli ? 'Onayla' : 'Onayı Kaldır',
          style: onayli ? 'default' : 'destructive',
          onPress: async () => {
            setIslemde(a.id);
            try {
              await asciOnayla(a.id, onayli);
              await yukle();
            } catch {
              Alert.alert('İşlem yapılamadı', 'Lütfen tekrar dene.');
            } finally {
              setIslemde(null);
            }
          },
        },
      ],
    );

  const durumDegistir = async (s: YonetimSikayet, durum: SikayetDurumu) => {
    setIslemde(s.id);
    try {
      await sikayetGuncelle(s.id, durum, notlar[s.id] ?? s.yonetici_notu ?? '');
      await yukle();
    } catch {
      Alert.alert('İşlem yapılamadı', 'Lütfen tekrar dene.');
    } finally {
      setIslemde(null);
    }
  };

  const bekleyenAsci = (ascilar ?? []).filter((a) => !a.onayli_mi).length;
  const acikSikayet = (sikayetler ?? []).filter((s) => s.durum !== 'cozuldu').length;

  return (
    <View style={styles.kap}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <Text style={styles.baslik}>Yönetici Paneli</Text>

      <View style={styles.sekmeler}>
        {(
          [
            ['ascilar', `Aşçı Onayları${bekleyenAsci ? ` (${bekleyenAsci})` : ''}`],
            ['sikayetler', `Şikayetler${acikSikayet ? ` (${acikSikayet})` : ''}`],
          ] as [Sekme, string][]
        ).map(([k, y]) => (
          <Pressable key={k} onPress={() => setSekme(k)} style={[styles.sekme, sekme === k && styles.sekmeAcik]} accessibilityRole="button">
            <Text style={[styles.sekmeYazi, sekme === k && { color: colors.sari }]}>{y}</Text>
          </Pressable>
        ))}
      </View>

      {hata ? <Text style={styles.bos}>{hata}</Text> : null}
      {!ascilar && !hata ? <ActivityIndicator size="large" color={colors.kirmizi} style={{ marginTop: 40 }} /> : null}

      {sekme === 'ascilar' && ascilar ? (
        <FlatList
          data={ascilar}
          keyExtractor={(a) => a.id}
          ListEmptyComponent={<Text style={styles.bos}>Henüz profili kaydedilmiş aşçı yok.</Text>}
          contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
          renderItem={({ item: a }) => (
            <View style={styles.kart}>
              <View style={styles.kartUst}>
                <Text style={styles.ad}>{a.ad}</Text>
                <View style={[styles.rozet, !a.onayli_mi && { backgroundColor: colors.sari }]}>
                  <Text style={styles.rozetYazi}>{a.onayli_mi ? 'Onaylı' : 'Onay bekliyor'}</Text>
                </View>
              </View>
              {a.telefon ? <Text style={styles.bilgi}>Telefon: {a.telefon}</Text> : null}
              {a.uzmanliklar.length > 0 ? <Text style={styles.bilgi}>Uzmanlık: {a.uzmanliklar.join(', ')}</Text> : null}
              {a.semtler.length > 0 ? <Text style={styles.bilgi}>Semtler: {a.semtler.join(', ')}</Text> : null}
              {a.baslangic_fiyati != null ? <Text style={styles.bilgi}>Başlangıç fiyatı: {tl(a.baslangic_fiyati)}</Text> : null}
              {a.tanitim ? <Text style={styles.bilgi} numberOfLines={4}>{a.tanitim}</Text> : <Text style={styles.soluk}>Tanıtım yazısı yok.</Text>}
              <View style={{ marginTop: spacing.s }}>
                {a.onayli_mi ? (
                  <Dugme yazi="Onayı Kaldır" ikincil onPress={() => onayDegistir(a, false)} pasif={islemde === a.id} />
                ) : (
                  <Dugme yazi="Onayla" onPress={() => onayDegistir(a, true)} yukleniyor={islemde === a.id} />
                )}
              </View>
            </View>
          )}
        />
      ) : null}

      {sekme === 'sikayetler' && sikayetler ? (
        <FlatList
          data={sikayetler}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={<Text style={styles.bos}>Henüz şikayet yok.</Text>}
          contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
          renderItem={({ item: s }) => (
            <View style={styles.kart}>
              <View style={styles.kartUst}>
                <Text style={styles.ad}>
                  {s.sikayet_eden_ad} → {s.karsi_taraf_ad}
                </Text>
                <View style={[styles.rozet, s.durum === 'acik' && { backgroundColor: colors.sari }, s.durum === 'inceleniyor' && { backgroundColor: colors.kirmizi }]}>
                  <Text style={[styles.rozetYazi, s.durum === 'inceleniyor' && { color: colors.sari }]}>{SIKAYET_DURUMU[s.durum]}</Text>
                </View>
              </View>
              <Text style={styles.soluk}>
                {s.sikayet_eden_rol === 'asci' ? 'Aşçı' : 'Müşteri'} şikayet etti · Hizmet: {tarihSaatYaz(s.talep_tarihi)}, {s.talep_semt}
              </Text>
              <Text style={styles.metin}>{s.aciklama}</Text>
              <TextInput
                style={styles.girdi}
                value={notlar[s.id] ?? s.yonetici_notu ?? ''}
                onChangeText={(t) => setNotlar((o) => ({ ...o, [s.id]: t }))}
                placeholder="Yönetici notu (isteğe bağlı)"
                multiline
              />
              <View style={styles.butonlar}>
                {s.durum !== 'inceleniyor' ? (
                  <View style={{ flex: 1 }}>
                    <Dugme yazi="İnceleniyor" onPress={() => durumDegistir(s, 'inceleniyor')} pasif={islemde === s.id} />
                  </View>
                ) : null}
                {s.durum !== 'cozuldu' ? (
                  <View style={{ flex: 1 }}>
                    <Dugme yazi="Çözüldü" cerceveli onPress={() => durumDegistir(s, 'cozuldu')} pasif={islemde === s.id} />
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Dugme yazi="Notu Kaydet" cerceveli onPress={() => durumDegistir(s, 'cozuldu')} pasif={islemde === s.id} />
                  </View>
                )}
              </View>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, marginTop: spacing.m, marginHorizontal: spacing.l },
  sekmeler: { flexDirection: 'row', gap: spacing.s, marginHorizontal: spacing.l, marginTop: spacing.m },
  sekme: { flex: 1, paddingVertical: 12, borderRadius: radius.tam, borderWidth: 2, borderColor: colors.kirmizi, alignItems: 'center' },
  sekmeAcik: { backgroundColor: colors.kirmizi },
  sekmeYazi: { fontSize: fontSize.kucuk + 1, fontWeight: '700', color: colors.kirmizi },
  bos: { textAlign: 'center', marginTop: 40, color: colors.metin, fontSize: fontSize.normal, paddingHorizontal: spacing.l },
  kart: { backgroundColor: colors.beyaz, borderRadius: radius.m, padding: spacing.m, gap: 4 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s },
  ad: { fontSize: fontSize.normal + 1, fontWeight: '700', color: colors.metin, flex: 1 },
  rozet: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.tam, borderWidth: 1, borderColor: colors.cizgi, backgroundColor: colors.beyaz },
  rozetYazi: { fontSize: 13, fontWeight: '700', color: colors.metin },
  bilgi: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 21 },
  soluk: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.6 },
  metin: { fontSize: fontSize.normal, color: colors.metin, lineHeight: 23, marginTop: 4 },
  girdi: {
    backgroundColor: colors.krem,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.s + 4,
    fontSize: fontSize.kucuk + 1,
    color: colors.metin,
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: spacing.s,
  },
  butonlar: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
});
