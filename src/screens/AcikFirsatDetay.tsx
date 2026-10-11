import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import MesajDugmesi from '../components/MesajDugmesi';
import { teklifSohbeti } from '../lib/sohbet';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import Rozet from '../components/Rozet';
import { AcikFirsat, acikFirsatlar, acikTeklifGeriCek, acikTeklifVer } from '../lib/acik';
import { sebep } from '../lib/hata';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';
import { acikFirsatDurumu } from './AcikFirsatlar';

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  if (!deger) return null;
  return (
    <Text style={styles.satir}>
      <Text style={styles.satirEtiket}>{etiket}: </Text>
      {deger}
    </Text>
  );
}

// Aşçının gördüğü açık talep: bilgiler ve fiyat teklifi verme.
export default function AcikFirsatDetay({ talepId, geri, sohbetAc }: { talepId: string; geri: () => void; sohbetAc: (sohbetId: string) => void }) {
  const { oturum } = useAuth();
  const [f, setF] = useState<AcikFirsat | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [fiyat, setFiyat] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      const l = await acikFirsatlar(oturum!.user.id);
      const x = l.find((y) => y.id === talepId) ?? null;
      setF(x);
      if (x?.benimTeklifim) {
        setFiyat((p) => (p === '' ? String(x.benimTeklifim!.fiyat) : p));
        setMesaj((p) => (p === '' ? x.benimTeklifim!.mesaj : p));
      }
    } finally {
      setYukleniyor(false);
    }
  }, [oturum, talepId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  if (yukleniyor || !f) {
    return (
      <Ekran baslik="Müşteri Talebi" geri={geri}>
        <Bos yukleniyor={yukleniyor} mesaj="Talep bulunamadı veya artık görüntüleyemezsin." />
      </Ekran>
    );
  }

  const teklif = f.benimTeklifim;
  const fiyatSayi = parseInt(fiyat.replace(/\D/g, ''), 10) || 0;
  const acik = f.durum === 'acik' && new Date(f.tarih) > new Date();
  const d = acikFirsatDurumu(f);

  const gonder = async () => {
    if (fiyatSayi < 1) return setHata('Lütfen toplam fiyatı yaz.');
    setHata('');
    setIslemde(true);
    try {
      await acikTeklifVer(f.id, fiyatSayi, mesaj.trim());
      await yukle();
      Alert.alert(teklif ? 'Teklifin güncellendi' : 'Teklifin gönderildi', 'Müşteri teklifleri karşılaştırıp bir aşçı seçecek.');
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
            await acikTeklifGeriCek(teklif!.id);
            setFiyat('');
            setMesaj('');
            await yukle();
          } catch {
            Alert.alert('Geri çekilemedi', 'Teklif artık değiştirilemiyor olabilir.');
          }
        },
      },
    ]);

  return (
    <Ekran baslik="Müşteri Talebi" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={styles.kart}>
            <View style={styles.kartUst}>
              <Text style={styles.yemek}>{f.istenen_yemekler}</Text>
              <Rozet yazi={d.yazi} ton={d.ton} />
            </View>
            <Satir etiket="Gün ve saat" deger={tarihSaatYaz(f.tarih)} />
            <Satir etiket="Kişi sayısı" deger={`${f.kisi_sayisi} kişi`} />
            <Satir etiket="Semt" deger={f.semt} />
            <Satir etiket="Mutfak" deger={f.mutfak_tercihleri.join(', ')} />
            <Satir etiket="Alerjiler" deger={f.alerjiler} />
            <Satir etiket="Notlar" deger={f.notlar} />
            <Text style={styles.ipucu}>Müşterinin adı ve açık adresi, seni seçerse talep "Bana Gelen" bölümünde görünür.</Text>
          </View>

          {teklif?.durum === 'kabul' ? (
            <View style={styles.secildi}>
              <Text style={styles.secildiBaslik}>Teklifin seçildi!</Text>
              <Text style={styles.secildiYazi}>
                {tl(teklif.fiyat)} karşılığında anlaştınız. Talep "Bana Gelen" bölümüne taşındı; müşterinin açık adresini orada görebilirsin.
              </Text>
            </View>
          ) : null}

          {acik && (!teklif || teklif.durum === 'bekliyor') ? (
            <View style={styles.form}>
              <Text style={styles.bolum}>{teklif ? 'Teklifini güncelle' : 'Teklif ver'}</Text>
              <Text style={styles.etiket}>Toplam fiyat (TL)</Text>
              <Girdi value={fiyat} onChangeText={setFiyat} placeholder="Örn: 1500" keyboardType="number-pad" maxLength={7} />
              <Text style={styles.ipucu}>Bu talebin tamamı için istediğin toplam ücret (hizmet ve malzeme dahil ne istiyorsan).</Text>
              <Text style={styles.etiket}>Müşteriye mesajın</Text>
              <Girdi style={{ height: 100 }} value={mesaj} onChangeText={setMesaj} placeholder="Menü önerin, malzemeleri kimin alacağı, deneyimin..." multiline maxLength={1000} />
              {hata ? <Text style={styles.hata}>{hata}</Text> : null}
              <Dugme yazi={teklif ? 'Teklifi Güncelle' : 'Teklifi Gönder'} onPress={gonder} yukleniyor={islemde} pasif={fiyatSayi < 1} />
              {teklif ? <Dugme yazi="Teklifi Geri Çek" tehlike onPress={geriCek} /> : null}
            </View>
          ) : null}

          {teklif ? (
            <MesajDugmesi ac={() => teklifSohbeti(teklif.id)} git={sohbetAc} yazi="Müşteriye Mesaj Gönder" />
          ) : null}

          {teklif && teklif.durum !== 'kabul' && !(acik && teklif.durum === 'bekliyor') ? (
            <Text style={styles.teklifOzet}>Teklifin: {tl(teklif.fiyat)}</Text>
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
  yemek: { flex: 1, fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin, lineHeight: 24 },
  satir: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 22 },
  satirEtiket: { fontWeight: '700', color: colors.metinSoluk },
  ipucu: { fontSize: 13, color: colors.metinSoluk, lineHeight: 19, marginTop: 4 },
  secildi: { backgroundColor: colors.sari, borderRadius: radius.m, padding: spacing.m, gap: 4 },
  secildiBaslik: { color: colors.koyuMetin, fontWeight: '800', fontSize: fontSize.normal + 2 },
  secildiYazi: { color: colors.koyuMetin, fontSize: fontSize.kucuk + 1, lineHeight: 21 },
  form: { gap: spacing.s },
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.sari },
  etiket: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin, marginTop: spacing.s },
  teklifOzet: { fontSize: fontSize.normal, fontWeight: '700', color: colors.sari },
  hata: { color: colors.kirmiziAcik, fontWeight: '600' },
});
