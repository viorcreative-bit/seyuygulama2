import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import ProfilResmi from '../components/ProfilResmi';
import Dugme from '../components/Dugme';
import MesajDugmesi from '../components/MesajDugmesi';
import { kurumsalSohbeti } from '../lib/sohbet';
import Ekran from '../components/Ekran';
import Rozet from '../components/Rozet';
import { sebep } from '../lib/hata';
import {
  KURUMSAL_DURUM_ADI, KurumsalTalep, KurumsalTeklif, OGUN_ADI, kurumsalTalepGetir, kurumsalTalepIptal,
  kurumsalTeklifleri, teklifSec, tekrarYazisi, toplamFiyat,
} from '../lib/kurumsal';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';
import { DURUM_TONU } from './KurumsalTaleplerim';

type Props = { talepId: string; geri: () => void; asciAc: (id: string) => void; sohbetAc: (sohbetId: string) => void };

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  if (!deger) return null;
  return (
    <Text style={styles.satir}>
      <Text style={styles.satirEtiket}>{etiket}: </Text>
      {deger}
    </Text>
  );
}

// Şirketin kurumsal talebi: özet, gelen teklifler ve teklif seçme.
export default function KurumsalTalepDetay({ talepId, geri, asciAc, sohbetAc }: Props) {
  const [talep, setTalep] = useState<KurumsalTalep | null>(null);
  const [teklifler, setTeklifler] = useState<KurumsalTeklif[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemde, setIslemde] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const [t, te] = await Promise.all([kurumsalTalepGetir(talepId), kurumsalTeklifleri(talepId)]);
      setTalep(t);
      setTeklifler(te);
    } finally {
      setYukleniyor(false);
    }
  }, [talepId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  if (yukleniyor || !talep) {
    return (
      <Ekran baslik="Kurumsal Talep" geri={geri}>
        <Bos yukleniyor={yukleniyor} mesaj="Talep bulunamadı." />
      </Ekran>
    );
  }

  const sec = (te: KurumsalTeklif) =>
    Alert.alert(
      'Teklifi seç',
      `${te.asci_ad} aşçısının kişi başı ${tl(te.kisi_basi_fiyat)} teklifini (toplam ${tl(toplamFiyat(te.kisi_basi_fiyat, talep))}) seçmek istiyor musun? Diğer teklifler reddedilir ve açık adresin ile yetkili bilgilerin bu aşçıyla paylaşılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Seç',
          onPress: async () => {
            setIslemde(true);
            try {
              await teklifSec(te.id);
              await yukle();
            } catch (e) {
              Alert.alert('Seçilemedi', `Talebin durumu değişmiş olabilir. Lütfen tekrar dene.${sebep(e)}`);
              await yukle();
            } finally {
              setIslemde(false);
            }
          },
        },
      ],
    );

  const iptal = () =>
    Alert.alert('Talebi iptal et', 'Bu kurumsal talebi iptal etmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await kurumsalTalepIptal(talep.id);
            await yukle();
          } catch {
            Alert.alert('İptal edilemedi', 'Lütfen tekrar dene.');
          }
        },
      },
    ]);

  const secilen = teklifler.find((x) => x.durum === 'kabul');
  const secimAcik = talep.durum === 'acik' && new Date(talep.baslangic_tarihi) > new Date();

  return (
    <Ekran baslik="Kurumsal Talep" geri={geri}>
      <ScrollView contentContainerStyle={styles.icerik}>
        <View style={styles.kart}>
          <View style={styles.kartUst}>
            <Text style={styles.sirket} numberOfLines={2}>{talep.sirket_adi}</Text>
            <Rozet yazi={KURUMSAL_DURUM_ADI[talep.durum]} ton={DURUM_TONU[talep.durum]} />
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
          {talep.durum === 'acik' ? (
            <Text style={styles.ipucu}>Teklifler {tarihSaatYaz(talep.son_teklif_tarihi)} tarihine kadar toplanır. İstediğin zaman, başlangıçtan önce bir teklifi seçebilirsin.</Text>
          ) : null}
        </View>

        {secilen && (talep.durum === 'secildi' || talep.durum === 'tamamlandi') ? (
          <View style={styles.secilenKutu}>
            <Ionicons name="checkmark-circle" size={22} color={colors.koyuMetin} />
            <Text style={styles.secilenYazi}>
              {secilen.asci_ad} ile anlaştın: kişi başı {tl(secilen.kisi_basi_fiyat)}, toplam {tl(toplamFiyat(secilen.kisi_basi_fiyat, talep))}. Aşçı adresini ve yetkili bilgilerini görebiliyor.
            </Text>
          </View>
        ) : null}

        <Text style={styles.bolum}>Teklifler ({teklifler.length})</Text>
        {teklifler.length === 0 ? (
          <Text style={styles.ipucu}>
            {talep.durum === 'acik' ? 'Henüz teklif gelmedi. Uygun aşçılar talebini inceleyip teklif gönderecek.' : 'Bu talep için teklif yok.'}
          </Text>
        ) : (
          teklifler.map((te, i) => {
            const toplam = toplamFiyat(te.kisi_basi_fiyat, talep);
            const butceyiAsiyor = talep.butce_kisi_basi != null && te.kisi_basi_fiyat > talep.butce_kisi_basi;
            return (
              <View key={te.id} style={[styles.teklif, te.durum === 'kabul' && styles.teklifKabul]}>
                <View style={styles.teklifUst}>
<ProfilResmi uri={te.asci_foto} kimlik={te.asci_id} style={styles.foto} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.asciAd}>{te.asci_ad}</Text>
                    {te.ortalama_puan != null && te.yorum_sayisi > 0 ? (
                      <Text style={styles.puan}>★ {Number(te.ortalama_puan).toLocaleString('tr-TR', { minimumFractionDigits: 1 })} ({te.yorum_sayisi} yorum)</Text>
                    ) : (
                      <Text style={styles.puan}>Yeni aşçı</Text>
                    )}
                  </View>
                  {i === 0 && te.durum === 'bekliyor' && teklifler.filter((x) => x.durum === 'bekliyor').length > 1 ? <Rozet yazi="En uygun" ton="beyaz" /> : null}
                  {te.durum === 'kabul' ? <Rozet yazi="Seçildi" ton="sari" /> : te.durum === 'red' ? <Rozet yazi="Seçilmedi" ton="soluk" /> : null}
                </View>
                <View style={styles.fiyatSatir}>
                  <View>
                    <Text style={styles.fiyat}>{tl(te.kisi_basi_fiyat)}</Text>
                    <Text style={styles.fiyatAlt}>kişi başı</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.toplam}>{tl(toplam)}</Text>
                    <Text style={styles.fiyatAlt}>toplam ({talep.kisi_sayisi} kişi × {talep.tekrar_sayisi} öğün)</Text>
                  </View>
                </View>
                {butceyiAsiyor ? <Text style={styles.uyari}>Bütçenin üzerinde</Text> : null}
                {te.mesaj ? <Text style={styles.mesaj}>{te.mesaj}</Text> : null}
                <View style={[styles.eylemler, { justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Pressable onPress={() => asciAc(te.asci_id)} accessibilityRole="button">
                    <Text style={styles.profilLink}>Aşçı profilini gör</Text>
                  </Pressable>
                  {talep.durum !== 'iptal' ? <MesajDugmesi ac={() => kurumsalSohbeti(te.id)} git={sohbetAc} yazi="Mesaj Gönder" /> : null}
                </View>
                {secimAcik && te.durum === 'bekliyor' ? (
                  <View style={{ marginTop: spacing.s }}>
                    <Dugme yazi="Bu Teklifi Seç" onPress={() => sec(te)} pasif={islemde} />
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {talep.durum === 'acik' || talep.durum === 'secildi' ? (
          <View style={{ marginTop: spacing.l }}>
            <Dugme yazi="Talebi İptal Et" tehlike onPress={iptal} />
          </View>
        ) : null}
      </ScrollView>
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
  secilenKutu: { flexDirection: 'row', gap: spacing.s, backgroundColor: colors.sari, borderRadius: radius.m, padding: spacing.m, alignItems: 'flex-start' },
  secilenYazi: { flex: 1, color: colors.koyuMetin, fontWeight: '600', fontSize: fontSize.kucuk + 1, lineHeight: 21 },
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin, marginTop: spacing.s },
  teklif: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: spacing.s },
  teklifKabul: { borderColor: colors.sari, borderWidth: 2 },
  teklifUst: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  foto: { width: 52, height: 52, borderRadius: radius.tam },
  asciAd: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin },
  puan: { fontSize: 13, color: colors.metinSoluk },
  fiyatSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  fiyat: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.sari },
  toplam: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin },
  fiyatAlt: { fontSize: 12, color: colors.metinSoluk },
  uyari: { fontSize: 13, color: colors.kirmiziAcik, fontWeight: '700' },
  mesaj: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 21, backgroundColor: colors.yuzeyUst, borderRadius: radius.s, padding: spacing.s + 4 },
  eylemler: { flexDirection: 'row' },
  profilLink: { color: colors.sari, fontWeight: '700', fontSize: fontSize.kucuk + 1 },
});
