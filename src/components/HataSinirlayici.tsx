import { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import Dugme from './Dugme';

type Props = { children: ReactNode };
type Durum = { hata: boolean };

// Beklenmeyen bir hata olursa uygulama beyaz ekranda kalmaz; kullanıcıya anlaşılır bir mesaj gösterir.
export default class HataSinirlayici extends Component<Props, Durum> {
  state: Durum = { hata: false };

  static getDerivedStateFromError(): Durum {
    return { hata: true };
  }

  render() {
    if (!this.state.hata) return this.props.children;
    return (
      <View style={styles.kap}>
        <Text style={styles.baslik}>Bir şeyler ters gitti</Text>
        <Text style={styles.yazi}>Beklenmeyen bir hata oluştu. Lütfen tekrar dene.</Text>
        <Dugme yazi="Tekrar Dene" onPress={() => this.setState({ hata: false })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.zemin, alignItems: 'center', justifyContent: 'center', padding: spacing.l, gap: spacing.m },
  baslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.sari },
  yazi: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center' },
});
