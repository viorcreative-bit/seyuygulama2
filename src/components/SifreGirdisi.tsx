import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import Girdi from './Girdi';

type Props = { deger: string; degisti: (t: string) => void; placeholder: string; otomatik?: 'password' | 'new-password' };

// Şifre kutusu: "Göster / Gizle" düğmesi var.
export default function SifreGirdisi({ deger, degisti, placeholder, otomatik = 'password' }: Props) {
  const [acik, setAcik] = useState(false);
  return (
    <View style={styles.kap}>
      <Girdi
        style={{ flex: 1, paddingRight: 84 }}
        value={deger}
        onChangeText={degisti}
        placeholder={placeholder}
        secureTextEntry={!acik}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={otomatik}
      />
      <Pressable onPress={() => setAcik((a) => !a)} style={styles.goster} accessibilityRole="button">
        <Text style={styles.gosterYazi}>{acik ? 'Gizle' : 'Göster'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flexDirection: 'row', alignItems: 'center' },
  goster: { position: 'absolute', right: spacing.m, paddingVertical: spacing.s },
  gosterYazi: { color: colors.sari, fontWeight: '700', fontSize: fontSize.kucuk + 1 },
});
