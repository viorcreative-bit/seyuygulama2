import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AsciKarti from '../components/AsciKarti';
import { enSevilenAscilar, ornekAscilar } from '../data/ornekAscilar';
import { colors, fontSize, radius, spacing } from '../theme';

export default function AnaSayfa() {
  const ascilar = enSevilenAscilar(ornekAscilar);

  const talepEt = () =>
    Alert.alert('Çok yakında', 'Aşçı talep etme ekranı 6. aşamada eklenecek.');

  return (
    <View style={styles.kap}>
      <View style={styles.ust}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.slogan}>Ev yemeği, şef elinden.</Text>
      </View>

      <Pressable
        onPress={talepEt}
        style={({ pressed }) => [styles.buton, pressed && styles.butonBasili]}
        accessibilityRole="button"
      >
        <Text style={styles.butonYazi}>Hemen Aşçı Talep Et</Text>
      </Pressable>

      <Text style={styles.bolum}>En Sevilen Aşçılar</Text>
      <FlatList
        horizontal
        data={ascilar}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AsciKarti asci={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.liste}
        ItemSeparatorComponent={() => <View style={{ width: spacing.m }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
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
