import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsciKarti from '../components/AsciKarti';
import { useAuth } from '../auth/AuthContext';
import { bekleyenTalepSayisi } from '../lib/talepler';
import { Asci, EN_AZ_YORUM, enSevilenAscilar, vitrindenKarta, yeniAscilar } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  profilDuzenle: () => void;
  asciAc: (id: string) => void;
  talepEt: () => void;
  taleplerim: () => void;
  gelenTalepler: () => void;
  sifreDegistir: () => void;
  yorumlarim: () => void;
};

export default function AnaSayfa({ profilDuzenle, asciAc, talepEt, taleplerim, gelenTalepler, sifreDegistir, yorumlarim }: Props) {
  const { profil, cikisYap } = useAuth();
  const [yeniler, setYeniler] = useState<Asci[]>([]);
  const [sevilenler, setSevilenler] = useState<Asci[]>([]);

  const [listeDurumu, setListeDurumu] = useState('');
  const [bekleyen, setBekleyen] = useState(0);

  useEffect(() => {
    if (profil?.rol === 'asci') bekleyenTalepSayisi().then(setBekleyen);
  }, [profil?.rol]);

  useEffect(() => {
    Promise.all([yeniAscilar(), enSevilenAscilar()])
      .then(([tumu, sevilen]) => {
        setYeniler(tumu.map(vitrindenKarta));
        setSevilenler(sevilen.map(vitrindenKarta));
        setListeDurumu(tumu.length === 0 ? 'Henüz profili kaydedilmiş aşçı yok.' : '');
      })
      .catch((e: { message?: string }) => setListeDurumu(`Aşçı listesi yüklenemedi. (Sebep: ${e.message ?? 'bilinmiyor'})`));
  }, []);

  return (
    <ScrollView style={styles.kap} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.ustSatir}>
        <Text style={styles.merhaba}>Merhaba, {profil?.ad}</Text>
        <View style={styles.ustLinkler}>
          <Pressable onPress={sifreDegistir} accessibilityRole="button">
            <Text style={styles.cikis}>Şifre</Text>
          </Pressable>
          <Pressable onPress={cikisYap} accessibilityRole="button">
            <Text style={styles.cikis}>Çıkış</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.ust}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.slogan}>Ev yemeği, şef elinden.</Text>
      </View>

      {profil?.rol === 'musteri' ? (
        <>
          <Pressable
            onPress={talepEt}
            style={({ pressed }) => [styles.buton, pressed && styles.butonBasili]}
            accessibilityRole="button"
          >
            <Text style={styles.butonYazi}>Hemen Aşçı Talep Et</Text>
          </Pressable>
          <Pressable onPress={taleplerim} style={styles.profilButon} accessibilityRole="button">
            <Text style={styles.profilButonYazi}>Taleplerim</Text>
          </Pressable>
        </>
      ) : null}

      {profil?.rol === 'asci' ? (
        <Pressable
          onPress={gelenTalepler}
          style={({ pressed }) => [styles.buton, pressed && styles.butonBasili]}
          accessibilityRole="button"
        >
          <Text style={styles.butonYazi}>
            Gelen Talepler{bekleyen > 0 ? ` (${bekleyen})` : ''}
          </Text>
        </Pressable>
      ) : null}

      {profil?.rol === 'asci' ? (
        <Pressable
          onPress={profilDuzenle}
          style={styles.profilButon}
          accessibilityRole="button"
        >
          <Text style={styles.profilButonYazi}>Aşçı Profilimi Düzenle</Text>
        </Pressable>
      ) : null}
      {profil?.rol === 'asci' ? (
        <Pressable onPress={yorumlarim} style={styles.profilButon} accessibilityRole="button">
          <Text style={styles.profilButonYazi}>Yorumlarım</Text>
        </Pressable>
      ) : null}

      <Text style={styles.bolum}>En Sevilen Aşçılar</Text>
      {sevilenler.length > 0 ? (
        <FlatList
          horizontal
          data={sevilenler}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AsciKarti asci={item} onPress={() => asciAc(item.id)} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.liste}
          ItemSeparatorComponent={() => <View style={{ width: spacing.m }} />}
        />
      ) : (
        <Text style={styles.durum}>
          Aşçılar en az {EN_AZ_YORUM} yorum aldığında en yüksek puanlılar burada listelenecek.
        </Text>
      )}

      {yeniler.length > 0 ? (
        <>
          <Text style={styles.bolum}>Aşçılarımız</Text>
          <FlatList
            horizontal
            data={yeniler}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => <AsciKarti asci={item} onPress={() => asciAc(item.id)} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liste}
            ItemSeparatorComponent={() => <View style={{ width: spacing.m }} />}
          />
        </>
      ) : listeDurumu ? (
        <>
          <Text style={styles.bolum}>Aşçılarımız</Text>
          <Text style={styles.durum}>{listeDurumu}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem },
  ustSatir: { paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.l },
  ustLinkler: { flexDirection: 'row', gap: spacing.l },
  merhaba: { fontSize: fontSize.normal, color: colors.metin, fontWeight: '600' },
  cikis: { fontSize: fontSize.normal, color: colors.kirmizi, fontWeight: '700' },
  ust: { alignItems: 'center', paddingHorizontal: spacing.l },
  logo: { width: 140, height: 140, resizeMode: 'contain' },
  slogan: { marginTop: spacing.s, fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '600' },
  buton: {
    marginHorizontal: spacing.l,
    marginTop: spacing.l,
    paddingVertical: 22,
    borderRadius: radius.l,
    backgroundColor: colors.kirmizi,
    alignItems: 'center',
    shadowColor: colors.kirmizi,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  butonBasili: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  butonYazi: { color: colors.sari, fontSize: fontSize.buyuk, fontWeight: '800' },
  profilButon: {
    marginHorizontal: spacing.l,
    marginTop: spacing.m,
    paddingVertical: 14,
    borderRadius: radius.l,
    borderWidth: 2,
    borderColor: colors.kirmizi,
    alignItems: 'center',
  },
  profilButonYazi: { color: colors.kirmizi, fontSize: fontSize.normal + 2, fontWeight: '800' },
  durum: { marginHorizontal: spacing.l, fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.7 },
  bolum: {
    fontSize: fontSize.baslik,
    fontWeight: '700',
    color: colors.kirmizi,
    marginTop: spacing.xl,
    marginBottom: spacing.m,
    marginHorizontal: spacing.l,
  },
  liste: { paddingHorizontal: spacing.l, paddingBottom: spacing.l },
});
