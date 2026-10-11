import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import Secimler from '../components/Secimler';
import { UZMANLIKLAR } from '../data/secenekler';
import { acikTalepOlustur } from '../lib/acik';
import { sebep } from '../lib/hata';
import { saatYazimi, tarihSaatCoz, tarihYazimi } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { geri: () => void; gonderildi: () => void; asciSec: () => void };

// Müşteri istediği yemekleri, günü ve saati yazar; talep tüm onaylı aşçılara gider, aşçılar teklif verir.
export default function AcikTalepOlustur({ geri, gonderildi, asciSec }: Props) {
  const [yemekler, setYemekler] = useState('');
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [kisi, setKisi] = useState(4);
  const [semt, setSemt] = useState('');
  const [adres, setAdres] = useState('');
  const [mutfak, setMutfak] = useState<string[]>([]);
  const [alerjiler, setAlerjiler] = useState('');
  const [notlar, setNotlar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  const gonder = async () => {
    if (yemekler.trim().length < 3) return setHata('Lütfen istediğin yemekleri yaz.');
    const zaman = tarihSaatCoz(tarih, saat);
    if (!zaman) return setHata('Tarih ve saati gg.aa.yyyy ve ss:dd biçiminde yaz. Örnek: 25.10.2026 ve 18:00');
    if (zaman.getTime() < Date.now() + 2 * 3600 * 1000) return setHata('Tarih ve saat en az 2 saat sonrası olmalı.');
    if (semt.trim().length < 2) return setHata('Lütfen semtini yaz.');
    if (adres.trim().length < 5) return setHata('Lütfen açık adresini yaz.');
    setHata('');
    setGonderiliyor(true);
    try {
      await acikTalepOlustur({
        semt: semt.trim(), adres: adres.trim(), tarih: zaman, kisi, mutfak,
        yemekler: yemekler.trim(), alerjiler: alerjiler.trim(), notlar: notlar.trim(),
      });
      Alert.alert('Talebin yayınlandı', 'Aşçılar talebini inceleyip teklif verecek. Gelen teklifleri Taleplerim sekmesinde görebilirsin.', [
        { text: 'Tamam', onPress: gonderildi },
      ]);
    } catch (e) {
      const m = e instanceof Error ? e.message : (e as { message?: string })?.message ?? '';
      setHata(m.includes('En fazla 5') ? 'En fazla 5 açık talebin olabilir. Birini iptal edip tekrar dene.' : `Talep gönderilemedi. Lütfen tekrar dene.${sebep(e)}`);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran baslik="Talep Oluştur" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text style={styles.giris}>Ne yemek istediğini yaz, aşçılar sana fiyat teklifi göndersin. Beğendiğin teklifi seçersin.</Text>

          <Text style={styles.etiket}>İstediğin yemekler</Text>
          <Girdi
            style={{ height: 110 }}
            value={yemekler}
            onChangeText={setYemekler}
            placeholder="Örn: Mercimek çorbası, kuru fasulye, pilav, ayran ve sütlaç"
            multiline
            maxLength={1000}
          />

          <View style={styles.satir}>
            <View style={{ flex: 3 }}>
              <Text style={styles.etiket}>Hangi gün?</Text>
              <Girdi value={tarih} onChangeText={(t) => setTarih(tarihYazimi(t))} placeholder="gg.aa.yyyy" keyboardType="number-pad" maxLength={10} />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.etiket}>Saat kaçta?</Text>
              <Girdi value={saat} onChangeText={(t) => setSaat(saatYazimi(t))} placeholder="ss:dd" keyboardType="number-pad" maxLength={5} />
            </View>
          </View>

          <Text style={styles.etiket}>Kaç kişilik?</Text>
          <View style={styles.sayac}>
            <Pressable onPress={() => setKisi((k) => Math.max(1, k - 1))} style={styles.sayacDugme} accessibilityLabel="Azalt">
              <Text style={styles.sayacYazi}>−</Text>
            </Pressable>
            <Text style={styles.kisi}>{kisi} kişi</Text>
            <Pressable onPress={() => setKisi((k) => Math.min(50, k + 1))} style={styles.sayacDugme} accessibilityLabel="Arttır">
              <Text style={styles.sayacYazi}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.etiket}>Semt</Text>
          <Girdi value={semt} onChangeText={setSemt} placeholder="Örn: Kadıköy" />

          <Text style={styles.etiket}>Açık adres</Text>
          <Girdi style={{ height: 90 }} value={adres} onChangeText={setAdres} placeholder="Mahalle, sokak, bina ve daire no" multiline />
          <Text style={styles.ipucu}>Açık adresin sadece seçtiğin aşçıyla paylaşılır; teklif veren aşçılar göremez.</Text>

          <Text style={styles.etiket}>Mutfak tercihi (isteğe bağlı)</Text>
          <Secimler secenekler={UZMANLIKLAR} secili={mutfak} degisti={setMutfak} />

          <Text style={styles.etiket}>Alerjiler (isteğe bağlı)</Text>
          <Girdi value={alerjiler} onChangeText={setAlerjiler} placeholder="Örn: Fıstık, gluten" />

          <Text style={styles.etiket}>Özel notlar (isteğe bağlı)</Text>
          <Girdi style={{ height: 80 }} value={notlar} onChangeText={setNotlar} placeholder="Aşçılara iletmek istediklerin" multiline />

          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <View style={{ marginTop: spacing.l, gap: spacing.s }}>
            <Dugme yazi="Talebi Yayınla" onPress={gonder} yukleniyor={gonderiliyor} />
            <Dugme yazi="Belirli bir aşçıdan talep et" ikincil onPress={asciSec} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, paddingBottom: 60, gap: spacing.s },
  giris: { fontSize: fontSize.normal, color: colors.metinSoluk, lineHeight: 22 },
  etiket: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin, marginTop: spacing.m, marginBottom: 4 },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  satir: { flexDirection: 'row', gap: spacing.m },
  sayac: { flexDirection: 'row', alignItems: 'center', gap: spacing.l },
  sayacDugme: { width: 48, height: 48, borderRadius: radius.tam, backgroundColor: colors.sari, alignItems: 'center', justifyContent: 'center' },
  sayacYazi: { color: colors.koyuMetin, fontSize: 28, fontWeight: '700' },
  kisi: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin, minWidth: 90, textAlign: 'center' },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', marginTop: spacing.m },
});
