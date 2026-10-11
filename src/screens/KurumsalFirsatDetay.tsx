import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import MesajDugmesi from '../components/MesajDugmesi';
import { kurumsalSohbeti } from '../lib/sohbet';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import Rozet from '../components/Rozet';
import { sebep } from '../lib/hata';
import {
  Iletisim, KurumsalTalep, KurumsalTeklif, OGUN_ADI, kurumsalFirsatlar, kurumsalIletisim, kurumsalTalepTamamla,
  sonHizmetGunu, teklifGeriCek, teklifVer, tekrarYazisi, toplamFiyat,
} from '../lib/kurumsal';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';
import { firsatDurumu } from './KurumsalFirsatlar';

function Satir({ etiket, deger, koyu }: { etiket: string; deger: string; koyu?: boolean }) {
  if (!deger) return null;
  return (
    <Text style={[styles.satir, koyu && { color: colors.koyuMetin }]}>
      <Text style={[styles.satirEtiket, koyu && { color: colors.koyuMetin, opacity: 0.7 }]}>{etiket}: </Text>
      {deger}
    </Text>
  );
}

// Aşçının gördüğü kurumsal talep: bilgiler, teklif verme ve (seçilirse) iletişim bilgileri.
export default function KurumsalFirsatDetay({ talepId, geri, sohbetAc }: { talepId: string; geri: () => void; sohbetAc: (sohbetId: string) => void }) {
  const { oturum } = useAuth();
  const [talep, setTalep] = useState<KurumsalTalep | null>(null);
  const [teklif, setTeklif] = useState<KurumsalTeklif | null>(null);
  const [iletisim, setIletisim] = useState<Iletisim | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [fiyat, setFiyat] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      const l = await kurumsalFirsatlar(oturum!.user.id);
      const f = l.find((x) => x.id === talepId) ?? null;
      setTalep(f);
      setTeklif(f?.benimTeklifim ?? null);
      if (f?.benimTeklifim) {
        setFiyat((p) => (p === '' ? String(f.benimTeklifim!.kisi_basi_fiyat) : p));
        setMesaj((p) => (p === '' ? f.benimTeklifim!.mesaj : p));
      }
      setIletisim(f?.benimTeklifim?.durum === 'kabul' ? await kurumsalIletisim(talepId) : null);
    } finally {
      setYukleniyor(false);
    }
  }, [oturum, talepId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  if (yukleniyor || !talep) {
    return (
      <Ekran baslik="Kurumsal Talep" geri={geri}>
        <Bos yukleniyor={yukleniyor} mesaj="Talep bulunamadı veya artık görüntüleyemezsin." />
      </Ekran>
    );
  }

  const fiyatSayi = parseInt(fiyat.replace(/\D/g, ''), 10) || 0;
  const acik = talep.durum === 'acik' && new Date(talep.son_teklif_tarihi) > new Date();
  const d = firsatDurumu({ ...talep, benimTeklifim: teklif });

  const gonder = async () => {
    if (fiyatSayi < 1) return setHata('Lütfen kişi başı fiyatı yaz.');
    setHata('');
    setIslemde(true);
    try {
      await teklifVer(talep.id, fiyatSayi, mesaj.trim());
      await yukle();
      Alert.alert(teklif ? 'Teklifin güncellendi' : 'Teklifin gönderildi', 'Şirket teklifleri karşılaştırıp bir aşçı seçecek.');
    } catch (e) {
      setHata(`Teklif gönderilemedi. Talep artık teklif almıyor olabilir.${sebep(e)}`);
    } finally {
      setIslemde(false);
    }
  };

  const geriCek = () =>
    Alert.alert('Teklifi geri çek', 'Teklifini geri çekmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Geri Çek',
        style: 'destructive',
        onPress: async () => {
          try {
            await teklifGeriCek(teklif!.id);
            setFiyat('');
            setMesaj('');
            await yukle();
          } catch {
            Alert.alert('Geri çekilemedi', 'Teklif artık değiştirilemiyor olabilir.');
          }
        },
      },
    ]);

  const sonGun = sonHizmetGunu(talep);
  const tamamlanabilir = talep.durum === 'secildi' && teklif?.durum === 'kabul' && sonGun.getTime() <= Date.now();
  const tamamla = () =>
    Alert.alert('Hizmeti tamamla', 'Tüm hizmet günleri bittiyse talebi tamamlandı olarak işaretleyebilirsin.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Tamamlandı',
        onPress: async () => {
          try {
            await kurumsalTalepTamamla(talep.id);
            await yukle();
          } catch {
            Alert.alert('İşlem yapılamadı', 'Lütfen tekrar dene.');
          }
        },
      },
    ]);

  return (
    <Ekran baslik="Kurumsal Talep" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={styles.kart}>
            <View style={styles.kartUst}>
              <Text style={styles.sirket} numberOfLines={2}>{talep.sirket_adi}</Text>
              <Rozet yazi={d.yazi} ton={d.ton} />
            </View>
            <Satir etiket="Başlangıç" deger={tarihSaatYaz(talep.baslangic_tarihi)} />
            <Satir etiket="Sıklık" deger={tekrarYazisi(talep)} />
            <Satir etiket="Öğün" deger={OGUN_ADI[talep.ogun]} />
            <Satir etiket="Kişi sayısı" deger={`${talep.kisi_sayisi} kişi`} />
            <Satir etiket="Semt" deger={talep.semt} />
            <Satir etiket="Bütçe" deger={talep.butce_kisi_basi ? `Kişi başı ${tl(talep.butce_kisi_basi)}` : ''} />
            <Satir etiket="Mutfak" deger={talep.mutfak_tercihleri.join(', ')} />
            <Satir etiket="Diyet / alerji" deger={talep.diyet_notlari} />
            <Satir etiket="Notlar" deger={talep.notlar} />
            {acik ? <Text style={styles.ipucu}>Son teklif tarihi: {tarihSaatYaz(talep.son_teklif_tarihi)}</Text> : null}
          </View>

          {iletisim ? (
            <View style={styles.iletisim}>
              <Text style={styles.iletisimBaslik}>Seçildin! İletişim bilgileri</Text>
              <Satir etiket="Açık adres" deger={iletisim.adres} koyu />
              <Satir etiket="Yetkili" deger={iletisim.yetkili_ad} koyu />
              <Pressable onPress={() => Linking.openURL(`tel:${iletisim.yetkili_telefon}`).catch(() => {})} style={styles.ara} accessibilityRole="button">
                <Ionicons name="call" size={18} color={colors.koyuMetin} />
                <Text style={styles.araYazi}>{iletisim.yetkili_telefon}</Text>
              </Pressable>
            </View>
          ) : null}

          {acik && (!teklif || teklif.durum === 'bekliyor') ? (
            <View style={styles.form}>
              <Text style={styles.bolum}>{teklif ? 'Teklifini güncelle' : 'Teklif ver'}</Text>
              <Text style={styles.etiket}>Kişi başı fiyat (TL)</Text>
              <Girdi value={fiyat} onChangeText={setFiyat} placeholder="Örn: 180" keyboardType="number-pad" maxLength={6} />
              {fiyatSayi > 0 ? (
                <Text style={styles.toplam}>
                  Toplam: {tl(toplamFiyat(fiyatSayi, talep))} ({talep.kisi_sayisi} kişi × {talep.tekrar_sayisi} öğün)
                </Text>
              ) : null}
              <Text style={styles.etiket}>Şirkete mesajın</Text>
              <Girdi style={{ height: 100 }} value={mesaj} onChangeText={setMesaj} placeholder="Menü önerin, deneyimin, servis şeklin..." multiline maxLength={1000} />
              {hata ? <Text style={styles.hata}>{hata}</Text> : null}
              <Dugme yazi={teklif ? 'Teklifi Güncelle' : 'Teklifi Gönder'} onPress={gonder} yukleniyor={islemde} pasif={fiyatSayi < 1} />
              {teklif ? <Dugme yazi="Teklifi Geri Çek" tehlike onPress={geriCek} /> : null}
            </View>
          ) : null}

          {teklif ? (
            <MesajDugmesi ac={() => kurumsalSohbeti(teklif.id)} git={sohbetAc} yazi="Şirkete Mesaj Gönder" />
          ) : null}

          {teklif && !(acik && teklif.durum === 'bekliyor') ? (
            <Text style={styles.teklifOzet}>
              Teklifin: kişi başı {tl(teklif.kisi_basi_fiyat)} · toplam {tl(toplamFiyat(teklif.kisi_basi_fiyat, talep))}
            </Text>
          ) : null}

          {teklif?.durum === 'kabul' && talep.durum === 'secildi' ? (
            tamamlanabilir ? (
              <Dugme yazi="Hizmeti Tamamla" onPress={tamamla} />
            ) : (
              <Text style={styles.ipucu}>Son hizmet gününden ({tarihSaatYaz(sonGun.toISOString())}) sonra "Tamamlandı" olarak işaretleyebilirsin.</Text>
            )
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, paddingBottom: 60, gap: spacing.m },
  kart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: 4 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.s, marginBottom: 4 },
  sirket: { flex: 1, fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin },
  satir: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 22 },
  satirEtiket: { fontWeight: '700', color: colors.metinSoluk },
  ipucu: { fontSize: 13, color: colors.metinSoluk, lineHeight: 19, marginTop: 4 },
  iletisim: { backgroundColor: colors.sari, borderRadius: radius.m, padding: spacing.m, gap: 4 },
  iletisimBaslik: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.koyuMetin, marginBottom: 4 },
  ara: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, backgroundColor: colors.zemin, alignSelf: 'flex-start', borderRadius: radius.tam, paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  araYazi: { color: colors.metin, fontWeight: '700' },
  form: { gap: spacing.s },
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.sari },
  etiket: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin, marginTop: spacing.s },
  toplam: { fontSize: fontSize.normal, fontWeight: '700', color: colors.sari },
  teklifOzet: { fontSize: fontSize.normal, fontWeight: '700', color: colors.sari },
  hata: { color: colors.kirmiziAcik, fontWeight: '600' },
});
