import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Dugme from '../components/Dugme';
import Secimler from '../components/Secimler';
import { UZMANLIKLAR } from '../data/secenekler';
import { supabase } from '../lib/supabase';
import { saatYazimi, tarihSaatCoz, tarihYazimi, talepOlustur } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

const girdi = {
  backgroundColor: colors.beyaz,
  borderRadius: radius.m,
  borderWidth: 1,
  borderColor: colors.cizgi,
  paddingHorizontal: spacing.m,
  paddingVertical: 12,
  fontSize: fontSize.normal,
  color: colors.metin,
} as const;

type Props = { asciId: string; geri: () => void; gonderildi: () => void };

export default function TalepOlustur({ asciId, geri, gonderildi }: Props) {
  const [asciAdi, setAsciAdi] = useState('');
  const [semt, setSemt] = useState('');
  const [adres, setAdres] = useState('');
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [kisi, setKisi] = useState(4);
  const [mutfak, setMutfak] = useState<string[]>([]);
  const [yemekler, setYemekler] = useState('');
  const [alerjiler, setAlerjiler] = useState('');
  const [notlar, setNotlar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    supabase.from('asci_vitrini').select('ad').eq('id', asciId).maybeSingle().then(({ data }) => setAsciAdi(data?.ad ?? ''));
  }, [asciId]);

  const gonder = async () => {
    if (semt.trim().length < 2) return setHata('Lütfen semtini yaz.');
    if (adres.trim().length < 5) return setHata('Lütfen açık adresini yaz.');
    const zaman = tarihSaatCoz(tarih, saat);
    if (!zaman) return setHata('Tarih ve saati gg.aa.yyyy ve ss:dd biçiminde yaz. Örnek: 25.10.2026 ve 10:00');
    if (zaman.getTime() <= Date.now()) return setHata('Tarih ve saat gelecekte olmalı.');

    setHata('');
    setGonderiliyor(true);
    try {
      await talepOlustur({
        asciId,
        semt: semt.trim(),
        adres: adres.trim(),
        tarih: zaman,
        kisi,
        mutfak,
        yemekler: yemekler.trim(),
        alerjiler: alerjiler.trim(),
        notlar: notlar.trim(),
      });
      Alert.alert('Talebin gönderildi', 'Aşçı talebini inceleyip sana dönecek.', [{ text: 'Tamam', onPress: gonderildi }]);
    } catch {
      setHata('Talep gönderilemedi. Lütfen tekrar dene.');
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <Text style={styles.baslik}>Aşçı Talebi</Text>
        {asciAdi ? <Text style={styles.altBaslik}>{asciAdi}</Text> : null}

        <Text style={styles.etiket}>Semt</Text>
        <TextInput style={girdi} value={semt} onChangeText={setSemt} placeholder="Örn: Kadıköy" />

        <Text style={styles.etiket}>Açık adres</Text>
        <TextInput
          style={[girdi, { height: 90, textAlignVertical: 'top' }]}
          value={adres}
          onChangeText={setAdres}
          placeholder="Mahalle, sokak, bina ve daire no"
          multiline
        />
        <Text style={styles.ipucu}>Açık adresin yalnızca talebini kabul eden aşçıya gösterilir.</Text>

        <View style={styles.satir}>
          <View style={{ flex: 3 }}>
            <Text style={styles.etiket}>Tarih</Text>
            <TextInput style={girdi} value={tarih} onChangeText={(t) => setTarih(tarihYazimi(t))} placeholder="gg.aa.yyyy" keyboardType="number-pad" maxLength={10} />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={styles.etiket}>Saat</Text>
            <TextInput style={girdi} value={saat} onChangeText={(t) => setSaat(saatYazimi(t))} placeholder="ss:dd" keyboardType="number-pad" maxLength={5} />
          </View>
        </View>

        <Text style={styles.etiket}>Kaç kişilik yemek?</Text>
        <View style={styles.sayac}>
          <Pressable onPress={() => setKisi((k) => Math.max(1, k - 1))} style={styles.sayacDugme} accessibilityLabel="Azalt">
            <Text style={styles.sayacYazi}>−</Text>
          </Pressable>
          <Text style={styles.kisi}>{kisi} kişi</Text>
          <Pressable onPress={() => setKisi((k) => Math.min(20, k + 1))} style={styles.sayacDugme} accessibilityLabel="Arttır">
            <Text style={styles.sayacYazi}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.etiket}>Mutfak tercihi</Text>
        <Secimler secenekler={UZMANLIKLAR} secili={mutfak} degisti={setMutfak} />

        <Text style={styles.etiket}>İstediğin yemekler</Text>
        <TextInput
          style={[girdi, { height: 90, textAlignVertical: 'top' }]}
          value={yemekler}
          onChangeText={setYemekler}
          placeholder="Örn: Zeytinyağlılar, mercimek çorbası, fırında tavuk"
          multiline
        />

        <Text style={styles.etiket}>Alerjiler</Text>
        <TextInput style={girdi} value={alerjiler} onChangeText={setAlerjiler} placeholder="Örn: Fıstık, gluten" />

        <Text style={styles.etiket}>Özel notlar</Text>
        <TextInput
          style={[girdi, { height: 80, textAlignVertical: 'top' }]}
          value={notlar}
          onChangeText={setNotlar}
          placeholder="Aşçıya iletmek istediklerin"
          multiline
        />

        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <View style={{ marginTop: spacing.l }}>
          <Dugme yazi="Talebi Gönder" onPress={gonder} yukleniyor={gonderiliyor} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  icerik: { padding: spacing.l, paddingBottom: 60, gap: spacing.s },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi },
  altBaslik: { fontSize: fontSize.baslik, color: colors.metin, fontWeight: '600' },
  etiket: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin, marginTop: spacing.m, marginBottom: 4 },
  ipucu: { fontSize: 13, color: colors.metin, opacity: 0.6 },
  satir: { flexDirection: 'row', gap: spacing.m },
  sayac: { flexDirection: 'row', alignItems: 'center', gap: spacing.l },
  sayacDugme: { width: 48, height: 48, borderRadius: radius.tam, backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  sayacYazi: { color: colors.sari, fontSize: 28, fontWeight: '700' },
  kisi: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin, minWidth: 90, textAlign: 'center' },
  hata: { color: colors.kirmizi, fontWeight: '600', marginTop: spacing.m },
});
