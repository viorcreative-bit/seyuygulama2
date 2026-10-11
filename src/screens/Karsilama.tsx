import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { colors, fontSize, radius, spacing } from '../theme';
import { YASAL_ADLARI, YasalAnahtar } from '../yasal';

type Props = { musteriGirisi: () => void; asciGirisi: () => void; kaydol: () => void; yasal: (a: YasalAnahtar) => void };

// Uygulama ilk açıldığında görünen ekran.
export default function Karsilama({ musteriGirisi, asciGirisi, kaydol, yasal }: Props) {
  const { girisHatasi, setGirisHatasi } = useAuth();
  const git = (f: () => void) => () => {
    setGirisHatasi('');
    f();
  };
  return (
    <View style={styles.kap}>
      <LinearGradient colors={[colors.zeminUst, colors.zemin]} style={StyleSheet.absoluteFill} />
      <View style={styles.ust}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.baslik}>Aşçım Gelsin</Text>
        <Text style={styles.slogan}>Ev yemeği, şef elinden.</Text>
      </View>
      <View style={styles.alt}>
        {girisHatasi ? <Text style={styles.hata}>{girisHatasi}</Text> : null}
        <Dugme yazi="Müşteri Girişi" onPress={git(musteriGirisi)} />
        <Dugme yazi="Aşçı Girişi" onPress={git(asciGirisi)} />
        <Dugme yazi="Kaydol" cerceveli onPress={git(kaydol)} />
        <Text style={styles.yasal}>
          {(['kosullar', 'gizlilik', 'kvkk'] as YasalAnahtar[]).map((a, i) => (
            <Text key={a} onPress={() => yasal(a)} style={styles.yasalBaglanti}>
              {i > 0 ? '  ·  ' : ''}{YASAL_ADLARI[a]}
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.zemin, padding: spacing.l, justifyContent: 'space-between' },
  ust: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 230, height: 230, borderRadius: radius.tam },
  baslik: { fontSize: 36, fontWeight: '800', color: colors.metin, marginTop: spacing.l },
  slogan: { fontSize: fontSize.baslik, color: colors.sari, fontWeight: '600', marginTop: spacing.s },
  alt: { gap: spacing.m, paddingBottom: spacing.l },
  yasal: { textAlign: 'center', marginTop: spacing.s, lineHeight: 22 },
  yasalBaglanti: { color: colors.metinSoluk, fontSize: 13 },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', textAlign: 'center', fontSize: fontSize.kucuk + 1 },
});
