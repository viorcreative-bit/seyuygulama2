import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Rozet, { Ton } from '../components/Rozet';
import { ACIK_DURUM_ADI, AcikFirsat, acikFirsatlar } from '../lib/acik';
import { supabase } from '../lib/supabase';
import { tarihSaatYaz } from '../lib/talepler';
import { tl } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';

// Aşçının bu talep için durumu ve rozeti.
export function acikFirsatDurumu(f: AcikFirsat): { yazi: string; ton: Ton; sira: number } {
  const te = f.benimTeklifim;
  if (te?.durum === 'kabul') return { yazi: 'Seçildin', ton: 'kirmizi', sira: 0 };
  if (te?.durum === 'red') return { yazi: 'Seçilmedi', ton: 'soluk', sira: 4 };
  if (te && f.durum === 'acik') return { yazi: 'Teklifin bekliyor', ton: 'beyaz', sira: 2 };
  if (!te && f.durum === 'acik') return { yazi: 'Teklif ver', ton: 'sari', sira: 1 };
  return { yazi: ACIK_DURUM_ADI[f.durum], ton: 'soluk', sira: 5 };
}

const kucuk = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

type Props = { ac: (id: string) => void };

// Aşçının "Teklif Ver" bölümü: müşterilerin açık talepleri ve verdiği teklifler.
export default function AcikFirsatlar({ ac }: Props) {
  const { oturum } = useAuth();
  const [liste, setListe] = useState<AcikFirsat[] | null>(null);
  const [semtler, setSemtler] = useState<string[]>([]);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      const uid = oturum!.user.id;
      const [l, p] = await Promise.all([
        acikFirsatlar(uid),
        supabase.from('asci_profilleri').select('semtler').eq('profil_id', uid).maybeSingle(),
      ]);
      setSemtler(((p.data?.semtler as string[] | undefined) ?? []).map(kucuk));
      const simdi = new Date();
      // Süresi geçmiş ve teklif vermediğin talepler gösterilmez.
      setListe(
        l
          .filter((f) => f.benimTeklifim || (f.durum === 'acik' && new Date(f.tarih) > simdi))
          .sort((a, b) => acikFirsatDurumu(a).sira - acikFirsatDurumu(b).sira || a.tarih.localeCompare(b.tarih)),
      );
      setHata('');
    } catch {
      setHata('Talepler yüklenemedi. İnternetini kontrol edip tekrar dene.');
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
      ListEmptyComponent={
        hata ? (
          <Bos mesaj={hata} simge="cloud-offline-outline" />
        ) : !liste ? (
          <Bos yukleniyor />
        ) : (
          <Bos mesaj="Şu an teklif verebileceğin açık müşteri talebi yok. Yeni talepler geldiğinde burada görünür." simge="restaurant-outline" />
        )
      }
      renderItem={({ item: f }) => {
        const d = acikFirsatDurumu(f);
        const te = f.benimTeklifim;
        const semtinde = semtler.some((s) => s && kucuk(f.semt).includes(s));
        return (
          <Pressable onPress={() => ac(f.id)} style={({ pressed }) => [styles.kart, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <View style={styles.kartUst}>
              <Text style={styles.ad} numberOfLines={2}>{f.istenen_yemekler}</Text>
              <Rozet yazi={d.yazi} ton={d.ton} />
            </View>
            <View style={styles.bilgi}>
              <Ionicons name="calendar-outline" size={16} color={colors.metinSoluk} />
              <Text style={styles.bilgiYazi}>{tarihSaatYaz(f.tarih)} · {f.kisi_sayisi} kişilik</Text>
            </View>
            <View style={styles.bilgi}>
              <Ionicons name="location-outline" size={16} color={colors.metinSoluk} />
              <Text style={styles.bilgiYazi}>{f.semt}</Text>
              {semtinde ? <Rozet yazi="Senin semtinde" ton="cizgili" /> : null}
            </View>
            {te ? <Text style={styles.teklifYazi}>Teklifin: {tl(te.fiyat)}</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m, gap: 6 },
  kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.s, marginBottom: 2 },
  ad: { fontSize: fontSize.normal + 1, fontWeight: '800', color: colors.metin, flex: 1 },
  bilgi: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  bilgiYazi: { fontSize: fontSize.kucuk + 1, color: colors.metinSoluk, flexShrink: 1 },
  teklifYazi: { fontSize: fontSize.kucuk + 1, fontWeight: '700', color: colors.sari, marginTop: 4 },
});
