import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Dugme from '../components/Dugme';
import { supabase } from '../lib/supabase';
import { tl, Vitrin } from '../lib/vitrin';
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
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, f] = await Promise.all([
        supabase.from('asci_vitrini').select('*').eq('id', asciId).maybeSingle(),
        supabase.from('asci_fotograflari').select('adres').eq('asci_id', asciId).order('sira'),
      ]);
      setAsci((a.data as Vitrin | null) ?? null);
      setGaleri((f.data ?? []).map((x: { adres: string }) => x.adres));
      setYukleniyor(false);
    })();
  }, [asciId]);

  const ustBar = (
    <View style={styles.ust}>
      <Pressable onPress={geri} accessibilityRole="button">
        <Text style={styles.geri}>‹ Geri</Text>
      </Pressable>
    </View>
  );

  if (yukleniyor) {
    return (
      <View style={styles.kap}>
        {ustBar}
        <ActivityIndicator size="large" color={colors.kirmizi} style={{ marginTop: 80 }} />
      </View>
    );
  }
  if (!asci) {
    return (
      <View style={styles.kap}>
        {ustBar}
        <Text style={styles.bos}>Bu aşçının profili bulunamadı.</Text>
      </View>
    );
  }

  const bas = asci.ad.split(' ').map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR');

  return (
    <View style={styles.kap}>
      {ustBar}
      <ScrollView contentContainerStyle={styles.icerik}>
        <View style={styles.baslikAlan}>
          {asci.fotograf ? (
            <Image source={{ uri: asci.fotograf }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.fotoBos]}>
              <Text style={styles.fotoBosYazi}>{bas}</Text>
            </View>
          )}
          <Text style={styles.ad}>{asci.ad}</Text>
          {asci.uzmanliklar.length > 0 ? (
            <Text style={styles.uzmanlik}>{asci.uzmanliklar.slice(0, 3).join(' · ')}</Text>
          ) : null}
          <Text style={styles.puan}>Yeni aşçı · henüz yorum yok</Text>
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
        <Text style={styles.metin}>Henüz yorum yok. İlk hizmetten sonra yorumlar burada görünecek.</Text>

        {talepEt ? (
          <View style={{ marginTop: spacing.xl }}>
            <Dugme yazi="Bu Aşçıdan Talep Et" onPress={talepEt} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  icerik: { padding: spacing.l, paddingBottom: 60 },
  bos: { textAlign: 'center', marginTop: 80, fontSize: fontSize.normal, color: colors.metin },
  baslikAlan: { alignItems: 'center' },
  foto: { width: 130, height: 130, borderRadius: radius.tam },
  fotoBos: { backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center' },
  fotoBosYazi: { color: colors.sari, fontSize: 44, fontWeight: '700' },
  ad: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.metin, marginTop: spacing.m },
  uzmanlik: { fontSize: fontSize.normal, color: colors.metin, opacity: 0.7, marginTop: 4, textAlign: 'center' },
  puan: { marginTop: spacing.s, fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.6 },
  fiyatKutu: {
    marginTop: spacing.l,
    backgroundColor: colors.kirmizi,
    borderRadius: radius.m,
    padding: spacing.m,
    alignItems: 'center',
  },
  fiyatEtiket: { color: colors.krem, fontSize: fontSize.kucuk },
  fiyat: { color: colors.sari, fontSize: fontSize.buyuk, fontWeight: '800', marginTop: 2 },
  bolum: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.kirmizi, marginTop: spacing.l, marginBottom: spacing.s },
  metin: { fontSize: fontSize.normal, color: colors.metin, lineHeight: 24 },
  etiketler: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  etiket: { backgroundColor: colors.beyaz, borderWidth: 1, borderColor: colors.cizgi, borderRadius: radius.tam, paddingVertical: 6, paddingHorizontal: 14 },
  etiketYazi: { fontSize: fontSize.kucuk, color: colors.metin, fontWeight: '600' },
  galeriFoto: { width: 150, height: 150, borderRadius: radius.m },
});
