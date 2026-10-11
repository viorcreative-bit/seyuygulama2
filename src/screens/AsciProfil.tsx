import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import { Yildizlar } from '../components/Yildizlar';
import YorumKarti from '../components/YorumKarti';
import { supabase } from '../lib/supabase';
import { tl, Vitrin } from '../lib/vitrin';
import { Yorum, asciYorumlari } from '../lib/yorumlar';
import { colors, fontSize, radius, spacing } from '../theme';

function Etiketler({ liste }: { liste: string[] }) {
  return (
    <View style={styles.etiketler}>
      {liste.map((e) => (
        <View key={e} style={styles.etiket}>
          <Text style={styles.etiketYazi}>{e}</Text>
        </View>
      ))}
    </View>
  );
}

// Müşterinin gördüğü aşçı profil sayfası.
type Props = { asciId: string; geri: () => void; talepEt?: () => void };

export default function AsciProfil({ asciId, geri, talepEt }: Props) {
  const [asci, setAsci] = useState<Vitrin | null>(null);
  const [galeri, setGaleri] = useState<string[]>([]);
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, f, y] = await Promise.all([
        supabase.from('asci_vitrini').select('*').eq('id', asciId).maybeSingle(),
        supabase.from('asci_fotograflari').select('adres').eq('asci_id', asciId).order('sira'),
        asciYorumlari(asciId).catch(() => [] as Yorum[]),
      ]);
      setYorumlar(y);
      setAsci((a.data as Vitrin | null) ?? null);
      setGaleri((f.data ?? []).map((x: { adres: string }) => x.adres));
      setYukleniyor(false);
    })();
  }, [asciId]);

  if (yukleniyor || !asci) {
    return (
      <Ekran baslik="Aşçı" geri={geri}>
        <Bos yukleniyor={yukleniyor} mesaj="Bu aşçının profili bulunamadı." />
      </Ekran>
    );
  }

  const kapak = asci.fotograf ?? galeri[0] ?? null;
  const bas = asci.ad.split(' ').map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR');
  const puanVar = asci.ortalama_puan != null && asci.yorum_sayisi > 0;

  return (
    <View style={styles.kap}>
      <ScrollView contentContainerStyle={{ paddingBottom: talepEt ? 110 : spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.kapak}>
          {kapak ? (
            <Image source={{ uri: kapak }} style={styles.kapakFoto} />
          ) : (
            <View style={[styles.kapakFoto, styles.kapakBos]}>
              <Text style={styles.kapakYazi}>{bas}</Text>
            </View>
          )}
          <LinearGradient colors={['transparent', colors.zemin]} style={styles.kapakGolge} />
          <Pressable onPress={geri} style={styles.geri} accessibilityRole="button" accessibilityLabel="Geri">
            <Ionicons name="chevron-back" size={22} color={colors.metin} />
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.ad}>{asci.ad}</Text>
          {asci.uzmanliklar.length > 0 ? <Text style={styles.uzmanlik}>{asci.uzmanliklar.slice(0, 3).join(' · ')}</Text> : null}

          <View style={styles.ozetSatir}>
            <View style={styles.ozet}>
              <Ionicons name="star" size={16} color={colors.sari} />
              <Text style={styles.ozetYazi}>
                {puanVar ? `${Number(asci.ortalama_puan).toLocaleString('tr-TR', { minimumFractionDigits: 1 })} (${asci.yorum_sayisi})` : 'Yeni aşçı'}
              </Text>
            </View>
            {asci.semtler.length > 0 ? (
              <View style={styles.ozet}>
                <Ionicons name="location" size={16} color={colors.sari} />
                <Text style={styles.ozetYazi} numberOfLines={1}>{asci.semtler.slice(0, 2).join(', ')}</Text>
              </View>
            ) : null}
          </View>

          {asci.baslangic_fiyati != null ? (
            <View style={styles.fiyatKutu}>
              <Text style={styles.fiyatEtiket}>Bir haftalık hizmet için başlangıç</Text>
              <Text style={styles.fiyat}>{tl(asci.baslangic_fiyati)}</Text>
            </View>
          ) : null}

          {asci.tanitim ? (
            <>
              <Text style={styles.bolum}>Hakkında</Text>
              <Text style={styles.metin}>{asci.tanitim}</Text>
            </>
          ) : null}

          {asci.uzmanliklar.length > 0 ? (
            <>
              <Text style={styles.bolum}>Uzmanlık alanları</Text>
              <Etiketler liste={asci.uzmanliklar} />
            </>
          ) : null}

          {asci.semtler.length > 0 ? (
            <>
              <Text style={styles.bolum}>Hizmet verdiği semtler</Text>
              <Etiketler liste={asci.semtler} />
            </>
          ) : null}

          {asci.musait_gunler.length > 0 ? (
            <>
              <Text style={styles.bolum}>Müsait günler</Text>
              <Etiketler liste={asci.musait_gunler} />
            </>
          ) : null}

          {galeri.length > 0 ? (
            <>
              <Text style={styles.bolum}>Yemeklerinden</Text>
              <FlatList
                horizontal
                data={galeri}
                keyExtractor={(g) => g}
                renderItem={({ item }) => <Image source={{ uri: item }} style={styles.galeriFoto} />}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: spacing.s }} />}
              />
            </>
          ) : null}

          <Text style={styles.bolum}>Yorumlar</Text>
          {puanVar ? (
            <View style={styles.yorumOzet}>
              <Yildizlar puan={Number(asci.ortalama_puan)} boyut={20} />
            </View>
          ) : null}
          {yorumlar.length === 0 ? (
            <Text style={styles.metin}>Henüz yorum yok. İlk hizmetten sonra yorumlar burada görünecek.</Text>
          ) : (
            <View style={{ gap: spacing.s }}>
              {yorumlar.map((y) => (
                <YorumKarti key={y.id} yorum={y} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {talepEt ? (
        <View style={styles.alt}>
          <Dugme yazi="Bu Aşçıdan Talep Et" onPress={talepEt} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.zemin },
  kapak: { height: 330 },
  kapakFoto: { width: '100%', height: '100%' },
  kapakBos: { backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  kapakYazi: { color: colors.sari, fontSize: 72, fontWeight: '800' },
  kapakGolge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  geri: {
    position: 'absolute',
    top: 56,
    left: spacing.l,
    width: 42,
    height: 42,
    borderRadius: radius.tam,
    backgroundColor: colors.zemin,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: { paddingHorizontal: spacing.l, marginTop: -spacing.l },
  ad: { fontSize: 32, fontWeight: '800', color: colors.metin },
  uzmanlik: { fontSize: fontSize.normal, color: colors.metinSoluk, marginTop: 2 },
  ozetSatir: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m, flexWrap: 'wrap' },
  ozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yuzey,
    borderRadius: radius.tam,
    borderWidth: 1,
    borderColor: colors.cizgi,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: '70%',
  },
  ozetYazi: { color: colors.metin, fontWeight: '700', fontSize: fontSize.kucuk },
  fiyatKutu: { marginTop: spacing.l, backgroundColor: colors.sari, borderRadius: radius.m, padding: spacing.m, alignItems: 'center' },
  fiyatEtiket: { color: colors.koyuMetin, fontSize: fontSize.kucuk, opacity: 0.8 },
  fiyat: { color: colors.koyuMetin, fontSize: fontSize.buyuk + 4, fontWeight: '800', marginTop: 2 },
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin, marginTop: spacing.l, marginBottom: spacing.s },
  metin: { fontSize: fontSize.normal, color: colors.metinSoluk, lineHeight: 24 },
  etiketler: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  etiket: { backgroundColor: colors.yuzey, borderWidth: 1, borderColor: colors.cizgi, borderRadius: radius.tam, paddingVertical: 7, paddingHorizontal: 14 },
  etiketYazi: { fontSize: fontSize.kucuk, color: colors.metin, fontWeight: '600' },
  galeriFoto: { width: 160, height: 160, borderRadius: radius.m },
  yorumOzet: { marginBottom: spacing.s },
  alt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.l,
    paddingBottom: spacing.xl,
    backgroundColor: colors.zemin,
    borderTopWidth: 1,
    borderTopColor: colors.cizgi,
  },
});
