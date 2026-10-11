import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import Secimler from '../components/Secimler';
import TekSecim from '../components/TekSecim';
import { UZMANLIKLAR } from '../data/secenekler';
import { sebep } from '../lib/hata';
import { OGUN_ADI, Ogun, TEKRAR_ADI, Tekrar, kurumsalTalepOlustur } from '../lib/kurumsal';
import { saatYazimi, tarihSaatCoz, tarihYazimi } from '../lib/talepler';
import { telefonuDuzenle } from '../lib/telefon';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { geri: () => void; gonderildi: () => void };

const sayiya = (s: string) => parseInt(s.replace(/\D/g, ''), 10);

// Şirketler için toplu yemek talebi formu.
export default function KurumsalTalepOlustur({ geri, gonderildi }: Props) {
  const { profil, oturum } = useAuth();
  const [sirket, setSirket] = useState('');
  const [yetkili, setYetkili] = useState(profil?.ad ?? '');
  const [telefon, setTelefon] = useState(oturum?.user.phone ? oturum.user.phone.replace(/^90/, '0') : '');
  const [semt, setSemt] = useState('');
  const [adres, setAdres] = useState('');
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('12:00');
  const [tekrar, setTekrar] = useState<Tekrar>('tek_sefer');
  const [tekrarSayisi, setTekrarSayisi] = useState(5);
  const [ogun, setOgun] = useState<Ogun>('ogle');
  const [kisi, setKisi] = useState('50');
  const [butce, setButce] = useState('');
  const [mutfak, setMutfak] = useState<string[]>([]);
  const [diyet, setDiyet] = useState('');
  const [notlar, setNotlar] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  const gonder = async () => {
    const tel = telefonuDuzenle(telefon);
    const zaman = tarihSaatCoz(tarih, saat);
    const kisiSayisi = sayiya(kisi);
    if (sirket.trim().length < 2) return setHata('Lütfen şirket adını yaz.');
    if (yetkili.trim().length < 2) return setHata('Lütfen yetkili kişinin adını yaz.');
    if (!tel) return setHata('Yetkili kişi için geçerli bir cep telefonu yaz. Örnek: 5XX XXX XX XX');
    if (semt.trim().length < 2) return setHata('Lütfen semti yaz.');
    if (adres.trim().length < 5) return setHata('Lütfen açık adresi yaz.');
    if (!zaman) return setHata('Tarih ve saati gg.aa.yyyy ve ss:dd biçiminde yaz. Örnek: 25.10.2026 ve 12:00');
    if (zaman.getTime() < Date.now() + 3 * 86400000) return setHata('Başlangıç tarihi en az 3 gün sonra olmalı; aşçıların teklif hazırlaması için zaman gerekir.');
    if (!kisiSayisi || kisiSayisi < 10 || kisiSayisi > 5000) return setHata('Kişi sayısı 10 ile 5000 arasında olmalı.');
    const butceSayi = butce.trim() ? sayiya(butce) : null;
    if (butce.trim() && !butceSayi) return setHata('Bütçeyi sayı olarak yaz.');

    setHata('');
    setGonderiliyor(true);
    try {
      await kurumsalTalepOlustur({
        sirket: sirket.trim(), yetkili: yetkili.trim(), telefon: tel, semt: semt.trim(), adres: adres.trim(),
        baslangic: zaman, tekrar, tekrarSayisi: tekrar === 'tek_sefer' ? 1 : tekrarSayisi, ogun, kisi: kisiSayisi,
        butce: butceSayi, mutfak, diyet: diyet.trim(), notlar: notlar.trim(),
      });
      Alert.alert('Talebin açıldı', 'Uygun aşçılar teklif gönderecek. Teklifleri "Taleplerim > Kurumsal" bölümünden karşılaştırıp seçebilirsin.', [
        { text: 'Tamam', onPress: gonderildi },
      ]);
    } catch (e) {
      setHata(`Talep gönderilemedi. Lütfen tekrar dene.${sebep(e)}`);
    } finally {
      setGonderiliyor(false);
    }
  };

  const sayac = (deger: number, degisti: (n: number) => void, min: number, max: number, birim: string) => (
    <View style={styles.sayac}>
      <Pressable onPress={() => degisti(Math.max(min, deger - 1))} style={styles.sayacDugme} accessibilityLabel="Azalt">
        <Text style={styles.sayacYazi}>−</Text>
      </Pressable>
      <Text style={styles.sayacDeger}>{deger} {birim}</Text>
      <Pressable onPress={() => degisti(Math.min(max, deger + 1))} style={styles.sayacDugme} accessibilityLabel="Arttır">
        <Text style={styles.sayacYazi}>+</Text>
      </Pressable>
    </View>
  );

  return (
    <Ekran baslik="Kurumsal Talep" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={styles.bilgi}>
            <Ionicons name="information-circle" size={22} color={colors.sari} />
            <Text style={styles.bilgiYazi}>
              Talebin, kurumsal hizmet veren ve kapasitesi yeten aşçılara iletilir. Onlar kişi başı fiyat teklifi gönderir; sen karşılaştırıp birini seçersin. Açık adresin ve yetkili bilgilerin yalnızca seçtiğin aşçıya gösterilir.
            </Text>
          </View>

          <Text style={styles.baslik}>Şirket</Text>
          <Text style={styles.etiket}>Şirket adı</Text>
          <Girdi value={sirket} onChangeText={setSirket} placeholder="Örn: Acme A.Ş." autoCapitalize="words" />
          <Text style={styles.etiket}>Yetkili kişi</Text>
          <Girdi value={yetkili} onChangeText={setYetkili} autoCapitalize="words" />
          <Text style={styles.etiket}>Yetkili telefonu</Text>
          <Girdi value={telefon} onChangeText={setTelefon} placeholder="5XX XXX XX XX" keyboardType="phone-pad" />
          <Text style={styles.etiket}>Semt</Text>
          <Girdi value={semt} onChangeText={setSemt} placeholder="Örn: Maslak" />
          <Text style={styles.etiket}>Açık adres</Text>
          <Girdi style={{ height: 90 }} value={adres} onChangeText={setAdres} placeholder="Mahalle, cadde, bina, kat" multiline />

          <Text style={styles.baslik}>Yemek</Text>
          <View style={styles.satir}>
            <View style={{ flex: 3 }}>
              <Text style={styles.etiket}>Başlangıç tarihi</Text>
              <Girdi value={tarih} onChangeText={(t) => setTarih(tarihYazimi(t))} placeholder="gg.aa.yyyy" keyboardType="number-pad" maxLength={10} />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.etiket}>Saat</Text>
              <Girdi value={saat} onChangeText={(t) => setSaat(saatYazimi(t))} placeholder="ss:dd" keyboardType="number-pad" maxLength={5} />
            </View>
          </View>
          <Text style={styles.ipucu}>En az 3 gün sonrasına talep açabilirsin.</Text>

          <Text style={styles.etiket}>Sıklık</Text>
          <TekSecim
            secenekler={(Object.keys(TEKRAR_ADI) as Tekrar[]).map((d) => ({ deger: d, yazi: TEKRAR_ADI[d] }))}
            secili={tekrar}
            degisti={setTekrar}
          />
          {tekrar !== 'tek_sefer' ? (
            <>
              <Text style={styles.etiket}>{tekrar === 'gunluk' ? 'Kaç gün boyunca?' : 'Kaç hafta boyunca?'}</Text>
              {sayac(tekrarSayisi, setTekrarSayisi, 2, 60, tekrar === 'gunluk' ? 'gün' : 'hafta')}
            </>
          ) : null}

          <Text style={styles.etiket}>Öğün</Text>
          <TekSecim
            secenekler={(Object.keys(OGUN_ADI) as Ogun[]).map((d) => ({ deger: d, yazi: OGUN_ADI[d] }))}
            secili={ogun}
            degisti={setOgun}
          />

          <View style={styles.satir}>
            <View style={{ flex: 1 }}>
              <Text style={styles.etiket}>Kaç kişilik?</Text>
              <Girdi value={kisi} onChangeText={setKisi} placeholder="10 - 5000" keyboardType="number-pad" maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.etiket}>Bütçe (kişi başı TL)</Text>
              <Girdi value={butce} onChangeText={setButce} placeholder="İsteğe bağlı" keyboardType="number-pad" maxLength={6} />
            </View>
          </View>

          <Text style={styles.etiket}>Mutfak tercihi</Text>
          <Secimler secenekler={UZMANLIKLAR} secili={mutfak} degisti={setMutfak} />
          <Text style={styles.etiket}>Diyet ve alerji notları</Text>
          <Girdi style={{ height: 80 }} value={diyet} onChangeText={setDiyet} placeholder="Örn: 5 kişi vegan, 3 kişi glütensiz" multiline />
          <Text style={styles.etiket}>Diğer notlar</Text>
          <Girdi style={{ height: 80 }} value={notlar} onChangeText={setNotlar} placeholder="Mutfak imkânları, servis düzeni vb." multiline />

          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <View style={{ marginTop: spacing.l }}>
            <Dugme yazi="Talebi Aç" onPress={gonder} yukleniyor={gonderiliyor} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, paddingBottom: 60, gap: spacing.s },
  bilgi: { flexDirection: 'row', gap: spacing.s + 2, backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m },
  bilgiYazi: { flex: 1, color: colors.metin, fontSize: fontSize.kucuk + 1, lineHeight: 21 },
  baslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.sari, marginTop: spacing.l },
  etiket: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin, marginTop: spacing.m, marginBottom: 4 },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  satir: { flexDirection: 'row', gap: spacing.m },
  sayac: { flexDirection: 'row', alignItems: 'center', gap: spacing.l },
  sayacDugme: { width: 48, height: 48, borderRadius: radius.tam, backgroundColor: colors.sari, alignItems: 'center', justifyContent: 'center' },
  sayacYazi: { color: colors.koyuMetin, fontSize: 28, fontWeight: '700' },
  sayacDeger: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin, minWidth: 100, textAlign: 'center' },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', marginTop: spacing.m },
});
