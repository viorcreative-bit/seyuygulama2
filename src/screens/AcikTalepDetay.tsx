import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import ProfilResmi from '../components/ProfilResmi';
import Dugme from '../components/Dugme';
import MesajDugmesi from '../components/MesajDugmesi';
import { teklifSohbeti } from '../lib/sohbet';
import Ekran from '../components/Ekran';
import Rozet from '../components/Rozet';
import { ACIK_DURUM_ADI, AcikTalep, AcikTeklif, acikTalepGetir, acikTalepIptal, acikTeklifleri, acikTeklifSec } from '../lib/acik';
import { sebep } from '../lib/hata';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';
import { ACIK_TON } from './AcikTaleplerim';

type Props = { talepId: string; geri: () => void; asciAc: (id: string) => void; talebeGit: () => void; sohbetAc: (sohbetId: string) => void };

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  if (!deger) return null;
  return (
    <Text style={styles.satir}>
      <Text style={styles.satirEtiket}>{etiket}: </Text>
      {deger}
    </Text>
  );
}

// Müşterinin açık talebi: özet, gelen teklifler ve teklif seçme.
export default function AcikTalepDetay({ talepId, geri, asciAc, talebeGit, sohbetAc }: Props) {
  const [talep, setTalep] = useState<AcikTalep | null>(null);
  const [teklifler, setTeklifler] = useState<AcikTeklif[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemde, setIslemde] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const [t, te] = await Promise.all([acikTalepGetir(talepId), acikTeklifleri(talepId)]);
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
      <Ekran baslik="Talebim" geri={geri}>
        <Bos yukleniyor={yukleniyor} mesaj="Talep bulunamadı." />
      </Ekran>
    );
  }

  const sec = (te: AcikTeklif) =>
    Alert.alert(
      'Teklifi seç',
      `${te.asci_ad} aşçısının ${tl(te.fiyat)} teklifini seçmek istiyor musun? Diğer teklifler reddedilir ve açık adresin yalnızca bu aşçıyla paylaşılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Seç',
          onPress: async () => {
            setIslemde(true);
            try {
              await acikTeklifSec(te.id);
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
    Alert.alert('Talebi iptal et', 'Bu talebi iptal etmek istediğine emin misin? Gelen teklifler reddedilir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await acikTalepIptal(talep.id);
            await yukle();
          } catch {
            Alert.alert('İptal edilemedi', 'Lütfen tekrar dene.');
          }
        },
      },
    ]);

  const secilen = teklifler.find((x) => x.durum === 'kabul');
  const gecti = new Date(talep.tarih) <= new Date();
  const secimAcik = talep.durum === 'acik' && !gecti;

  return (
    <Ekran baslik="Talebim" geri={geri}>
      <ScrollView contentContainerStyle={styles.icerik}>
        <View style={styles.kart}>
          <View style={styles.kartUst}>
            <Text style={styles.yemek}>{talep.istenen_yemekler}</Text>
            <Rozet yazi={talep.durum === 'acik' && gecti ? 'Süresi doldu' : ACIK_DURUM_ADI[talep.durum]} ton={talep.durum === 'acik' && gecti ? 'soluk' : ACIK_TON[talep.durum]} />
          </View>
          <Satir etiket="Gün ve saat" deger={tarihSaatYaz(talep.tarih)} />
          <Satir etiket="Kişi sayısı" deger={`${talep.kisi_sayisi} kişi`} />
          <Satir etiket="Semt" deger={talep.semt} />
          <Satir etiket="Mutfak" deger={talep.mutfak_tercihleri.join(', ')} />
          <Satir etiket="Alerjiler" deger={talep.alerjiler} />
          <Satir etiket="Notlar" deger={talep.notlar} />
          {secimAcik ? <Text style={styles.ipucu}>Hizmet gününden önce istediğin zaman bir teklifi seçebilirsin.</Text> : null}
        </View>

        {secilen && talep.durum === 'secildi' ? (
          <View style={styles.secilenKutu}>
            <Ionicons name="checkmark-circle" size={22} color={colors.koyuMetin} />
            <View style={{ flex: 1, gap: spacing.s }}>
              <Text style={styles.secilenYazi}>
                {secilen.asci_ad} ile {tl(secilen.fiyat)} karşılığında anlaştın. Talebin kabul edildi ve "Doğrudan" talepler bölümünde takip edebilirsin.
              </Text>
              <Pressable onPress={talebeGit} accessibilityRole="button">
                <Text style={styles.secilenLink}>Talebe git →</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={styles.bolum}>Teklifler ({teklifler.length})</Text>
        {teklifler.length === 0 ? (
          <Text style={styles.ipucu}>
            {talep.durum === 'acik' ? 'Henüz teklif gelmedi. Aşçılar talebini inceleyip teklif gönderecek.' : 'Bu talep için teklif yok.'}
          </Text>
        ) : (
          teklifler.map((te, i) => (
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
              <Text style={styles.fiyat}>{tl(te.fiyat)}</Text>
              {te.mesaj ? <Text style={styles.mesaj}>{te.mesaj}</Text> : null}
              <View style={styles.eylem}>
                <Pressable onPress={() => asciAc(te.asci_id)} accessibilityRole="button">
                  <Text style={styles.profilLink}>Aşçı profilini gör</Text>
                </Pressable>
                {talep.durum !== 'iptal' ? <MesajDugmesi ac={() => teklifSohbeti(te.id)} git={sohbetAc} yazi="Mesaj Gönder" /> : null}
              </View>
              {secimAcik && te.durum === 'bekliyor' ? (
                <View style={{ marginTop: spacing.s }}>
                  <Dugme yazi="Bu Teklifi Seç" onPress={() => sec(te)} pasif={islemde} />
                </View>
              ) : null}
            </View>
          ))
        )}

        {talep.durum === 'acik' ? (
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
  yemek: { flex: 1, fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin, lineHeight: 24 },
  satir: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 22 },
  satirEtiket: { fontWeight: '700', color: colors.metinSoluk },
  ipucu: { fontSize: 13, color: colors.metinSoluk, lineHeight: 19, marginTop: 4 },
  secilenKutu: { flexDirection: 'row', gap: spacing.s, backgroundColor: colors.sari, borderRadius: radius.m, padding: spacing.m, alignItems: 'flex-start' },
  secilenYazi: { color: colors.koyuMetin, fontWeight: '600', fontSize: fontSize.kucuk + 1, lineHeight: 21 },
  secilenLink: { color: colors.koyuMetin, fontWeight: '800', fontSize: fontSize.kucuk + 1 },
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin, marginTop: spacing.s },
  teklif: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: spacing.s },
  teklifKabul: { borderColor: colors.sari, borderWidth: 2 },
  teklifUst: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  foto: { width: 52, height: 52, borderRadius: radius.tam },
  asciAd: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin },
  puan: { fontSize: 13, color: colors.metinSoluk },
  fiyat: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.sari },
  mesaj: { fontSize: fontSize.kucuk + 1, color: colors.metin, lineHeight: 21, backgroundColor: colors.yuzeyUst, borderRadius: radius.s, padding: spacing.s + 4 },
  eylem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.m },
  profilLink: { color: colors.sari, fontWeight: '700', fontSize: fontSize.kucuk + 1 },
});
