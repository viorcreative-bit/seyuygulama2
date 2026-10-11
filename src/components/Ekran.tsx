import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import Ust from './Ust';

type Props = { baslik?: string; geri?: () => void; sag?: React.ReactNode; children: React.ReactNode };

// Her ekranın ortak çerçevesi: koyu degrade arka plan ve (isteğe bağlı) üst çubuk.
export default function Ekran({ baslik, geri, sag, children }: Props) {
  return (
    <View style={styles.kap}>
      <LinearGradient colors={[colors.zeminUst, colors.zemin]} style={StyleSheet.absoluteFill} />
      {baslik ? <Ust baslik={baslik} geri={geri} sag={sag} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.zemin, paddingTop: 56 },
});
