import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { colors, fontSize, spacing } from '../theme';

type Props = { musteriGirisi: () => void; asciGirisi: () => void; kaydol: () => void };

// Uygulama ilk açıldığında görünen ekran.
export default function Karsilama({ musteriGirisi, asciGirisi, kaydol }: Props) {
  const { girisHatasi, setGirisHatasi } = useAuth();
  const git = (f: () => void) => () => {
    setGirisHatasi('');
    f();
  };
  return (
    <View style={styles.kap}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.slogan}>Ev yemeği, şef elinden.</Text>
      {girisHatasi ? <Text style={styles.hata}>{girisHatasi}</Text> : null}
      <View style={styles.butonlar}>
        <Dugme yazi="Müşteri Girişi" onPress={git(musteriGirisi)} />
        <Dugme yazi="Aşçı Girişi" onPress={git(asciGirisi)} />
        <Dugme yazi="Kaydol" cerceveli onPress={git(kaydol)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, padding: spacing.l, justifyContent: 'center' },
  logo: { width: 220, height: 220, alignSelf: 'center' },
  slogan: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '600', textAlign: 'center', marginTop: spacing.m },
  hata: { color: colors.kirmizi, fontWeight: '600', textAlign: 'center', marginTop: spacing.m, fontSize: fontSize.kucuk + 1 },
  butonlar: { gap: spacing.m, marginTop: spacing.xl },
});
