import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ekran from '../components/Ekran';
import { YasalAnahtar, yasalBelge } from '../yasal';
import { colors, fontSize, spacing } from '../theme';

// KVKK, gizlilik ve kullanım koşulları metinlerini gösterir.
export default function YasalMetin({ anahtar, geri }: { anahtar: YasalAnahtar; geri: () => void }) {
  const b = yasalBelge(anahtar);
  return (
    <Ekran baslik={b.baslik} geri={geri}>
      <ScrollView contentContainerStyle={styles.icerik}>
        <Text style={styles.tarih}>Son güncelleme: {b.guncelleme}</Text>
        {b.bolumler.map((x) => (
          <View key={x.baslik} style={{ gap: spacing.s }}>
            <Text style={styles.bolum}>{x.baslik}</Text>
            <Text style={styles.metin}>{x.metin}</Text>
          </View>
        ))}
      </ScrollView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, paddingBottom: 60, gap: spacing.l },
  tarih: { fontSize: fontSize.kucuk, color: colors.metinSoluk },
  bolum: { fontSize: fontSize.normal + 2, fontWeight: '800', color: colors.sari },
  metin: { fontSize: fontSize.normal, color: colors.metin, lineHeight: 24 },
});
