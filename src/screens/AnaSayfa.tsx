import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

export default function AnaSayfa() {
  return (
    <ScrollView
      style={styles.kap}
      contentContainerStyle={styles.icerik}
    >
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.slogan}>Ev yemeği, şef elinden.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem },
  icerik: { alignItems: 'center', padding: spacing.l, paddingTop: 72 },
  logo: { width: 200, height: 200, resizeMode: 'contain' },
  slogan: {
    marginTop: spacing.m,
    fontSize: fontSize.baslik,
    color: colors.kirmizi,
    fontWeight: '600',
  },
});
