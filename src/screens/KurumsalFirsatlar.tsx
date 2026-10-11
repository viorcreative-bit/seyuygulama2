import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Rozet, { Ton } from '../components/Rozet';
import { Firsat, KURUMSAL_DURUM_ADI, OGUN_ADI, kurumsalFirsatlar, tekrarYazisi, toplamFiyat } from '../lib/kurumsal';
import { supabase } from '../lib/supabase';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';

// Aşçının bu talep için durumu ve rozeti.
export function firsatDurumu(f: Firsat): { yazi: string; ton: Ton; sira: number } {
  const te = f.benimTeklifim;
  if (te?.durum === 'kabul') return f.durum === 'tamamlandi' ? { yazi: 'Tamamlandı', ton: 'beyaz', sira: 3 } : { yazi: 'Seçildin', ton: 'kirmizi', sira: 0 };
  if (te?.durum === 'red') return { yazi: 'Seçilmedi', ton: 'soluk', sira: 4 };
  if (te && f.durum === 'acik') return { yazi: 'Teklifin bekliyor', ton: 'beyaz', sira: 2 };
  if (!te && f.durum === 'acik') return { yazi: 'Teklif ver', ton: 'sari', sira: 1 };
  return { yazi: KURUMSAL_DURUM_ADI[f.durum], ton: 'soluk', sira: 5 };
}

type Props = { ac: (id: string) => void; profilAc: () => void };

// Aşçının "Kurumsal" bölümü: teklif verebileceği fırsatlar ve verdiği teklifler.
export default function KurumsalFirsatlar({ ac, profilAc }: Props) {
  const { oturum } = useAuth();
  const [liste, setListe] = useState<Firsat[] | null>(null);
  const [kurumsalMi, setKurumsalMi] = useState<boolean | null>(null);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      const uid = oturum!.user.id;
      const [l, p] = await Promise.all([
        kurumsalFirsatlar(uid),
        supabase.from('asci_profilleri').select('kurumsal_mi').eq('profil_id', uid).maybeSingle(),
      ]);
      setKurumsalMi(p.data?.kurumsal_mi ?? false);
      setListe(l.sort((a, b) => firsatDurumu(a).sira - firsatDurumu(b).sira || a.baslangic_tarihi.localeCompare(b.baslangic_tarihi)));
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
      ListHeaderComponent={
        kurumsalMi === false ? (
          <Pressable onPress={profilAc} style={styles.davet} accessibilityRole="button">
            <Ionicons name="business" size={26} color={colors.koyuMetin} />
            <View style={{ flex: 1 }}>
              <Text style={styles.davetBaslik}>Şirketlere toplu yemek yapmak ister misin?</Text>
              <Text style={styles.davetAlt}>Profilinde "Kurumsal hizmet" seçeneğini aç, şirketlerin taleplerine teklif ver.</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.koyuMetin} />
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        hata ? (
          <Bos mesaj={hata} simge="cloud-offline-outline" />
        ) : !liste ? (
          <Bos yukleniyor />
        ) : kurumsalMi ? (
          <Bos mesaj="Şu an kapasitene uyan açık kurumsal talep yok. Yeni talepler geldiğinde burada görünür." simge="business-outline" />
        ) : null
      }
      renderItem={({ item: f }) => {
        const d = firsatDurumu(f);
        const te = f.benimTeklifim;
        return (
          <Pressable onPress={() => ac(f.id)} style={({ pressed }) => [styles.kart, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <View style={styles.kartUst}>
              <Text style={styles.ad} numberOfLines={1}>{f.sirket_adi}</Text>
              <Rozet yazi={d.yazi} ton={d.ton} />
            </View>
            <View style={styles.bilgi}>
              <Ionicons name="calendar-outline" size={16} color={colors.metinSoluk} />
              <Text style={styles.bilgiYazi}>{tarihSaatYaz(f.baslangic_tarihi)} · {tekrarYazisi(f)}</Text>
            </View>
            <View style={styles.bilgi}>
              <Ionicons name="people-outline" size={16} color={colors.metinSoluk} />
              <Text style={styles.bilgiYazi}>{f.kisi_sayisi} kişi · {OGUN_ADI[f.ogun]}</Text>
            </View>
            <View style={styles.bilgi}>
              <Ionicons name="location-outline" size={16} color={colors.metinSoluk} />
              <Text style={styles.bilgiYazi}>{f.semt}</Text>
            </View>
            {te ? (
              <Text style={styles.teklifYazi}>Teklifin: kişi başı {tl(te.kisi_basi_fiyat)} · toplam {tl(toplamFiyat(te.kisi_basi_fiyat, f))}</Text>
            ) : f.butce_kisi_basi ? (
              <Text style={styles.teklifYazi}>Şirketin bütçesi: kişi başı {tl(f.butce_kisi_basi)}</Text>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  davet: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, backgroundColor: colors.sari, borderRadius: radius.m, padding: spacing.m, marginBottom: spacing.m },
  davetBaslik: { color: colors.koyuMetin, fontWeight: '800', fontSize: fontSize.normal },
  davetAlt: { color: colors.koyuMetin, fontSize: 13, marginTop: 2, opacity: 0.85 },
  kart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: 6 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s, marginBottom: 2 },
  ad: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.metin, flex: 1 },
  bilgi: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  bilgiYazi: { fontSize: fontSize.kucuk + 1, color: colors.metinSoluk, flex: 1 },
  teklifYazi: { fontSize: fontSize.kucuk + 1, fontWeight: '700', color: colors.sari, marginTop: 4 },
});
